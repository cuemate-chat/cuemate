#include <napi.h>
#include <functional>
#include <memory>
#include <fstream>
#include <ctime>
#include <iomanip>
#include <sstream>
#include "ScreenCaptureAudio.h"
#include "CoreAudioCapture.h"

// C++ 日志函数 - 写入与 Node.js 相同的日志文件
void cppLog(const std::string& level, const std::string& message) {
    // 获取当前时间
    auto now = std::time(nullptr);
    auto* tm = std::localtime(&now);

    // 构建日志文件路径，格式：/opt/cuemate/logs/LEVEL/desktop-client/YYYY-MM-DD/LEVEL.log
    std::stringstream pathStream;
    pathStream << "/opt/cuemate/logs/" << level << "/desktop-client/"
               << std::put_time(tm, "%Y-%m-%d") << "/" << level << ".log";

    std::ofstream logFile(pathStream.str(), std::ios::app);
    if (logFile.is_open()) {
        // 使用与 pino 相同的 JSON 格式
        auto timestamp = std::time(nullptr) * 1000; // 毫秒时间戳

        // 根据级别设置 pino level 数值
        int pinoLevel = 30; // info
        if (level == "error") pinoLevel = 50;
        else if (level == "warn") pinoLevel = 40;
        else if (level == "debug") pinoLevel = 20;

        logFile << "{\"level\":" << pinoLevel << ",\"time\":" << timestamp
                << ",\"ts\":\"" << std::put_time(tm, "%Y-%m-%d %H:%M:%S")
                << "\",\"service\":\"desktop-client\",\"msg\":\"[CPP] " << message << "\"}" << std::endl;
        logFile.close();
    }
}

// 便利函数
void cppLogInfo(const std::string& message) { cppLog("info", message); }
void cppLogError(const std::string& message) { cppLog("error", message); }
void cppLogWarn(const std::string& message) { cppLog("warn", message); }
void cppLogDebug(const std::string& message) { cppLog("debug", message); }

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
            StaticMethod("getAudioDevices", &ScreenCaptureAudioNode::GetAudioDevices),
            StaticMethod("isCoreAudioTapsAvailable", &ScreenCaptureAudioNode::IsCoreAudioTapsAvailable)
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
        cppLogInfo("INDEX_CPP StartCapture 函数开始执行");
        printf("[INDEX_CPP] 检查 onData 回调\n");
        fflush(stdout);

        cppLogInfo("INDEX_CPP 检查 config.Has(\"onData\"): " + std::string(config.Has("onData") ? "true" : "false"));
        if (config.Has("onData")) {
            cppLogInfo("INDEX_CPP 检查 config.Get(\"onData\").IsFunction(): " + std::string(config.Get("onData").IsFunction() ? "true" : "false"));
        }

        if (config.Has("onData") && config.Get("onData").IsFunction()) {
            cppLogInfo("INDEX_CPP onData 回调存在，开始设置 audioDataCallback");
            audioDataCallback = Napi::ThreadSafeFunction::New(
                env,
                config.Get("onData").As<Napi::Function>(),
                "AudioDataCallback",
                0,
                1
            );
            cppLogInfo("INDEX_CPP audioDataCallback 设置成功");
            printf("[INDEX_CPP] audioDataCallback 设置成功\n");
        } else {
            cppLogError("INDEX_CPP onData 回调不存在或不是函数");
            printf("[INDEX_CPP] audioDataCallback 设置失败\n");
        }

        // 设置错误回调
        printf("[INDEX_CPP] 检查 onError 回调\n");
               
        if (config.Has("onError") && config.Get("onError").IsFunction()) {
            errorCallback = Napi::ThreadSafeFunction::New(
                env,
                config.Get("onError").As<Napi::Function>(),
                "ErrorCallback",
                0,
                1
            );
            printf("[INDEX_CPP] errorCallback 设置成功\n");
        } else {
            printf("[INDEX_CPP] errorCallback 设置失败\n");
        }

        // 启动音频捕获
        cppLogInfo("INDEX_CPP 准备调用 wrapper->startCapture");
        wrapper->startCapture(
            sampleRate,
            channels,
            [this](const char* data, size_t length) {
                // 音频数据回调
                cppLogInfo("INDEX_CPP 收到音频数据回调，大小: " + std::to_string(length) + " bytes");
                if (audioDataCallback) {
                    audioDataCallback.NonBlockingCall([data, length](Napi::Env env, Napi::Function jsCallback) {
                        Napi::Buffer<char> buffer = Napi::Buffer<char>::Copy(env, data, length);
                        jsCallback.Call({buffer});
                    });
                }
            },
            [this](const std::string& errorMessage) {
                // 错误回调
                cppLogError("INDEX_CPP 收到错误回调: " + errorMessage);
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


    // 检查 Core Audio Taps 是否可用 (静态方法)
    static Napi::Value IsCoreAudioTapsAvailable(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        bool isAvailable = CoreAudioTapsWrapper::isAvailable();
        cppLogInfo("INDEX_CPP 检查 Core Audio Taps 可用性: " + std::string(isAvailable ? "true" : "false"));
        return Napi::Boolean::New(env, isAvailable);
    }
};


// 模块初始化
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // 导出 ScreenCaptureAudio 类
    ScreenCaptureAudioNode::Init(env, exports);

    return exports;
}

NODE_API_MODULE(screen_capture_audio, Init)