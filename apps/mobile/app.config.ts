import type { ExpoConfig } from "expo/config";

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryUploadEnabled = process.env.SENTRY_ENABLE_UPLOAD === "true";
const buildProfile = process.env.EAS_BUILD_PROFILE ?? process.env.EAS_PROFILE;
const buildPlatform = process.env.EAS_BUILD_PLATFORM;
const appVersion = process.env.HYPOFIT_APP_VERSION ?? "1.0.1";
const appRevision = readOptionalTrimmedString(
  process.env.HYPOFIT_APP_REVISION,
  process.env.EXPO_PUBLIC_APP_REVISION,
  process.env.EAS_BUILD_GIT_COMMIT_HASH,
  process.env.GITHUB_SHA,
);
const iosBuildNumber = process.env.HYPOFIT_IOS_BUILD_NUMBER ?? "1";
const androidVersionCodeValue = process.env.HYPOFIT_ANDROID_VERSION_CODE;
const androidVersionCode = androidVersionCodeValue
  ? parsePositiveInteger(
      "HYPOFIT_ANDROID_VERSION_CODE",
      androidVersionCodeValue,
    )
  : 1;
const isProductionAndroidBuild =
  buildProfile === "production" && buildPlatform === "android";

if (
  buildProfile === "production" &&
  !isProductionAndroidBuild &&
  !process.env.HYPOFIT_IOS_BUILD_NUMBER
) {
  throw new Error(
    "HYPOFIT_IOS_BUILD_NUMBER is required for production iOS builds. Use scripts/eas-local-ios-build.sh.",
  );
}

if (isProductionAndroidBuild) {
  if (!androidVersionCodeValue) {
    throw new Error(
      "HYPOFIT_ANDROID_VERSION_CODE is required for production Android builds.",
    );
  }

  if (!googleServicesFile) {
    throw new Error(
      "GOOGLE_SERVICES_JSON is required for production Android builds.",
    );
  }
}

function parsePositiveInteger(name: string, value: string) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

function readOptionalTrimmedString(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

const iosConfig = {
  usesNonExemptEncryption: false,
  ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
};
const sentryPlugin =
  sentryUploadEnabled && sentryOrg && sentryProject
    ? [
        "@sentry/react-native/expo",
        {
          organization: sentryOrg,
          project: sentryProject,
          url: "https://sentry.io/",
        },
      ]
    : null;

const config: ExpoConfig = {
  name: "Hypofit",
  slug: "hypofit",
  scheme: "hypofit",
  version: appVersion,
  orientation: "portrait",
  userInterfaceStyle: "light",
  // Keep legacy architecture for the current release while map/navigation
  // dependencies are stabilized. See docs/completed/code-remediation-implementation-plan.md.
  newArchEnabled: false,
  icon: "./assets/icon.png",
  extra: {
    ...(appRevision ? { appRevision } : {}),
    eas: {
      projectId: "af7fe2c6-af1b-4c87-8976-cdccd20b100f",
    },
  },
  androidStatusBar: {
    backgroundColor: "#0F7A4D",
    barStyle: "light-content",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.contentruck.hypofit",
    buildNumber: iosBuildNumber,
    usesAppleSignIn: true,
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      CFBundleDevelopmentRegion: "ko",
      ITSAppUsesNonExemptEncryption: false,
    },
    config: iosConfig,
  },
  android: {
    package: "com.contentruck.hypofit",
    versionCode: androidVersionCode,
    googleServicesFile,
    config: googleMapsApiKey
      ? { googleMaps: { apiKey: googleMapsApiKey } }
      : undefined,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      monochromeImage: "./assets/adaptive-icon-monochrome.png",
      backgroundColor: "#0F7A4D",
    },
  },
  plugins: [
    "expo-router",
    "expo-apple-authentication",
    "expo-web-browser",
    "@react-native-community/datetimepicker",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0F7A4D",
        image: "./assets/splash-static.png",
        imageWidth: 176,
        resizeMode: "contain",
      },
    ],
    "./plugins/withFmtCxx17",
    "./plugins/withAndroidExpoPackageListFix",
    ...(sentryPlugin ? [sentryPlugin] : []),
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#0F7A4D",
        defaultChannel: "hypofit-workflow",
      },
    ],
    [
      "expo-image-picker",
      {
        cameraPermission: "프로필 사진을 촬영하기 위해 카메라를 사용합니다.",
        microphonePermission: false,
        photosPermission:
          "프로필 사진을 선택하기 위해 사진 보관함을 사용합니다.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "내 주변 공고를 보여드리기 위해 현재 위치를 사용합니다.",
      },
    ],
  ],
};

export default config;
