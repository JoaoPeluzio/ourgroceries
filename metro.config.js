const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force Metro to resolve Zustand to the CommonJS version to avoid import.meta issues
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('zustand')) {
    const result = require.resolve(moduleName);
    return context.resolveRequest(context, result, platform);
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
