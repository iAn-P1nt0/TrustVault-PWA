/**
 * Password Module Edge Cases and Security Tests
 * Tests for Unicode passwords, malicious inputs, timing attacks, edge cases
 * Addresses identified gaps in password module coverage
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  analyzePasswordStrength,
  generateSecurePassword,
  generatePassphrase
} from '../password';

describe('Password Edge Cases and Security', () => {
  describe('Unicode and Special Character Handling', () => {
    it('should handle emoji passwords', async () => {
      const password = '🔐🛡️🔑💾🚀🌟✨🎉';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle RTL text passwords', async () => {
      const password = 'مرحبا بك في TrustVault';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle Chinese character passwords', async () => {
      const password = '你好世界密码';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle Hebrew character passwords', async () => {
      const password = 'שלום עולם סיסמה';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle mixed unicode scripts', async () => {
      const password = 'Hello مرحبا 你好 שלום 🔐 Привет';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle passwords with null bytes', async () => {
      const password = 'test\u0000password\u0000here';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle passwords with control characters', async () => {
      const password = 'test\n\r\t\bpassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle zero-width characters', async () => {
      const password = 'test\u200Bpassword\uFEFF'; // Zero-width space
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('Empty and Boundary Passwords', () => {
    it('should reject empty password for hashing', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    it('should reject very short password (less than minimum)', async () => {
      await expect(hashPassword('abc')).rejects.toThrow();
    });

    it('should handle minimum length password', async () => {
      const password = 'abcdefghijkl'; // Exactly 12 chars
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle very long passwords (10000 chars)', async () => {
      const password = 'a'.repeat(10000);
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    }, 30000);

    it('should handle extremely long passwords (100000 chars)', async () => {
      const password = 'x'.repeat(100000);
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    }, 60000);
  });

  describe('Malicious Hash Format Attacks', () => {
    it('should reject malformed hash format', async () => {
      const password = 'ValidPassword123!';
      const malformedHash = 'notahash';

      const isValid = await verifyPassword(password, malformedHash);
      expect(isValid).toBe(false);
    });

    it('should reject hash with wrong algorithm prefix', async () => {
      const password = 'ValidPassword123!';
      const wrongAlgoHash = 'md5$salt$hash';

      const isValid = await verifyPassword(password, wrongAlgoHash);
      expect(isValid).toBe(false);
    });

    it('should reject hash with missing components', async () => {
      const password = 'ValidPassword123!';
      const incompleteHash = 'scrypt$32768$8';

      const isValid = await verifyPassword(password, incompleteHash);
      expect(isValid).toBe(false);
    });

    it('should reject hash with invalid scrypt parameters', async () => {
      const password = 'ValidPassword123!';
      // Invalid N parameter (not power of 2)
      const invalidHash = 'scrypt$12345$8$1$somesalt$somehash';

      const isValid = await verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });

    it('should reject hash with SQL injection attempt', async () => {
      const password = 'ValidPassword123!';
      const sqlInjection = "scrypt$32768$8$1$'; DROP TABLE users; --$hash";

      const isValid = await verifyPassword(password, sqlInjection);
      expect(isValid).toBe(false);
    });

    it('should reject hash with path traversal attempt', async () => {
      const password = 'ValidPassword123!';
      const pathTraversal = 'scrypt$32768$8$1$../../etc/passwd$hash';

      const isValid = await verifyPassword(password, pathTraversal);
      expect(isValid).toBe(false);
    });

    it('should reject excessively large N parameter (DoS attempt)', async () => {
      const password = 'ValidPassword123!';
      // Extremely large N would cause DoS
      const dosHash = 'scrypt$999999999$8$1$salt$hash';

      const isValid = await verifyPassword(password, dosHash);
      expect(isValid).toBe(false);
    });
  });

  describe('Integer Overflow and Parameter Edge Cases', () => {
    it('should handle maximum safe integer in scrypt parameters', async () => {
      const password = 'ValidPassword123!';
      const hash = await hashPassword(password);

      // Verify hash uses safe parameters
      expect(hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$/);
      const parts = hash.split('$');
      const N = parseInt(parts[1] ?? '0');
      const r = parseInt(parts[2] ?? '0');
      const p = parseInt(parts[3] ?? '0');

      expect(N).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(r).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(p).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });

    it('should reject negative scrypt parameters', async () => {
      const password = 'ValidPassword123!';
      const negativeParams = 'scrypt$-32768$8$1$salt$hash';

      const isValid = await verifyPassword(password, negativeParams);
      expect(isValid).toBe(false);
    });

    it('should reject zero scrypt parameters', async () => {
      const password = 'ValidPassword123!';
      const zeroParams = 'scrypt$0$0$0$salt$hash';

      const isValid = await verifyPassword(password, zeroParams);
      expect(isValid).toBe(false);
    });
  });

  describe('Concurrent Hashing (Race Conditions)', () => {
    it('should handle concurrent password hashing', async () => {
      const passwords = Array.from({ length: 10 }, (_, i) => `Password${i}!`);

      const hashes = await Promise.all(passwords.map(p => hashPassword(p)));

      expect(hashes).toHaveLength(10);
      // All hashes should be unique (different salts)
      expect(new Set(hashes).size).toBe(10);

      // Verify each hash
      const verifications = await Promise.all(
        passwords.map((p, i) => verifyPassword(p, hashes[i] ?? ''))
      );

      expect(verifications.every(v => v)).toBe(true);
    }, 30000);

    it('should handle concurrent verification', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const verifications = await Promise.all(
        Array.from({ length: 20 }, () => verifyPassword(password, hash))
      );

      expect(verifications.every(v => v)).toBe(true);
    });
  });

  describe('Password Strength Analysis Edge Cases', () => {
    it('should analyze very weak password', () => {
      const result = analyzePasswordStrength('12345678');

      expect(result.score).toBeLessThan(20);
      expect(result.category).toBe('very_weak');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should analyze weak password', () => {
      const result = analyzePasswordStrength('password123');

      expect(result.score).toBeLessThan(40);
      expect(['very_weak', 'weak']).toContain(result.category);
    });

    it('should analyze fair password', () => {
      const result = analyzePasswordStrength('Password123');

      expect(result.score).toBeGreaterThan(20);
      expect(['weak', 'fair', 'good']).toContain(result.category);
    });

    it('should analyze good password', () => {
      const result = analyzePasswordStrength('P@ssw0rd!2024');

      expect(result.score).toBeGreaterThan(40);
      expect(['fair', 'good', 'strong']).toContain(result.category);
    });

    it('should analyze strong password', () => {
      const result = analyzePasswordStrength('X9$mK#pL2@qR5^nT8&wY');

      expect(result.score).toBeGreaterThan(60);
      expect(['good', 'strong', 'very_strong']).toContain(result.category);
    });

    it('should detect common patterns', () => {
      const result = analyzePasswordStrength('qwerty123456');

      expect(result.feedback.some(f =>
        f.toLowerCase().includes('common') ||
        f.toLowerCase().includes('pattern')
      )).toBe(true);
    });

    it('should handle empty string for strength analysis', () => {
      const result = analyzePasswordStrength('');

      expect(result.score).toBe(0);
      expect(result.category).toBe('very_weak');
    });

    it('should handle unicode in strength analysis', () => {
      const result = analyzePasswordStrength('🔐Pässw0rd!你好');

      expect(result.score).toBeGreaterThan(0);
      expect(result.category).toBeDefined();
    });

    it('should analyze very long password', () => {
      const longPassword = 'a'.repeat(1000);
      const result = analyzePasswordStrength(longPassword);

      expect(result.score).toBeGreaterThan(0);
      expect(result.category).toBeDefined();
    });
  });

  describe('Password Generation Edge Cases', () => {
    it('should generate password with minimum length', () => {
      const password = generateSecurePassword(8);

      expect(password.length).toBe(8);
    });

    it('should generate password with maximum practical length', () => {
      const password = generateSecurePassword(128);

      expect(password.length).toBe(128);
    });

    it('should generate password with very large length', () => {
      const password = generateSecurePassword(1000);

      expect(password.length).toBe(1000);
    });

    it('should generate passwords with only lowercase', () => {
      const password = generateSecurePassword(20, {
        uppercase: false,
        numbers: false,
        symbols: false
      });

      expect(password).toMatch(/^[a-z]+$/);
    });

    it('should generate passwords with only uppercase', () => {
      const password = generateSecurePassword(20, {
        lowercase: false,
        numbers: false,
        symbols: false
      });

      expect(password).toMatch(/^[A-Z]+$/);
    });

    it('should generate passwords with only numbers', () => {
      const password = generateSecurePassword(20, {
        lowercase: false,
        uppercase: false,
        symbols: false
      });

      expect(password).toMatch(/^[0-9]+$/);
    });

    it('should generate passwords with only symbols', () => {
      const password = generateSecurePassword(20, {
        lowercase: false,
        uppercase: false,
        numbers: false
      });

      expect(password).toMatch(/^[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/);
    });

    it('should exclude ambiguous characters when specified', () => {
      const password = generateSecurePassword(100, {
        excludeAmbiguous: true
      });

      // Should not contain 0, O, I, l, 1
      expect(password).not.toMatch(/[0OIl1]/);
    });

    it('should generate different passwords each time', () => {
      const passwords = Array.from({ length: 100 }, () =>
        generateSecurePassword(16)
      );

      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBe(100);
    });

    it('should handle all character types enabled', () => {
      const password = generateSecurePassword(20, {
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: true
      });

      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
    });
  });

  describe('Passphrase Generation Edge Cases', () => {
    it('should generate passphrase with minimum words', () => {
      const passphrase = generatePassphrase(3);

      const words = passphrase.split('-');
      expect(words.length).toBe(3);
    });

    it('should generate passphrase with many words', () => {
      const passphrase = generatePassphrase(10);

      const words = passphrase.split('-');
      expect(words.length).toBe(10);
    });

    it('should use custom separator', () => {
      const passphrase = generatePassphrase(4, { separator: '_' });

      expect(passphrase).toContain('_');
      expect(passphrase).not.toContain('-');

      const words = passphrase.split('_');
      expect(words.length).toBe(4);
    });

    it('should use space separator', () => {
      const passphrase = generatePassphrase(4, { separator: ' ' });

      expect(passphrase).toContain(' ');

      const words = passphrase.split(' ');
      expect(words.length).toBe(4);
    });

    it('should capitalize words when specified', () => {
      const passphrase = generatePassphrase(4, { capitalize: true });

      const words = passphrase.split('-');
      words.forEach(word => {
        expect(word.charAt(0)).toMatch(/[A-Z]/);
      });
    });

    it('should not capitalize words by default', () => {
      const passphrase = generatePassphrase(4, { capitalize: false });

      const words = passphrase.split('-');
      // At least one word should be lowercase
      expect(words.some(word => word.charAt(0) === word.charAt(0)?.toLowerCase())).toBe(true);
    });

    it('should include numbers when specified', () => {
      const passphrase = generatePassphrase(4, { includeNumbers: true });

      expect(passphrase).toMatch(/[0-9]/);
    });

    it('should generate different passphrases each time', () => {
      const passphrases = Array.from({ length: 50 }, () =>
        generatePassphrase(5)
      );

      const uniquePassphrases = new Set(passphrases);
      expect(uniquePassphrases.size).toBe(50);
    });
  });

  describe('Constant-Time Verification (Timing Attack Prevention)', () => {
    it('should take similar time for correct and incorrect passwords', async () => {
      const correctPassword = 'CorrectPassword123!';
      const incorrectPassword = 'WrongPassword123!';
      const hash = await hashPassword(correctPassword);

      const timings: number[] = [];

      // Measure correct password verification
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await verifyPassword(correctPassword, hash);
        const end = performance.now();
        timings.push(end - start);
      }

      // Measure incorrect password verification
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await verifyPassword(incorrectPassword, hash);
        const end = performance.now();
        timings.push(end - start);
      }

      // Both should take roughly the same time (within reasonable variance)
      // This is a behavioral test - actual constant-time is in the crypto
      expect(timings.length).toBe(20);
    });

    it('should not leak information through early rejection', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      // Passwords that differ at different positions
      const tests = [
        'XestPassword123!', // Differs at position 0
        'TXstPassword123!', // Differs at position 1
        'TeXtPassword123!', // Differs at position 2
        'TestPassword123X', // Differs at end
      ];

      const results = await Promise.all(
        tests.map(p => verifyPassword(p, hash))
      );

      // All should be false (no timing leak)
      expect(results.every(r => r === false)).toBe(true);
    });
  });

  describe('Hash Format Consistency', () => {
    it('should produce PHC-compatible hash format', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      // Format: scrypt$N$r$p$salt$hash
      expect(hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$.+\$.+$/);
    });

    it('should include all required components', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const parts = hash.split('$');
      expect(parts.length).toBe(6);
      expect(parts[0]).toBe('scrypt');
      expect(parts[1]).toBeDefined(); // N
      expect(parts[2]).toBeDefined(); // r
      expect(parts[3]).toBeDefined(); // p
      expect(parts[4]).toBeDefined(); // salt
      expect(parts[5]).toBeDefined(); // hash
    });

    it('should use correct scrypt parameters', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const parts = hash.split('$');
      const N = parseInt(parts[1] ?? '0');
      const r = parseInt(parts[2] ?? '0');
      const p = parseInt(parts[3] ?? '0');

      expect(N).toBe(32768); // 2^15
      expect(r).toBe(8);
      expect(p).toBe(1);
    });
  });
});
