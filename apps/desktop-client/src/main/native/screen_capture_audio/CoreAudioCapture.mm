#import <Foundation/Foundation.h>
#import <CoreAudio/CoreAudio.h>
#import <AudioUnit/AudioUnit.h>
#import <AudioToolbox/AudioToolbox.h>
#import <AVFoundation/AVFoundation.h>
#include <functional>
#include <vector>
#include <string>
#include <utility>
#include <fstream>
#include <iomanip>
#include <sstream>

// Objective-C 日志函数 - 写入与 Node.js 相同的日志文件
void coreAudioLog(const std::string& level, const std::string& message) {
    auto now = std::time(nullptr);
    auto* tm = std::localtime(&now);

    std::stringstream pathStream;
    pathStream << "/opt/cuemate/logs/" << level << "/desktop-client/"
               << std::put_time(tm, "%Y-%m-%d") << "/" << level << ".log";

    std::ofstream logFile(pathStream.str(), std::ios::app);
    if (logFile.is_open()) {
        auto timestamp = std::time(nullptr) * 1000;

        int pinoLevel = 30; // info
        if (level == "error") pinoLevel = 50;
        else if (level == "warn") pinoLevel = 40;
        else if (level == "debug") pinoLevel = 20;

        logFile << "{\"level\":" << pinoLevel << ",\"time\":" << timestamp
                << ",\"ts\":\"" << std::put_time(tm, "%Y-%m-%d %H:%M:%S")
                << "\",\"service\":\"desktop-client\",\"msg\":\"[CORE_AUDIO] " << message << "\"}" << std::endl;
        logFile.close();
    }
}

void coreAudioLogInfo(const std::string& message) { coreAudioLog("info", message); }
void coreAudioLogError(const std::string& message) { coreAudioLog("error", message); }
void coreAudioLogWarn(const std::string& message) { coreAudioLog("warn", message); }

@interface CoreAudioCaptureHandler : NSObject {
    AudioDeviceID outputDevice;
    AudioDeviceIOProcID ioProcID;
    BOOL isCapturing;
}

@property (nonatomic, copy) void (^audioDataCallback)(NSData *audioData);
@property (nonatomic, copy) void (^errorCallback)(NSError *error);

- (BOOL)startCaptureWithSampleRate:(int)sampleRate channels:(int)channels;
- (void)stopCapture;
- (BOOL)isCapturing;

@end

@implementation CoreAudioCaptureHandler

- (instancetype)init {
    self = [super init];
    if (self) {
        isCapturing = NO;
        outputDevice = kAudioObjectUnknown;
        ioProcID = NULL;
    }
    return self;
}

- (void)dealloc {
    [self stopCapture];
    [super dealloc];
}

// Core Audio IO 回调函数 - 获取扬声器音频输出
static OSStatus audioIOProc(AudioDeviceID device,
                           const AudioTimeStamp* now,
                           const AudioBufferList* inputData,
                           const AudioTimeStamp* inputTime,
                           AudioBufferList* outputData,
                           const AudioTimeStamp* outputTime,
                           void* clientData) {

    CoreAudioCaptureHandler* self = (__bridge CoreAudioCaptureHandler*)clientData;

    if (!outputData || outputData->mNumberBuffers == 0) {
        return noErr;
    }

    // 获取第一个音频缓冲区
    AudioBuffer* buffer = &outputData->mBuffers[0];
    if (buffer->mData && buffer->mDataByteSize > 0) {

        coreAudioLogInfo("收到音频输出数据，大小: " + std::to_string(buffer->mDataByteSize) + " bytes");

        // 创建 NSData 并触发回调
        NSData* audioData = [NSData dataWithBytes:buffer->mData length:buffer->mDataByteSize];

        if (self.audioDataCallback) {
            // 在主线程执行回调
            dispatch_async(dispatch_get_main_queue(), ^{
                self.audioDataCallback(audioData);
            });
        }
    }

    return noErr;
}

- (BOOL)startCaptureWithSampleRate:(int)sampleRate channels:(int)channels {
    if (isCapturing) {
        coreAudioLogWarn("Core Audio 捕获已在进行中");
        return YES;
    }

    coreAudioLogInfo("开始 Core Audio 音频捕获...");

    // 1. 获取默认音频输出设备（扬声器）
    UInt32 size = sizeof(outputDevice);
    AudioObjectPropertyAddress outputDeviceAddress = {
        kAudioHardwarePropertyDefaultOutputDevice,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };

    OSStatus status = AudioObjectGetPropertyData(kAudioObjectSystemObject,
                                                &outputDeviceAddress,
                                                0, NULL,
                                                &size,
                                                &outputDevice);

    if (status != noErr || outputDevice == kAudioObjectUnknown) {
        coreAudioLogError("无法获取默认音频输出设备，状态码: " + std::to_string((int)status));
        if (self.errorCallback) {
            NSError* error = [NSError errorWithDomain:@"CoreAudioCaptureDomain"
                                               code:2001
                                           userInfo:@{NSLocalizedDescriptionKey: @"无法获取默认音频输出设备"}];
            self.errorCallback(error);
        }
        return NO;
    }

    // 获取设备名称用于日志
    CFStringRef deviceName = NULL;
    size = sizeof(deviceName);
    AudioObjectPropertyAddress nameAddress = {
        kAudioDevicePropertyDeviceNameCFString,
        kAudioObjectPropertyScopeOutput,
        kAudioObjectPropertyElementMain
    };

    AudioObjectGetPropertyData(outputDevice, &nameAddress, 0, NULL, &size, &deviceName);
    if (deviceName) {
        char deviceNameC[256];
        CFStringGetCString(deviceName, deviceNameC, sizeof(deviceNameC), kCFStringEncodingUTF8);
        coreAudioLogInfo("使用音频输出设备: " + std::string(deviceNameC) + " (ID: " + std::to_string(outputDevice) + ")");
        CFRelease(deviceName);
    }

    // 2. 创建音频 IO 回调
    status = AudioDeviceCreateIOProcID(outputDevice,
                                      audioIOProc,
                                      (__bridge void*)self,
                                      &ioProcID);

    if (status != noErr) {
        coreAudioLogError("创建音频 IO 回调失败，状态码: " + std::to_string((int)status));
        if (self.errorCallback) {
            NSError* error = [NSError errorWithDomain:@"CoreAudioCaptureDomain"
                                               code:2002
                                           userInfo:@{NSLocalizedDescriptionKey: @"创建音频 IO 回调失败"}];
            self.errorCallback(error);
        }
        return NO;
    }

    // 3. 启动音频设备捕获
    status = AudioDeviceStart(outputDevice, ioProcID);

    if (status != noErr) {
        coreAudioLogError("启动音频设备失败，状态码: " + std::to_string((int)status));

        // 清理已创建的 IO 回调
        AudioDeviceDestroyIOProcID(outputDevice, ioProcID);
        ioProcID = NULL;

        if (self.errorCallback) {
            NSError* error = [NSError errorWithDomain:@"CoreAudioCaptureDomain"
                                               code:2003
                                           userInfo:@{NSLocalizedDescriptionKey: @"启动音频设备失败"}];
            self.errorCallback(error);
        }
        return NO;
    }

    isCapturing = YES;
    coreAudioLogInfo("Core Audio 音频捕获已启动");

    return YES;
}

- (void)stopCapture {
    if (!isCapturing) {
        coreAudioLogWarn("Core Audio 捕获未在进行中");
        return;
    }

    coreAudioLogInfo("停止 Core Audio 音频捕获...");

    if (outputDevice != kAudioObjectUnknown && ioProcID != NULL) {
        // 停止音频设备
        OSStatus status = AudioDeviceStop(outputDevice, ioProcID);
        if (status != noErr) {
            coreAudioLogError("停止音频设备失败，状态码: " + std::to_string((int)status));
        }

        // 销毁 IO 回调
        status = AudioDeviceDestroyIOProcID(outputDevice, ioProcID);
        if (status != noErr) {
            coreAudioLogError("销毁音频 IO 回调失败，状态码: " + std::to_string((int)status));
        }

        ioProcID = NULL;
    }

    outputDevice = kAudioObjectUnknown;
    isCapturing = NO;

    coreAudioLogInfo("Core Audio 音频捕获已停止");
}

- (BOOL)isCapturing {
    return isCapturing;
}

@end

#include "CoreAudioCapture.h"

// C++ 包装器类实现
CoreAudioCaptureWrapper::CoreAudioCaptureWrapper() {
    handler = (void*)[[CoreAudioCaptureHandler alloc] init];
}

CoreAudioCaptureWrapper::~CoreAudioCaptureWrapper() {
    CoreAudioCaptureHandler *audioHandler = (CoreAudioCaptureHandler*)handler;
    [audioHandler stopCapture];
    [audioHandler release];
    handler = nil;
}

void CoreAudioCaptureWrapper::startCapture(int sampleRate, int channels,
                                          std::function<void(const char*, size_t)> audioCallback,
                                          std::function<void(const std::string&)> errorCallback) {

    coreAudioLogInfo("CoreAudioCaptureWrapper startCapture 开始执行");

    CoreAudioCaptureHandler *audioHandler = (CoreAudioCaptureHandler*)handler;

    // 设置音频数据回调
    audioHandler.audioDataCallback = ^(NSData *audioData) {
        coreAudioLogInfo("收到音频数据回调，大小: " + std::to_string(audioData.length) + " bytes");
        audioCallback((const char*)audioData.bytes, audioData.length);
    };

    // 设置错误回调
    audioHandler.errorCallback = ^(NSError *error) {
        coreAudioLogError("收到错误回调: " + std::string(error.localizedDescription.UTF8String));
        std::string errorMessage = error.localizedDescription.UTF8String;
        errorCallback(errorMessage);
    };

    // 启动捕获
    BOOL success = [audioHandler startCaptureWithSampleRate:sampleRate channels:channels];
    if (!success) {
        coreAudioLogError("CoreAudioCaptureWrapper 启动捕获失败");
        errorCallback("启动 Core Audio 捕获失败");
    } else {
        coreAudioLogInfo("CoreAudioCaptureWrapper 启动捕获成功");
    }
}

void CoreAudioCaptureWrapper::stopCapture() {
    CoreAudioCaptureHandler *audioHandler = (CoreAudioCaptureHandler*)handler;
    [audioHandler stopCapture];
}

bool CoreAudioCaptureWrapper::isCapturing() const {
    CoreAudioCaptureHandler *audioHandler = (CoreAudioCaptureHandler*)handler;
    return audioHandler.isCapturing;
}

std::vector<std::pair<std::string, std::string>> CoreAudioCaptureWrapper::getAudioDevices() {
    std::vector<std::pair<std::string, std::string>> devices;

    // 获取默认输出设备
    AudioDeviceID defaultDevice = kAudioObjectUnknown;
    UInt32 size = sizeof(defaultDevice);

    AudioObjectPropertyAddress address = {
        kAudioHardwarePropertyDefaultOutputDevice,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMain
    };

    if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size, &defaultDevice) == noErr) {
        CFStringRef deviceName = NULL;
        size = sizeof(deviceName);

        AudioObjectPropertyAddress nameAddress = {
            kAudioDevicePropertyDeviceNameCFString,
            kAudioObjectPropertyScopeOutput,
            kAudioObjectPropertyElementMain
        };

        if (AudioObjectGetPropertyData(defaultDevice, &nameAddress, 0, NULL, &size, &deviceName) == noErr) {
            if (deviceName) {
                char deviceNameC[256];
                CFStringGetCString(deviceName, deviceNameC, sizeof(deviceNameC), kCFStringEncodingUTF8);
                devices.emplace_back("default", deviceNameC);
                CFRelease(deviceName);
            }
        }
    }

    return devices;
}

