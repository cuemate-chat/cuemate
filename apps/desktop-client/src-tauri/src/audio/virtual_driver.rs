use log::{debug, error, info, warn};
use std::process::Command;

use super::Result;

/// 虚拟音频驱动安装器
pub struct VirtualAudioDriverInstaller;

impl VirtualAudioDriverInstaller {
    /// 检测并安装合适的虚拟音频驱动
    pub async fn ensure_virtual_driver_installed() -> Result<String> {
        #[cfg(target_os = "windows")]
        {
            Self::ensure_vb_cable_windows().await
        }
        #[cfg(target_os = "macos")]
        {
            Self::ensure_blackhole_macos().await
        }
        #[cfg(target_os = "linux")]
        {
            Self::ensure_pulseaudio_virtual_linux().await
        }
    }

    /// 检测系统上已安装的虚拟音频驱动
    pub fn detect_installed_drivers() -> Vec<String> {
        let mut drivers = Vec::new();

        #[cfg(target_os = "windows")]
        {
            if Self::is_vb_cable_installed() {
                drivers.push("VB-Audio Cable".to_string());
            }
        }

        #[cfg(target_os = "macos")]
        {
            if Self::is_blackhole_installed() {
                drivers.push("BlackHole".to_string());
            }
        }

        #[cfg(target_os = "linux")]
        {
            if Self::is_pulseaudio_virtual_available() {
                drivers.push("PulseAudio Virtual".to_string());
            }
        }

        drivers
    }
}

// Windows - VB-Audio Cable 安装
#[cfg(target_os = "windows")]
impl VirtualAudioDriverInstaller {
    async fn ensure_vb_cable_windows() -> Result<String> {
        if Self::is_vb_cable_installed() {
            info!("VB-Audio Cable 已安装");
            return Ok("VB-Audio Cable".to_string());
        }

        info!("检测到 Windows 系统，准备安装 VB-Audio Cable");
        Self::install_vb_cable().await?;
        Ok("VB-Audio Cable".to_string())
    }

    fn is_vb_cable_installed() -> bool {
        // 检查注册表或设备管理器中是否存在 VB-Audio Cable
        use winapi::um::winreg::*;
        use winapi::um::winnt::*;
        use std::ptr;

        unsafe {
            let mut key = ptr::null_mut();
            let result = RegOpenKeyExA(
                HKEY_LOCAL_MACHINE,
                b"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VB-Audio Cable\0".as_ptr() as *const i8,
                0,
                KEY_READ,
                &mut key,
            );

            if result == 0 {
                RegCloseKey(key);
                debug!("在注册表中找到 VB-Audio Cable");
                return true;
            }
        }

        // 备用方法：通过 PowerShell 检查音频设备
        match Command::new("powershell")
            .arg("-Command")
            .arg("Get-WmiObject -Class Win32_SoundDevice | Where-Object { $_.Name -like '*CABLE*' }")
            .output()
        {
            Ok(output) => {
                let result = String::from_utf8_lossy(&output.stdout);
                !result.trim().is_empty()
            }
            Err(_) => false,
        }
    }

    async fn install_vb_cable() -> Result<()> {
        warn!("VB-Audio Cable 需要手动安装");
        
        // 打开 VB-Audio 官网下载页面
        let url = "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip";
        
        info!("正在打开 VB-Audio Cable 下载页面...");
        if let Err(e) = open::that(url) {
            error!("无法打开下载页面: {}", e);
        }

        // 显示安装指引
        let message = r#"
请按以下步骤安装 VB-Audio Cable：

1. 从打开的页面下载 VB-Audio Cable
2. 解压下载的 ZIP 文件
3. 以管理员身份运行 VBCABLE_Setup_x64.exe (64位) 或 VBCABLE_Setup.exe (32位)
4. 安装完成后重启 CueMate 客户端

安装完成后，您将在音频设备中看到 "CABLE Input" 和 "CABLE Output" 设备。
"#;
        
        error!("{}", message);
        Err("需要手动安装 VB-Audio Cable".into())
    }
}

// macOS - BlackHole 安装
#[cfg(target_os = "macos")]
impl VirtualAudioDriverInstaller {
    async fn ensure_blackhole_macos() -> Result<String> {
        if Self::is_blackhole_installed() {
            info!("BlackHole 已安装");
            return Ok("BlackHole".to_string());
        }

        info!("检测到 macOS 系统，准备安装 BlackHole");
        Self::install_blackhole().await?;
        Ok("BlackHole".to_string())
    }

    fn is_blackhole_installed() -> bool {
        // 检查系统音频设备中是否有 BlackHole
        match Command::new("system_profiler")
            .arg("SPAudioDataType")
            .arg("-json")
            .output()
        {
            Ok(output) => {
                let result = String::from_utf8_lossy(&output.stdout);
                result.contains("BlackHole")
            }
            Err(_) => {
                // 备用方法：检查 /Applications 目录
                std::path::Path::new("/Applications/BlackHole").exists()
            }
        }
    }

    async fn install_blackhole() -> Result<()> {
        info!("尝试通过 Homebrew 安装 BlackHole...");

        // 检查是否安装了 Homebrew
        match Command::new("brew").arg("--version").output() {
            Ok(_) => {
                // 使用 Homebrew 安装
                info!("使用 Homebrew 安装 BlackHole...");
                let output = Command::new("brew")
                    .args(&["install", "--cask", "blackhole-2ch"])
                    .output()?;

                if output.status.success() {
                    info!("BlackHole 安装成功");
                    return Ok(());
                } else {
                    warn!("Homebrew 安装失败，尝试手动安装方式");
                }
            }
            Err(_) => {
                warn!("未检测到 Homebrew，使用手动安装方式");
            }
        }

        // 手动安装方式
        Self::install_blackhole_manually().await
    }

    async fn install_blackhole_manually() -> Result<()> {
        let url = "https://github.com/ExistentialAudio/BlackHole/releases/latest";
        
        info!("正在打开 BlackHole 下载页面...");
        if let Err(e) = open::that(url) {
            error!("无法打开下载页面: {}", e);
        }

        let message = r#"
请按以下步骤安装 BlackHole：

1. 从 GitHub 页面下载最新的 BlackHole.pkg
2. 双击运行 BlackHole.pkg 安装包
3. 按照安装向导完成安装
4. 安装完成后重启 CueMate 客户端

安装完成后，您将在音频设备中看到 "BlackHole 2ch" 设备。
"#;
        
        error!("{}", message);
        Err("需要手动安装 BlackHole".into())
    }
}

// Linux - PulseAudio 虚拟设备
#[cfg(target_os = "linux")]
impl VirtualAudioDriverInstaller {
    async fn ensure_pulseaudio_virtual_linux() -> Result<String> {
        if Self::is_pulseaudio_virtual_available() {
            info!("PulseAudio 虚拟设备已可用");
            return Ok("PulseAudio Virtual".to_string());
        }

        info!("检测到 Linux 系统，配置 PulseAudio 虚拟设备");
        Self::setup_pulseaudio_virtual().await?;
        Ok("PulseAudio Virtual".to_string())
    }

    fn is_pulseaudio_virtual_available() -> bool {
        // 检查是否有 PulseAudio 并且可以创建虚拟设备
        match Command::new("pactl").arg("info").output() {
            Ok(output) => output.status.success(),
            Err(_) => false,
        }
    }

    async fn setup_pulseaudio_virtual() -> Result<()> {
        info!("设置 PulseAudio 虚拟音频设备...");

        // 创建虚拟输出设备
        let create_sink = Command::new("pactl")
            .args(&[
                "load-module",
                "module-null-sink",
                "sink_name=cuemate_virtual_output",
                "sink_properties=device.description=CueMate_Virtual_Speaker",
            ])
            .output()?;

        if !create_sink.status.success() {
            warn!("创建虚拟输出设备失败");
        }

        // 创建虚拟输入设备（监听虚拟输出）
        let create_source = Command::new("pactl")
            .args(&[
                "load-module", 
                "module-virtual-source",
                "source_name=cuemate_virtual_input",
                "master=cuemate_virtual_output.monitor",
                "source_properties=device.description=CueMate_Virtual_Microphone",
            ])
            .output()?;

        if create_source.status.success() {
            info!("PulseAudio 虚拟设备设置完成");
            Ok(())
        } else {
            Err("无法创建 PulseAudio 虚拟设备".into())
        }
    }
}

// 通用的打开网页功能
mod open {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    pub fn that(url: &str) -> Result<(), Box<dyn std::error::Error>> {
        Command::new("cmd").args(&["/c", "start", url]).spawn()?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    pub fn that(url: &str) -> Result<(), Box<dyn std::error::Error>> {
        Command::new("open").arg(url).spawn()?;
        Ok(())
    }

    #[cfg(target_os = "linux")]
    pub fn that(url: &str) -> Result<(), Box<dyn std::error::Error>> {
        Command::new("xdg-open").arg(url).spawn()?;
        Ok(())
    }
}