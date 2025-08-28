use crate::audio::{AudioConfig, AudioDevice, virtual_driver::VirtualAudioDriverInstaller};
use crate::AppState;
use log::{debug, error, info};
use tauri::State;

/// 获取所有音频设备
#[tauri::command]
pub async fn get_audio_devices(state: State<'_, AppState>) -> Result<Vec<AudioDevice>, String> {
    debug!("获取音频设备列表");
    
    match state.device_manager.get_all_devices() {
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
pub async fn get_virtual_devices(state: State<'_, AppState>) -> Result<Vec<AudioDevice>, String> {
    debug!("获取虚拟音频设备列表");
    
    match state.device_manager.get_virtual_devices() {
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

/// 检查虚拟音频驱动是否已安装
#[tauri::command]
pub async fn check_virtual_driver(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    debug!("检查虚拟音频驱动");
    
    let installed_drivers = VirtualAudioDriverInstaller::detect_installed_drivers();
    let has_virtual_device = state.device_manager.has_virtual_audio_driver();
    
    info!("已安装的驱动: {:?}", installed_drivers);
    info!("检测到虚拟设备: {}", has_virtual_device);
    
    Ok(installed_drivers)
}

/// 安装虚拟音频驱动
#[tauri::command]
pub async fn install_virtual_driver() -> Result<String, String> {
    info!("开始安装虚拟音频驱动");
    
    match VirtualAudioDriverInstaller::ensure_virtual_driver_installed().await {
        Ok(driver_name) => {
            info!("虚拟音频驱动安装完成: {}", driver_name);
            Ok(driver_name)
        }
        Err(e) => {
            error!("虚拟音频驱动安装失败: {}", e);
            Err(format!("安装失败: {}", e))
        }
    }
}

/// 设置 WebSocket 连接地址
#[tauri::command]
pub async fn set_websocket_url(
    url: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("设置 WebSocket 地址: {}", url);
    
    let mut audio_capture = state.audio_capture.lock().await;
    audio_capture.set_websocket_url(url);
    
    Ok(())
}

/// 设置音频配置
#[tauri::command]
pub async fn set_audio_config(
    config: AudioConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("设置音频配置: {:?}", config);
    
    let mut audio_capture = state.audio_capture.lock().await;
    audio_capture.set_audio_config(config);
    
    Ok(())
}

/// 开始音频捕获
#[tauri::command]
pub async fn start_audio_capture(
    device_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("开始音频捕获，设备: {}", device_name);
    
    let mut audio_capture = state.audio_capture.lock().await;
    
    match audio_capture.start_capture(&device_name).await {
        Ok(()) => {
            info!("音频捕获已启动");
            Ok(())
        }
        Err(e) => {
            error!("启动音频捕获失败: {}", e);
            Err(format!("启动音频捕获失败: {}", e))
        }
    }
}

/// 停止音频捕获
#[tauri::command]
pub async fn stop_audio_capture(state: State<'_, AppState>) -> Result<(), String> {
    info!("停止音频捕获");
    
    let mut audio_capture = state.audio_capture.lock().await;
    
    match audio_capture.stop_capture().await {
        Ok(()) => {
            info!("音频捕获已停止");
            Ok(())
        }
        Err(e) => {
            error!("停止音频捕获失败: {}", e);
            Err(format!("停止音频捕获失败: {}", e))
        }
    }
}

/// 检查是否正在捕获
#[tauri::command]
pub async fn is_capturing(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_capture = state.audio_capture.lock().await;
    let capturing = audio_capture.is_capturing();
    
    debug!("当前捕获状态: {}", capturing);
    Ok(capturing)
}