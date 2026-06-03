import crypto from 'node:crypto';

const keyLength = 64;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, keyLength).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.startsWith('scrypt$')) return false;

  const [, salt, hash] = storedHash.split('$');
  if (!salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, keyLength);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}

export function generateTemporaryPassword() {
  return `TB-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function assertPasswordPolicy(password: string) {
  if (password.length < 8) {
    throw new Error('Password minimal 8 karakter.');
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password wajib berisi huruf dan angka.');
  }
}
