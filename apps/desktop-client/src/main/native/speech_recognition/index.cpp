#include <napi.h>
#include "SpeechRecognition.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return SpeechRecognition::Init(env, exports);
}

NODE_API_MODULE(speech_recognition, Init)