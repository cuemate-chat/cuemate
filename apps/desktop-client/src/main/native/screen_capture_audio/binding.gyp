{
  "targets": [
    {
      "target_name": "screen_capture_audio",
      "sources": [
        "ScreenCaptureAudio.mm",
        "CoreAudioCapture.mm",
        "index.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [
        "-framework CoreAudio",
        "-framework AudioUnit",
        "-framework AudioToolbox",
        "-framework Foundation"
      ],
      "xcode_settings": {
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++17", "-stdlib=libc++"],
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "ARCHS": ["arm64"],
        "ONLY_ACTIVE_ARCH": "YES"
      },
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ]
    }
  ]
}