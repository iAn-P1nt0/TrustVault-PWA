/**
 * Credential Repository Implementation
 * Implements ICredentialRepository with encrypted storage
 */

import { ICredentialRepository } from '@/domain/repositories/ICredentialRepository';
import { Credential, CredentialInput } from '@/domain/entities/Credential';
import { db, type StoredCredential } from '../storage/database';
import { encrypt, decrypt } from '@/core/crypto/encryption';
import { analyzePasswordStrength } from '@/core/crypto/password';

export class CredentialRepository implements ICredentialRepository {
  async create(input: CredentialInput, encryptionKey: CryptoKey): Promise<Credential> {
    // Encrypt the password
    const encryptedPassword = await encrypt(input.password, encryptionKey);

    // Encrypt TOTP secret if provided
    let encryptedTotpSecret: string | undefined;
    if (input.totpSecret) {
      const totpSecretEncrypted = await encrypt(input.totpSecret, encryptionKey);
      encryptedTotpSecret = JSON.stringify(totpSecretEncrypted);
    }

    // Encrypt card-specific fields if provided
    let encryptedCardNumber: string | undefined;
    if (input.cardNumber) {
      const cardNumberEncrypted = await encrypt(input.cardNumber, encryptionKey);
      encryptedCardNumber = JSON.stringify(cardNumberEncrypted);
    }

    let encryptedCvv: string | undefined;
    if (input.cvv) {
      const cvvEncrypted = await encrypt(input.cvv, encryptionKey);
      encryptedCvv = JSON.stringify(cvvEncrypted);
    }

    const credential: StoredCredential = {
      id: crypto.randomUUID(),
      title: input.title,
      username: input.username,
      encryptedPassword: JSON.stringify(encryptedPassword),
      encryptedTotpSecret,
      url: input.url ?? undefined,
      notes: input.notes ?? undefined,
      category: input.category,
      tags: input.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      securityScore: analyzePasswordStrength(input.password).score,
      // Card-specific fields
      encryptedCardNumber,
      cardholderName: input.cardholderName,
      expiryMonth: input.expiryMonth,
      expiryYear: input.expiryYear,
      encryptedCvv,
      cardType: input.cardType,
      billingAddress: input.billingAddress,
    };

    await db.credentials.add(credential);

    return this.mapToDomain(credential);
  }

  async findById(id: string, decryptionKey: CryptoKey): Promise<Credential | null> {
    const stored = await db.credentials.get(id);
    if (!stored) {
      return null;
    }

    // Update last accessed timestamp
    await this.updateAccessTime(id);

    return this.decryptCredential(stored, decryptionKey);
  }

  async findAll(decryptionKey: CryptoKey): Promise<Credential[]> {
    const storedCredentials = await db.credentials.toArray();
    return Promise.all(storedCredentials.map((c) => this.decryptCredential(c, decryptionKey)));
  }

  async update(
    id: string,
    input: Partial<CredentialInput>,
    encryptionKey: CryptoKey
  ): Promise<Credential> {
    const existing = await db.credentials.get(id);
    if (!existing) {
      throw new Error('Credential not found');
    }

    const updates: Partial<StoredCredential> = {
      updatedAt: Date.now(),
    };

    if (input.title) updates.title = input.title;
    if (input.username) updates.username = input.username;
    if (input.url !== undefined) updates.url = input.url;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.category) updates.category = input.category;
    if (input.tags) updates.tags = input.tags;
    if (input.isFavorite !== undefined) updates.isFavorite = input.isFavorite;

    if (input.password) {
      const encryptedPassword = await encrypt(input.password, encryptionKey);
      updates.encryptedPassword = JSON.stringify(encryptedPassword);
      updates.securityScore = analyzePasswordStrength(input.password).score;
    }

    if (input.totpSecret !== undefined) {
      if (input.totpSecret) {
        const totpSecretEncrypted = await encrypt(input.totpSecret, encryptionKey);
        updates.encryptedTotpSecret = JSON.stringify(totpSecretEncrypted);
      } else {
        // Empty string means remove TOTP secret
        updates.encryptedTotpSecret = undefined;
      }
    }

    // Handle card-specific field updates
    if (input.cardNumber !== undefined) {
      if (input.cardNumber) {
        const cardNumberEncrypted = await encrypt(input.cardNumber, encryptionKey);
        updates.encryptedCardNumber = JSON.stringify(cardNumberEncrypted);
      } else {
        updates.encryptedCardNumber = undefined;
      }
    }

    if (input.cvv !== undefined) {
      if (input.cvv) {
        const cvvEncrypted = await encrypt(input.cvv, encryptionKey);
        updates.encryptedCvv = JSON.stringify(cvvEncrypted);
      } else {
        updates.encryptedCvv = undefined;
      }
    }

    if (input.cardholderName !== undefined) updates.cardholderName = input.cardholderName;
    if (input.expiryMonth !== undefined) updates.expiryMonth = input.expiryMonth;
    if (input.expiryYear !== undefined) updates.expiryYear = input.expiryYear;
    if (input.cardType !== undefined) updates.cardType = input.cardType;
    if (input.billingAddress !== undefined) updates.billingAddress = input.billingAddress;

    await db.credentials.update(id, updates);

    const updated = await db.credentials.get(id);
    return this.mapToDomain(updated!);
  }

  async delete(id: string): Promise<void> {
    await db.credentials.delete(id);
  }

  async search(query: string, decryptionKey: CryptoKey): Promise<Credential[]> {
    const lowerQuery = query.toLowerCase();
    const allCredentials = await db.credentials.toArray();

    const filtered = allCredentials.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.username.toLowerCase().includes(lowerQuery) ||
        c.url?.toLowerCase().includes(lowerQuery) ||
        c.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );

    return Promise.all(filtered.map((c) => this.decryptCredential(c, decryptionKey)));
  }

  async findByCategory(category: string, decryptionKey: CryptoKey): Promise<Credential[]> {
    const credentials = await db.credentials.where('category').equals(category).toArray();
    return Promise.all(credentials.map((c) => this.decryptCredential(c, decryptionKey)));
  }

  async findFavorites(decryptionKey: CryptoKey): Promise<Credential[]> {
    const credentials = await db.credentials.where('isFavorite').equals(1).toArray();
    return Promise.all(credentials.map((c) => this.decryptCredential(c, decryptionKey)));
  }

  async exportAll(decryptionKey: CryptoKey): Promise<string> {
    const credentials = await db.credentials.toArray();
    
    // Decrypt passwords for export
    const decrypted = await Promise.all(
      credentials.map(async (c) => {
        try {
          const encData = JSON.parse(c.encryptedPassword);
          const password = await decrypt(encData, decryptionKey);
          return {
            ...c,
            password, // Include plain password for export
            encryptedPassword: undefined,
          };
        } catch {
          return {
            ...c,
            password: '[DECRYPTION_FAILED]',
            encryptedPassword: undefined,
          };
        }
      })
    );

    return JSON.stringify(decrypted, null, 2);
  }

  async importFromJson(data: string, encryptionKey: CryptoKey): Promise<number> {
    try {
      const parsed = JSON.parse(data) as Array<
        Omit<StoredCredential, 'encryptedPassword'> & { password: string }
      >;

      let imported = 0;
      for (const item of parsed) {
        try {
          await this.create(
            {
              title: item.title,
              username: item.username,
              password: item.password,
              url: item.url ?? undefined,
              notes: item.notes ?? undefined,
              category: item.category,
              tags: item.tags,
            },
            encryptionKey
          );
          imported++;
        } catch (error) {
          console.error('Failed to import credential:', error);
        }
      }

      return imported;
    } catch (error) {
      console.error('Failed to parse import data:', error);
      throw new Error('Invalid import data format');
    }
  }

  async updateAccessTime(id: string): Promise<void> {
    await db.credentials.update(id, { lastAccessedAt: Date.now() });
  }

  async analyzeSecurityScore(id: string, decryptionKey: CryptoKey): Promise<number> {
    const credential = await db.credentials.get(id);
    if (!credential) {
      throw new Error('Credential not found');
    }

    try {
      const encData = JSON.parse(credential.encryptedPassword);
      const password = await decrypt(encData, decryptionKey);
      const analysis = analyzePasswordStrength(password);
      
      // Update the security score
      await db.credentials.update(id, { securityScore: analysis.score });
      
      return analysis.score;
    } catch {
      return 0;
    }
  }

  private async decryptCredential(
    stored: StoredCredential,
    vaultKey: CryptoKey
  ): Promise<Credential> {
    try {
      // Decrypt the password
      const encryptedPasswordData = JSON.parse(stored.encryptedPassword);
      const password = await decrypt(encryptedPasswordData, vaultKey);

      // Decrypt TOTP secret if present
      let totpSecret: string | undefined;
      if (stored.encryptedTotpSecret) {
        try {
          const encryptedTotpData = JSON.parse(stored.encryptedTotpSecret);
          totpSecret = await decrypt(encryptedTotpData, vaultKey);
        } catch (error) {
          console.error('Failed to decrypt TOTP secret:', error);
          // Continue without TOTP secret if decryption fails
        }
      }

      // Decrypt card-specific fields if present
      let cardNumber: string | undefined;
      if (stored.encryptedCardNumber) {
        try {
          const encryptedCardData = JSON.parse(stored.encryptedCardNumber);
          cardNumber = await decrypt(encryptedCardData, vaultKey);
        } catch (error) {
          console.error('Failed to decrypt card number:', error);
        }
      }

      let cvv: string | undefined;
      if (stored.encryptedCvv) {
        try {
          const encryptedCvvData = JSON.parse(stored.encryptedCvv);
          cvv = await decrypt(encryptedCvvData, vaultKey);
        } catch (error) {
          console.error('Failed to decrypt CVV:', error);
        }
      }

      return {
        id: stored.id,
        title: stored.title,
        username: stored.username,
        password, // Decrypted password
        url: stored.url,
        notes: stored.notes,
        category: stored.category,
        tags: stored.tags,
        createdAt: new Date(stored.createdAt),
        updatedAt: new Date(stored.updatedAt),
        lastAccessedAt: stored.lastAccessedAt ? new Date(stored.lastAccessedAt) : undefined,
        isFavorite: stored.isFavorite,
        securityScore: stored.securityScore,
        totpSecret, // Decrypted TOTP secret
        // Card-specific fields
        cardNumber,
        cardholderName: stored.cardholderName,
        expiryMonth: stored.expiryMonth,
        expiryYear: stored.expiryYear,
        cvv,
        cardType: stored.cardType,
        billingAddress: stored.billingAddress,
      };
    } catch (error) {
      console.error('Failed to decrypt credential:', error);
      // Return credential with placeholder password if decryption fails
      return {
        id: stored.id,
        title: stored.title,
        username: stored.username,
        password: '[Decryption Failed]',
        url: stored.url,
        notes: stored.notes,
        category: stored.category,
        tags: stored.tags,
        createdAt: new Date(stored.createdAt),
        updatedAt: new Date(stored.updatedAt),
        lastAccessedAt: stored.lastAccessedAt ? new Date(stored.lastAccessedAt) : undefined,
        isFavorite: stored.isFavorite,
        securityScore: stored.securityScore,
        totpSecret: undefined, // Don't include failed TOTP secret
      };
    }
  }

  private mapToDomain(stored: StoredCredential): Credential {
    return {
      ...stored,
      password: stored.encryptedPassword, // This will show encrypted data - used only in create() which returns immediately
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt),
      lastAccessedAt: stored.lastAccessedAt ? new Date(stored.lastAccessedAt) : undefined,
    };
  }
}

export const credentialRepository = new CredentialRepository();
