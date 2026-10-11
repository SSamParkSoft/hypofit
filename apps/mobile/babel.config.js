const path = require("path");

const expoPackageDir = path.dirname(require.resolve("expo/package.json"));
const expoPreset = require.resolve("babel-preset-expo", {
  paths: [expoPackageDir],
});

module.exports = function (api) {
  api.cache(true);

  return {
    presets: [[expoPreset, { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
