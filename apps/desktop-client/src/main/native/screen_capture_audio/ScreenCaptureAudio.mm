#import <Foundation/Foundation.h>
#import <CoreAudio/CoreAudio.h>
#include <functional>
#include <vector>
#include <string>
#include <utility>
#include <fstream>
#include <iomanip>
#include <sstream>
#include "CoreAudioCapture.h"

// Objective-C 日志函数 - 写入与 Node.js 相同的日志文件
void objcLog(const std::string& level, const std::string& message) {
    // 获取当前时间
    auto now = std::time(nullptr);
    auto* tm = std::localtime(&now);

    // 构建日志文件路径
    std::stringstream pathStream;
    pathStream << "/opt/cuemate/logs/" << level << "/desktop-client/"
               << std::put_time(tm, "%Y-%m-%d") << "/" << level << ".log";

    std::ofstream logFile(pathStream.str(), std::ios::app);
    if (logFile.is_open()) {
        auto timestamp = std::time(nullptr) * 1000; // 毫秒时间戳

        // 根据级别设置 pino level 数值
        int pinoLevel = 30; // info
        if (level == "error") pinoLevel = 50;
        else if (level == "warn") pinoLevel = 40;
        else if (level == "debug") pinoLevel = 20;

        logFile << "{\"level\":" << pinoLevel << ",\"time\":" << timestamp
                << ",\"ts\":\"" << std::put_time(tm, "%Y-%m-%d %H:%M:%S")
                << "\",\"service\":\"desktop-client\",\"msg\":\"[OBJC] " << message << "\"}" << std::endl;
        logFile.close();
    }
}

// 便利函数
void objcLogInfo(const std::string& message) { objcLog("info", message); }
void objcLogError(const std::string& message) { objcLog("error", message); }
void objcLogWarn(const std::string& message) { objcLog("warn", message); }

#include "ScreenCaptureAudio.h"

// C++ 包装器类实现
ScreenCaptureAudioWrapper::ScreenCaptureAudioWrapper() {
    objcLogInfo("ScreenCaptureAudioWrapper 构造，使用 Core Audio Taps");
    coreAudioTapsHandler = new CoreAudioTapsWrapper();
}

ScreenCaptureAudioWrapper::~ScreenCaptureAudioWrapper() {
    objcLogInfo("ScreenCaptureAudioWrapper 析构");
    delete coreAudioTapsHandler;
}

void ScreenCaptureAudioWrapper::startCapture(int sampleRate, int channels,
                                           std::function<void(const char*, size_t)> audioCallback,
                                           std::function<void(const std::string&)> errorCallback) {
    objcLogInfo("使用 Core Audio Taps 方案进行音频捕获");
    coreAudioTapsHandler->startCapture(sampleRate, channels, audioCallback, errorCallback);
}

void ScreenCaptureAudioWrapper::stopCapture() {
    coreAudioTapsHandler->stopCapture();
}

bool ScreenCaptureAudioWrapper::isCapturing() const {
    return coreAudioTapsHandler->isCapturing();
}

std::vector<std::pair<std::string, std::string>> ScreenCaptureAudioWrapper::getAudioDevices() {
    // 简单返回默认设备，因为 Core Audio Taps 不需要设备选择
    std::vector<std::pair<std::string, std::string>> devices;
    devices.emplace_back("default", "默认音频设备");
    return devices;
}