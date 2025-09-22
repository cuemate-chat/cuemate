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
    // 导出 ScreenCaptureAudio 类
    ScreenCaptureAudioNode::Init(env, exports);

    return exports;
}

NODE_API_MODULE(screen_capture_audio, Init)