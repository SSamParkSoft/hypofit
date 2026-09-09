import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchServiceStatus, isFullMaintenance, normalServiceStatus, type ServiceStatus } from "./serviceStatus";
import { useAuth } from "@/features/auth/AuthProvider";
import { subscribeToMaintenanceSignal } from "@/shared/maintenance/maintenanceSignal";
import { useAppActive } from "@/shared/hooks/useAppActive";

interface MaintenanceContextValue {
  errorMessage: string | null;
  isActive: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  status: ServiceStatus;
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);
const refreshDelayMs = 65_000;

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const { isLoading: isAuthLoading, isSyncing: isAuthSyncing } = useAuth();
  const isAppActive = useAppActive();
  const [status, setStatus] = useState<ServiceStatus>(normalServiceStatus);
  const [isActive, setIsActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;
    setIsRefreshing(true);

    try {
      const nextStatus = await fetchServiceStatus();
      setStatus(nextStatus);
      setIsActive(isFullMaintenance(nextStatus));
      setErrorMessage(null);
    } catch {
      setErrorMessage("점검 상태를 다시 확인하지 못했어요.");
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAppActive || isAuthLoading || isAuthSyncing) {
      return;
    }

    void refresh();
  }, [isAppActive, isAuthLoading, isAuthSyncing, refresh]);

  useEffect(() => subscribeToMaintenanceSignal(() => {
    setIsActive(true);
    void refresh();
  }), [refresh]);

  useEffect(() => {
    if (!isActive || !isAppActive) {
      return;
    }

    const timeout = setTimeout(() => void refresh(), refreshDelayMs + Math.floor(Math.random() * 5_000));
    return () => clearTimeout(timeout);
  }, [isActive, isAppActive, refresh, status.endsAt, status.status]);

  const value = useMemo<MaintenanceContextValue>(() => ({
    errorMessage,
    isActive,
    isRefreshing,
    refresh,
    status,
  }), [errorMessage, isActive, isRefreshing, refresh, status]);

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error("useMaintenance must be used within MaintenanceProvider.");
  }

  return context;
}
