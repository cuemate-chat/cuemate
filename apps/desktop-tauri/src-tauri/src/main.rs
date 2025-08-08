#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, GlobalShortcutManager, Manager, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem, WindowEvent,
};

// 命令：切换窗口显示/隐藏
#[tauri::command]
fn toggle_window_visibility(window: tauri::Window) {
    if window.is_visible().unwrap() {
        window.hide().unwrap();
    } else {
        window.show().unwrap();
        window.set_focus().unwrap();
    }
}

// 命令：设置窗口置顶
#[tauri::command]
fn set_always_on_top(window: tauri::Window, always_on_top: bool) {
    window.set_always_on_top(always_on_top).unwrap();
}

// 命令：设置窗口透明度
#[tauri::command]
fn set_window_opacity(window: tauri::Window, opacity: f32) {
    // 注意：透明度设置在某些平台可能需要额外配置
    // 这里仅作为示例
}

// 命令：获取系统音频设备列表
#[tauri::command]
async fn get_audio_devices() -> Result<Vec<String>, String> {
    // TODO: 实现获取音频设备列表
    // 这里需要集成音频设备枚举库
    Ok(vec![
        "Default Microphone".to_string(),
        "BlackHole 2ch".to_string(),
        "System Audio".to_string(),
    ])
}

fn main() {
    // 创建系统托盘菜单
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    let hide = CustomMenuItem::new("hide".to_string(), "隐藏");
    let show = CustomMenuItem::new("show".to_string(), "显示");
    let settings = CustomMenuItem::new("settings".to_string(), "设置");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(settings)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "settings" => {
                    // TODO: 打开设置窗口
                }
                _ => {}
            },
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            WindowEvent::CloseRequested { api, .. } => {
                // 关闭时隐藏而不是退出
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .setup(|app| {
            // 注册全局快捷键
            let app_handle = app.handle();
            let mut shortcut_manager = app.global_shortcut_manager();
            
            // Cmd/Ctrl + Shift + Space 显示/隐藏窗口
            shortcut_manager
                .register("CmdOrCtrl+Shift+Space", move || {
                    if let Some(window) = app_handle.get_window("main") {
                        if window.is_visible().unwrap() {
                            window.hide().unwrap();
                        } else {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .unwrap();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_window_visibility,
            set_always_on_top,
            set_window_opacity,
            get_audio_devices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
