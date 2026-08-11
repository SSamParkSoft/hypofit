import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { PushNotificationManager } from "@/features/push/PushNotificationManager";
import { addAppBreadcrumb } from "@/shared/diagnostics/sentry";
import { useReactQueryAppFocus } from "@/shared/hooks/useReactQueryAppFocus";

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  useReactQueryAppFocus();
  addAppBreadcrumb("app_providers_render");

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PushNotificationManager />
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
