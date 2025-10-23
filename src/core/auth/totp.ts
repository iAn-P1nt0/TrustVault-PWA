/**
 * TOTP (Time-based One-Time Password) Generator
 * RFC 6238 compliant implementation for 2FA codes
 * Compatible with Google Authenticator, Authy, etc.
 */

import { hmac } from '@noble/hashes/hmac';
import { sha1 } from '@noble/hashes/sha1';

/**
 * Base32 character set (RFC 4648)
 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a base32-encoded string to Uint8Array
 * Base32 is commonly used for TOTP secrets (e.g., Google Authenticator format)
 */
export function base32Decode(base32: string): Uint8Array {
  // Remove spaces and convert to uppercase
  const cleanedBase32 = base32.replace(/\s/g, '').toUpperCase();

  // Validate base32 string
  const validChars = new RegExp(`^[${BASE32_CHARS}=]*$`);
  if (!validChars.test(cleanedBase32)) {
    throw new Error('Invalid base32 string');
  }

  // Remove padding
  const unpadded = cleanedBase32.replace(/=+$/, '');

  // Calculate output length
  const length = unpadded.length;
  const outputLength = Math.floor((length * 5) / 8);
  const output = new Uint8Array(outputLength);

  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < length; i++) {
    const char = unpadded[i];
    if (!char) continue;

    const charIndex = BASE32_CHARS.indexOf(char);
    if (charIndex === -1) {
      throw new Error(`Invalid character in base32 string: ${char}`);
    }

    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }

  return output;
}

/**
 * Encodes a Uint8Array to base32 string
 * Useful for generating TOTP secrets
 */
export function base32Encode(data: Uint8Array): string {
  let output = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | (data[i] as number);
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  // Add padding
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

/**
 * Generates a TOTP code based on a secret and current time
 * @param secret - Base32-encoded secret key
 * @param timeStep - Time step in seconds (default: 30)
 * @param digits - Number of digits in the code (default: 6)
 * @param time - Optional time in milliseconds (defaults to Date.now())
 * @returns TOTP code as a string (zero-padded)
 */
export function generateTOTP(
  secret: string,
  timeStep: number = 30,
  digits: number = 6,
  time: number = Date.now()
): string {
  // Calculate time counter
  const counter = Math.floor(time / 1000 / timeStep);

  // Convert counter to 8-byte buffer (big-endian)
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter), false); // false = big-endian

  // Decode secret from base32
  const secretBytes = base32Decode(secret);

  // Generate HMAC-SHA1 hash
  const hash = hmac(sha1, secretBytes, new Uint8Array(buffer));

  // Dynamic truncation (RFC 6238)
  const offset = hash[hash.length - 1]! & 0x0f;
  const code =
    (((hash[offset]! & 0x7f) << 24) |
      ((hash[offset + 1]!) << 16) |
      ((hash[offset + 2]!) << 8) |
      hash[offset + 3]!) %
    Math.pow(10, digits);

  // Return zero-padded code
  return code.toString().padStart(digits, '0');
}

/**
 * Formats a TOTP code with a space in the middle for readability
 * Example: "123456" -> "123 456"
 */
export function formatTOTPCode(code: string): string {
  if (code.length === 6) {
    return `${code.substring(0, 3)} ${code.substring(3)}`;
  }
  return code;
}

/**
 * Gets the remaining time in seconds until the next TOTP code
 * @param timeStep - Time step in seconds (default: 30)
 * @param time - Optional time in milliseconds (defaults to Date.now())
 * @returns Remaining seconds (1-30)
 */
export function getTOTPRemaining(timeStep: number = 30, time: number = Date.now()): number {
  const elapsed = Math.floor(time / 1000) % timeStep;
  return timeStep - elapsed;
}

/**
 * Gets the progress percentage for the current TOTP code
 * @param timeStep - Time step in seconds (default: 30)
 * @param time - Optional time in milliseconds (defaults to Date.now())
 * @returns Progress percentage (0-100)
 */
export function getTOTPProgress(timeStep: number = 30, time: number = Date.now()): number {
  const remaining = getTOTPRemaining(timeStep, time);
  return (remaining / timeStep) * 100;
}

/**
 * Validates a TOTP secret format
 * @param secret - Base32-encoded secret to validate
 * @returns true if valid, false otherwise
 */
export function isValidTOTPSecret(secret: string): boolean {
  try {
    const cleaned = secret.replace(/\s/g, '').toUpperCase();
    if (cleaned.length === 0) return false;

    // Check if it's valid base32
    const validChars = new RegExp(`^[${BASE32_CHARS}=]*$`);
    if (!validChars.test(cleaned)) return false;

    // Try to decode it
    base32Decode(cleaned);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a random TOTP secret (for testing or new account setup)
 * @param length - Length in bytes (default: 20, which is 32 base32 chars)
 * @returns Base32-encoded secret
 */
export function generateTOTPSecret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/**
 * Verifies a TOTP code against a secret
 * Allows for time drift by checking adjacent time windows
 * @param code - TOTP code to verify
 * @param secret - Base32-encoded secret
 * @param window - Number of time steps to check before/after (default: 1)
 * @param timeStep - Time step in seconds (default: 30)
 * @returns true if code is valid, false otherwise
 */
export function verifyTOTP(
  code: string,
  secret: string,
  window: number = 1,
  timeStep: number = 30
): boolean {
  const now = Date.now();

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const time = now + i * timeStep * 1000;
    const expectedCode = generateTOTP(secret, timeStep, 6, time);

    if (code === expectedCode) {
      return true;
    }
  }

  return false;
}
