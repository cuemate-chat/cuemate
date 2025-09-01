/// 主内容窗口管理
/// 负责主应用内容窗口的创建和管理

use log::{info, error, warn};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Position, PhysicalPosition, TitleBarStyle};

pub struct MainContentWindow {
    app_handle: AppHandle,
    is_created: bool,
}

impl MainContentWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_created: false,
        }
    }

    /// 创建主内容窗口
    pub async fn create(&mut self) -> Result<(), String> {
        if self.is_created {
            info!("主内容窗口已存在");
            return Ok(());
        }

        info!("创建主内容窗口");

        let url = match "http://localhost:80".parse() {
            Ok(url) => url,
            Err(e) => {
                error!("解析主内容窗口 URL 失败: {}", e);
                return Err(format!("解析主内容窗口 URL 失败: {}", e));
            }
        };
        let webview_url = WebviewUrl::External(url);
        
        let window_builder = WebviewWindowBuilder::new(
            &self.app_handle,
            "main-content",
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
        .title_bar_style(TitleBarStyle::Visible);

        match window_builder.build() {
            Ok(window) => {
                info!("主内容窗口创建成功");
                
                // 设置窗口位置
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let window_size = match window.inner_size() {
                            Ok(size) => size,
                            Err(e) => {
                                warn!("获取主内容窗口大小失败: {}", e);
                                self.is_created = true;
                                return Ok(()); // 跳过位置设置，但不影响窗口创建
                            }
                        };
                        
                        let x = (screen_size.width - window_size.width) / 2;
                        let y = 200;
                        
                        if let Err(e) = window.set_position(Position::Physical(PhysicalPosition::new(x as i32, y))) {
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

    /// 显示窗口
    pub fn show(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            window.show().map_err(|e| format!("显示主内容窗口失败: {}", e))?;
            info!("主内容窗口已显示");
            Ok(())
        } else {
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 隐藏窗口
    pub fn hide(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            window.hide().map_err(|e| format!("隐藏主内容窗口失败: {}", e))?;
            info!("主内容窗口已隐藏");
            Ok(())
        } else {
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 切换显示状态
    pub fn toggle(&self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            match window.is_visible() {
                Ok(is_visible) => {
                    if is_visible {
                        self.hide()
                    } else {
                        self.show()
                    }
                }
                Err(e) => {
                    error!("获取主内容窗口状态失败: {}", e);
                    Err(format!("获取主内容窗口状态失败: {}", e))
                }
            }
        } else {
            Err("主内容窗口不存在".to_string())
        }
    }

    /// 销毁窗口
    pub fn destroy(&mut self) -> Result<(), String> {
        if let Some(window) = self.app_handle.get_webview_window("main-content") {
            window.close().map_err(|e| format!("销毁主内容窗口失败: {}", e))?;
            info!("主内容窗口已销毁");
            self.is_created = false;
            Ok(())
        } else {
            warn!("主内容窗口不存在，无需销毁");
            self.is_created = false;
            Ok(())
        }
    }

    /// 检查窗口是否已创建
    pub fn is_created(&self) -> bool {
        self.is_created
    }
}