/// 统一窗口管理器
/// 负责协调所有窗口的创建、配置和生命周期管理
/// 重点解决焦点管理问题：确保焦点始终在 main-focus 窗口上

use log::{info, error, warn};
use tauri::{AppHandle, Manager};

use crate::windows::{
    main_focus_window::MainFocusWindow,
    control_bar_window::ControlBarWindow,
    close_button_window::CloseButtonWindow,
    main_content_window::MainContentWindow,
};

pub struct WindowManager {
    app_handle: AppHandle,
    main_focus_window: MainFocusWindow,
    control_bar_window: ControlBarWindow,
    close_button_window: CloseButtonWindow,
    main_content_window: MainContentWindow,
}

impl WindowManager {
    pub fn new(app_handle: AppHandle) -> Self {
        let main_focus_window = MainFocusWindow::new(app_handle.clone());
        let control_bar_window = ControlBarWindow::new(app_handle.clone());
        let close_button_window = CloseButtonWindow::new(app_handle.clone());
        let main_content_window = MainContentWindow::new(app_handle.clone());

        Self {
            app_handle,
            main_focus_window,
            control_bar_window,
            close_button_window,
            main_content_window,
        }
    }

    /// 初始化所有窗口和 NSPanel 配置
    /// 关键：创建 main-focus 主焦点窗口并确保焦点管理正确
    pub async fn initialize(&mut self) -> Result<(), String> {
        info!("开始初始化窗口管理器");

        // 1. 首先创建 main-focus 主焦点窗口，这是最重要的
        match self.main_focus_window.create().await {
            Ok(_) => {
                info!("main-focus 主焦点窗口已创建");
            }
            Err(e) => {
                error!("创建 main-focus 窗口失败，这是致命错误: {}", e);
                return Err(format!("创建 main-focus 窗口失败: {}", e));
            }
        }

        info!("准备配置 control-bar 为 NSPanel...");
        
        // 2. 配置 control-bar 为 NSPanel（非阻塞，失败不影响启动）
        match self.control_bar_window.setup_as_panel() {
            Ok(_) => {
                info!("control-bar NSPanel 配置成功");
            }
            Err(e) => {
                warn!("配置 control-bar NSPanel 失败，但不影响启动: {}", e);
            }
        }

        info!("control-bar 配置完成，准备配置 close-button...");

        // 3. 配置 close-button 为 NSPanel（非阻塞，失败不影响启动）
        // 由于 control-bar 已经设置了 center: true，close-button 会自动定位
        match self.close_button_window.setup_as_panel() {
            Ok(_) => {
                info!("close-button NSPanel 配置成功");
            }
            Err(e) => {
                warn!("配置 close-button NSPanel 失败，但不影响启动: {}", e);
            }
        }

        info!("close-button 配置完成，准备配置 main-content...");

        // 4. 配置 main-content 为 NSPanel（非阻塞，失败不影响启动）
        match self.main_content_window.setup_as_panel() {
            Ok(_) => {
                info!("main-content NSPanel 配置成功");
            }
            Err(e) => {
                warn!("配置 main-content NSPanel 失败，但不影响启动: {}", e);
            }
        }

        info!("main-content 配置完成，准备恢复焦点...");

        // 5. 最后确保焦点在 main-focus 窗口上（非阻塞）
        if let Err(e) = self.ensure_main_focus() {
            warn!("初始化时恢复 main-focus 焦点失败，但不影响启动: {}", e);
        }

        info!("窗口管理器初始化完成");
        Ok(())
    }

    /// 核心方法：确保焦点始终在 main-focus 窗口上
    /// 这是解决焦点切换问题的关键
    pub fn ensure_main_focus(&self) -> Result<(), String> {
        // 立即恢复焦点到 main-focus 窗口
        self.main_focus_window.ensure_focus()?;
        
        // 记录日志以便调试
        info!("🔥 强制恢复焦点到 main-focus 主焦点窗口");
        
        Ok(())
    }

    /// 创建主内容窗口（现在只是确保存在，因为窗口已在 tauri.conf.json 中定义）
    pub async fn create_main_content(&mut self) -> Result<(), String> {
        // 确保 main-focus 主焦点窗口存在
        if !self.main_focus_window.is_created() {
            self.main_focus_window.create().await?;
        }

        // 主内容窗口已在 tauri.conf.json 中定义，无需手动创建
        info!("主内容窗口已在配置中定义，无需手动创建");
        
        // 关键：确保焦点在 main-focus 窗口上
        self.ensure_main_focus()?;
        
        Ok(())
    }

    /// 显示主内容窗口
    pub fn show_main_content(&self) -> Result<(), String> {
        self.main_content_window.show()?;
        
        // 关键：主内容窗口显示后立即恢复焦点到 main-focus
        self.ensure_main_focus()?;
        
        Ok(())
    }

    /// 隐藏主内容窗口
    pub fn hide_main_content(&self) -> Result<(), String> {
        self.main_content_window.hide()?;
        
        // 确保焦点还是在 main-focus
        self.ensure_main_focus()?;
        
        Ok(())
    }

    /// 切换主内容窗口
    pub fn toggle_main_content(&self) -> Result<(), String> {
        self.main_content_window.toggle()?;
        
        // 关键：无论显示还是隐藏，都要确保焦点在 main-focus
        self.ensure_main_focus()?;
        
        Ok(())
    }

    /// 显示所有浮动窗口
    pub fn show_floating_windows(&self) -> Result<(), String> {
        let mut success_count = 0;
        let mut error_count = 0;

        // 显示 control-bar
        if let Err(e) = self.control_bar_window.show() {
            error!("显示 control-bar 失败: {}", e);
            error_count += 1;
        } else {
            success_count += 1;
        }

        // 显示 close-button
        if let Err(e) = self.close_button_window.show() {
            error!("显示 close-button 失败: {}", e);
            error_count += 1;
        } else {
            success_count += 1;
        }

        // 关键：显示浮动窗口后确保焦点在 main-focus
        self.ensure_main_focus()?;

        if error_count == 0 {
            info!("所有浮动窗口显示成功，成功: {}", success_count);
            Ok(())
        } else {
            warn!("部分浮动窗口显示失败，成功: {}, 失败: {}", success_count, error_count);
            Ok(()) // 不返回错误，允许部分成功
        }
    }

    /// 隐藏所有浮动窗口
    pub fn hide_floating_windows(&self) -> Result<(), String> {
        let mut success_count = 0;
        let mut error_count = 0;

        // 隐藏 control-bar
        if let Err(e) = self.control_bar_window.hide() {
            error!("隐藏 control-bar 失败: {}", e);
            error_count += 1;
        } else {
            success_count += 1;
        }

        // 隐藏 close-button
        if let Err(e) = self.close_button_window.hide() {
            error!("隐藏 close-button 失败: {}", e);
            error_count += 1;
        } else {
            success_count += 1;
        }

        // 即使隐藏了，焦点还是要在 main-focus
        self.ensure_main_focus()?;

        if error_count == 0 {
            info!("所有浮动窗口隐藏成功，成功: {}", success_count);
            Ok(())
        } else {
            warn!("部分浮动窗口隐藏失败，成功: {}, 失败: {}", success_count, error_count);
            Ok(()) // 不返回错误，允许部分成功
        }
    }

    /// 切换浮动窗口显示状态
    pub fn toggle_floating_windows(&self) -> Result<(), String> {
        // 检查 control-bar 的可见性作为参考
        if let Some(window) = self.app_handle.get_webview_window("control-bar") {
            match window.is_visible() {
                Ok(is_visible) => {
                    if is_visible {
                        self.hide_floating_windows()
                    } else {
                        self.show_floating_windows()
                    }
                }
                Err(e) => {
                    error!("获取浮动窗口状态失败: {}", e);
                    Err(format!("获取浮动窗口状态失败: {}", e))
                }
            }
        } else {
            Err("control-bar 窗口不存在".to_string())
        }
    }

}