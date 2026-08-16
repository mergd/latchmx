function shouldIgnore(message: string): boolean {
  return /metamask|failed to connect to metamask/i.test(message);
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      if (shouldIgnore(event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      if (shouldIgnore(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}
