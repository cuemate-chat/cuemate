{
  "targets": [
    {
      "target_name": "screen_capture_audio",
      "sources": [
        "ScreenCaptureAudio.mm",
        "index.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [
        "-framework ScreenCaptureKit",
        "-framework AVFoundation",
        "-framework CoreMedia",
        "-framework CoreAudio",
        "-framework Foundation"
      ],
      "xcode_settings": {
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++17", "-stdlib=libc++"],
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "MACOSX_DEPLOYMENT_TARGET": "13.0",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "ARCHS": ["$(ARCHS_STANDARD)"]
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