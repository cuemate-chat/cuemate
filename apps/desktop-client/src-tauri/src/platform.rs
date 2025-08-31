/// 平台判断公共逻辑模块
/// 统一处理跨平台差异，供后续功能复用

use log::info;

/// 当前运行平台枚举
#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum Platform {
    MacOS,
    Windows,
    Linux,
}

/// 获取当前运行平台
pub fn get_current_platform() -> Platform {
    #[cfg(target_os = "macos")]
    return Platform::MacOS;
    
    #[cfg(target_os = "windows")]
    return Platform::Windows;
    
    #[cfg(target_os = "linux")]
    return Platform::Linux;
    
    // 兜底，虽然不太可能走到这里
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return Platform::Linux;
}


/// 打印当前平台信息
pub fn log_platform_info() {
    let platform = get_current_platform();
    info!("当前运行平台: {:?}", platform);
    
    match platform {
        Platform::MacOS => {
            info!("macOS 平台特性:");
            info!("  - 支持 NSPanel 和 NSWindow");
            info!("  - 支持 Cocoa 原生窗口操作");
            info!("  - 支持多桌面空间");
        }
        Platform::Windows => {
            info!("Windows 平台特性:");
            info!("  - 支持 Win32 窗口操作");
            info!("  - 支持系统任务栏集成");
            info!("  - 支持 DWM 合成窗口管理器");
        }
        Platform::Linux => {
            info!("Linux 平台特性:");
            info!("  - 支持 X11/Wayland 窗口系统");
            info!("  - 支持多种窗口管理器");
            info!("  - 支持桌面环境集成");
        }
    }
}

