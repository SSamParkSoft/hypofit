type MapTabReselectListener = () => void;

const mapTabReselectListeners = new Set<MapTabReselectListener>();

export function emitMapTabReselect() {
  for (const listener of mapTabReselectListeners) {
    listener();
  }
}

export function subscribeMapTabReselect(listener: MapTabReselectListener) {
  mapTabReselectListeners.add(listener);

  return () => {
    mapTabReselectListeners.delete(listener);
  };
}
