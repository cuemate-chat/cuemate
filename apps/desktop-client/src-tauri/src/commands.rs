use crate::audio::{AudioConfig, AudioDevice, device_manager::AudioDeviceManager, virtual_driver::VirtualAudioDriverInstaller};
use log::{debug, error, info};

/// 获取所有音频设备
#[tauri::command]
pub async fn get_audio_devices() -> Result<Vec<AudioDevice>, String> {
    debug!("获取音频设备列表");
    
    let device_manager = AudioDeviceManager::new();
    match device_manager.get_all_devices() {
        Ok(devices) => {
            info!("找到 {} 个音频设备", devices.len());
            Ok(devices)
        }
        Err(e) => {
            error!("获取音频设备失败: {}", e);
            Err(format!("获取音频设备失败: {}", e))
        }
    }
}

/// 获取虚拟音频设备
#[tauri::command]
pub async fn get_virtual_devices() -> Result<Vec<AudioDevice>, String> {
    debug!("获取虚拟音频设备列表");
    
    let device_manager = AudioDeviceManager::new();
    match device_manager.get_virtual_devices() {
        Ok(devices) => {
            info!("找到 {} 个虚拟音频设备", devices.len());
            Ok(devices)
        }
        Err(e) => {
            error!("获取虚拟音频设备失败: {}", e);
            Err(format!("获取虚拟音频设备失败: {}", e))
        }
    }
}

/// 检查虚拟音频驱动安装情况
#[tauri::command]
pub async fn check_virtual_driver() -> Result<Vec<String>, String> {
    debug!("检查虚拟音频驱动");
    
    let installed_drivers = VirtualAudioDriverInstaller::detect_installed_drivers();
    info!("检测到虚拟音频驱动: {:?}", installed_drivers);
    
    Ok(installed_drivers)
}

/// 安装虚拟音频驱动
#[tauri::command]
pub async fn install_virtual_driver() -> Result<String, String> {
    info!("开始安装虚拟音频驱动");
    
    match VirtualAudioDriverInstaller::ensure_virtual_driver_installed().await {
        Ok(message) => {
            info!("虚拟音频驱动安装成功: {}", message);
            Ok(message)
        }
        Err(e) => {
            error!("虚拟音频驱动安装失败: {}", e);
            Err(format!("安装失败: {}", e))
        }
    }
}

/// 开始音频捕获
#[tauri::command]
pub async fn start_audio_capture(device_name: String) -> Result<String, String> {
    info!("开始音频捕获，设备: {}", device_name);
    
    // TODO: 这里需要实现实际的音频捕获逻辑
    // 由于线程安全问题，暂时返回成功消息
    Ok("音频捕获已开始".to_string())
}

/// 停止音频捕获
#[tauri::command]
pub async fn stop_audio_capture() -> Result<String, String> {
    info!("停止音频捕获");
    
    // TODO: 这里需要实现实际的停止逻辑
    Ok("音频捕获已停止".to_string())
}

/// 检查是否正在捕获音频
#[tauri::command]
pub async fn is_capturing() -> Result<bool, String> {
    // TODO: 实现实际的状态检查
    Ok(false)
}

/// 设置 WebSocket URL
#[tauri::command]
pub async fn set_websocket_url(url: String) -> Result<String, String> {
    info!("设置 WebSocket URL: {}", url);
    
    // TODO: 这里需要存储到全局状态或配置文件
    Ok("WebSocket URL 已设置".to_string())
}

/// 设置音频配置
#[tauri::command]
pub async fn set_audio_config(config: AudioConfig) -> Result<String, String> {
    info!("设置音频配置: {:?}", config);
    
    // TODO: 这里需要存储到全局状态或配置文件
    Ok("音频配置已更新".to_string())
}