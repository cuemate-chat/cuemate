#!/usr/bin/env python3
"""
Piper TTS Wrapper for Electron
支持两种模式：
1. 单次模式：合成一次后退出（向后兼容）
2. 服务模式：保持进程常驻，持续监听 stdin，模型只加载一次
"""
import argparse
import sys
import os
import platform
import tempfile
import subprocess
import json
from pathlib import Path
from piper import PiperVoice
from piper.config import SynthesisConfig
import wave


def play_audio(audio_data, sample_rate=22050):
    """跨平台播放音频数据"""
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
        tmp_path = tmp_file.name

        with wave.open(tmp_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data)

    try:
        system = platform.system()

        if system == "Darwin":
            subprocess.run(['afplay', tmp_path], check=True)
        elif system == "Windows":
            subprocess.run([
                'powershell', '-Command',
                f'(New-Object System.Media.SoundPlayer "{tmp_path}").PlaySync()'
            ], check=True)
        else:
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
        try:
            os.unlink(tmp_path)
        except:
            pass


def run_service_mode(model_path, length_scale=1.0):
    """
    服务模式：保持进程常驻，持续监听 stdin

    协议：
    - 输入：每行一个 JSON 对象 {"text": "要合成的文本", "action": "play|raw"}
    - 输出：每行一个 JSON 对象 {"status": "ok|error", "message": "..."}
    - 特殊命令：{"action": "ping"} 用于检测进程是否存活
    - 特殊命令：{"action": "quit"} 退出服务
    """
    # 启动时加载模型（只加载一次！）
    try:
        voice = PiperVoice.load(model_path)
        syn_config = SynthesisConfig(length_scale=length_scale)
        sample_rate = voice.config.sample_rate

        # 发送就绪信号
        print(json.dumps({"status": "ready", "message": "Piper TTS 服务已启动", "sample_rate": sample_rate}), flush=True)
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"模型加载失败: {e}"}), flush=True)
        return 1

    # 持续监听 stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            # 向后兼容：如果不是 JSON，当作纯文本处理
            request = {"text": line, "action": "play"}

        action = request.get("action", "play")

        # 处理特殊命令
        if action == "ping":
            print(json.dumps({"status": "ok", "message": "pong"}), flush=True)
            continue

        if action == "quit":
            print(json.dumps({"status": "ok", "message": "服务已退出"}), flush=True)
            break

        text = request.get("text", "")
        if not text:
            print(json.dumps({"status": "error", "message": "没有提供文本"}), flush=True)
            continue

        try:
            # 合成语音
            audio_chunks = []
            for audio_chunk in voice.synthesize(text, syn_config):
                audio_chunks.append(audio_chunk.audio_int16_bytes)

            audio_data = b''.join(audio_chunks)

            if action == "raw":
                # 输出原始 PCM 数据（base64 编码）
                import base64
                audio_base64 = base64.b64encode(audio_data).decode('ascii')
                print(json.dumps({"status": "ok", "audio": audio_base64, "sample_rate": sample_rate}), flush=True)
            else:
                # 默认播放
                play_audio(audio_data, sample_rate)
                print(json.dumps({"status": "ok", "message": "播放完成"}), flush=True)

        except Exception as e:
            print(json.dumps({"status": "error", "message": f"合成失败: {e}"}), flush=True)

    return 0


def run_single_mode(args):
    """单次模式：合成一次后退出（向后兼容）"""
    # 获取输入文本
    if args.text:
        text = args.text
    else:
        text = sys.stdin.read().strip()

    if not text:
        print("错误: 没有提供要合成的文本", file=sys.stderr)
        return 1

    if not os.path.exists(args.model):
        print(f"错误: 模型文件不存在: {args.model}", file=sys.stderr)
        return 1

    try:
        voice = PiperVoice.load(args.model)
        syn_config = SynthesisConfig(length_scale=args.length_scale)

        audio_chunks = []
        for audio_chunk in voice.synthesize(text, syn_config):
            audio_chunks.append(audio_chunk.audio_int16_bytes)

        audio_data = b''.join(audio_chunks)

        if args.output_raw:
            sys.stdout.buffer.write(audio_data)
        elif args.output_file:
            with wave.open(args.output_file, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(voice.config.sample_rate)
                wav_file.writeframes(audio_data)
            print(f"音频已保存到: {args.output_file}", file=sys.stderr)
        else:
            play_audio(audio_data, voice.config.sample_rate)

        return 0

    except Exception as e:
        print(f"错误: 语音合成失败: {e}", file=sys.stderr)
        return 1


def main():
    parser = argparse.ArgumentParser(description='Piper TTS Wrapper for Electron')
    parser.add_argument('-m', '--model', required=True, help='Path to Onnx model file')
    parser.add_argument('-f', '--output-file', help='Path to output WAV file')
    parser.add_argument('--output-raw', action='store_true', help='Stream raw audio to stdout')
    parser.add_argument('--play', action='store_true', help='Play audio directly (default)')
    parser.add_argument('--service', action='store_true', help='Run in service mode (keep process alive)')
    parser.add_argument('--length-scale', type=float, default=1.0, help='Phoneme length')
    parser.add_argument('text', nargs='?', help='Text to synthesize (from command line or stdin)')

    args = parser.parse_args()

    if args.service:
        # 服务模式：保持进程常驻
        return run_service_mode(args.model, args.length_scale)
    else:
        # 单次模式：向后兼容
        return run_single_mode(args)


if __name__ == '__main__':
    sys.exit(main())
