const transientPattern = /upstream connect|disconnect|reset before headers|connection termination|connection reset|econnreset|fetch failed|network|timeout|timed out/i;

export function isRetryableError(status, message = '') {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(Number(status)) || transientPattern.test(String(message));
}

export function retryDelay(attempt) {
  return Math.min(800 * (2 ** Math.max(0, attempt - 1)), 8000);
}
