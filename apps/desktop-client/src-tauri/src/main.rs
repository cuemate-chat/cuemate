// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::*;
use log::{info, LevelFilter};
use tauri::Manager;
use tauri::Listener;
use log::error;
use tauri_nspanel::WebviewWindowExt;

#[cfg(target_os = "macos")]
use objc2::{msg_send, runtime::AnyObject};


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
            hide_close_button,
            open_url,
            show_all_windows
        ])
        .setup(|app| {
            info!("开始初始化 NSPanel");
            
            // 转换 control-bar 窗口为 NSPanel
            if let Some(window) = app.get_webview_window("control-bar") {
                match window.to_panel() {
                    Ok(panel) => {
                        info!("control-bar 窗口已转换为 NSPanel");
                        
                        // 配置 NSPanel 的关键属性解决鼠标焦点问题
                        #[cfg(target_os = "macos")]
                        {
                            // NSNonactivatingPanelMask = 1 << 7 = 128
                            let nonactivating_panel_mask = 128i32;
                            panel.set_style_mask(nonactivating_panel_mask);
                            info!("control-bar NSPanel 已设置为 nonactivatingPanel 模式");
                            
                            unsafe {
                                // 从 panel 解引用后强转
                                let raw: *mut AnyObject = (&*panel) as *const _ as *mut AnyObject;
                            
                                // 关键：让 NSPanel 能接收鼠标事件，但不抢焦点
                                let _: () = msg_send![raw, setIgnoresMouseEvents: false];
                            
                                // 设置其他属性
                                let _: () = msg_send![raw, setBecomesKeyOnlyIfNeeded: true];
                                let _: () = msg_send![raw, setHidesOnDeactivate: false];
                                let _: () = msg_send![raw, setFloatingPanel: true];
                                let _: () = msg_send![raw, setMovableByWindowBackground: true];
                            
                                // 设置 collectionBehavior: canJoinAllSpaces + fullScreenAuxiliary
                                let collection_behavior = 1i64 | 256i64; // 1 + 256 = 257
                                let _: () = msg_send![raw, setCollectionBehavior: collection_behavior];
                            
                                // 如果这是 A 窗口：强制成为 key window
                                let _: () = msg_send![raw, makeKeyWindow];
                            }
                        }
                        
                        // 确保 always_on_top 设置
                        if let Err(e) = window.set_always_on_top(true) {
                            info!("设置 control-bar always_on_top 失败: {}", e);
                        } else {
                            info!("control-bar 窗口已确保 always_on_top");
                        }
                        
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
                                
                                if let Some(close_window) = app.get_webview_window("close-button") {
                                    info!("close-button 窗口转换为 NSPanel");
                                    
                                    // 转换 close-button 窗口为 NSPanel
                                    match close_window.to_panel() {
                                        Ok(close_panel) => {
                                            info!("close-button 窗口已转换为 NSPanel");
                                            
                                            // 配置 NSPanel 的关键属性
                                            #[cfg(target_os = "macos")]
                                            {
                                                // NSNonactivatingPanelMask = 1 << 7 = 128
                                                let nonactivating_panel_mask = 128i32;
                                                close_panel.set_style_mask(nonactivating_panel_mask);
                                                info!("close-button NSPanel 已设置为 nonactivatingPanel 模式");
                                                
                                                unsafe {
                                                    let raw: *mut AnyObject = (&*close_panel) as *const _ as *mut AnyObject;
                                                
                                                    let _: () = msg_send![raw, setIgnoresMouseEvents: false];
                                                    let _: () = msg_send![raw, setHidesOnDeactivate: false];
                                                    let _: () = msg_send![raw, setFloatingPanel: true];
                                                    let _: () = msg_send![raw, setMovableByWindowBackground: true];
                                                
                                                    let collection_behavior = 1i64 | 256i64;
                                                    let _: () = msg_send![raw, setCollectionBehavior: collection_behavior];
                                                }
                                            }
                                            
                                            // 确保 always_on_top 设置
                                            if let Err(e) = close_window.set_always_on_top(true) {
                                                info!("设置 close-button always_on_top 失败: {}", e);
                                            } else {
                                                info!("close-button 窗口已确保 always_on_top");
                                            }
                                            
                                            info!("close-button NSPanel 配置完成");
                                            
                                            // 让关闭按钮稍微重叠，确保鼠标能无缝移动
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
            
            // 监听 Dock 图标点击事件
            let app_handle = app.handle().clone();

            // 再 clone 一份给闭包 move 进去
            let handle_for_listener = app_handle.clone();

            let _unlisten = app_handle.listen_any("tauri://activate", move |_event| {
                info!("Dock 图标被点击，显示所有窗口");

                // 用 handle_for_listener（已经提前 clone 好的），不会冲突
                let handle = handle_for_listener.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = show_all_windows(handle).await {
                        error!("显示所有窗口失败: {}", e);
                    }
                });
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}