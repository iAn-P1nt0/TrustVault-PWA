/**
 * Password Hashing Service
 * Uses scrypt for secure password hashing (from @noble/hashes)
 * OWASP compliant password hashing with memory-hard algorithm
 */

import { scrypt } from '@noble/hashes/scrypt';
import { randomBytes } from '@noble/hashes/utils';

// Scrypt parameters (OWASP recommended for password hashing)
const SCRYPT_CONFIG = {
  N: 32768, // CPU/memory cost parameter (2^15)
  r: 8,     // Block size parameter
  p: 1,     // Parallelization parameter
  dkLen: 32 // Derived key length in bytes
};

export interface HashedPassword {
  hash: string; // Encoded hash with parameters
  salt: string; // Base64 encoded salt
}

/**
 * Hashes a password using scrypt
 * Returns the hash in a custom encoded format: scrypt$N$r$p$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate random salt (16 bytes)
    const salt = randomBytes(16);

    // Hash password with scrypt
    const hash = scrypt(password, salt, SCRYPT_CONFIG);

    // Encode to base64
    const saltB64 = btoa(String.fromCharCode(...salt));
    const hashB64 = btoa(String.fromCharCode(...hash));

    // Return in PHC-like format
    return `scrypt$${SCRYPT_CONFIG.N}$${SCRYPT_CONFIG.r}$${SCRYPT_CONFIG.p}$${saltB64}$${hashB64}`;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verifies a password against a scrypt hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    console.log('Verifying password...');

    // Parse the hash format: scrypt$N$r$p$salt$hash
    const parts = hashedPassword.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      console.error('Invalid hash format. Expected scrypt hash but got:', hashedPassword.substring(0, 50));
      console.error('This might be an old argon2 hash. Please clear the database using: window.debugDB.clearAllData()');
      return false;
    }

    const N = parseInt(parts[1] || '0', 10);
    const r = parseInt(parts[2] || '0', 10);
    const p = parseInt(parts[3] || '0', 10);
    const saltB64 = parts[4] || '';
    const hashB64 = parts[5] || '';

    // Decode salt and hash
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const expectedHash = Uint8Array.from(atob(hashB64), c => c.charCodeAt(0));

    // Hash the provided password with the same parameters
    const actualHash = scrypt(password, salt, { N, r, p, dkLen: expectedHash.length });

    // Constant-time comparison
    let match = true;
    for (let i = 0; i < expectedHash.length; i++) {
      if (expectedHash[i] !== actualHash[i]) {
        match = false;
      }
    }

    console.log('Password verification result:', match);
    return match;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Analyzes password strength
 * Returns a score from 0 to 100
 */
export function analyzePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
} {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters long');
  } else if (password.length >= 8) {
    score += 20;
  }
  
  if (password.length >= 12) {
    score += 10;
  }
  
  if (password.length >= 16) {
    score += 10;
  }

  // Complexity checks
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add special characters');
  }

  // Common patterns check (basic)
  const commonPatterns = [
    /12345/,
    /qwerty/i,
    /password/i,
    /admin/i,
    /letmein/i,
    /abc123/i,
  ];

  if (commonPatterns.some((pattern) => pattern.test(password))) {
    score -= 30;
    feedback.push('Avoid common patterns and words');
  }

  // Sequential characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repeating characters');
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine strength level
  let strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  if (score < 20) {
    strength = 'very_weak';
  } else if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'fair';
  } else if (score < 80) {
    strength = 'strong';
  } else {
    strength = 'very_strong';
  }

  return { score, feedback, strength };
}

/**
 * Generates a cryptographically secure random password
 */
export function generateSecurePassword(
  length: number = 20,
  options: {
    lowercase?: boolean;
    uppercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
    excludeAmbiguous?: boolean;
  } = {}
): string {
  const {
    lowercase = true,
    uppercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = false,
  } = options;

  // Character sets
  let lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  let uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let numberChars = '0123456789';
  let symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Exclude ambiguous characters if requested
  if (excludeAmbiguous) {
    lowercaseChars = lowercaseChars.replace(/[ilo]/g, ''); // Remove i, l, o
    uppercaseChars = uppercaseChars.replace(/[IO]/g, ''); // Remove I, O
    numberChars = numberChars.replace(/[01]/g, ''); // Remove 0, 1
    symbolChars = symbolChars.replace(/[|]/g, ''); // Remove pipe
  }

  // Build character set based on options
  let charset = '';
  const charGroups: string[] = [];

  if (lowercase && lowercaseChars.length > 0) {
    charset += lowercaseChars;
    charGroups.push(lowercaseChars);
  }
  if (uppercase && uppercaseChars.length > 0) {
    charset += uppercaseChars;
    charGroups.push(uppercaseChars);
  }
  if (numbers && numberChars.length > 0) {
    charset += numberChars;
    charGroups.push(numberChars);
  }
  if (symbols && symbolChars.length > 0) {
    charset += symbolChars;
    charGroups.push(symbolChars);
  }

  // Fallback if no options selected
  if (charset.length === 0) {
    charset = lowercaseChars + uppercaseChars + numberChars + symbolChars;
    charGroups.push(lowercaseChars, uppercaseChars, numberChars, symbolChars);
  }

  // Generate password
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = (randomBytes[i] as number) % charset.length;
    const char = charset[randomIndex];
    if (char !== undefined) {
      password += char;
    }
  }

  // Ensure at least one character from each selected type
  // Replace random positions if any type is missing
  for (let i = 0; i < charGroups.length; i++) {
    const group = charGroups[i];
    if (!group) continue;

    const hasCharFromGroup = password.split('').some((char) => group.includes(char));
    if (!hasCharFromGroup && password.length > 0) {
      // Replace a random position with a character from this group
      const replaceIndex = Math.floor(Math.random() * password.length);
      const groupRandomBytes = new Uint8Array(1);
      crypto.getRandomValues(groupRandomBytes);
      const charIndex = (groupRandomBytes[0] as number) % group.length;
      password = password.substring(0, replaceIndex) + group[charIndex] + password.substring(replaceIndex + 1);
    }
  }

  return password;
}

/**
 * Generates a memorable passphrase
 */
export function generatePassphrase(wordCount: number = 6): string {
  // Basic word list (in production, use a comprehensive word list)
  const words = [
    'correct', 'horse', 'battery', 'staple', 'monkey', 'dragon',
    'wizard', 'castle', 'rainbow', 'thunder', 'phoenix', 'crystal',
    'mountain', 'ocean', 'forest', 'river', 'galaxy', 'planet',
    'rocket', 'satellite', 'comet', 'nebula', 'aurora', 'eclipse',
  ];

  const randomBytes = new Uint8Array(wordCount);
  crypto.getRandomValues(randomBytes);

  const selectedWords: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = (randomBytes[i] as number) % words.length;
    selectedWords.push(words[randomIndex] as string);
  }

  return selectedWords.join('-');
}
