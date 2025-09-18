/**
 * 音频工具函数
 */

/**
 * 保存音频数据到文件
 * @param audioChunks 音频数据块数组
 * @param fileName 可选的文件名，如果不提供则自动生成
 */
export function saveAudioToFile(audioChunks: ArrayBuffer[], fileName?: string): void {
  try {
    // 计算总大小
    const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);

    // 合并所有音频块
    const mergedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of audioChunks) {
      mergedBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    // 生成文件名
    const finalFileName = fileName || `audio_debug_${Date.now()}.pcm`;

    // 通过Electron主进程保存到项目data目录
    if (window.electronAPI && (window.electronAPI as any).saveAudioFile) {
      (window.electronAPI as any).saveAudioFile(mergedBuffer, finalFileName);
      console.log(`保存音频文件到data目录: ${finalFileName}, ${totalSize} 字节`);
    } else {
      // 降级方案：保存到下载目录
      const blob = new Blob([mergedBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`保存音频文件到下载目录: ${finalFileName}, ${totalSize} 字节`);
    }
  } catch (error) {
    console.error('保存音频文件失败:', error);
  }
}
