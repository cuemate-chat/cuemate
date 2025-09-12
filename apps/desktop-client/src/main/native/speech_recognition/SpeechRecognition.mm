#include "SpeechRecognition.h"
#import <Speech/Speech.h>
#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

static void requestMicrophoneAccess(void (^completion)(BOOL)) {
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeAudio
                             completionHandler:^(BOOL granted) {
        // Ensure callback on main queue for UI/TCC consistency
        dispatch_async(dispatch_get_main_queue(), ^{
            completion(granted);
        });
    }];
}

@interface SpeechRecognitionDelegate : NSObject <SFSpeechRecognitionTaskDelegate>
@property (nonatomic, strong) SFSpeechRecognitionTask *recognitionTask;
- (void)setCallback:(Napi::ThreadSafeFunction)tsfn;
- (Napi::ThreadSafeFunction)getCallback;
@end

@implementation SpeechRecognitionDelegate {
    Napi::ThreadSafeFunction _callback;
}

- (void)setCallback:(Napi::ThreadSafeFunction)tsfn {
    _callback = tsfn;
}

- (Napi::ThreadSafeFunction)getCallback {
    return _callback;
}

- (void)speechRecognitionTask:(SFSpeechRecognitionTask *)task didFinishRecognition:(SFSpeechRecognitionResult *)result {
    if (result.isFinal) {
        NSString *recognizedText = result.bestTranscription.formattedString;
        
        auto callback = [recognizedText](Napi::Env env, Napi::Function jsCallback) {
            Napi::Object resultObj = Napi::Object::New(env);
            resultObj.Set("success", true);
            resultObj.Set("text", Napi::String::New(env, [recognizedText UTF8String]));
            resultObj.Set("isFinal", true);
            
            jsCallback.Call({resultObj});
        };
        
        _callback.BlockingCall(callback);
    }
}

- (void)speechRecognitionTask:(SFSpeechRecognitionTask *)task didFinishSuccessfully:(BOOL)successfully {
    if (!successfully) {
        auto callback = [](Napi::Env env, Napi::Function jsCallback) {
            Napi::Object resultObj = Napi::Object::New(env);
            resultObj.Set("success", false);
            resultObj.Set("error", Napi::String::New(env, "Recognition failed"));
            
            jsCallback.Call({resultObj});
        };
        
        _callback.BlockingCall(callback);
    }
}

- (void)speechRecognitionTaskWasCancelled:(SFSpeechRecognitionTask *)task {
    auto callback = [](Napi::Env env, Napi::Function jsCallback) {
        Napi::Object resultObj = Napi::Object::New(env);
        resultObj.Set("success", false);
        resultObj.Set("error", Napi::String::New(env, "Recognition cancelled"));
        
        jsCallback.Call({resultObj});
    };
    
    _callback.BlockingCall(callback);
}

@end

Napi::FunctionReference SpeechRecognition::constructor;

SpeechRecognition::SpeechRecognition(const Napi::CallbackInfo& info) : Napi::ObjectWrap<SpeechRecognition>(info) {
    recognizer = nullptr;
    audioEngine = nullptr;
}

Napi::Object SpeechRecognition::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "SpeechRecognition", {
        InstanceMethod("startRecognition", &SpeechRecognition::StartRecognition),
        InstanceMethod("stopRecognition", &SpeechRecognition::StopRecognition),
        InstanceMethod("isAvailable", &SpeechRecognition::IsAvailable),
        InstanceMethod("requestPermission", &SpeechRecognition::RequestPermission),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("SpeechRecognition", func);
    return exports;
}

Napi::Value SpeechRecognition::IsAvailable(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Check if Speech framework is available
    BOOL available = [SFSpeechRecognizer class] != nil;
    
    return Napi::Boolean::New(env, available);
}

Napi::Value SpeechRecognition::RequestPermission(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected callback function").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Function jsCallback = info[0].As<Napi::Function>();
    
    // 使用 ThreadSafeFunction 确保在 Node 线程上调用 JS 回调，避免崩溃
    Napi::ThreadSafeFunction tsfn = Napi::ThreadSafeFunction::New(
        env,
        jsCallback,
        "SpeechPermissionCallback",
        0,
        1
    );
    
    auto tsfnPtr = std::make_shared<Napi::ThreadSafeFunction>(tsfn);
    
    dispatch_async(dispatch_get_main_queue(), ^{
        [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus speechStatus) {
            requestMicrophoneAccess(^(BOOL micGranted) {
                auto callJs = [speechStatus, micGranted](Napi::Env env, Napi::Function callback) {
                    Napi::Object result = Napi::Object::New(env);
                    bool speechAuthorized = (speechStatus == SFSpeechRecognizerAuthorizationStatusAuthorized);
                    bool allAuthorized = speechAuthorized && micGranted;

                    // Backward-compatible fields
                    result.Set("authorized", allAuthorized);
                    result.Set("status", Napi::String::New(env, speechAuthorized ? (micGranted ? "authorized" : "mic_denied") : "speech_denied"));

                    // Extra details
                    Napi::Object details = Napi::Object::New(env);
                    details.Set("speech", Napi::String::New(env,
                        speechStatus == SFSpeechRecognizerAuthorizationStatusAuthorized ? "authorized" :
                        speechStatus == SFSpeechRecognizerAuthorizationStatusDenied ? "denied" :
                        speechStatus == SFSpeechRecognizerAuthorizationStatusRestricted ? "restricted" : "not_determined"));
                    details.Set("microphone", micGranted);
                    result.Set("details", details);

                    callback.Call({ result });
                };
                tsfnPtr->BlockingCall(callJs);
                tsfnPtr->Release();
            });
        }];
    });
    
    return env.Undefined();
}

Napi::Value SpeechRecognition::StartRecognition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected callback function").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Function callback = info[0].As<Napi::Function>();
    
    // Create thread-safe callback
    Napi::ThreadSafeFunction tsfn = Napi::ThreadSafeFunction::New(
        env,
        callback,
        "SpeechRecognitionCallback",
        0,
        1
    );
    
    dispatch_async(dispatch_get_main_queue(), ^{
        __block bool setupOk = true;
        __block NSString *setupError = nil;
        // Check permissions before starting audio engine
        SFSpeechRecognizerAuthorizationStatus speechStatus = [SFSpeechRecognizer authorizationStatus];
        if (speechStatus != SFSpeechRecognizerAuthorizationStatusAuthorized) {
            setupOk = false;
            setupError = @"Speech recognition not authorized";
            return;
        }

        AVAuthorizationStatus micStatus = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio];
        if (micStatus != AVAuthorizationStatusAuthorized) {
            setupOk = false;
            setupError = @"Microphone not authorized";
            return;
        }

        // Create speech recognizer for Chinese
        SFSpeechRecognizer *speechRecognizer = [[SFSpeechRecognizer alloc] initWithLocale:[[NSLocale alloc] initWithLocaleIdentifier:@"zh-CN"]];
        if (!speechRecognizer || !speechRecognizer.isAvailable) {
            setupOk = false;
            setupError = @"Speech recognizer not available";
            return;
        }
        // Create audio engine and input node
        AVAudioEngine *audioEngine = [[AVAudioEngine alloc] init];
        AVAudioInputNode *inputNode = audioEngine.inputNode;
        AVAudioFormat *recordingFormat = [inputNode outputFormatForBus:0];
        // Configure audio session for record
        // On macOS, AVAudioSession is unavailable; AVAudioEngine can be used directly.
        // Create request
        SFSpeechAudioBufferRecognitionRequest *request = [[SFSpeechAudioBufferRecognitionRequest alloc] init];
        request.shouldReportPartialResults = YES;
        // Create delegate
        SpeechRecognitionDelegate *delegate = [[SpeechRecognitionDelegate alloc] init];
        [delegate setCallback:tsfn];
        // Start recognition task
        SFSpeechRecognitionTask *recognitionTask = [speechRecognizer recognitionTaskWithRequest:request delegate:delegate];
        delegate.recognitionTask = recognitionTask;
        // Install tap
        [inputNode installTapOnBus:0 bufferSize:1024 format:recordingFormat block:^(AVAudioPCMBuffer * _Nonnull buffer, AVAudioTime * _Nonnull when) {
            [request appendAudioPCMBuffer:buffer];
        }];
        // Start audio engine
        NSError *error;
        [audioEngine prepare];
        BOOL started = [audioEngine startAndReturnError:&error];
        if (!started || error) {
            setupOk = false;
            setupError = error ? error.localizedDescription : @"Failed to start audio engine";
            return;
        }
        // retain ownership
        this->recognizer = (__bridge_retained void*)speechRecognizer;
        this->audioEngine = (__bridge_retained void*)audioEngine;
        
        // 成功启动，通过回调通知
        if (setupOk) {
            auto successCallback = [](Napi::Env env, Napi::Function jsCallback) {
                Napi::Object resultObj = Napi::Object::New(env);
                resultObj.Set("success", true);
                resultObj.Set("message", Napi::String::New(env, "Speech recognition started"));
                jsCallback.Call({ resultObj });
            };
            tsfn.BlockingCall(successCallback);
        } else {
            // 处理错误
            std::string errorMsg = setupError ? std::string([setupError UTF8String]) : std::string("Unknown error");
            auto errorCallback = [errorMsg](Napi::Env env, Napi::Function jsCallback) {
                Napi::Object resultObj = Napi::Object::New(env);
                resultObj.Set("success", false);
                resultObj.Set("error", Napi::String::New(env, errorMsg));
                jsCallback.Call({ resultObj });
            };
            tsfn.BlockingCall(errorCallback);
            tsfn.Release();
        }
    });
    
    return env.Undefined();
}

Napi::Value SpeechRecognition::StopRecognition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (this->audioEngine) {
        AVAudioEngine *engine = (__bridge AVAudioEngine*)this->audioEngine;
        [engine stop];
        [engine.inputNode removeTapOnBus:0];
        CFBridgingRelease(this->audioEngine);
        this->audioEngine = nullptr;
    }
    
    if (this->recognizer) {
        CFBridgingRelease(this->recognizer);
        this->recognizer = nullptr;
    }
    
    return env.Undefined();
}