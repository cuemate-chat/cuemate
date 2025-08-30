// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::*;
use log::{info, LevelFilter};
use tauri::Manager;

// 移除 macOS objc 依赖

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
            toggle_app_visibility,
            show_close_button,
            hide_close_button
        ])
        .setup(|app| {
            info!("CueMate 全屏透明窗口初始化完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}