use log::{error, info, warn, debug};
use tauri::{AppHandle, Manager};



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

/// 打开网页链接
#[tauri::command]
pub async fn open_url(url: String) -> Result<String, String> {
    info!("打开网页链接: {}", url);
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        match Command::new("open").arg(&url).spawn() {
            Ok(_) => {
                info!("网页链接已打开: {}", url);
                Ok(format!("网页链接已打开: {}", url))
            }
            Err(e) => {
                error!("打开网页链接失败: {}", e);
                Err(format!("打开网页链接失败: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        match Command::new("cmd").args(&["/C", "start", &url]).spawn() {
            Ok(_) => {
                info!("网页链接已打开: {}", url);
                Ok(format!("网页链接已打开: {}", url))
            }
            Err(e) => {
                error!("打开网页链接失败: {}", e);
                Err(format!("打开网页链接失败: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        match Command::new("xdg-open").arg(&url).spawn() {
            Ok(_) => {
                info!("网页链接已打开: {}", url);
                Ok(format!("网页链接已打开: {}", url))
            }
            Err(e) => {
                error!("打开网页链接失败: {}", e);
                Err(format!("打开网页链接失败: {}", e))
            }
        }
    }
}

/// 显示所有窗口（Dock图标点击专用，不设置焦点）
#[tauri::command]
pub async fn show_all_windows(app_handle: AppHandle) -> Result<String, String> {
    info!("显示所有窗口（来自Dock图标点击）");
    
    let mut success_count = 0;
    let mut error_count = 0;
    
    // 显示 control-bar 窗口（不设置焦点，避免死循环）
    match app_handle.get_webview_window("control-bar") {
        Some(window) => {
            match window.show() {
                Ok(_) => {
                    info!("control-bar 窗口已显示");
                    success_count += 1;
                }
                Err(e) => {
                    error!("显示 control-bar 窗口失败: {}", e);
                    error_count += 1;
                }
            }
        }
        None => {
            error!("control-bar 窗口不存在");
            error_count += 1;
        }
    }
    
    // 显示 close-button 窗口
    match app_handle.get_webview_window("close-button") {
        Some(window) => {
            match window.show() {
                Ok(_) => {
                    info!("close-button 窗口已显示");
                    success_count += 1;
                }
                Err(e) => {
                    error!("显示 close-button 窗口失败: {}", e);
                    error_count += 1;
                }
            }
        }
        None => {
            error!("close-button 窗口不存在");
            error_count += 1;
        }
    }
    
    
    if error_count == 0 {
        info!("所有窗口已显示完成，成功: {}", success_count);
        Ok(format!("所有窗口已显示完成，成功: {}", success_count))
    } else {
        warn!("部分窗口显示失败，成功: {}, 失败: {}", success_count, error_count);
        Ok(format!("部分窗口显示失败，成功: {}, 失败: {}", success_count, error_count))
    }
}