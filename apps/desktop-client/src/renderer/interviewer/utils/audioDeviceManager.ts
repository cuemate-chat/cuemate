/**
 * ============================================================================
 * 音频设备管理器 - audioDeviceManager
 * ============================================================================
 *
 * 提供音频设备管理的公共逻辑，供模拟面试和面试训练共用。
 *
 * 【功能】
 * 1. 获取系统音频设备列表
 * 2. 加载/保存默认设备配置
 * 3. 设备切换
 *
 * ============================================================================
 */

import { logger } from '../../../utils/rendererLogger.js';

// ============================================================================
// 类型定义
// ============================================================================

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface AudioDevices {
  microphones: AudioDevice[];
  speakers: AudioDevice[];
}

export interface DefaultDevices {
  microphoneId?: string;
  speakerId?: string;
}

// ============================================================================
// 公共函数
// ============================================================================

/**
 * 获取系统音频设备列表
 */
export async function getAudioDevices(): Promise<AudioDevices> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const microphones = devices
      .filter(device => device.kind === 'audioinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `麦克风 ${device.deviceId.slice(0, 4)}`
      }));

    const speakers = devices
      .filter(device => device.kind === 'audiooutput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `扬声器 ${device.deviceId.slice(0, 4)}`
      }));

    return { microphones, speakers };
  } catch (error) {
    await logger.error(`[音频设备] 获取设备列表失败: ${error}`);
    return { microphones: [], speakers: [] };
  }
}

/**
 * 获取保存的默认设备配置
 */
export async function getDefaultDevices(): Promise<DefaultDevices> {
  try {
    const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
    const res = await api?.asrConfig?.get?.();
    const cfg = res?.config;

    if (cfg) {
      return {
        microphoneId: cfg.microphone_device_id,
        speakerId: cfg.speaker_device_id
      };
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * 保存麦克风设备配置
 */
export async function saveMicrophoneDevice(deviceId: string, deviceName: string): Promise<void> {
  try {
    const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
    await api?.asrConfig?.updateDevices?.({
      microphone_device_id: deviceId,
      microphone_device_name: deviceName,
    });
  } catch (error) {
    await logger.error(`[音频设备] 保存麦克风配置失败: ${error}`);
  }
}

/**
 * 保存扬声器设备配置
 */
export async function saveSpeakerDevice(deviceId: string, deviceName: string): Promise<void> {
  try {
    const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
    await api?.asrConfig?.updateDevices?.({
      speaker_device_id: deviceId,
      speaker_device_name: deviceName,
    });
  } catch (error) {
    await logger.error(`[音频设备] 保存扬声器配置失败: ${error}`);
  }
}

/**
 * 加载音频设备并选择默认设备
 */
export async function loadAudioDevicesWithDefaults(): Promise<{
  devices: AudioDevices;
  selectedMic: string;
  selectedSpeaker: string;
}> {
  const devices = await getAudioDevices();
  const defaults = await getDefaultDevices();

  let selectedMic = '';
  let selectedSpeaker = '';

  // 选择麦克风
  if (devices.microphones.length > 0) {
    const exists = defaults.microphoneId && devices.microphones.some(d => d.deviceId === defaults.microphoneId);
    selectedMic = exists && defaults.microphoneId ? defaults.microphoneId : devices.microphones[0].deviceId;
  }

  // 选择扬声器
  if (devices.speakers.length > 0) {
    const exists = defaults.speakerId && devices.speakers.some(d => d.deviceId === defaults.speakerId);
    selectedSpeaker = exists && defaults.speakerId ? defaults.speakerId : devices.speakers[0].deviceId;
  }

  return {
    devices,
    selectedMic,
    selectedSpeaker
  };
}
