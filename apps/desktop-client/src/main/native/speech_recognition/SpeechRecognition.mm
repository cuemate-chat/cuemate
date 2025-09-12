#include "SpeechRecognition.h"
#import <Speech/Speech.h>
#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

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
    
    Napi::Function callback = info[0].As<Napi::Function>();
    
    [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus status) {
        dispatch_async(dispatch_get_main_queue(), ^{
            Napi::Object result = Napi::Object::New(env);
            
            switch (status) {
                case SFSpeechRecognizerAuthorizationStatusAuthorized:
                    result.Set("authorized", true);
                    result.Set("status", Napi::String::New(env, "authorized"));
                    break;
                case SFSpeechRecognizerAuthorizationStatusDenied:
                    result.Set("authorized", false);
                    result.Set("status", Napi::String::New(env, "denied"));
                    break;
                case SFSpeechRecognizerAuthorizationStatusRestricted:
                    result.Set("authorized", false);
                    result.Set("status", Napi::String::New(env, "restricted"));
                    break;
                case SFSpeechRecognizerAuthorizationStatusNotDetermined:
                    result.Set("authorized", false);
                    result.Set("status", Napi::String::New(env, "not_determined"));
                    break;
            }
            
            callback.Call({result});
        });
    }];
    
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
    
    // Create speech recognizer for Chinese
    SFSpeechRecognizer *speechRecognizer = [[SFSpeechRecognizer alloc] initWithLocale:[[NSLocale alloc] initWithLocaleIdentifier:@"zh-CN"]];
    
    if (!speechRecognizer || !speechRecognizer.isAvailable) {
        auto errorCallback = [](Napi::Env env, Napi::Function jsCallback) {
            Napi::Object resultObj = Napi::Object::New(env);
            resultObj.Set("success", false);
            resultObj.Set("error", Napi::String::New(env, "Speech recognizer not available"));
            
            jsCallback.Call({resultObj});
        };
        tsfn.BlockingCall(errorCallback);
        tsfn.Release();
        return env.Undefined();
    }
    
    // Create audio engine and input node
    AVAudioEngine *audioEngine = [[AVAudioEngine alloc] init];
    AVAudioInputNode *inputNode = audioEngine.inputNode;
    AVAudioFormat *recordingFormat = [inputNode outputFormatForBus:0];
    
    // Create speech recognition request
    SFSpeechAudioBufferRecognitionRequest *request = [[SFSpeechAudioBufferRecognitionRequest alloc] init];
    request.shouldReportPartialResults = YES;
    
    // Create delegate
    SpeechRecognitionDelegate *delegate = [[SpeechRecognitionDelegate alloc] init];
    [delegate setCallback:tsfn];
    
    // Start recognition task
    SFSpeechRecognitionTask *recognitionTask = [speechRecognizer recognitionTaskWithRequest:request delegate:delegate];
    delegate.recognitionTask = recognitionTask;
    
    // Install tap on audio input
    [inputNode installTapOnBus:0 bufferSize:1024 format:recordingFormat block:^(AVAudioPCMBuffer * _Nonnull buffer, AVAudioTime * _Nonnull when) {
        [request appendAudioPCMBuffer:buffer];
    }];
    
    // Start audio engine
    NSError *error;
    [audioEngine prepare];
    BOOL started = [audioEngine startAndReturnError:&error];
    
    if (!started || error) {
        auto errorCallback = [error](Napi::Env env, Napi::Function jsCallback) {
            Napi::Object resultObj = Napi::Object::New(env);
            resultObj.Set("success", false);
            NSString *errorMsg = error ? error.localizedDescription : @"Failed to start audio engine";
            resultObj.Set("error", Napi::String::New(env, [errorMsg UTF8String]));
            
            jsCallback.Call({resultObj});
        };
        tsfn.BlockingCall(errorCallback);
        tsfn.Release();
        return env.Undefined();
    }
    
    // Store references (using __bridge to cast without transferring ownership)
    this->recognizer = (__bridge void*)speechRecognizer;
    this->audioEngine = (__bridge void*)audioEngine;
    
    return env.Undefined();
}

Napi::Value SpeechRecognition::StopRecognition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (this->audioEngine) {
        AVAudioEngine *engine = (__bridge AVAudioEngine*)this->audioEngine;
        [engine stop];
        [engine.inputNode removeTapOnBus:0];
        this->audioEngine = nullptr;
    }
    
    if (this->recognizer) {
        this->recognizer = nullptr;
    }
    
    return env.Undefined();
}