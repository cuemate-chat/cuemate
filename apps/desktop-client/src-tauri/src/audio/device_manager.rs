use cpal::traits::*;
use cpal::{Device, Host};
use log::{debug, warn};

use super::{AudioDevice, DeviceType, Result};

pub struct AudioDeviceManager {
    host: Host,
}

impl AudioDeviceManager {
    pub fn new() -> Self {
        let host = cpal::default_host();
        debug!("音频主机初始化完成: {}", host.id().name());
        Self { host }
    }

    /// 获取所有可用的音频设备
    pub fn get_all_devices(&self) -> Result<Vec<AudioDevice>> {
        let mut devices = Vec::new();

        // 获取输入设备
        match self.host.input_devices() {
            Ok(input_devices) => {
                for device in input_devices {
                    if let Ok(name) = device.name() {
                        devices.push(AudioDevice {
                            id: format!("input_{}", name),
                            name: name.clone(),
                            device_type: DeviceType::Input,
                            is_virtual: self.is_virtual_device(&name),
                            is_default: self.is_default_input(&device),
                        });
                    }
                }
            }
            Err(e) => warn!("无法获取输入设备: {}", e),
        }

        // 获取输出设备
        match self.host.output_devices() {
            Ok(output_devices) => {
                for device in output_devices {
                    if let Ok(name) = device.name() {
                        devices.push(AudioDevice {
                            id: format!("output_{}", name),
                            name: name.clone(),
                            device_type: DeviceType::Output,
                            is_virtual: self.is_virtual_device(&name),
                            is_default: self.is_default_output(&device),
                        });
                    }
                }
            }
            Err(e) => warn!("无法获取输出设备: {}", e),
        }

        debug!("找到 {} 个音频设备", devices.len());
        Ok(devices)
    }

    /// 检测是否为虚拟音频设备
    fn is_virtual_device(&self, name: &str) -> bool {
        let virtual_keywords = [
            "VB-Cable",       // VB-Audio Cable (Windows)
            "CABLE Output",   // VB-Audio Cable (Windows)
            "CABLE Input",    // VB-Audio Cable (Windows)
            "BlackHole",      // BlackHole (macOS)
            "virtual",        // 通用虚拟设备标识
            "loopback",       // 回环设备
            "monitor",        // PulseAudio monitor (Linux)
        ];

        virtual_keywords
            .iter()
            .any(|keyword| name.to_lowercase().contains(&keyword.to_lowercase()))
    }

    /// 检查是否为默认输入设备
    fn is_default_input(&self, device: &Device) -> bool {
        if let Ok(default_device) = self.host.default_input_device() {
            if let (Ok(name1), Ok(name2)) = (device.name(), default_device.name()) {
                return name1 == name2;
            }
        }
        false
    }

    /// 检查是否为默认输出设备
    fn is_default_output(&self, device: &Device) -> bool {
        if let Ok(default_device) = self.host.default_output_device() {
            if let (Ok(name1), Ok(name2)) = (device.name(), default_device.name()) {
                return name1 == name2;
            }
        }
        false
    }

    /// 根据名称获取输入设备
    pub fn get_input_device_by_name(&self, name: &str) -> Result<Device> {
        let devices = self.host.input_devices()?;
        for device in devices {
            if let Ok(device_name) = device.name() {
                if device_name == name {
                    debug!("找到输入设备: {}", name);
                    return Ok(device);
                }
            }
        }
        Err(format!("找不到输入设备: {}", name).into())
    }

    /// 获取虚拟音频设备列表
    pub fn get_virtual_devices(&self) -> Result<Vec<AudioDevice>> {
        let all_devices = self.get_all_devices()?;
        Ok(all_devices
            .into_iter()
            .filter(|device| device.is_virtual)
            .collect())
    }

    /// 检测是否已安装虚拟音频设备
    pub fn has_virtual_audio_driver(&self) -> bool {
        match self.get_virtual_devices() {
            Ok(devices) => !devices.is_empty(),
            Err(_) => false,
        }
    }
}

impl Default for AudioDeviceManager {
    fn default() -> Self {
        Self::new()
    }
}