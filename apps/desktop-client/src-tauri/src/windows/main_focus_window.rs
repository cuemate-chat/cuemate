/// 主焦点窗口管理 (main-focus)
/// 负责创建和管理主焦点窗口，确保焦点始终保持在此窗口上
/// 设计为无边框极小窗口，放置在屏幕外而非隐藏

use log::{info, error, warn};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Position, PhysicalPosition};

pub struct MainFocusWindow {
    app_handle: AppHandle,
    is_created: bool,
}

impl MainFocusWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_created: false,
        }
    }

    /// 创建主焦点窗口 (main-focus)
    /// 设计为无边框极小窗口，放置在屏幕外保持焦点
    pub async fn create(&mut self) -> Result<(), String> {
        // 检查窗口是否真的存在，而不是依赖内部状态
        if self.app_handle.get_webview_window("main-focus").is_some() {
            info!("main-focus 窗口已存在");
            self.is_created = true; // 同步内部状态
            return Ok(());
        }
        
        if self.is_created {
            info!("main-focus 窗口已存在");
            return Ok(());
        }

        info!("创建 main-focus 主焦点窗口");

        let url = match "http://localhost:1420".parse() {
            Ok(url) => url,
            Err(e) => {
                error!("解析 main-focus URL 失败: {}", e);
                return Err(format!("解析 main-focus URL 失败: {}", e));
            }
        };
        let webview_url = WebviewUrl::External(url);
        
        let window_builder = WebviewWindowBuilder::new(
            &self.app_handle,
            "main-focus",
            webview_url
        )
        .title("CueMate Main Focus")
        .inner_size(1.0, 1.0)        // 极小尺寸 1x1 像素
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .closable(false)
        .always_on_top(false)
        .visible(true)               // 保持可见但在屏幕外
        .decorations(false)          // 无边框
        .skip_taskbar(true);         // 不在任务栏显示

        match window_builder.build() {
            Ok(window) => {
                info!("main-focus 窗口创建成功");
                
                // 关键：将窗口放到屏幕外而不是隐藏
                if let Err(e) = window.set_position(Position::Physical(PhysicalPosition::new(-2000, -2000))) {
                    warn!("设置 main-focus 屏幕外位置失败: {}", e);
                } else {
                    info!("main-focus 窗口已放置到屏幕外位置 (-2000, -2000)");
                }
                
                // 设置初始焦点
                if let Err(e) = window.set_focus() {
                    warn!("设置 main-focus 初始焦点失败: {}", e);
                } else {
                    info!("main-focus 窗口已获得初始焦点");
                }
                
                self.is_created = true;
                Ok(())
            }
            Err(e) => {
                error!("创建 main-focus 窗口失败: {}", e);
                Err(format!("创建 main-focus 窗口失败: {}", e))
            }
        }
    }

    /// 确保焦点始终在 main-focus 窗口上
    pub fn ensure_focus(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-focus") {
            match window.set_focus() {
                Ok(_) => {
                    info!("main-focus 窗口焦点已恢复");
                    Ok(())
                }
                Err(e) => {
                    warn!("无法设置 main-focus 窗口焦点: {:?}", e);
                    // 即使失败也不返回错误，避免影响用户体验
                    Ok(())
                }
            }
        } else {
            error!("main-focus 窗口不存在");
            Err("main-focus 窗口不存在".to_string())
        }
    }

    /// 检查窗口是否已创建
    pub fn is_created(&self) -> bool {
        // 检查窗口是否真的存在，而不是依赖内部状态
        if self.app_handle.get_webview_window("main-focus").is_some() {
            true
        } else {
            self.is_created
        }
    }
}