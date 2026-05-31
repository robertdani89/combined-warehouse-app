const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force all imports of 'react-router' to resolve to the same physical copy,
// preventing Metro from bundling two separate module instances when
// react-router-native carries its own nested react-router in its node_modules.
const reactRouterPath = path.resolve(
  __dirname,
  'node_modules/react-router/dist/main.js'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-router') {
    return { filePath: reactRouterPath, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
