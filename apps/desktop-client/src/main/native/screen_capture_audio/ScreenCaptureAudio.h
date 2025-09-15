#ifndef SCREEN_CAPTURE_AUDIO_H
#define SCREEN_CAPTURE_AUDIO_H

#include <functional>
#include <vector>
#include <string>
#include <utility>

// 前向声明
class CoreAudioCaptureWrapper;

// 音频捕获实现方式枚举
enum class AudioCaptureMethod {
    CORE_AUDIO,        // 使用 Core Audio HAL (推荐)
    SCREEN_CAPTURE_KIT // 使用 ScreenCaptureKit (已注释，保留作为备用)
};

// C++ 包装器类的声明
class ScreenCaptureAudioWrapper {
public:
    ScreenCaptureAudioWrapper();
    ~ScreenCaptureAudioWrapper();

    void startCapture(int sampleRate, int channels,
                     std::function<void(const char*, size_t)> audioCallback,
                     std::function<void(const std::string&)> errorCallback);

    void stopCapture();
    bool isCapturing() const;

    static std::vector<std::pair<std::string, std::string>> getAudioDevices();

    // 设置音频捕获方式
    void setCaptureMethod(AudioCaptureMethod method);
    AudioCaptureMethod getCaptureMethod() const;

private:
    void* handler; // ScreenCaptureKit 处理器 (已注释)
    CoreAudioCaptureWrapper* coreAudioHandler; // Core Audio 处理器
    AudioCaptureMethod captureMethod; // 当前使用的捕获方式
};

#endif // SCREEN_CAPTURE_AUDIO_H