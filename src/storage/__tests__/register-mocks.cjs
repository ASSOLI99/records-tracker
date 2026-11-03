// Test-only: points native modules at in-memory mocks so storage code runs under Node.
/* global __dirname */
const Module = require('node:module');
const path = require('node:path');
const mocks = {
  'expo-file-system': path.join(__dirname, 'mocks/expo-file-system.ts'),
  'react-native': path.join(__dirname, 'mocks/react-native.ts'),
  'expo-localization': path.join(__dirname, 'mocks/expo-localization.ts'),
};
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return original.call(this, mocks[request] ?? request, ...rest);
};
