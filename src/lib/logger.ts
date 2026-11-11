type LogMeta = Record<string, unknown>;

function safeError(error: unknown): LogMeta {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function logInfo(scope: string, message: string, meta?: LogMeta) {
  console.info(JSON.stringify({ level: "info", scope, message, ...meta, time: new Date().toISOString() }));
}

export function logWarn(scope: string, message: string, meta?: LogMeta) {
  console.warn(JSON.stringify({ level: "warn", scope, message, ...meta, time: new Date().toISOString() }));
}

export function logError(scope: string, message: string, error?: unknown, meta?: LogMeta) {
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message,
      ...(error === undefined ? {} : { error: safeError(error) }),
      ...meta,
      time: new Date().toISOString(),
    }),
  );
}
