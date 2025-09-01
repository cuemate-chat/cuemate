/// 窗口管理模块
/// 统一管理所有窗口的创建、配置和生命周期

pub mod main_focus_window;
pub mod control_bar_window;
pub mod close_button_window;
pub mod main_content_window;
pub mod window_manager;
pub mod panel_utils;

pub use window_manager::WindowManager;