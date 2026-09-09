import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { subscribeToMaintenanceSignal } from "../../shared/maintenance/maintenanceSignal";
import { fetchServiceStatus, isFullMaintenance, normalServiceStatus, type ServiceStatus } from "./serviceStatus";

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
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeToMaintenanceSignal(() => {
    setIsActive(true);
    void refresh();
  }), [refresh]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refresh]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timeout = window.setTimeout(() => void refresh(), refreshDelayMs + Math.floor(Math.random() * 5_000));
    return () => window.clearTimeout(timeout);
  }, [isActive, refresh, status.endsAt, status.status]);

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
