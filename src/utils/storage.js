function cloneFallback(fallback) {
  if (fallback === undefined || fallback === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneFallback(fallback);
    return JSON.parse(raw);
  } catch {
    return cloneFallback(fallback);
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}