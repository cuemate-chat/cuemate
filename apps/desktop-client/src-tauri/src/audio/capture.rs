use cpal::traits::*;
use cpal::{Device, Stream, StreamConfig};
use futures_util::{SinkExt, StreamExt};
use log::{debug, error, info, warn};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

use super::{device_manager::AudioDeviceManager, AudioConfig, Result};

pub struct AudioCapture {
    device_manager: AudioDeviceManager,
    stream: Option<Stream>,
    audio_tx: Option<mpsc::UnboundedSender<Vec<u8>>>,
    websocket_url: Option<String>,
    config: AudioConfig,
}

impl AudioCapture {
    pub fn new() -> Self {
        Self {
            device_manager: AudioDeviceManager::new(),
            stream: None,
            audio_tx: None,
            websocket_url: None,
            config: AudioConfig::default(),
        }
    }

    /// 设置 WebSocket 连接地址
    pub fn set_websocket_url(&mut self, url: String) {
        info!("设置 WebSocket 地址: {}", url);
        self.websocket_url = Some(url);
    }

    /// 设置音频配置
    pub fn set_audio_config(&mut self, config: AudioConfig) {
        self.config = config;
        info!("更新音频配置: {:?}", self.config);
    }

    /// 开始音频捕获
    pub async fn start_capture(&mut self, device_name: &str) -> Result<()> {
        info!("开始音频捕获，设备: {}", device_name);

        // 停止当前的捕获
        self.stop_capture().await?;

        // 获取输入设备
        let device = self.device_manager.get_input_device_by_name(device_name)?;
        
        // 获取设备配置
        let supported_config = device.default_input_config()?;
        let sample_rate = supported_config.sample_rate().0;
        let channels = supported_config.channels();
        
        info!(
            "设备配置 - 采样率: {}Hz, 声道: {}, 格式: {:?}",
            sample_rate,
            channels,
            supported_config.sample_format()
        );

        // 创建流配置
        let stream_config = StreamConfig {
            channels,
            sample_rate: cpal::SampleRate(self.config.sample_rate),
            buffer_size: cpal::BufferSize::Fixed(self.config.buffer_size),
        };

        // 创建音频数据通道
        let (audio_tx, audio_rx) = mpsc::unbounded_channel::<Vec<u8>>();
        self.audio_tx = Some(audio_tx.clone());

        // 启动 WebSocket 连接任务
        if let Some(websocket_url) = &self.websocket_url {
            let websocket_url = websocket_url.clone();
            tokio::spawn(async move {
                if let Err(e) = Self::websocket_task(websocket_url, audio_rx).await {
                    error!("WebSocket 连接失败: {}", e);
                }
            });
        }

        // 创建音频流
        let stream = device.build_input_stream(
            &stream_config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                // 转换音频数据格式
                let audio_data = Self::convert_audio_data(data, sample_rate, channels as u32);
                
                // 发送到 WebSocket
                if let Err(e) = audio_tx.send(audio_data) {
                    error!("发送音频数据失败: {}", e);
                }
            },
            move |err| {
                error!("音频流错误: {}", err);
            },
            None,
        )?;

        // 开始播放流
        stream.play()?;
        self.stream = Some(stream);

        info!("音频捕获已开始");
        Ok(())
    }

    /// 停止音频捕获
    pub async fn stop_capture(&mut self) -> Result<()> {
        if let Some(stream) = self.stream.take() {
            drop(stream);
            info!("音频流已停止");
        }

        if let Some(audio_tx) = self.audio_tx.take() {
            drop(audio_tx);
            debug!("音频数据通道已关闭");
        }

        Ok(())
    }

    /// 检查是否正在捕获
    pub fn is_capturing(&self) -> bool {
        self.stream.is_some()
    }

    /// WebSocket 连接任务
    async fn websocket_task(
        websocket_url: String,
        mut audio_rx: mpsc::UnboundedReceiver<Vec<u8>>,
    ) -> Result<()> {
        info!("连接到 WebSocket: {}", websocket_url);

        let url = if websocket_url.ends_with("/asr") {
            websocket_url
        } else {
            format!("{}/asr", websocket_url)
        };

        // 建立 WebSocket 连接
        let (ws_stream, response) = connect_async(&url).await?;
        info!("WebSocket 连接成功: {}", response.status());

        let (mut ws_sink, mut ws_stream) = ws_stream.split();

        // 处理音频数据发送
        let send_task = tokio::spawn(async move {
            while let Some(audio_data) = audio_rx.recv().await {
                if let Err(e) = ws_sink.send(Message::Binary(audio_data)).await {
                    error!("发送音频数据到 WebSocket 失败: {}", e);
                    break;
                }
            }
        });

        // 处理 WebSocket 响应
        let recv_task = tokio::spawn(async move {
            while let Some(msg) = ws_stream.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        debug!("收到转录结果: {}", text);
                        // TODO: 将结果发送到前端
                    }
                    Ok(Message::Binary(data)) => {
                        debug!("收到二进制数据: {} bytes", data.len());
                    }
                    Ok(Message::Close(_)) => {
                        info!("WebSocket 连接已关闭");
                        break;
                    }
                    Err(e) => {
                        error!("WebSocket 接收错误: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        // 等待任何一个任务完成
        tokio::select! {
            _ = send_task => {
                info!("音频发送任务结束");
            }
            _ = recv_task => {
                info!("WebSocket 接收任务结束");
            }
        }

        Ok(())
    }

    /// 转换音频数据格式
    fn convert_audio_data(data: &[f32], sample_rate: u32, channels: u32) -> Vec<u8> {
        // 如果需要降采样到 16kHz
        let target_sample_rate = 16000u32;
        let data = if sample_rate != target_sample_rate {
            Self::resample_audio(data, sample_rate, target_sample_rate, channels)
        } else {
            data.to_vec()
        };

        // 转换为单声道 (如果是多声道)
        let data = if channels > 1 {
            Self::convert_to_mono(&data, channels)
        } else {
            data
        };

        // 转换为 16-bit PCM
        Self::f32_to_i16_pcm(&data)
    }

    /// 重采样音频
    fn resample_audio(data: &[f32], from_rate: u32, to_rate: u32, channels: u32) -> Vec<f32> {
        if from_rate == to_rate {
            return data.to_vec();
        }

        let ratio = from_rate as f64 / to_rate as f64;
        let output_len = (data.len() as f64 / ratio) as usize;
        let mut output = Vec::with_capacity(output_len);

        for i in 0..output_len / channels as usize {
            let src_index = (i as f64 * ratio) as usize * channels as usize;
            
            for ch in 0..channels as usize {
                if src_index + ch < data.len() {
                    output.push(data[src_index + ch]);
                } else {
                    output.push(0.0);
                }
            }
        }

        output
    }

    /// 转换为单声道
    fn convert_to_mono(data: &[f32], channels: u32) -> Vec<f32> {
        if channels == 1 {
            return data.to_vec();
        }

        let samples_per_channel = data.len() / channels as usize;
        let mut mono_data = Vec::with_capacity(samples_per_channel);

        for i in 0..samples_per_channel {
            let mut sum = 0.0f32;
            for ch in 0..channels as usize {
                let index = i * channels as usize + ch;
                if index < data.len() {
                    sum += data[index];
                }
            }
            mono_data.push(sum / channels as f32);
        }

        mono_data
    }

    /// 转换 f32 到 16-bit PCM
    fn f32_to_i16_pcm(data: &[f32]) -> Vec<u8> {
        let mut pcm_data = Vec::with_capacity(data.len() * 2);
        
        for sample in data {
            // 限制范围到 [-1.0, 1.0]
            let sample = sample.max(-1.0).min(1.0);
            // 转换为 16-bit 整数
            let sample_i16 = (sample * 32767.0) as i16;
            // 转换为小端字节序
            let bytes = sample_i16.to_le_bytes();
            pcm_data.extend_from_slice(&bytes);
        }

        pcm_data
    }
}

impl Default for AudioCapture {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for AudioCapture {
    fn drop(&mut self) {
        if let Some(stream) = self.stream.take() {
            drop(stream);
        }
    }
}