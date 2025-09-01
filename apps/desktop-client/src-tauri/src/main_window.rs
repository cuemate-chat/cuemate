/// 主窗口管理模块
/// 处理跨平台的主应用窗口创建、配置和管理

use crate::platform::get_current_platform;
use log::{info, error, warn};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// 主窗口管理器
pub struct MainWindowManager {
    app_handle: AppHandle,
    is_created: bool,
}

impl MainWindowManager {
    /// 创建新的主窗口管理器
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_created: false,
        }
    }

    /// 创建并配置主窗口（普通 NSWindow）
    pub async fn create_main_window(&mut self) -> Result<(), String> {
        if self.is_created {
            info!("主窗口已存在，直接显示");
            return self.show_main_window();
        }

        let platform = get_current_platform();
        info!("创建主窗口，平台: {:?}", platform);

        // 直接创建普通的 NSWindow（不使用 NSPanel）
        // 前端 web 页面在 Docker 的 80 端口（cuemate-web 容器）
        let webview_url = WebviewUrl::External("http://localhost:80".parse().unwrap());
        
        let window_builder = WebviewWindowBuilder::new(
            &self.app_handle,
            "main-app",
            webview_url
        )
        .title("CueMate 主应用")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center() // 先居中，后面手动调整Y坐标
        .resizable(true)  // 允许调整大小
        .maximizable(true) // 允许最大化
        .minimizable(true) // 允许最小化
        .closable(true)   // 允许关闭
        .always_on_top(false) // 不总是置顶
        .visible(false)   // 先隐藏
        .decorations(true) // 显示标题栏
        .title_bar_style(tauri::TitleBarStyle::Visible); // 使用标准标题栏

        match window_builder.build() {
            Ok(window) => {
                info!("主窗口（普通 NSWindow）创建成功");
                
                // 获取屏幕大小并调整窗口Y坐标，确保在control-bar下方
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let window_size = window.inner_size().unwrap();
                        
                        // 保持水平居中，只调整Y坐标
                        let x = (screen_size.width - window_size.width) / 2;
                        let y = 350;
                        
                        if let Err(e) = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x as i32, y))) {
                            info!("设置主窗口位置失败: {}", e);
                        } else {
                            info!("主窗口位置设置成功，位置: x={}, y={}", x, y);
                        }
                    }
                }
                
                // 暂时跳过 macOS 特殊配置，先测试基本功能
                info!("跳过 macOS 特殊配置，使用默认窗口设置");
                
                self.is_created = true;
                Ok(())
            }
            Err(e) => {
                error!("创建主窗口失败: {}", e);
                Err(format!("创建主窗口失败: {}", e))
            }
        }
    }



    /// 显示主窗口
    pub fn show_main_window(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-app") {
            match window.show() {
                Ok(_) => {
                    info!("主窗口已显示");
                    
                    // 设置焦点
                    if let Err(e) = window.set_focus() {
                        warn!("设置主窗口焦点失败: {}", e);
                    }
                    
                    // macOS 确保 Key Window 状态
                    #[cfg(target_os = "macos")]
                    {
                        if let Ok(ns_window) = window.ns_window() {
                            unsafe {
                                use objc2::{msg_send, runtime::AnyObject};
                                let raw: *mut AnyObject = ns_window as *mut AnyObject;
                                let _: () = msg_send![raw, makeKeyWindow];
                                let _: () = msg_send![raw, makeMainWindow];
                            }
                        }
                    }
                    
                    Ok(())
                }
                Err(e) => {
                    error!("显示主窗口失败: {}", e);
                    Err(format!("显示主窗口失败: {}", e))
                }
            }
        } else {
            error!("主窗口不存在");
            Err("主窗口不存在".to_string())
        }
    }

    /// 隐藏主窗口
    #[allow(dead_code)]
    pub fn hide_main_window(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-app") {
            match window.hide() {
                Ok(_) => {
                    info!("主窗口已隐藏");
                    Ok(())
                }
                Err(e) => {
                    error!("隐藏主窗口失败: {}", e);
                    Err(format!("隐藏主窗口失败: {}", e))
                }
            }
        } else {
            error!("主窗口不存在");
            Err("主窗口不存在".to_string())
        }
    }

    /// 切换主窗口显示状态
    #[allow(dead_code)]
    pub fn toggle_main_window(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-app") {
            match window.is_visible() {
                Ok(is_visible) => {
                    if is_visible {
                        self.hide_main_window()
                    } else {
                        self.show_main_window()
                    }
                }
                Err(e) => {
                    error!("获取主窗口状态失败: {}", e);
                    Err(format!("获取主窗口状态失败: {}", e))
                }
            }
        } else {
            error!("主窗口不存在");
            Err("主窗口不存在".to_string())
        }
    }

    /// 销毁主窗口
    #[allow(dead_code)]
    pub fn destroy_main_window(&mut self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-app") {
            match window.close() {
                Ok(_) => {
                    info!("主窗口已销毁");
                    self.is_created = false;
                    Ok(())
                }
                Err(e) => {
                    error!("销毁主窗口失败: {}", e);
                    Err(format!("销毁主窗口失败: {}", e))
                }
            }
        } else {
            warn!("主窗口不存在，无需销毁");
            self.is_created = false;
            Ok(())
        }
    }

    /// 检查主窗口是否已创建
    #[allow(dead_code)]
    pub fn is_created(&self) -> bool {
        self.is_created
    }

    /// 获取主窗口标签
    #[allow(dead_code)]
    pub fn get_window_label(&self) -> &str {
        "main-app"
    }
}