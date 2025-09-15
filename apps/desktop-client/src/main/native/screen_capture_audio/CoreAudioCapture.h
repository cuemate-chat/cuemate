#ifndef CORE_AUDIO_CAPTURE_H
#define CORE_AUDIO_CAPTURE_H

#include <functional>
#include <vector>
#include <string>
#include <utility>

// Core Audio HAL 音频捕获类的声明
class CoreAudioCaptureWrapper {
public:
    CoreAudioCaptureWrapper();
    ~CoreAudioCaptureWrapper();

    void startCapture(int sampleRate, int channels,
                     std::function<void(const char*, size_t)> audioCallback,
                     std::function<void(const std::string&)> errorCallback);

    void stopCapture();
    bool isCapturing() const;

    static std::vector<std::pair<std::string, std::string>> getAudioDevices();

private:
    void* handler; // 使用 void* 来避免在头文件中暴露 Objective-C 类型
};

#endif // CORE_AUDIO_CAPTURE_H