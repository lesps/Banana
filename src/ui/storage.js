// JSON key/value storage that never throws: localStorage when usable, otherwise memory.
export function memoryBackend() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}

function defaultBackend() {
  try {
    const ls = globalThis.localStorage;
    ls.setItem('banana:probe', '1');
    ls.removeItem('banana:probe');
    return ls;
  } catch {
    return memoryBackend();
  }
}

export function createStorage(backend = defaultBackend()) {
  return {
    get(key, fallback) {
      try {
        const v = backend.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        backend.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try { backend.removeItem(key); } catch { /* storage blocked */ }
    },
  };
}
