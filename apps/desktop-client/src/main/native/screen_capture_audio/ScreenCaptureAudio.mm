#import <Foundation/Foundation.h>
#import <ScreenCaptureKit/ScreenCaptureKit.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreAudio/CoreAudio.h>
#include <functional>
#include <vector>
#include <string>
#include <utility>

API_AVAILABLE(macos(13.0))
@interface ScreenCaptureAudioHandler : NSObject <SCStreamDelegate>

@property (nonatomic, strong) SCStream *stream;
@property (nonatomic, copy) void (^audioDataCallback)(NSData *audioData);
@property (nonatomic, copy) void (^errorCallback)(NSError *error);
@property (nonatomic, assign) BOOL isCapturing;

- (void)startCaptureWithConfiguration:(SCStreamConfiguration *)config;
- (void)stopCapture;

@end

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
    if (self.isCapturing) {
        NSLog(@"ScreenCaptureAudio: 音频捕获已在进行中");
        return;
    }
    
    if (@available(macOS 13.0, *)) {
        [SCShareableContent getShareableContentWithCompletionHandler:^(SCShareableContent *shareableContent, NSError *error) {
            if (error) {
                NSLog(@"ScreenCaptureAudio: 获取共享内容失败: %@", error.localizedDescription);
                if (self.errorCallback) {
                    self.errorCallback(error);
                }
                return;
            }
            
            // 创建内容过滤器以捕获系统音频
            // 使用显示器内容而不是窗口
            NSArray *displays = shareableContent.displays;
            if (displays.count == 0) {
                NSError *noDisplayError = [NSError errorWithDomain:@"ScreenCaptureAudioDomain" 
                                                              code:1002 
                                                          userInfo:@{NSLocalizedDescriptionKey: @"没有找到可用的显示器"}];
                if (self.errorCallback) {
                    self.errorCallback(noDisplayError);
                }
                return;
            }
            
            SCDisplay *primaryDisplay = displays.firstObject;
            SCContentFilter *filter = [[SCContentFilter alloc] initWithDisplay:primaryDisplay excludingWindows:@[]];
            
            NSError *streamError = nil;
            self.stream = [[SCStream alloc] initWithFilter:filter configuration:config delegate:self];
            
            if (streamError || !self.stream) {
                NSLog(@"ScreenCaptureAudio: 创建流失败");
                if (self.errorCallback) {
                    NSError *error = [NSError errorWithDomain:@"ScreenCaptureAudioDomain" 
                                                         code:1003 
                                                     userInfo:@{NSLocalizedDescriptionKey: @"创建音频流失败"}];
                    self.errorCallback(error);
                }
                return;
            }
            
            [self.stream startCaptureWithCompletionHandler:^(NSError *startError) {
                if (startError) {
                    NSLog(@"ScreenCaptureAudio: 启动捕获失败: %@", startError.localizedDescription);
                    if (self.errorCallback) {
                        self.errorCallback(startError);
                    }
                } else {
                    NSLog(@"ScreenCaptureAudio: 音频捕获已启动");
                    self.isCapturing = YES;
                }
            }];
        }];
    } else {
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
    if (type == SCStreamOutputTypeAudio) {
        [self processSampleBuffer:sampleBuffer];
    }
}

- (void)stream:(SCStream *)stream didStopWithError:(NSError *)error {
    NSLog(@"ScreenCaptureAudio: 流意外停止: %@", error.localizedDescription);
    self.isCapturing = NO;
    if (self.errorCallback) {
        self.errorCallback(error);
    }
}

- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer {
    CMBlockBufferRef blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer);
    if (!blockBuffer) {
        return;
    }
    
    size_t length = 0;
    char *dataPointer = NULL;
    
    OSStatus status = CMBlockBufferGetDataPointer(blockBuffer, 0, NULL, &length, &dataPointer);
    if (status != noErr || !dataPointer) {
        NSLog(@"ScreenCaptureAudio: 获取音频数据失败: %d", (int)status);
        return;
    }
    
    NSData *audioData = [NSData dataWithBytes:dataPointer length:length];
    if (self.audioDataCallback) {
        self.audioDataCallback(audioData);
    }
}

@end

#include "ScreenCaptureAudio.h"

// C++ 包装器类实现
ScreenCaptureAudioWrapper::ScreenCaptureAudioWrapper() {
    handler = (void*)[[ScreenCaptureAudioHandler alloc] init];
}

ScreenCaptureAudioWrapper::~ScreenCaptureAudioWrapper() {
    ScreenCaptureAudioHandler *audioHandler = (ScreenCaptureAudioHandler*)handler;
    [audioHandler stopCapture];
    [audioHandler release];
    handler = nil;
}

void ScreenCaptureAudioWrapper::startCapture(int sampleRate, int channels, 
                                           std::function<void(const char*, size_t)> audioCallback,
                                           std::function<void(const std::string&)> errorCallback) {
    ScreenCaptureAudioHandler *audioHandler = (ScreenCaptureAudioHandler*)handler;
    
    if (@available(macOS 13.0, *)) {
        SCStreamConfiguration *config = [[SCStreamConfiguration alloc] init];
        
        config.capturesAudio = YES;
        config.sampleRate = sampleRate;
        config.channelCount = channels;
        config.excludesCurrentProcessAudio = YES;
        
        audioHandler.audioDataCallback = ^(NSData *audioData) {
            audioCallback((const char*)audioData.bytes, audioData.length);
        };
        
        audioHandler.errorCallback = ^(NSError *error) {
            std::string errorMessage = error.localizedDescription.UTF8String;
            errorCallback(errorMessage);
        };
        
        [audioHandler startCaptureWithConfiguration:config];
    } else {
        errorCallback("需要 macOS 13.0 或更高版本");
    }
}

void ScreenCaptureAudioWrapper::stopCapture() {
    ScreenCaptureAudioHandler *audioHandler = (ScreenCaptureAudioHandler*)handler;
    [audioHandler stopCapture];
}

bool ScreenCaptureAudioWrapper::isCapturing() const {
    ScreenCaptureAudioHandler *audioHandler = (ScreenCaptureAudioHandler*)handler;
    return audioHandler.isCapturing;
}

std::vector<std::pair<std::string, std::string>> ScreenCaptureAudioWrapper::getAudioDevices() {
    std::vector<std::pair<std::string, std::string>> devices;
    
    AudioDeviceID defaultDevice = 0;
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