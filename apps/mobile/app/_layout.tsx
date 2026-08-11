import "react-native-url-polyfill/auto";
import "react-native-gesture-handler";
import "../global.css";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { TextProps } from "react-native";
import { Text, TextInput } from "react-native";
import { enableScreens } from "react-native-screens";
import { AppProviders } from "@/providers/AppProviders";
import { addAppBreadcrumb, wrapWithSentry } from "@/shared/diagnostics/sentry";

// Keep disabled until the react-native-screens release-build startup crash
// investigation is closed. See docs/completed/code-remediation-implementation-plan.md.
enableScreens(false);
addAppBreadcrumb("root_layout_module_loaded");

const defaultFontStyle = { fontFamily: "HypofitSansRegular" };

function installDefaultFont() {
  const textWithDefaults = Text as typeof Text & { defaultProps?: TextProps };
  const inputWithDefaults = TextInput as typeof TextInput & { defaultProps?: TextProps };

  textWithDefaults.defaultProps = textWithDefaults.defaultProps ?? {};
  textWithDefaults.defaultProps.style = defaultFontStyle;

  inputWithDefaults.defaultProps = inputWithDefaults.defaultProps ?? {};
  inputWithDefaults.defaultProps.style = defaultFontStyle;
}

installDefaultFont();
addAppBreadcrumb("root_layout_default_font_installed");

function RootLayout() {
  const [fontsLoaded] = useFonts({
    HypofitSansRegular: require("../assets/fonts/SpoqaHanSansNeo-Regular.ttf"),
    HypofitSansMedium: require("../assets/fonts/SpoqaHanSansNeo-Medium.ttf"),
    HypofitSansBold: require("../assets/fonts/SpoqaHanSansNeo-Bold.ttf"),
  });

  if (!fontsLoaded) {
    addAppBreadcrumb("root_layout_waiting_for_fonts");
    return null;
  }

  addAppBreadcrumb("root_layout_render_app_providers");

  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor="#F6F7F8" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="interviews" />
        <Stack.Screen name="support" />
        <Stack.Screen name="notice" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}

export default wrapWithSentry(RootLayout);
