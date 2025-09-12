#ifndef SPEECHRECOGNITION_H
#define SPEECHRECOGNITION_H

#include <napi.h>

class SpeechRecognition : public Napi::ObjectWrap<SpeechRecognition> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    SpeechRecognition(const Napi::CallbackInfo& info);

private:
    static Napi::FunctionReference constructor;
    
    // Methods
    Napi::Value StartRecognition(const Napi::CallbackInfo& info);
    Napi::Value StopRecognition(const Napi::CallbackInfo& info);
    Napi::Value IsAvailable(const Napi::CallbackInfo& info);
    Napi::Value RequestPermission(const Napi::CallbackInfo& info);
    
    // Native implementation
    void* recognizer; // Will hold SFSpeechRecognizer instance
    void* audioEngine; // Will hold AVAudioEngine instance
};

#endif