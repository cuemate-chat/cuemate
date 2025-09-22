#ifndef SCREEN_CAPTURE_AUDIO_H
#define SCREEN_CAPTURE_AUDIO_H

#include <functional>
#include <vector>
#include <string>
#include <utility>

// C++ 包装器类的声明（仅用于获取设备列表）
class ScreenCaptureAudioWrapper {
public:
    ScreenCaptureAudioWrapper();
    ~ScreenCaptureAudioWrapper();

    static std::vector<std::pair<std::string, std::string>> getAudioDevices();
};

#endif // SCREEN_CAPTURE_AUDIO_H