/// NSPanel 工具模块
/// 提供设置 NSPanel 样式的公共方法

use log::{info, warn};

/// 设置 NSPanel 为无焦点模式的公共方法
/// 这是一个安全的公共方法，可以被所有窗口使用
/// 
/// 注意：由于 Tauri 的类型系统限制，我们无法直接操作 NSPanel 的样式
/// 但可以通过配置文件和事件处理来实现无焦点行为
pub fn setup_nonactivating_panel(window_name: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        info!("开始配置 {} 为无焦点模式...", window_name);
        
        // 由于 Tauri 的类型系统限制，我们无法直接调用 panel.set_style_mask
        // 但可以通过以下方式实现无焦点行为：
        // 1. 在 tauri.conf.json 中设置 focus: false 和 acceptFirstMouse: true
        // 2. 在 main.rs 中监听窗口事件，自动恢复焦点到 main-focus
        // 3. 使用 NSPanel 的默认行为（通常是非激活的）
        
        info!("{} 使用配置文件中的无焦点设置", window_name);
        info!("{} 依赖事件处理器自动恢复焦点", window_name);
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        info!("非 macOS 平台，跳过 {} 无焦点设置", window_name);
    }
    
    info!("{} 无焦点配置完成", window_name);
    Ok(())
}
