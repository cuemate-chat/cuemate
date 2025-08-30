// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::*;
use log::{info, LevelFilter};
use tauri::Manager;
use tauri_nspanel::WebviewWindowExt;

fn main() {
    // 初始化日志
    env_logger::Builder::from_default_env()
        .filter_level(LevelFilter::Info)
        .init();

    info!("CueMate 桌面客户端启动");

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(tauri_nspanel::WebviewPanelManager::default())
        .invoke_handler(tauri::generate_handler![
            show_floating_overlay,
            hide_floating_overlay,
            toggle_floating_overlay,
            log_from_frontend,
            toggle_app_visibility,
            show_close_button,
            hide_close_button
        ])
        .setup(|app| {
            // 转换 control-bar 窗口为 NSPanel
            if let Some(window) = app.get_webview_window("control-bar") {
                match window.to_panel() {
                    Ok(_panel) => {
                        info!("control-bar 窗口已转换为 NSPanel");
                        
                        // 获取屏幕大小并设置窗口位置
                        if let Ok(monitor) = window.current_monitor() {
                            if let Some(monitor) = monitor {
                                let screen_size = monitor.size();
                                let window_size = window.inner_size().unwrap();
                                
                                // 横向居中
                                let x = (screen_size.width - window_size.width) / 2;
                                let y = 100;
                                
                                if let Err(e) = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x as i32, y))) {
                                    info!("设置 control-bar 窗口位置失败: {}", e);
                                } else {
                                    info!("control-bar NSPanel 设置成功，位置: x={}, y={}", x, y);
                                }
                                
                                // 转换 close-button 窗口为 NSPanel
                                if let Some(close_window) = app.get_webview_window("close-button") {
                                    match close_window.to_panel() {
                                        Ok(_close_panel) => {
                                            info!("close-button 窗口已转换为 NSPanel");
                                            
                                            let close_x = x + window_size.width;
                                            let close_y = y; // 同一水平线
                                            
                                            if let Err(e) = close_window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(close_x as i32, close_y))) {
                                                info!("设置 close-button 窗口位置失败: {}", e);
                                            } else {
                                                info!("close-button NSPanel 设置成功，位置: x={}, y={}", close_x, close_y);
                                            }
                                        }
                                        Err(e) => {
                                            info!("转换 close-button 为 NSPanel 失败: {}", e);
                                        }
                                    }
                                } else {
                                    info!("未找到 close-button 窗口");
                                }
                            } else {
                                info!("无法获取显示器信息");
                            }
                        } else {
                            info!("获取显示器失败");
                        }
                    }
                    Err(e) => {
                        info!("转换 control-bar 为 NSPanel 失败: {}", e);
                    }
                }
            } else {
                info!("未找到 control-bar 窗口");
            }
            info!("NSPanel 初始化完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}