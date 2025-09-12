{
  "targets": [
    {
      "target_name": "speech_recognition",
      "sources": [
        "index.cpp",
        "SpeechRecognition.mm"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [
        "-framework Foundation",
        "-framework Speech",
        "-framework AVFoundation"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        [
          "OS=='mac'",
          {
            "xcode_settings": {
              "CLANG_CXX_LIBRARY": "libc++",
              "MACOSX_DEPLOYMENT_TARGET": "10.15",
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_ENABLE_OBJC_ARC": "YES",
              "ARCHS": ["arm64"],
              "ONLY_ACTIVE_ARCH": "YES"
            }
          }
        ]
      ]
    }
  ]
}