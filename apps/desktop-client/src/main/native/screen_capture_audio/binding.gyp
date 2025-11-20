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
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++20", "-stdlib=libc++"],
        "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
        "MACOSX_DEPLOYMENT_TARGET": "12.0",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "ARCHS": ["arm64"],
        "ONLY_ACTIVE_ARCH": "YES",
        "OTHER_LDFLAGS": ["-Wl,-w", "-Wl,-no_warn_duplicate_libraries"]
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