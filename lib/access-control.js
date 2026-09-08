import { createHash, timingSafeEqual } from 'node:crypto';

function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}

export function verifyBasicAuthorization(header, expectedUser, expectedPassword) {
  if (!expectedPassword) return true;
  const match = /^Basic\s+(.+)$/i.exec(String(header || ''));
  if (!match) return false;
  let decoded = '';
  try {
    decoded = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    return false;
  }
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  const user = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return timingSafeEqual(digest(user), digest(expectedUser || 'judge'))
    && timingSafeEqual(digest(password), digest(expectedPassword));
}

export function verifyAccessPassword(value, expectedPassword) {
  if (!expectedPassword) return true;
  if (!value) return false;
  return timingSafeEqual(digest(value), digest(expectedPassword));
}

export function requestIsAuthorized(req, env = process.env) {
  const expectedPassword = env.JUDGE_ACCESS_PASSWORD || '';
  return verifyAccessPassword(req.headers['x-judge-password'], expectedPassword)
    || verifyBasicAuthorization(
      req.headers.authorization,
      env.JUDGE_ACCESS_USER || 'judge',
      expectedPassword
    );
}
