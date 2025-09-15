#import <Foundation/Foundation.h>
// ScreenCaptureKit 方案已注释，切换到 Core Audio HAL 方案
/*
#import <ScreenCaptureKit/ScreenCaptureKit.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreGraphics/CoreGraphics.h>
*/
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

// ScreenCaptureAudioHandler 类已注释，切换到 Core Audio HAL 方案
/*
API_AVAILABLE(macos(13.0))
@interface ScreenCaptureAudioHandler : NSObject <SCStreamDelegate>

@property (nonatomic, strong) SCStream *stream;
@property (nonatomic, copy) void (^audioDataCallback)(NSData *audioData);
@property (nonatomic, copy) void (^errorCallback)(NSError *error);
@property (nonatomic, assign) BOOL isCapturing;

- (void)startCaptureWithConfiguration:(SCStreamConfiguration *)config;
- (void)stopCapture;

@end
*/

// ScreenCaptureAudioHandler 实现已注释，切换到 Core Audio HAL 方案
/*
@implementation ScreenCaptureAudioHandler

- (instancetype)init {
    self = [super init];
    if (self) {
        _isCapturing = NO;
        _stream = nil;
    }
    return self;
}

- (void)dealloc {
    [self stopCapture];
    [super dealloc];
}

- (void)startCaptureWithConfiguration:(SCStreamConfiguration *)config {
    objcLogInfo("OBJC_HANDLER startCaptureWithConfiguration 方法开始执行");

    if (self.isCapturing) {
        objcLogWarn("OBJC_HANDLER 音频捕获已在进行中");
        NSLog(@"ScreenCaptureAudio: 音频捕获已在进行中");
        return;
    }

    // 检查并请求屏幕录制权限
    objcLogInfo("OBJC_HANDLER 开始检查屏幕录制权限");
    NSLog(@"[OBJC_HANDLER] PERMISSION_CHECK: 开始检查屏幕录制权限...");

    // CGRequestScreenCaptureAccess() 会在权限未授予时显示系统对话框
    // 这是一个阻塞调用，会等待用户响应
    objcLogInfo("OBJC_HANDLER 调用 CGRequestScreenCaptureAccess");
    BOOL hasPermission = CGRequestScreenCaptureAccess();

    if (!hasPermission) {
        objcLogError("OBJC_HANDLER 屏幕录制权限被用户拒绝");
        NSLog(@"[OBJC_HANDLER] PERMISSION_DENIED: 屏幕录制权限被用户拒绝");
        NSError *permissionError = [NSError errorWithDomain:@"ScreenCaptureAudioDomain"
                                                       code:1004
                                                   userInfo:@{NSLocalizedDescriptionKey: @"需要屏幕录制权限来捕获系统音频。请在\"系统偏好设置 > 安全性与隐私 > 屏幕录制\"中允许此应用，然后重新启动应用。"}];
        if (self.errorCallback) {
            objcLogInfo("OBJC_HANDLER 触发权限错误回调");
            self.errorCallback(permissionError);
        }
        return;
    }

    objcLogInfo("OBJC_HANDLER 屏幕录制权限检查通过，准备开始音频捕获");
    NSLog(@"[OBJC_HANDLER] PERMISSION_GRANTED: 屏幕录制权限检查通过，准备开始音频捕获");
    
    if (@available(macOS 13.0, *)) {
        objcLogInfo("OBJC_HANDLER macOS 版本检查通过，开始获取共享内容");
        [SCShareableContent getShareableContentWithCompletionHandler:^(SCShareableContent *shareableContent, NSError *error) {
            if (error) {
                objcLogError("OBJC_HANDLER 获取共享内容失败: " + std::string(error.localizedDescription.UTF8String));
                NSLog(@"ScreenCaptureAudio: 获取共享内容失败: %@", error.localizedDescription);
                if (self.errorCallback) {
                    self.errorCallback(error);
                }
                return;
            }

            objcLogInfo("OBJC_HANDLER 共享内容获取成功，开始处理显示器");
            // 创建内容过滤器以捕获系统音频扬声器
            // 使用显示器内容而不是窗口
            NSArray *displays = shareableContent.displays;
            objcLogInfo("OBJC_HANDLER 找到显示器数量: " + std::to_string(displays.count));

            if (displays.count == 0) {
                objcLogError("OBJC_HANDLER 没有找到可用的显示器");
                NSError *noDisplayError = [NSError errorWithDomain:@"ScreenCaptureAudioDomain"
                                                              code:1002
                                                          userInfo:@{NSLocalizedDescriptionKey: @"没有找到可用的显示器"}];
                if (self.errorCallback) {
                    self.errorCallback(noDisplayError);
                }
                return;
            }

            objcLogInfo("OBJC_HANDLER 使用主显示器创建内容过滤器");
            SCDisplay *primaryDisplay = displays.firstObject;
            SCContentFilter *filter = [[SCContentFilter alloc] initWithDisplay:primaryDisplay excludingWindows:@[]];
            
            objcLogInfo("OBJC_HANDLER 创建 SCStream 实例");
            NSError *streamError = nil;
            self.stream = [[SCStream alloc] initWithFilter:filter configuration:config delegate:self];

            if (streamError || !self.stream) {
                objcLogError("OBJC_HANDLER 创建流失败");
                NSLog(@"ScreenCaptureAudio: 创建流失败");
                if (self.errorCallback) {
                    NSError *error = [NSError errorWithDomain:@"ScreenCaptureAudioDomain"
                                                         code:1003
                                                     userInfo:@{NSLocalizedDescriptionKey: @"创建音频流失败"}];
                    self.errorCallback(error);
                }
                return;
            }

            objcLogInfo("OBJC_HANDLER SCStream 创建成功，开始启动捕获");
            [self.stream startCaptureWithCompletionHandler:^(NSError *startError) {
                if (startError) {
                    objcLogError("OBJC_HANDLER 启动捕获失败: " + std::string(startError.localizedDescription.UTF8String));
                    NSLog(@"ScreenCaptureAudio: 启动捕获失败: %@", startError.localizedDescription);
                    if (self.errorCallback) {
                        self.errorCallback(startError);
                    }
                } else {
                    objcLogInfo("OBJC_HANDLER 音频捕获启动成功");
                    NSLog(@"ScreenCaptureAudio: 音频捕获已启动");
                    self.isCapturing = YES;
                }
            }];
        }];
    } else {
        objcLogError("OBJC_HANDLER macOS 版本不支持，需要 macOS 13.0 或更高版本");
        NSError *versionError = [NSError errorWithDomain:@"ScreenCaptureAudioDomain"
                                                    code:1001
                                                userInfo:@{NSLocalizedDescriptionKey: @"需要 macOS 12.3 或更高版本"}];
        if (self.errorCallback) {
            self.errorCallback(versionError);
        }
    }
}

- (void)stopCapture {
    if (!self.isCapturing || !self.stream) {
        NSLog(@"ScreenCaptureAudio: 音频捕获未在进行中");
        return;
    }
    
    [self.stream stopCaptureWithCompletionHandler:^(NSError *stopError) {
        if (stopError) {
            NSLog(@"ScreenCaptureAudio: 停止捕获失败: %@", stopError.localizedDescription);
        } else {
            NSLog(@"ScreenCaptureAudio: 音频捕获已停止");
        }
        self.isCapturing = NO;
        self.stream = nil;
    }];
}

#pragma mark - SCStreamDelegate

- (void)stream:(SCStream *)stream didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer ofType:(SCStreamOutputType)type {
    objcLogInfo("OBJC_HANDLER 收到样本缓冲区，类型: " + std::to_string((int)type));
    NSLog(@"[OBJC_HANDLER] SAMPLE_BUFFER: 收到样本缓冲区，类型: %d", (int)type);
    if (type == SCStreamOutputTypeAudio) {
        objcLogInfo("OBJC_HANDLER 开始处理音频样本缓冲区");
        NSLog(@"[OBJC_HANDLER] AUDIO_SAMPLE: 开始处理音频样本缓冲区");
        [self processSampleBuffer:sampleBuffer];
    } else {
        objcLogInfo("OBJC_HANDLER 收到非音频样本，类型: " + std::to_string((int)type));
        NSLog(@"[OBJC_HANDLER] NON_AUDIO_SAMPLE: 收到非音频样本，类型: %d", (int)type);
    }
}

- (void)stream:(SCStream *)stream didStopWithError:(NSError *)error {
    objcLogError("OBJC_HANDLER 流意外停止: " + std::string(error.localizedDescription.UTF8String));
    NSLog(@"ScreenCaptureAudio: 流意外停止: %@", error.localizedDescription);
    self.isCapturing = NO;
    if (self.errorCallback) {
        self.errorCallback(error);
    }
}

- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer {
    objcLogInfo("OBJC_HANDLER processSampleBuffer 方法开始执行");
    NSLog(@"[OBJC_HANDLER] PROCESS_BUFFER: 开始处理样本缓冲区");

    objcLogInfo("OBJC_HANDLER 获取数据缓冲区");
    CMBlockBufferRef blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer);
    if (!blockBuffer) {
        objcLogError("OBJC_HANDLER 无法获取数据缓冲区");
        NSLog(@"[OBJC_HANDLER] NO_BLOCK_BUFFER: 无法获取数据缓冲区");
        return;
    }

    size_t length = 0;
    char *dataPointer = NULL;

    objcLogInfo("OBJC_HANDLER 获取数据指针");
    OSStatus status = CMBlockBufferGetDataPointer(blockBuffer, 0, NULL, &length, &dataPointer);
    if (status != noErr || !dataPointer) {
        objcLogError("OBJC_HANDLER 获取音频数据失败，状态码: " + std::to_string((int)status));
        NSLog(@"[OBJC_HANDLER] DATA_POINTER_ERROR: 获取音频数据失败: %d", (int)status);
        return;
    }

    objcLogInfo("OBJC_HANDLER 成功获取音频数据，大小: " + std::to_string(length) + " bytes");
    NSLog(@"[OBJC_HANDLER] AUDIO_DATA_SUCCESS: 成功获取音频数据，大小: %zu bytes", length);
    NSData *audioData = [NSData dataWithBytes:dataPointer length:length];
    if (self.audioDataCallback) {
        objcLogInfo("OBJC_HANDLER 音频数据回调存在，准备触发回调");
        NSLog(@"[OBJC_HANDLER] CALLBACK_TRIGGER: 触发音频数据回调");
        self.audioDataCallback(audioData);
        objcLogInfo("OBJC_HANDLER 音频数据回调调用完成");
    } else {
        objcLogWarn("OBJC_HANDLER 音频数据回调为空");
        NSLog(@"[OBJC_HANDLER] NO_CALLBACK: 音频数据回调为空");
    }
}

@end
*/

#include "ScreenCaptureAudio.h"

// C++ 包装器类实现 - 使用 Core Audio HAL 方案
ScreenCaptureAudioWrapper::ScreenCaptureAudioWrapper() {
    // ScreenCaptureKit 处理器已注释
    handler = nullptr;

    // 创建 Core Audio 处理器
    coreAudioHandler = new CoreAudioCaptureWrapper();

    // 默认使用 Core Audio 方案
    captureMethod = AudioCaptureMethod::CORE_AUDIO;

    objcLogInfo("ScreenCaptureAudioWrapper 构造完成，使用 Core Audio HAL 方案");
}

ScreenCaptureAudioWrapper::~ScreenCaptureAudioWrapper() {
    // ScreenCaptureKit 处理器已注释
    /*
    ScreenCaptureAudioHandler *audioHandler = (ScreenCaptureAudioHandler*)handler;
    [audioHandler stopCapture];
    [audioHandler release];
    handler = nil;
    */

    // 清理 Core Audio 处理器
    if (coreAudioHandler) {
        coreAudioHandler->stopCapture();
        delete coreAudioHandler;
        coreAudioHandler = nullptr;
    }

    objcLogInfo("ScreenCaptureAudioWrapper 析构完成");
}

void ScreenCaptureAudioWrapper::startCapture(int sampleRate, int channels,
                                           std::function<void(const char*, size_t)> audioCallback,
                                           std::function<void(const std::string&)> errorCallback) {

    objcLogInfo("ScreenCaptureAudioWrapper startCapture 开始执行 (使用 Core Audio HAL)");

    // 根据设置的捕获方式选择实现
    if (captureMethod == AudioCaptureMethod::CORE_AUDIO) {
        objcLogInfo("使用 Core Audio HAL 方案进行音频捕获");

        if (coreAudioHandler) {
            coreAudioHandler->startCapture(sampleRate, channels, audioCallback, errorCallback);
        } else {
            objcLogError("Core Audio 处理器未初始化");
            errorCallback("Core Audio 处理器未初始化");
        }
    } else {
        // ScreenCaptureKit 方案已注释
        objcLogError("ScreenCaptureKit 方案已被注释，请使用 Core Audio 方案");
        errorCallback("ScreenCaptureKit 方案已被注释，请使用 Core Audio 方案");

        /* ScreenCaptureKit 实现已注释
        objcLogInfo("C++_WRAPPER startCapture 方法开始执行");

        // ... ScreenCaptureKit 相关代码已注释 ...
        */
    }
}

void ScreenCaptureAudioWrapper::stopCapture() {
    objcLogInfo("ScreenCaptureAudioWrapper stopCapture 开始执行");

    // 根据设置的捕获方式选择实现
    if (captureMethod == AudioCaptureMethod::CORE_AUDIO) {
        if (coreAudioHandler) {
            coreAudioHandler->stopCapture();
        }
    } else {
        // ScreenCaptureKit 方案已注释
        /* ScreenCaptureKit 实现已注释
        ScreenCaptureAudioHandler *audioHandler = (ScreenCaptureAudioHandler*)handler;
        [audioHandler stopCapture];
        */
    }

    objcLogInfo("ScreenCaptureAudioWrapper stopCapture 执行完成");
}

bool ScreenCaptureAudioWrapper::isCapturing() const {
    // 根据设置的捕获方式选择实现
    if (captureMethod == AudioCaptureMethod::CORE_AUDIO) {
        return coreAudioHandler ? coreAudioHandler->isCapturing() : false;
    } else {
        // ScreenCaptureKit 方案已注释
        /* ScreenCaptureKit 实现已注释
        ScreenCaptureAudioHandler *audioHandler = (ScreenCaptureAudioHandler*)handler;
        return audioHandler.isCapturing;
        */
        return false;
    }
}

std::vector<std::pair<std::string, std::string>> ScreenCaptureAudioWrapper::getAudioDevices() {
    // 使用 Core Audio 方案获取音频设备列表
    return CoreAudioCaptureWrapper::getAudioDevices();
}

// 新增方法：设置音频捕获方式
void ScreenCaptureAudioWrapper::setCaptureMethod(AudioCaptureMethod method) {
    if (isCapturing()) {
        objcLogWarn("音频捕获进行中，无法切换捕获方式");
        return;
    }

    captureMethod = method;
    objcLogInfo("音频捕获方式已设置为: " + std::to_string(static_cast<int>(method)));
}

// 新增方法：获取当前音频捕获方式
AudioCaptureMethod ScreenCaptureAudioWrapper::getCaptureMethod() const {
    return captureMethod;
}