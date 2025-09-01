// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod platform;
mod windows;

use commands::*;
use platform::log_platform_info;
use windows::WindowManager;
use log::{info, LevelFilter};
use tauri::{Manager, RunEvent, WindowEvent};

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
            toggle_main_window,
            ensure_main_focus
        ])
        .setup(|app| {
            info!("开始初始化窗口管理器");
            
            // 创建窗口管理器并初始化
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut window_manager = WindowManager::new(app_handle);
                if let Err(e) = window_manager.initialize().await {
                    log::error!("窗口管理器初始化失败: {}", e);
                } else {
                    log::info!("窗口管理器初始化完成");
                }
            });
            
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
                                
                                // 只有 main-focus 窗口可以真正获得焦点
                                // 其他窗口（NSPanel）不应该获得焦点
                                if label != "main-focus" {
                                    info!("NSPanel 窗口 {} 获得焦点，立即恢复焦点到 main-focus", label);
                                    // 立即恢复焦点，防止其他窗口保持焦点
                                    if let Some(main_focus_window) = app_handle.get_webview_window("main-focus") {
                                        if let Err(e) = main_focus_window.set_focus() {
                                            log::error!("恢复焦点到 main-focus 失败: {}", e);
                                        } else {
                                            log::info!("焦点已恢复 to main-focus");
                                        }
                                    }
                                }
                            }
                        }
                        WindowEvent::CloseRequested { .. } => {
                            info!("窗口关闭请求: {}", label);
                            
                            // 特殊处理 main-content 窗口的关闭请求
                            if label == "main-content" {
                                info!("处理 main-content 窗口关闭请求，执行安全隐藏");
                                if let Some(window) = app_handle.get_webview_window("main-content") {
                                    // 直接隐藏窗口，不使用 catch_unwind
                                    if let Err(e) = window.hide() {
                                        log::error!("隐藏 main-content 窗口失败: {}", e);
                                    } else {
                                        log::info!("main-content 窗口已安全隐藏");
                                    }
                                }
                            }
                        }
                        WindowEvent::Moved(_) => {
                            info!("窗口位置改变: {}", label);
                            // 鼠标移动不触发焦点恢复，让鼠标事件正常工作
                        }
                        WindowEvent::Resized(_) => {
                            info!("窗口大小改变: {}", label);
                        }
                        _ => {
                            // 忽略其他不重要的窗口事件
                        }
                    }
                }
                RunEvent::MainEventsCleared => {
                    // 主事件循环结束，可以在这里执行一些清理工作
                }
                _ => {
                    // 忽略其他事件
                }
            }
        });
}