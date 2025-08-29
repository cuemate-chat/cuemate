use log::{error, info};
use tauri::{AppHandle, Manager};

/// 显示悬浮窗口
#[tauri::command]
pub async fn show_floating_overlay(app_handle: AppHandle) -> Result<String, String> {
    info!("显示悬浮窗口");
    
    match app_handle.get_webview_window("floating-overlay") {
        Some(window) => {
            match window.show() {
                Ok(_) => {
                    info!("悬浮窗口已显示");
                    Ok("悬浮窗口已显示".to_string())
                }
                Err(e) => {
                    error!("显示悬浮窗口失败: {}", e);
                    Err(format!("显示悬浮窗口失败: {}", e))
                }
            }
        }
        None => {
            error!("悬浮窗口不存在");
            Err("悬浮窗口不存在".to_string())
        }
    }
}

/// 隐藏悬浮窗口
#[tauri::command]
pub async fn hide_floating_overlay(app_handle: AppHandle) -> Result<String, String> {
    info!("隐藏悬浮窗口");
    
    match app_handle.get_webview_window("floating-overlay") {
        Some(window) => {
            match window.hide() {
                Ok(_) => {
                    info!("悬浮窗口已隐藏");
                    Ok("悬浮窗口已隐藏".to_string())
                }
                Err(e) => {
                    error!("隐藏悬浮窗口失败: {}", e);
                    Err(format!("隐藏悬浮窗口失败: {}", e))
                }
            }
        }
        None => {
            error!("悬浮窗口不存在");
            Err("悬浮窗口不存在".to_string())
        }
    }
}

/// 切换悬浮窗口显示状态
#[tauri::command]
pub async fn toggle_floating_overlay(app_handle: AppHandle) -> Result<String, String> {
    info!("切换悬浮窗口显示状态");
    
    match app_handle.get_webview_window("floating-overlay") {
        Some(window) => {
            match window.is_visible() {
                Ok(is_visible) => {
                    if is_visible {
                        match window.hide() {
                            Ok(_) => {
                                info!("悬浮窗口已隐藏");
                                Ok("悬浮窗口已隐藏".to_string())
                            }
                            Err(e) => {
                                error!("隐藏悬浮窗口失败: {}", e);
                                Err(format!("隐藏悬浮窗口失败: {}", e))
                            }
                        }
                    } else {
                        match window.show() {
                            Ok(_) => {
                                info!("悬浮窗口已显示");
                                Ok("悬浮窗口已显示".to_string())
                            }
                            Err(e) => {
                                error!("显示悬浮窗口失败: {}", e);
                                Err(format!("显示悬浮窗口失败: {}", e))
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("获取悬浮窗口状态失败: {}", e);
                    Err(format!("获取悬浮窗口状态失败: {}", e))
                }
            }
        }
        None => {
            error!("悬浮窗口不存在");
            Err("悬浮窗口不存在".to_string())
        }
    }
}