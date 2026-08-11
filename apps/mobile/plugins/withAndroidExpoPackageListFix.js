const { withAppBuildGradle } = require("expo/config-plugins");

const PATCH_MARKER = "// Hypofit: patch ExpoModulesPackage import for Android release autolinking";

const PATCH_BLOCK = `
${PATCH_MARKER}
afterEvaluate {
    def patchExpoPackageListTask = tasks.register("patchExpoPackageListImport") {
        def packageListFile = file("$buildDir/generated/autolinking/src/main/java/com/facebook/react/PackageList.java")

        doLast {
            if (packageListFile.exists()) {
                def packageListContents = packageListFile.getText("UTF-8")
                def patchedPackageListContents = packageListContents.replace(
                    "import expo.core.ExpoModulesPackage;",
                    "import expo.modules.ExpoModulesPackage;"
                )

                if (patchedPackageListContents != packageListContents) {
                    packageListFile.write(patchedPackageListContents, "UTF-8")
                }
            }
        }
    }

    tasks.matching { task ->
        task.name == "compileDebugJavaWithJavac" ||
            task.name == "compileReleaseJavaWithJavac" ||
            task.name == "compileDebugKotlin" ||
            task.name == "compileReleaseKotlin"
    }.configureEach { task ->
        task.dependsOn(patchExpoPackageListTask)
    }
}
`;

function injectPatch(contents) {
  if (contents.includes(PATCH_MARKER)) {
    return contents;
  }

  return `${contents.trimEnd()}\n\n${PATCH_BLOCK}\n`;
}

const withAndroidExpoPackageListFix = (config) =>
  withAppBuildGradle(config, (config) => {
    config.modResults.contents = injectPatch(config.modResults.contents);
    return config;
  });

module.exports = withAndroidExpoPackageListFix;
