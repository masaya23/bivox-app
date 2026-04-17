export interface SubscriptionDebugEntry {
  id: string;
  timestamp: string;
  source: string;
  event: string;
  payload: unknown;
}

const STORAGE_KEY = 'englishapp_subscription_debug_logs';
const MAX_LOG_ENTRIES = 150;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack || null,
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 40);
    return Object.fromEntries(entries.map(([key, entryValue]) => [key, sanitizeValue(entryValue)]));
  }

  return value;
}

function readLogs(): SubscriptionDebugEntry[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as SubscriptionDebugEntry[] : [];
  } catch {
    return [];
  }
}

function writeLogs(logs: SubscriptionDebugEntry[]) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOG_ENTRIES)));
}

export function appendSubscriptionDebugLog(
  source: string,
  event: string,
  payload: unknown = null
) {
  const entry: SubscriptionDebugEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source,
    event,
    payload: sanitizeValue(payload),
  };

  const logs = readLogs();
  logs.push(entry);
  writeLogs(logs);
}

export function getSubscriptionDebugLogs(): SubscriptionDebugEntry[] {
  return readLogs();
}

export function clearSubscriptionDebugLogs() {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
