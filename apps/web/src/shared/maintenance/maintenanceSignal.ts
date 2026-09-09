type MaintenanceSignalListener = () => void;

const listeners = new Set<MaintenanceSignalListener>();

export function notifyMaintenanceDetected() {
  listeners.forEach((listener) => listener());
}

export function subscribeToMaintenanceSignal(listener: MaintenanceSignalListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
