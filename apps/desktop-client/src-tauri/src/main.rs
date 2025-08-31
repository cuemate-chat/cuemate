// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod platform;
mod main_window;

use commands::*;
use platform::log_platform_info;
use log::{info, LevelFilter};
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_nspanel::WebviewWindowExt;

#[cfg(target_os = "macos")]
use objc2::{msg_send, runtime::AnyObject};


fn main() {
    // 初始化日志
    env_logger::Builder::from_default_env()
        .filter_level(LevelFilter::Info)
        .init();

    info!("CueMate 桌面客户端启动");

    // 记录平台信息
    log_platform_info();

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(tauri_nspanel::WebviewPanelManager::default())
        .invoke_handler(tauri::generate_handler![
            log_from_frontend,
            toggle_app_visibility,
            show_close_button,
            hide_close_button,
            open_url,
            show_all_windows,
            create_main_window,
            show_main_window,
            hide_main_window,
            toggle_main_window
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
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle: &tauri::AppHandle, event: RunEvent| {
            match event {
                RunEvent::Ready => {
                    info!("App is ready");
                }
                RunEvent::Reopen { has_visible_windows, .. } => {
                    info!("应用被重新打开 (Dock 图标点击): has_visible_windows={}", has_visible_windows);
                    // 这是 macOS 上点击 Dock 图标的正确事件!
                    if let Some(control_window) = app_handle.get_webview_window("control-bar") {
                        let _ = control_window.show();
                        info!("显示 control-bar 窗口");
                    }
                    if let Some(close_window) = app_handle.get_webview_window("close-button") {
                        let _ = close_window.show();
                        info!("显示 close-button 窗口");
                    }
                }
                RunEvent::WindowEvent { label, event, .. } => {
                    // 只记录重要的窗口事件
                    match event {
                        WindowEvent::Focused(focused) => {
                            if focused {
                                info!("窗口获得焦点: {}", label);
                            }
                        }
                        WindowEvent::CloseRequested { .. } => {
                            info!("窗口关闭请求: {}", label);
                        }
                        WindowEvent::Resized(_) => {
                            info!("窗口大小改变: {}", label);
                        }
                        WindowEvent::Moved(_) => {
                            info!("窗口位置改变: {}", label);
                        }
                        _ => {
                            // 忽略其他不重要的窗口事件
                        }
                    }
                }
                RunEvent::MainEventsCleared => {
                    // 不记录 MainEventsCleared 事件，因为它太频繁了
                }
                _ => {
                    // 其他事件可以选择性记录，但不包括频繁的内部事件
                }
            }
        });
}