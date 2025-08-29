// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::*;
use log::{info, LevelFilter};
use tauri::Manager;

fn main() {
    // 初始化日志
    env_logger::Builder::from_default_env()
        .filter_level(LevelFilter::Info)
        .init();

    info!("CueMate 桌面客户端启动");

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            show_floating_overlay,
            hide_floating_overlay,
            toggle_floating_overlay,
            log_from_frontend,
            toggle_app_visibility
        ])
        .setup(|app| {
            // 设置 control-bar 窗口位置
            if let Some(window) = app.get_webview_window("control-bar") {
                // 获取屏幕大小 & 窗口大小
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let window_size = window.inner_size().unwrap();
                        
                        // 横向居中
                        let x = (screen_size.width - window_size.width) / 2;
                        let y = 100;
                        
                        // 设置窗口位置，并确保窗口可以被后续移动
                        if let Err(e) = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x as i32, y))) {
                            info!("设置窗口失败: {}", e);
                        } else {
                            info!("窗口设置成功，位置: x={}, y={}", x, y);
                            // 确保窗口是可移动的
                            window.set_resizable(true).unwrap_or_else(|e| info!("设置可调整大小失败: {}", e));
                        }
                    } else {
                        info!("无法获取显示器信息");
                    }
                } else {
                    info!("获取显示器失败");
                }
            } else {
                info!("未找到 control-bar 窗口");
            }
            info!("应用初始化完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}