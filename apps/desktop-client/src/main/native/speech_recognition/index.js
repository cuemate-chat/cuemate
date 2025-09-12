const path = require('path');

// Load the native module
const speechRecognition = require(path.join(__dirname, 'build/Release/speech_recognition.node'));

module.exports = speechRecognition;