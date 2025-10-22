/**
 * Domain Entity: Credential
 * Represents a securely stored credential with encrypted data
 */
export interface Credential {
  id: string;
  title: string;
  username: string;
  encryptedPassword: string; // Base64 encoded encrypted data
  url?: string | undefined;
  notes?: string | undefined;
  category: CredentialCategory;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date | undefined;
  isFavorite: boolean;
  securityScore?: number | undefined; // 0-100 based on password strength
}

export type CredentialCategory = 
  | 'login'
  | 'credit_card'
  | 'bank_account'
  | 'secure_note'
  | 'identity'
  | 'api_key'
  | 'ssh_key';

export interface CredentialInput {
  title: string;
  username: string;
  password: string; // Plain text - will be encrypted before storage
  url?: string | undefined;
  notes?: string | undefined;
  category: CredentialCategory;
  tags?: string[];
}
