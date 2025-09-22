#ifndef SCREEN_CAPTURE_AUDIO_H
#define SCREEN_CAPTURE_AUDIO_H

#include <functional>
#include <vector>
#include <string>
#include <utility>

// 前向声明
class CoreAudioTapsWrapper;

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

private:
    CoreAudioTapsWrapper* coreAudioTapsHandler; // Core Audio Taps 处理器
};

#endif // SCREEN_CAPTURE_AUDIO_H