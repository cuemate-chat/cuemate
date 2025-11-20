#!/bin/bash
set -e

# ============================================
# 构建 Piper TTS 独立可执行文件
# 使用 PyInstaller 将 Python + piper-tts 打包成单个二进制文件
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESOURCES_DIR="$PROJECT_ROOT/resources/piper"
OUTPUT_DIR="$PROJECT_ROOT/resources/piper-bin"
VENV_DIR="$OUTPUT_DIR/venv"

echo "=========================================="
echo "构建 Piper TTS 独立可执行文件"
echo "=========================================="

# 创建虚拟环境
if [ ! -d "$VENV_DIR" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source "$VENV_DIR/bin/activate"

# 检查是否安装了 pyinstaller
if ! python -c "import PyInstaller" 2>/dev/null; then
    echo "安装 PyInstaller..."
    pip install pyinstaller
fi

# 检查是否安装了 piper-tts
if ! python -c "from piper import PiperVoice" 2>/dev/null; then
    echo "安装 piper-tts..."
    pip install piper-tts
fi

# 清理旧的输出目录（保留 venv）
rm -rf "$OUTPUT_DIR/piper" "$OUTPUT_DIR/build" "$OUTPUT_DIR/piper.spec"
mkdir -p "$OUTPUT_DIR"

# 使用 PyInstaller 打包
echo "正在打包 piper_wrapper.py..."
cd "$RESOURCES_DIR"

pyinstaller \
    --onefile \
    --name piper \
    --distpath "$OUTPUT_DIR" \
    --workpath "$OUTPUT_DIR/build" \
    --specpath "$OUTPUT_DIR" \
    --hidden-import piper \
    --hidden-import piper.config \
    --collect-data piper \
    --clean \
    piper_wrapper.py

# 清理构建文件
rm -rf "$OUTPUT_DIR/build" "$OUTPUT_DIR/piper.spec"

# 停用虚拟环境
deactivate

# 验证生成的可执行文件
if [ -f "$OUTPUT_DIR/piper" ]; then
    echo "✓ Piper 可执行文件构建成功: $OUTPUT_DIR/piper"
    ls -lh "$OUTPUT_DIR/piper"

    # 测试运行
    echo "测试 Piper 可执行文件..."
    echo "你好世界" | "$OUTPUT_DIR/piper" -m "$RESOURCES_DIR/zh_CN-huayan-medium.onnx" --output-file "$OUTPUT_DIR/test.wav" || true

    if [ -f "$OUTPUT_DIR/test.wav" ]; then
        echo "✓ 测试成功"
        rm "$OUTPUT_DIR/test.wav"
    fi
else
    echo "✗ 构建失败"
    exit 1
fi

echo "=========================================="
echo "构建完成"
echo "=========================================="
