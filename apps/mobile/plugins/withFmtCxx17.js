const { withPodfile } = require("expo/config-plugins");

const PATCH_MARKER = "# Hypofit: force fmt to C++17 for Xcode 26";

const PATCH_BLOCK = `
  ${PATCH_MARKER}
  installer.pods_project.targets.each do |target|
    next unless target.name == 'fmt'

    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      build_config.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'
    end
  end
`;

function injectFmtPatch(contents) {
  if (contents.includes(PATCH_MARKER)) {
    return contents;
  }

  const reactNativePostInstall = /(\n\s*react_native_post_install\([\s\S]*?\n\s*\))/;
  if (reactNativePostInstall.test(contents)) {
    return contents.replace(reactNativePostInstall, `$1\n${PATCH_BLOCK}`);
  }

  const postInstall = /(\n\s*post_install do \|installer\|)/;
  if (postInstall.test(contents)) {
    return contents.replace(postInstall, `$1\n${PATCH_BLOCK}`);
  }

  throw new Error("Could not find an iOS Podfile post_install block to patch fmt.");
}

const withFmtCxx17 = (config) =>
  withPodfile(config, (config) => {
    config.modResults.contents = injectFmtPatch(config.modResults.contents);
    return config;
  });

module.exports = withFmtCxx17;
