/**
 * Password Hashing Tests
 * Tests Scrypt password hashing and verification
 * Phase 0 validation
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  analyzePasswordStrength,
  generateSecurePassword,
  generatePassphrase
} from '../password';

describe('Password Hashing (Scrypt)', () => {
  describe('Hash Generation', () => {
    it('should hash password with scrypt', async () => {
      const password = 'TestPassword123!';
      
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('scrypt$')).toBe(true);
    });

    it('should include scrypt parameters in hash', async () => {
      const password = 'TestPassword123!';
      
      const hash = await hashPassword(password);
      const parts = hash.split('$');
      
      expect(parts[0]).toBe('scrypt');
      expect(parts[1]).toBe('32768'); // N parameter
      expect(parts[2]).toBe('8');     // r parameter
      expect(parts[3]).toBe('1');     // p parameter
      expect(parts[4]).toBeDefined(); // salt
      expect(parts[5]).toBeDefined(); // hash
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Different salts
    });

    it('should handle empty password', async () => {
      const password = '';
      
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.startsWith('scrypt$')).toBe(true);
    });

    it('should handle special characters', async () => {
      const password = 'P@ssw0rd!™€日本語🔐';
      
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.startsWith('scrypt$')).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000);
      
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.startsWith('scrypt$')).toBe(true);
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should reject empty password when hash is not empty', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('', hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle case sensitivity', async () => {
      const password = 'TestPassword123!';
      const wrongCase = 'testpassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongCase, hash);
      
      expect(isValid).toBe(false);
    });

    it('should reject invalid hash format', async () => {
      const password = 'TestPassword123!';
      const invalidHash = 'invalid_hash_format';
      
      const isValid = await verifyPassword(password, invalidHash);
      
      expect(isValid).toBe(false);
    });

    it('should reject argon2 hash format (migration check)', async () => {
      const password = 'TestPassword123!';
      const argon2Hash = '$argon2id$v=19$m=65536,t=3,p=4$...';
      
      const isValid = await verifyPassword(password, argon2Hash);
      
      expect(isValid).toBe(false);
    });

    it('should perform constant-time comparison', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const start1 = Date.now();
      await verifyPassword(password, hash);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await verifyPassword('WrongPassword', hash);
      const time2 = Date.now() - start2;
      
      // Times should be similar (within 50% tolerance)
      // This is a rough check, not perfect for timing attacks
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      expect(ratio).toBeLessThan(2);
    });
  });

  describe('Password Strength Analysis', () => {
    it('should rate very weak passwords correctly', () => {
      const result = analyzePasswordStrength('123');
      
      expect(result.strength).toBe('very_weak');
      expect(result.score).toBeLessThan(20);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should rate weak passwords correctly', () => {
      const result = analyzePasswordStrength('password');
      
      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThan(40);
    });

    it('should rate fair passwords correctly', () => {
      const result = analyzePasswordStrength('Password1');
      
      expect(result.strength).toBe('fair');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
    });

    it('should rate strong passwords correctly', () => {
      const result = analyzePasswordStrength('Password123!');
      
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
    });

    it('should rate very strong passwords correctly', () => {
      const result = analyzePasswordStrength('MyV3ry$tr0ngP@ssw0rd!');
      
      expect(result.strength).toBe('very_strong');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should penalize common patterns', () => {
      const weak = analyzePasswordStrength('password123');
      const strong = analyzePasswordStrength('xKj9$mL2pQ!z');
      
      expect(weak.score).toBeLessThan(strong.score);
      expect(weak.feedback).toContain('Avoid common patterns and words');
    });

    it('should penalize repeated characters', () => {
      const repeated = analyzePasswordStrength('Passssword111!!!');
      const varied = analyzePasswordStrength('P@ssw0rd!Var1ed');
      
      expect(repeated.score).toBeLessThan(varied.score);
    });

    it('should provide helpful feedback', () => {
      const result = analyzePasswordStrength('short');
      
      expect(result.feedback).toContain('Password should be at least 8 characters long');
    });

    it('should reward length', () => {
      const short = analyzePasswordStrength('Ab1!');
      const medium = analyzePasswordStrength('Abcd1234!@#$');
      const long = analyzePasswordStrength('Abcd1234!@#$Efgh5678%^&*');
      
      expect(short.score).toBeLessThan(medium.score);
      expect(medium.score).toBeLessThan(long.score);
    });

    it('should detect missing character types', () => {
      const noLower = analyzePasswordStrength('UPPERCASE123!');
      const noUpper = analyzePasswordStrength('lowercase123!');
      const noNumbers = analyzePasswordStrength('NoNumbers!@#');
      const noSymbols = analyzePasswordStrength('NoSymbols123');
      
      expect(noLower.feedback).toContain('Add lowercase letters');
      expect(noUpper.feedback).toContain('Add uppercase letters');
      expect(noNumbers.feedback).toContain('Add numbers');
      expect(noSymbols.feedback).toContain('Add special characters');
    });
  });

  describe('Secure Password Generation', () => {
    it('should generate password of specified length', () => {
      const password = generateSecurePassword(20);
      
      expect(password.length).toBe(20);
    });

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword(20);
      const password2 = generateSecurePassword(20);
      
      expect(password1).not.toBe(password2);
    });

    it('should include lowercase by default', () => {
      const password = generateSecurePassword(100);
      
      expect(/[a-z]/.test(password)).toBe(true);
    });

    it('should include uppercase by default', () => {
      const password = generateSecurePassword(100);
      
      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it('should include numbers by default', () => {
      const password = generateSecurePassword(100);
      
      expect(/[0-9]/.test(password)).toBe(true);
    });

    it('should include symbols by default', () => {
      const password = generateSecurePassword(100);
      
      expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should respect lowercase option', () => {
      const withLower = generateSecurePassword(50, { lowercase: true, uppercase: false, numbers: false, symbols: false });
      const withoutLower = generateSecurePassword(50, { lowercase: false, uppercase: true, numbers: true, symbols: true });
      
      expect(/[a-z]/.test(withLower)).toBe(true);
      expect(/[a-z]/.test(withoutLower)).toBe(false);
    });

    it('should respect uppercase option', () => {
      const withUpper = generateSecurePassword(50, { lowercase: false, uppercase: true, numbers: false, symbols: false });
      const withoutUpper = generateSecurePassword(50, { lowercase: true, uppercase: false, numbers: true, symbols: true });
      
      expect(/[A-Z]/.test(withUpper)).toBe(true);
      expect(/[A-Z]/.test(withoutUpper)).toBe(false);
    });

    it('should respect numbers option', () => {
      const withNumbers = generateSecurePassword(50, { lowercase: false, uppercase: false, numbers: true, symbols: false });
      const withoutNumbers = generateSecurePassword(50, { lowercase: true, uppercase: true, numbers: false, symbols: true });
      
      expect(/[0-9]/.test(withNumbers)).toBe(true);
      expect(/[0-9]/.test(withoutNumbers)).toBe(false);
    });

    it('should respect symbols option', () => {
      const withSymbols = generateSecurePassword(50, { lowercase: false, uppercase: false, numbers: false, symbols: true });
      const withoutSymbols = generateSecurePassword(50, { lowercase: true, uppercase: true, numbers: true, symbols: false });
      
      expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(withSymbols)).toBe(true);
      expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(withoutSymbols)).toBe(false);
    });

    it('should exclude ambiguous characters when requested', () => {
      const password = generateSecurePassword(100, { excludeAmbiguous: true });
      
      // Should not contain: i, l, o (lowercase), I, O (uppercase), 0, 1 (numbers), | (symbol)
      expect(/[ilo]/.test(password)).toBe(false);
      expect(/[IO]/.test(password)).toBe(false);
      expect(/[01]/.test(password)).toBe(false);
      expect(/\|/.test(password)).toBe(false);
    });

    it('should fallback to all characters if no options selected', () => {
      const password = generateSecurePassword(100, {
        lowercase: false,
        uppercase: false,
        numbers: false,
        symbols: false
      });
      
      expect(password.length).toBe(100);
      // Should still generate something (fallback charset)
    });
  });

  describe('Passphrase Generation', () => {
    it('should generate passphrase with specified word count', () => {
      const passphrase = generatePassphrase(6);
      const words = passphrase.split('-');
      
      expect(words.length).toBe(6);
    });

    it('should generate different passphrases each time', () => {
      const passphrase1 = generatePassphrase(6);
      const passphrase2 = generatePassphrase(6);
      
      expect(passphrase1).not.toBe(passphrase2);
    });

    it('should use hyphens as separators', () => {
      const passphrase = generatePassphrase(6);
      
      expect(passphrase).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
    });

    it('should handle different word counts', () => {
      const short = generatePassphrase(3);
      const medium = generatePassphrase(6);
      const long = generatePassphrase(10);
      
      expect(short.split('-').length).toBe(3);
      expect(medium.split('-').length).toBe(6);
      expect(long.split('-').length).toBe(10);
    });
  });
});
