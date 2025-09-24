#!/usr/bin/env python3
"""
Piper TTS Wrapper for Electron
一个用于 Electron 应用的 Piper TTS 封装脚本，支持实时语音播放
"""
import argparse
import sys
import os
import platform
import tempfile
import subprocess
from pathlib import Path
from piper import PiperVoice
from piper.config import SynthesisConfig
import wave

def play_audio(audio_data, sample_rate=22050):
    """跨平台播放音频数据"""
    # 创建临时WAV文件
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
        tmp_path = tmp_file.name

        # 写入WAV数据
        with wave.open(tmp_path, 'wb') as wav_file:
            wav_file.setnchannels(1)  # 单声道
            wav_file.setsampwidth(2)  # 16位
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data)

    try:
        # 根据平台选择播放器
        system = platform.system()

        if system == "Darwin":  # macOS
            subprocess.run(['afplay', tmp_path], check=True)
        elif system == "Windows":
            # Windows PowerShell 播放
            subprocess.run([
                'powershell', '-Command',
                f'(New-Object System.Media.SoundPlayer "{tmp_path}").PlaySync()'
            ], check=True)
        else:  # Linux
            # 尝试多个Linux音频播放器
            players = ['aplay', 'paplay', 'play', 'ffplay']
            for player in players:
                try:
                    subprocess.run([player, tmp_path], check=True)
                    break
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
            else:
                raise RuntimeError("没有找到可用的音频播放器")

    finally:
        # 清理临时文件
        try:
            os.unlink(tmp_path)
        except:
            pass

def main():
    parser = argparse.ArgumentParser(description='Piper TTS Wrapper for Electron')
    parser.add_argument('-m', '--model', required=True, help='Path to Onnx model file')
    parser.add_argument('-f', '--output-file', help='Path to output WAV file')
    parser.add_argument('--output-raw', action='store_true', help='Stream raw audio to stdout')
    parser.add_argument('--play', action='store_true', help='Play audio directly (default)')
    parser.add_argument('--length-scale', type=float, default=1.0, help='Phoneme length')
    parser.add_argument('text', nargs='?', help='Text to synthesize (from command line or stdin)')

    args = parser.parse_args()

    # 获取输入文本
    if args.text:
        text = args.text
    else:
        text = sys.stdin.read().strip()

    if not text:
        print("错误: 没有提供要合成的文本", file=sys.stderr)
        return 1

    # 检查模型文件
    if not os.path.exists(args.model):
        print(f"错误: 模型文件不存在: {args.model}", file=sys.stderr)
        return 1

    try:
        # 加载语音模型
        voice = PiperVoice.load(args.model)

        # 配置合成参数
        syn_config = SynthesisConfig(length_scale=args.length_scale)

        # 合成语音
        audio_chunks = []
        for audio_chunk in voice.synthesize(text, syn_config):
            audio_chunks.append(audio_chunk.audio_int16_bytes)

        # 合并音频数据
        audio_data = b''.join(audio_chunks)

        if args.output_raw:
            # 输出原始PCM数据到stdout
            sys.stdout.buffer.write(audio_data)
        elif args.output_file:
            # 保存为WAV文件
            with wave.open(args.output_file, 'wb') as wav_file:
                wav_file.setnchannels(1)  # 单声道
                wav_file.setsampwidth(2)  # 16位
                wav_file.setframerate(voice.config.sample_rate)
                wav_file.writeframes(audio_data)
            print(f"音频已保存到: {args.output_file}", file=sys.stderr)
        else:
            # 默认直接播放音频
            play_audio(audio_data, voice.config.sample_rate)

        return 0

    except Exception as e:
        print(f"错误: 语音合成失败: {e}", file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())