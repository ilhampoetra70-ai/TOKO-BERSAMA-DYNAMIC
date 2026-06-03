import crypto from 'node:crypto';

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(buffer: Buffer) {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    output += base32Alphabet[Number.parseInt(chunk, 2)];
  }

  return output;
}

function decodeBase32(input: string) {
  const clean = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';

  for (const char of clean) {
    const value = base32Alphabet.indexOf(char);
    if (value < 0) throw new Error('Secret TOTP tidak valid.');
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secret: string, step: number) {
  const key = decodeBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(step / 0x100000000), 0);
  counter.writeUInt32BE(step >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secret: string, code: string) {
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (const drift of [-1, 0, 1]) {
    if (generateTotp(secret, currentStep + drift) === code) return true;
  }

  return false;
}

export function createOtpAuthUrl(username: string, secret: string) {
  const issuer = 'TOKO BERSAMA POS';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
