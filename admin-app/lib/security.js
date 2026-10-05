// Primitivas de seguridad sin dependencias: hash de contraseñas (scrypt),
// TOTP (RFC 6238, compatible con Google Authenticator) y tokens de sesión.
import crypto from "node:crypto";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64");
  const got = crypto.scryptSync(password, Buffer.from(salt, "base64"), expected.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(expected, got);
}

// Hash ficticio para igualar tiempos cuando el usuario no existe
export const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString("hex"));

export function passwordProblems(pw) {
  const p = [];
  if (pw.length < 12) p.push("al menos 12 caracteres");
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) p.push("mayúsculas y minúsculas");
  if (!/\d/.test(pw)) p.push("algún número");
  return p;
}

/* ===== TOTP ===== */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  let bits = 0, value = 0;
  const out = [];
  for (const c of str.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(crypto.randomBytes(20));

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1e6).padStart(6, "0");
}

// Devuelve el contador del código válido (para impedir reutilizarlo) o null
export function verifyTotp(secret, code, lastCounter = -1) {
  code = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(Date.now() / 30000);
  for (const c of [now, now - 1, now + 1]) {
    if (c <= lastCounter) continue;
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, c)), Buffer.from(code))) return c;
  }
  return null;
}

export const totpUri = (secret, email) =>
  `otpauth://totp/${encodeURIComponent("Majosoft:" + email)}?secret=${secret}&issuer=Majosoft&algorithm=SHA1&digits=6&period=30`;

/* ===== Tokens ===== */
export const newToken = () => crypto.randomBytes(32).toString("base64url");
export const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
