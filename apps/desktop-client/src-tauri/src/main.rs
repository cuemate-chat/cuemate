// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod commands;

use audio::virtual_driver::VirtualAudioDriverInstaller;
use commands::*;
use log::{info, LevelFilter};
use tauri::{Emitter, Manager};

fn main() {
    // 初始化日志
    env_logger::Builder::from_default_env()
        .filter_level(LevelFilter::Info)
        .init();

    info!("CueMate 桌面客户端启动");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_audio_devices,
            get_virtual_devices,
            check_virtual_driver,
            install_virtual_driver,
            start_audio_capture,
            stop_audio_capture,
            is_capturing,
            set_websocket_url,
            set_audio_config
        ])
        .setup(|app| {
            info!("应用初始化完成");
            
            // 检查虚拟音频驱动
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let installed_drivers = VirtualAudioDriverInstaller::detect_installed_drivers();
                if installed_drivers.is_empty() {
                    info!("未检测到虚拟音频驱动");
                    // 通知前端显示安装向导
                    let _ = app_handle.emit("virtual-driver-not-found", ());
                } else {
                    info!("检测到虚拟音频驱动: {:?}", installed_drivers);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}