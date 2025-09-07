#include <napi.h>
#include <functional>
#include <memory>
#include "ScreenCaptureAudio.h"

// Node.js 音频捕获类
class ScreenCaptureAudioNode : public Napi::ObjectWrap<ScreenCaptureAudioNode> {
private:
    std::unique_ptr<ScreenCaptureAudioWrapper> wrapper;
    Napi::ThreadSafeFunction audioDataCallback;
    Napi::ThreadSafeFunction errorCallback;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "ScreenCaptureAudio", {
            InstanceMethod("startCapture", &ScreenCaptureAudioNode::StartCapture),
            InstanceMethod("stopCapture", &ScreenCaptureAudioNode::StopCapture),
            InstanceMethod("isCapturing", &ScreenCaptureAudioNode::IsCapturing),
            StaticMethod("getAudioDevices", &ScreenCaptureAudioNode::GetAudioDevices)
        });

        Napi::FunctionReference* constructor = new Napi::FunctionReference();
        *constructor = Napi::Persistent(func);
        env.SetInstanceData(constructor);

        exports.Set("ScreenCaptureAudio", func);
        return exports;
    }

    ScreenCaptureAudioNode(const Napi::CallbackInfo& info) : Napi::ObjectWrap<ScreenCaptureAudioNode>(info) {
        wrapper = std::make_unique<ScreenCaptureAudioWrapper>();
    }

    ~ScreenCaptureAudioNode() {
        if (audioDataCallback) {
            audioDataCallback.Release();
        }
        if (errorCallback) {
            errorCallback.Release();
        }
    }

    // 开始音频捕获
    Napi::Value StartCapture(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        // 检查参数
        if (info.Length() < 1 || !info[0].IsObject()) {
            Napi::TypeError::New(env, "期望参数为配置对象").ThrowAsJavaScriptException();
            return env.Null();
        }

        Napi::Object config = info[0].As<Napi::Object>();

        // 解析配置参数
        int sampleRate = 16000;
        int channels = 1;
        
        if (config.Has("sampleRate")) {
            sampleRate = config.Get("sampleRate").As<Napi::Number>().Int32Value();
        }
        
        if (config.Has("channels")) {
            channels = config.Get("channels").As<Napi::Number>().Int32Value();
        }

        // 设置音频数据回调
        if (config.Has("onData") && config.Get("onData").IsFunction()) {
            audioDataCallback = Napi::ThreadSafeFunction::New(
                env,
                config.Get("onData").As<Napi::Function>(),
                "AudioDataCallback",
                0,
                1
            );
        }

        // 设置错误回调
        if (config.Has("onError") && config.Get("onError").IsFunction()) {
            errorCallback = Napi::ThreadSafeFunction::New(
                env,
                config.Get("onError").As<Napi::Function>(),
                "ErrorCallback",
                0,
                1
            );
        }

        // 启动音频捕获
        wrapper->startCapture(
            sampleRate, 
            channels,
            [this](const char* data, size_t length) {
                // 音频数据回调
                if (audioDataCallback) {
                    audioDataCallback.NonBlockingCall([data, length](Napi::Env env, Napi::Function jsCallback) {
                        Napi::Buffer<char> buffer = Napi::Buffer<char>::Copy(env, data, length);
                        jsCallback.Call({buffer});
                    });
                }
            },
            [this](const std::string& errorMessage) {
                // 错误回调
                if (errorCallback) {
                    errorCallback.NonBlockingCall([errorMessage](Napi::Env env, Napi::Function jsCallback) {
                        Napi::Error error = Napi::Error::New(env, errorMessage);
                        jsCallback.Call({error.Value()});
                    });
                }
            }
        );

        return env.Undefined();
    }

    // 停止音频捕获
    Napi::Value StopCapture(const Napi::CallbackInfo& info) {
        wrapper->stopCapture();
        
        // 释放回调函数
        if (audioDataCallback) {
            audioDataCallback.Release();
        }
        if (errorCallback) {
            errorCallback.Release();
        }

        return info.Env().Undefined();
    }

    // 检查是否正在捕获
    Napi::Value IsCapturing(const Napi::CallbackInfo& info) {
        return Napi::Boolean::New(info.Env(), wrapper->isCapturing());
    }

    // 获取可用音频设备列表 (静态方法)
    static Napi::Value GetAudioDevices(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        auto devices = ScreenCaptureAudioWrapper::getAudioDevices();
        
        Napi::Array result = Napi::Array::New(env, devices.size());
        for (size_t i = 0; i < devices.size(); i++) {
            Napi::Object device = Napi::Object::New(env);
            device.Set("id", Napi::String::New(env, devices[i].first));
            device.Set("name", Napi::String::New(env, devices[i].second));
            result.Set(i, device);
        }
        
        return result;
    }
};

// 模块初始化
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return ScreenCaptureAudioNode::Init(env, exports);
}

NODE_API_MODULE(screen_capture_audio, Init)