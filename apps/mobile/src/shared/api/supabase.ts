import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv, readSupabaseEnv } from "./env";

let client: SupabaseClient | null = null;
let authRefreshListenerInstalled = false;

export function isSupabaseConfigured() {
  return hasSupabaseEnv();
}

export function getSupabaseClient() {
  if (client) {
    return client;
  }

  const supabaseEnv = readSupabaseEnv();

  client = createClient(supabaseEnv.supabaseUrl, supabaseEnv.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
    },
  });

  installAuthRefreshListener(client);

  return client;
}

function installAuthRefreshListener(supabase: SupabaseClient) {
  if (authRefreshListenerInstalled) {
    return;
  }

  authRefreshListenerInstalled = true;

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
      return;
    }

    void supabase.auth.stopAutoRefresh();
  });
}
