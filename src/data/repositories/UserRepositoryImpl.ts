/**
 * User Repository Implementation
 * Handles user authentication and management with IndexedDB storage
 */

import { hashPassword, verifyPassword } from '@/core/crypto/password';
import { deriveKeyFromPassword, encrypt, decrypt } from '@/core/crypto/encryption';
import { db, type StoredUser } from '../storage/database';
import type { User, AuthSession, SecuritySettings } from '@/domain/entities/User';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';

export class UserRepositoryImpl implements IUserRepository {
  /**
   * Create a new user account
   */
  async createUser(email: string, masterPassword: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the master password with Argon2id
    const hashedMasterPassword = await hashPassword(masterPassword);

    // Generate salt for vault key derivation
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);
    const saltBase64 = btoa(String.fromCharCode(...salt));

    // Derive vault key from password + salt
    const vaultKey = await deriveKeyFromPassword(masterPassword, salt);

    // Generate and encrypt the master vault key
    const masterVaultKey = new Uint8Array(32);
    crypto.getRandomValues(masterVaultKey);
    const masterVaultKeyBase64 = btoa(String.fromCharCode(...masterVaultKey));
    const encryptedVaultKey = await encrypt(masterVaultKeyBase64, vaultKey);

    // Create user entity
    const user: User = {
      id: crypto.randomUUID(),
      email,
      hashedMasterPassword,
      encryptedVaultKey: JSON.stringify(encryptedVaultKey),
      salt: saltBase64,
      biometricEnabled: false,
      webAuthnCredentials: [],
      createdAt: new Date(),
      lastLoginAt: new Date(),
      securitySettings: {
        sessionTimeoutMinutes: 15,
        requireBiometric: false,
        clipboardClearSeconds: 30,
        showPasswordStrength: true,
        enableSecurityAudit: true,
        passwordGenerationLength: 20,
        twoFactorEnabled: false,
      },
    };

    // Store in IndexedDB
    const storedUser: StoredUser = {
      ...user,
      createdAt: user.createdAt.getTime(),
      lastLoginAt: user.lastLoginAt.getTime(),
    };

    await db.users.add(storedUser);
    console.log('User created successfully:', email);

    return user;
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateWithPassword(email: string, masterPassword: string): Promise<AuthSession> {
    // Find user by email
    const storedUser = await db.users.where('email').equals(email).first();
    if (!storedUser) {
      throw new Error('Invalid email or password');
    }

    // Verify master password
    const isValid = await verifyPassword(masterPassword, storedUser.hashedMasterPassword);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Derive temporary key from password + salt (used to decrypt the vault key)
    const salt = Uint8Array.from(atob(storedUser.salt), c => c.charCodeAt(0));
    const tempKey = await deriveKeyFromPassword(masterPassword, salt);

    // Decrypt the actual vault key (masterVaultKey) from storage
    const encryptedVaultKeyData = JSON.parse(storedUser.encryptedVaultKey);
    const masterVaultKeyBase64 = await decrypt(encryptedVaultKeyData, tempKey);

    // Convert base64 master vault key to raw bytes
    const masterVaultKeyBytes = Uint8Array.from(atob(masterVaultKeyBase64), c => c.charCodeAt(0));

    // Import the raw master vault key as a CryptoKey
    const vaultKey = await crypto.subtle.importKey(
      'raw',
      masterVaultKeyBytes,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );

    // Update last login time
    await db.users.update(storedUser.id, {
      lastLoginAt: Date.now(),
    });

    // Create session with the actual vault key
    return {
      userId: storedUser.id,
      vaultKey,
      expiresAt: new Date(Date.now() + storedUser.securitySettings.sessionTimeoutMinutes * 60 * 1000),
      isLocked: false,
    };
  }

  /**
   * Authenticate with biometric (WebAuthn)
   */
  async authenticateWithBiometric(userId: string, credentialId: string): Promise<AuthSession> {
    const user = await db.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find the credential
    const credential = user.webAuthnCredentials.find(c => c.id === credentialId);
    if (!credential) {
      throw new Error('Biometric credential not found');
    }

    // Import the stored public key for verification
    const publicKeyBytes = Uint8Array.from(atob(credential.publicKey), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );

    // Perform WebAuthn authentication
    const { authenticateBiometric } = await import('@/core/auth/webauthn');
    const authResponse = await authenticateBiometric(
      credentialId,
      window.location.hostname
    );

    // Verify the signature (simplified - in production, verify the full authenticatorData)
    // For now, we trust the WebAuthn API's internal verification
    if (!authResponse.response.authenticatorData) {
      throw new Error('Invalid authentication response');
    }

    // Update credential counter and last used time
    const updatedCredentials = user.webAuthnCredentials.map(c =>
      c.id === credentialId
        ? { ...c, counter: credential.counter + 1, lastUsedAt: new Date() }
        : c
    );

    await db.users.update(userId, {
      webAuthnCredentials: updatedCredentials,
      lastLoginAt: Date.now(),
    });

    // Decrypt vault key (user must have it stored encrypted)
    const salt = Uint8Array.from(atob(user.salt), c => c.charCodeAt(0));
    const encryptedVaultKeyData = JSON.parse(user.encryptedVaultKey);
    
    // For biometric auth, we need to derive a key from stored data
    // In a real implementation, you'd prompt for password once to cache the vault key
    // or use a separate encrypted storage tied to the biometric credential
    // For this implementation, we'll require a password unlock first
    throw new Error('Biometric authentication requires initial password unlock. Please unlock with password first, then enable biometric.');
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const storedUser = await db.users.get(id);
    if (!storedUser) {
      return null;
    }

    return this.mapStoredUserToUser(storedUser);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const storedUser = await db.users.where('email').equals(email).first();
    if (!storedUser) {
      return null;
    }

    return this.mapStoredUserToUser(storedUser);
  }

  /**
   * Check if any users exist in the database
   */
  async hasAnyUsers(): Promise<boolean> {
    const count = await db.users.count();
    return count > 0;
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(userId: string, settings: Partial<SecuritySettings>): Promise<void> {
    const user = await db.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await db.users.update(userId, {
      securitySettings: {
        ...user.securitySettings,
        ...settings,
      },
    });
  }

  /**
   * Register biometric credential
   */
  async registerBiometric(userId: string, vaultKey: CryptoKey, deviceName?: string): Promise<void> {
    const user = await db.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if biometric is available
    const { isBiometricAvailable } = await import('@/core/auth/webauthn');
    const available = await isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric authentication is not available on this device');
    }

    // Register with WebAuthn
    const { registerBiometric } = await import('@/core/auth/webauthn');
    const registrationResponse = await registerBiometric({
      rpName: 'TrustVault',
      rpId: window.location.hostname,
      userId: user.id,
      userName: user.email,
      userDisplayName: user.displayName || user.email,
    });

    // Extract credential data
    const credentialId = registrationResponse.id;
    const publicKeyBytes = new Uint8Array(
      atob(registrationResponse.response.publicKey || '')
        .split('')
        .map(c => c.charCodeAt(0))
    );
    const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyBytes));

    // Create new credential record
    const newCredential = {
      id: credentialId,
      publicKey: publicKeyBase64,
      counter: 0,
      transports: registrationResponse.response.transports,
      createdAt: new Date(),
      deviceName: deviceName || 'Biometric Device',
    };

    // Store encrypted vault key with this credential
    // In production, you'd want to encrypt the vault key specifically for biometric access
    // For now, we'll mark biometric as enabled and require password unlock first
    const updatedCredentials = [...user.webAuthnCredentials, newCredential];

    await db.users.update(userId, {
      webAuthnCredentials: updatedCredentials,
      biometricEnabled: true,
    });

    console.log('Biometric credential registered successfully');
  }

  /**
   * Remove biometric credential
   */
  async removeBiometric(userId: string, credentialId: string): Promise<void> {
    const user = await db.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove the credential
    const updatedCredentials = user.webAuthnCredentials.filter(c => c.id !== credentialId);

    // Disable biometric if no credentials remain
    const biometricEnabled = updatedCredentials.length > 0;

    await db.users.update(userId, {
      webAuthnCredentials: updatedCredentials,
      biometricEnabled,
    });

    console.log('Biometric credential removed successfully');
  }

  /**
   * Create session (placeholder - sessions handled by authStore)
   */
  async createSession(userId: string, vaultKey: CryptoKey): Promise<AuthSession> {
    const user = await db.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId,
      vaultKey,
      expiresAt: new Date(Date.now() + user.securitySettings.sessionTimeoutMinutes * 60 * 1000),
      isLocked: false,
    };
  }

  /**
   * Get current session (placeholder)
   */
  async getSession(): Promise<AuthSession | null> {
    // Sessions are managed by Zustand store
    return null;
  }

  /**
   * Lock session (placeholder)
   */
  async lockSession(): Promise<void> {
    // Handled by authStore
  }

  /**
   * Unlock session (placeholder)
   */
  async unlockSession(_vaultKey: CryptoKey): Promise<void> {
    // Handled by authStore
  }

  /**
   * Destroy session (placeholder)
   */
  async destroySession(): Promise<void> {
    // Handled by authStore
  }

  /**
   * Change master password
   */
  async changeMasterPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await db.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.hashedMasterPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newHashedPassword = await hashPassword(newPassword);

    // Re-encrypt vault key with new password
    const currentSalt = Uint8Array.from(atob(user.salt), c => c.charCodeAt(0));
    const currentVaultKey = await deriveKeyFromPassword(currentPassword, currentSalt);

    const encryptedVaultKeyData = JSON.parse(user.encryptedVaultKey);
    const masterVaultKey = await decrypt(encryptedVaultKeyData, currentVaultKey);

    const newSalt = new Uint8Array(32);
    crypto.getRandomValues(newSalt);
    const newVaultKey = await deriveKeyFromPassword(newPassword, newSalt);
    const newEncryptedVaultKey = await encrypt(masterVaultKey, newVaultKey);

    // Update user
    await db.users.update(userId, {
      hashedMasterPassword: newHashedPassword,
      salt: btoa(String.fromCharCode(...newSalt)),
      encryptedVaultKey: JSON.stringify(newEncryptedVaultKey),
    });
  }

  /**
   * Get last login time
   */
  async getLastLoginTime(userId: string): Promise<Date | null> {
    const user = await db.users.get(userId);
    if (!user) {
      return null;
    }

    return new Date(user.lastLoginAt);
  }

  /**
   * Helper: Convert StoredUser to User
   */
  private mapStoredUserToUser(storedUser: StoredUser): User {
    return {
      ...storedUser,
      createdAt: new Date(storedUser.createdAt),
      lastLoginAt: new Date(storedUser.lastLoginAt),
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepositoryImpl();
