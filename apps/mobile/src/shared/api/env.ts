import { Platform } from "react-native";

const localApiBaseUrl = Platform.select({
  android: "http://10.0.2.2:8000",
  default: "http://127.0.0.1:8000",
});

const publicEnv = {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
} as const;

type PublicEnvName = keyof typeof publicEnv;

function readPublicEnv(name: PublicEnvName) {
  const value = publicEnv[name];

  if (!value) {
    throw new Error(`${name} is required for Hypofit mobile.`);
  }

  return value;
}

function readApiBaseUrl() {
  const value = publicEnv.EXPO_PUBLIC_API_BASE_URL;

  if (value) {
    return value;
  }

  return localApiBaseUrl;
}

export const mobileEnv = {
  apiBaseUrl: readApiBaseUrl(),
  supportEmail: publicEnv.EXPO_PUBLIC_SUPPORT_EMAIL ?? "ssamso8282@gmail.com",
};

export function hasSupabaseEnv() {
  return Boolean(publicEnv.EXPO_PUBLIC_SUPABASE_URL && publicEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY);
}

export function readSupabaseEnv() {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required for Supabase auth.",
    );
  }

  return {
    supabaseUrl: readPublicEnv("EXPO_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readPublicEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
