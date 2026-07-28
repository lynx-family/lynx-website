const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname, 'build', 'Release', 'native_texture_canvas_module.node');

const setUp = () => {
  if (!fs.existsSync(modulePath)) {
    console.warn(`[lynxtron-native-texture-canvas] Native module not found at ${modulePath}; skipping registration.`);
    return false;
  }

  const { registerGlobalEnvModule } = process._linkedBinding('lynx_extension');
  const extensionModule = require(modulePath);
  const creator = extensionModule.createExtensionModule();
  if (creator && registerGlobalEnvModule) {
    registerGlobalEnvModule(creator.name, creator.creatorModuleFunc, creator.isLazyCreate, creator.opaque);
    return true;
  }
  throw new Error('native texture canvas extension config is empty');
};

exports.setUp = setUp;
