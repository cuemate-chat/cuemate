#![allow(unsafe_code)]
#![allow(unused_unsafe)]

use log::{error, info, warn, debug};
use tauri::{AppHandle, Manager};
use crate::windows::WindowManager;

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
    
    // 创建窗口管理器
    let window_manager = WindowManager::new(app_handle.clone());
    
    // 切换浮动窗口显示状态
    match window_manager.toggle_floating_windows() {
        Ok(_) => {
            info!("应用显示状态切换成功");
            
            // 关键：无论显示还是隐藏浮动窗口，焦点都要在锚点
            if let Err(e) = window_manager.ensure_main_focus() {
                warn!("恢复焦点锚点失败: {}", e);
            } else {
                info!("🔥 浮动窗口状态已切换，焦点强制保持在 main-focus");
            }
            
            Ok("应用显示状态切换成功".to_string())
        }
        Err(e) => {
            error!("切换应用显示状态失败: {}", e);
            Err(format!("切换应用显示状态失败: {}", e))
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

/// 显示所有窗口（Dock图标点击专用）
#[tauri::command]
pub async fn show_all_windows(app_handle: AppHandle) -> Result<String, String> {
    info!("显示所有窗口（来自Dock图标点击）");
    
    // 创建窗口管理器
    let window_manager = WindowManager::new(app_handle.clone());
    
    // 显示浮动窗口
    match window_manager.show_floating_windows() {
        Ok(_) => {
            info!("所有浮动窗口显示成功");
            
            // 关键：Dock点击显示窗口后，焦点必须回到锚点
            if let Err(e) = window_manager.ensure_main_focus() {
                warn!("恢复焦点锚点失败: {}", e);
            } else {
                info!("🔥 Dock点击显示窗口完成，焦点强制保持在 main-focus");
            }
            
            Ok("所有窗口显示完成".to_string())
        }
        Err(e) => {
            error!("显示浮动窗口失败: {}", e);
            // 即使失败也要尝试恢复焦点
            let _ = window_manager.ensure_main_focus();
            Err(format!("显示浮动窗口失败: {}", e))
        }
    }
}

/// 创建并显示主应用窗口  
#[tauri::command]
pub async fn create_main_window(
    app_handle: AppHandle,
) -> Result<String, String> {
    info!("创建主应用窗口");
    
    // 创建窗口管理器
    let mut window_manager = WindowManager::new(app_handle.clone());
    
    // 创建并显示主内容窗口
    match window_manager.create_main_content().await {
        Ok(_) => {
            info!("主窗口创建成功");
            match window_manager.show_main_content() {
                Ok(_) => {
                    info!("主应用窗口创建并显示完成");
                    
                    // 关键：确保焦点立即回到 main-focus 窗口
                    if let Err(e) = window_manager.ensure_main_focus() {
                        warn!("恢复 main-focus 焦点失败: {}", e);
                    }
                    
                    Ok("主应用窗口创建并显示完成".to_string())
                }
                Err(e) => {
                    error!("显示主窗口失败: {}", e);
                    Err(format!("显示主窗口失败: {}", e))
                }
            }
        }
        Err(e) => {
            error!("创建主窗口失败: {}", e);
            Err(format!("创建主窗口失败: {}", e))
        }
    }
}

/// 显示主应用窗口
#[tauri::command]
pub fn show_main_window(
    app_handle: AppHandle,
) -> Result<String, String> {
    info!("显示主应用窗口");
    
    // 创建窗口管理器
    let window_manager = WindowManager::new(app_handle.clone());
    
    // 显示主内容窗口
    match window_manager.show_main_content() {
        Ok(_) => {
            info!("主应用窗口显示成功");
            
            // 关键：确保焦点立即回到 main-focus 窗口
            if let Err(e) = window_manager.ensure_main_focus() {
                warn!("恢复 main-focus 焦点失败: {}", e);
            } else {
                info!("🔥 主应用窗口显示，焦点已强制保持在 main-focus");
            }
            
            Ok("主应用窗口显示成功".to_string())
        }
        Err(e) => {
            error!("显示主应用窗口失败: {}", e);
            Err(format!("显示主应用窗口失败: {}", e))
        }
    }
}

/// 隐藏主应用窗口
#[tauri::command]
pub fn hide_main_window(
    app_handle: AppHandle,
) -> Result<String, String> {
    info!("隐藏主应用窗口");
    
    // 创建窗口管理器
    let window_manager = WindowManager::new(app_handle.clone());
    
    // 隐藏主内容窗口
    match window_manager.hide_main_content() {
        Ok(_) => {
            info!("主应用窗口隐藏成功");
            
            // 关键：即使隐藏了窗口，焦点还是要在锚点
            if let Err(e) = window_manager.ensure_main_focus() {
                warn!("恢复焦点锚点失败: {}", e);
            } else {
                info!("🔥 主应用窗口已隐藏，焦点保持在 main-focus");
            }
            
            Ok("主应用窗口隐藏成功".to_string())
        }
        Err(e) => {
            error!("隐藏主应用窗口失败: {}", e);
            Err(format!("隐藏主应用窗口失败: {}", e))
        }
    }
}

/// 切换主应用窗口显示状态
#[tauri::command]
pub fn toggle_main_window(
    app_handle: AppHandle,
) -> Result<String, String> {
    info!("切换主应用窗口显示状态");
    
    // 创建窗口管理器
    let window_manager = WindowManager::new(app_handle.clone());
    
    // 切换主内容窗口
    match window_manager.toggle_main_content() {
        Ok(_) => {
            info!("主应用窗口状态切换成功");
            
            // 关键：无论显示还是隐藏，都要确保焦点在锚点
            if let Err(e) = window_manager.ensure_main_focus() {
                warn!("恢复焦点锚点失败: {}", e);
            } else {
                info!("🔥 主应用窗口状态已切换，焦点保持在 main-focus");
            }
            
            Ok("主应用窗口状态切换成功".to_string())
        }
        Err(e) => {
            error!("切换主应用窗口状态失败: {}", e);
            Err(format!("切换主应用窗口状态失败: {}", e))
        }
    }
}

/// 确保隐形锚点保持焦点（供NSPanel使用）
/// 这是解决焦点一直切换问题的核心函数
#[tauri::command]
pub fn ensure_main_focus(app_handle: AppHandle) -> Result<String, String> {
    info!("🔥 ensure_main_focus 被调用，强制恢复焦点到 main-focus");
    
    // 创建窗口管理器
    let window_manager = WindowManager::new(app_handle.clone());
    
    // 使用窗口管理器的焦点管理方法
    match window_manager.ensure_main_focus() {
        Ok(_) => {
            info!("🔥 焦点已强制恢复到 main-focus 锚点窗口");
            Ok("焦点已强制恢复到隐形锚点".to_string())
        }
        Err(e) => {
            warn!("恢复焦点锚点失败: {}", e);
            // 即使设置焦点失败，也不返回错误，避免影响用户体验
            Ok("尝试恢复焦点（可能部分成功）".to_string())
        }
    }
}