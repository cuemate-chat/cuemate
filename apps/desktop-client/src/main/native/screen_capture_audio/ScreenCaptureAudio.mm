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

    // 从环境变量获取日志目录，默认使用相对路径
    const char* logDir = std::getenv("CUEMATE_LOG_DIR");
    std::string baseLogDir = logDir ? logDir : "../../logs";

    // 构建日志文件路径
    std::stringstream pathStream;
    pathStream << baseLogDir << "/" << level << "/desktop-client/"
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

// C++ 包装器类实现（仅用于获取设备列表）
ScreenCaptureAudioWrapper::ScreenCaptureAudioWrapper() {
    objcLogInfo("ScreenCaptureAudioWrapper 构造（仅设备列表功能）");
}

ScreenCaptureAudioWrapper::~ScreenCaptureAudioWrapper() {
    objcLogInfo("ScreenCaptureAudioWrapper 析构");
}

std::vector<std::pair<std::string, std::string>> ScreenCaptureAudioWrapper::getAudioDevices() {
    std::vector<std::pair<std::string, std::string>> devices;

    objcLogInfo("开始枚举音频输出设备");

    // 获取所有音频设备
    AudioObjectPropertyAddress propertyAddress = {
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };

    UInt32 dataSize = 0;
    OSStatus status = AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &propertyAddress, 0, NULL, &dataSize);
    if (status != noErr) {
        objcLogError("获取音频设备列表大小失败: " + std::to_string(status));
        // 返回默认设备列表
        devices.emplace_back("default", "默认音频输出设备");
        return devices;
    }

    UInt32 deviceCount = dataSize / sizeof(AudioDeviceID);
    std::vector<AudioDeviceID> audioDevices(deviceCount);

    status = AudioObjectGetPropertyData(kAudioObjectSystemObject, &propertyAddress, 0, NULL, &dataSize, audioDevices.data());
    if (status != noErr) {
        objcLogError("获取音频设备列表失败: " + std::to_string(status));
        devices.emplace_back("default", "默认音频输出设备");
        return devices;
    }

    objcLogInfo("找到 " + std::to_string(deviceCount) + " 个音频设备");

    // 遍历所有设备，筛选出音频输出设备
    for (UInt32 i = 0; i < deviceCount; i++) {
        AudioDeviceID deviceID = audioDevices[i];

        // 检查设备是否有输出流
        AudioObjectPropertyAddress outputStreamsAddress = {
            kAudioDevicePropertyStreams,
            kAudioDevicePropertyScopeOutput,
            kAudioObjectPropertyElementMain
        };

        UInt32 streamDataSize = 0;
        status = AudioObjectGetPropertyDataSize(deviceID, &outputStreamsAddress, 0, NULL, &streamDataSize);
        if (status != noErr || streamDataSize == 0) {
            // 没有输出流，跳过这个设备
            continue;
        }

        // 获取设备 UID
        CFStringRef deviceUID = NULL;
        dataSize = sizeof(deviceUID);
        AudioObjectPropertyAddress uidAddress = {
            kAudioDevicePropertyDeviceUID,
            kAudioObjectPropertyScopeGlobal,
            kAudioObjectPropertyElementMain
        };

        status = AudioObjectGetPropertyData(deviceID, &uidAddress, 0, NULL, &dataSize, &deviceUID);
        if (status != noErr || deviceUID == NULL) {
            continue;
        }

        // 获取设备名称
        CFStringRef deviceName = NULL;
        dataSize = sizeof(deviceName);
        AudioObjectPropertyAddress nameAddress = {
            kAudioDevicePropertyDeviceNameCFString,
            kAudioObjectPropertyScopeGlobal,
            kAudioObjectPropertyElementMain
        };

        status = AudioObjectGetPropertyData(deviceID, &nameAddress, 0, NULL, &dataSize, &deviceName);
        if (status != noErr || deviceName == NULL) {
            if (deviceUID) CFRelease(deviceUID);
            continue;
        }

        // 转换为 C++ string
        char uidBuffer[256];
        char nameBuffer[256];
        CFStringGetCString(deviceUID, uidBuffer, sizeof(uidBuffer), kCFStringEncodingUTF8);
        CFStringGetCString(deviceName, nameBuffer, sizeof(nameBuffer), kCFStringEncodingUTF8);

        devices.emplace_back(std::string(uidBuffer), std::string(nameBuffer));

        objcLogInfo("找到音频输出设备: " + std::string(nameBuffer) + " (UID: " + std::string(uidBuffer) + ")");

        // 释放资源
        CFRelease(deviceUID);
        CFRelease(deviceName);
    }

    if (devices.empty()) {
        objcLogWarn("未找到任何音频输出设备，返回默认设备");
        devices.emplace_back("default", "默认音频输出设备");
    }

    objcLogInfo("枚举完成，共找到 " + std::to_string(devices.size()) + " 个音频输出设备");

    return devices;
}