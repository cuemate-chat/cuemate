/// 主窗口管理模块
/// 处理跨平台的主应用窗口创建、配置和管理

use crate::platform::get_current_platform;
use log::{info, error, warn};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// 主窗口管理器
pub struct MainWindowManager {
    app_handle: AppHandle,
    is_created: bool,
    is_invisible_anchor_created: bool,
}

impl MainWindowManager {
    /// 创建新的主窗口管理器
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_created: false,
            is_invisible_anchor_created: false,
        }
    }

    /// 创建隐形主窗口（焦点锚点）- 临时简化版本
    pub async fn create_invisible_anchor(&mut self) -> Result<(), String> {
        if self.is_invisible_anchor_created {
            info!("隐形焦点锚点已存在");
            return Ok(());
        }

        let platform = get_current_platform();
        info!("创建隐形焦点锚点窗口，平台: {:?}", platform);

        // 使用本地服务器作为隐形窗口的内容源
        let webview_url = WebviewUrl::External("http://localhost:1420".parse().unwrap());
        
        let window_builder = WebviewWindowBuilder::new(
            &self.app_handle,
            "invisible-anchor",
            webview_url
        )
        .title("CueMate Focus Anchor")
        .inner_size(10.0, 10.0)  // 改为10x10像素，避免1x1的问题
        .position(-100.0, -100.0)  // 移到屏幕外
        .resizable(false)
        .maximizable(false)
        .minimizable(true)     // 允许最小化
        .closable(false)       // 不允许关闭
        .always_on_top(false)
        .visible(false)        // 隐形
        .decorations(false)
        .skip_taskbar(true);

        match window_builder.build() {
            Ok(_window) => {
                info!("隐形焦点锚点创建成功（简化版本）");
                
                // 暂时完全跳过 macOS 特殊配置，避免任何 unsafe 操作
                info!("暂时跳过所有 macOS 特殊配置，避免崩溃");
                
                self.is_invisible_anchor_created = true;
                Ok(())
            }
            Err(e) => {
                error!("创建隐形焦点锚点失败: {}", e);
                Err(format!("创建隐形焦点锚点失败: {}", e))
            }
        }
    }

    /// 确保隐形锚点始终为 Key Window (完全简化版)
    pub fn ensure_anchor_focus(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("invisible-anchor") {
            match window.set_focus() {
                Ok(_) => {
                    log::info!("隐形锚点焦点已通过 set_focus 设置");
                    Ok(())
                }
                Err(e) => {
                    log::warn!("无法使用 set_focus 设置隐形锚点焦点: {:?}", e);
                    Err(format!("设置焦点失败: {:?}", e))
                }
            }
        } else {
            Err("隐形锚点不存在".to_string())
        }
    }

    /// 创建主内容窗口（NSPanel形式，不争夺焦点）
    pub async fn create_main_window(&mut self) -> Result<(), String> {
        // 首先确保隐形锚点存在
        if let Err(e) = self.create_invisible_anchor().await {
            warn!("创建隐形锚点失败: {}", e);
        }

        if self.is_created {
            info!("主内容窗口已存在，直接显示");
            return self.show_main_window();
        }

        let platform = get_current_platform();
        info!("创建主内容窗口（NSPanel），平台: {:?}", platform);

        // 创建主内容窗口，将转换为 NSPanel
        let webview_url = WebviewUrl::External("http://localhost:80".parse().unwrap());
        
        let window_builder = WebviewWindowBuilder::new(
            &self.app_handle,
            "main-content",  // 改名为 main-content
            webview_url
        )
        .title("CueMate 主应用")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center()
        .resizable(true)
        .maximizable(true)
        .minimizable(true)
        .closable(true)
        .always_on_top(false)
        .visible(false)   // 先隐藏，稍后显示
        .decorations(true)
        .title_bar_style(tauri::TitleBarStyle::Visible);

        match window_builder.build() {
            Ok(window) => {
                info!("主内容窗口创建成功，开始转换为 NSPanel");
                
                // 暂时跳过 NSPanel 转换，先测试基本窗口功能
                info!("暂时使用普通 NSWindow，跳过 NSPanel 转换以避免崩溃");
                
                // 设置窗口位置
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let window_size = window.inner_size().unwrap();
                        
                        let x = (screen_size.width - window_size.width) / 2;
                        let y = 200;
                        
                        if let Err(e) = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x as i32, y))) {
                            warn!("设置主内容窗口位置失败: {}", e);
                        } else {
                            info!("主内容窗口位置设置成功: x={}, y={}", x, y);
                        }
                    }
                }
                
                self.is_created = true;
                Ok(())
            }
            Err(e) => {
                error!("创建主内容窗口失败: {}", e);
                Err(format!("创建主内容窗口失败: {}", e))
            }
        }
    }



    /// 显示主内容窗口
    pub fn show_main_window(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            match window.show() {
                Ok(_) => {
                    info!("主内容窗口已显示");
                    
                    // 关键：主内容窗口显示后，确保隐形锚点保持焦点
                    if let Err(e) = self.ensure_anchor_focus() {
                        warn!("确保隐形锚点焦点失败: {}", e);
                    }
                    
                    // 主内容窗口（NSPanel）不应该争夺焦点
                    info!("主内容窗口已显示，隐形锚点保持焦点");
                    Ok(())
                }
                Err(e) => {
                    error!("显示主内容窗口失败: {}", e);
                    Err(format!("显示主内容窗口失败: {}", e))
                }
            }
        } else {
            error!("主内容窗口不存在");
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 隐藏主内容窗口
    #[allow(dead_code)]
    pub fn hide_main_window(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            match window.hide() {
                Ok(_) => {
                    info!("主内容窗口已隐藏");
                    Ok(())
                }
                Err(e) => {
                    error!("隐藏主内容窗口失败: {}", e);
                    Err(format!("隐藏主内容窗口失败: {}", e))
                }
            }
        } else {
            error!("主内容窗口不存在");
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 切换主内容窗口显示状态
    #[allow(dead_code)]
    pub fn toggle_main_window(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            match window.is_visible() {
                Ok(is_visible) => {
                    if is_visible {
                        self.hide_main_window()
                    } else {
                        self.show_main_window()
                    }
                }
                Err(e) => {
                    error!("获取主内容窗口状态失败: {}", e);
                    Err(format!("获取主内容窗口状态失败: {}", e))
                }
            }
        } else {
            error!("主内容窗口不存在");
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 销毁主内容窗口
    #[allow(dead_code)]
    pub fn destroy_main_window(&mut self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            match window.close() {
                Ok(_) => {
                    info!("主内容窗口已销毁");
                    self.is_created = false;
                    Ok(())
                }
                Err(e) => {
                    error!("销毁主内容窗口失败: {}", e);
                    Err(format!("销毁主内容窗口失败: {}", e))
                }
            }
        } else {
            warn!("主内容窗口不存在，无需销毁");
            self.is_created = false;
            Ok(())
        }
    }

    /// 检查主窗口是否已创建
    #[allow(dead_code)]
    pub fn is_created(&self) -> bool {
        self.is_created
    }

    /// 获取主内容窗口标签
    #[allow(dead_code)]
    pub fn get_window_label(&self) -> &str {
        "main-content"
    }
}