use log::{error, info, warn, debug};
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

/// 前端日志记录
#[tauri::command]
pub async fn log_from_frontend(level: String, message: String) -> Result<String, String> {
    match level.to_lowercase().as_str() {
        "info" => info!("[前端] {}", message),
        "warn" => warn!("[前端] {}", message),
        "error" => error!("[前端] {}", message),
        "debug" => debug!("[前端] {}", message),
        _ => info!("[前端] {}", message),
    }
    Ok("日志已记录".to_string())
}

/// 显示关闭按钮窗口
#[tauri::command]
pub async fn show_close_button(app_handle: AppHandle) -> Result<String, String> {
    info!("显示关闭按钮窗口");
    
    match app_handle.get_webview_window("close-button") {
        Some(window) => {
            match window.show() {
                Ok(_) => {
                    info!("关闭按钮窗口已显示");
                    Ok("关闭按钮窗口已显示".to_string())
                }
                Err(e) => {
                    error!("显示关闭按钮窗口失败: {}", e);
                    Err(format!("显示关闭按钮窗口失败: {}", e))
                }
            }
        }
        None => {
            error!("关闭按钮窗口不存在");
            Err("关闭按钮窗口不存在".to_string())
        }
    }
}

/// 隐藏关闭按钮窗口
#[tauri::command]
pub async fn hide_close_button(app_handle: AppHandle) -> Result<String, String> {
    info!("隐藏关闭按钮窗口");
    
    match app_handle.get_webview_window("close-button") {
        Some(window) => {
            match window.hide() {
                Ok(_) => {
                    info!("关闭按钮窗口已隐藏");
                    Ok("关闭按钮窗口已隐藏".to_string())
                }
                Err(e) => {
                    error!("隐藏关闭按钮窗口失败: {}", e);
                    Err(format!("隐藏关闭按钮窗口失败: {}", e))
                }
            }
        }
        None => {
            error!("关闭按钮窗口不存在");
            Err("关闭按钮窗口不存在".to_string())
        }
    }
}

/// 切换应用显示状态
#[tauri::command]
pub async fn toggle_app_visibility(app_handle: AppHandle) -> Result<String, String> {
    info!("切换应用显示状态");
    
    match app_handle.get_webview_window("control-bar") {
        Some(window) => {
            match window.is_visible() {
                Ok(is_visible) => {
                    if is_visible {
                        match window.hide() {
                            Ok(_) => {
                                info!("应用已隐藏");
                                Ok("应用已隐藏".to_string())
                            }
                            Err(e) => {
                                error!("隐藏应用失败: {}", e);
                                Err(format!("隐藏应用失败: {}", e))
                            }
                        }
                    } else {
                        match window.show() {
                            Ok(_) => {
                                match window.set_focus() {
                                    Ok(_) => {
                                        info!("应用已显示并聚焦");
                                        Ok("应用已显示并聚焦".to_string())
                                    }
                                    Err(e) => {
                                        info!("应用已显示但聚焦失败: {}", e);
                                        Ok("应用已显示".to_string())
                                    }
                                }
                            }
                            Err(e) => {
                                error!("显示应用失败: {}", e);
                                Err(format!("显示应用失败: {}", e))
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("获取应用状态失败: {}", e);
                    Err(format!("获取应用状态失败: {}", e))
                }
            }
        }
        None => {
            error!("控制栏窗口不存在");
            Err("控制栏窗口不存在".to_string())
        }
    }
}