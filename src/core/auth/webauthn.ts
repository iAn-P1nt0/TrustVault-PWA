/**
 * WebAuthn Biometric Authentication Service
 * Implements fingerprint and face recognition using SimpleWebAuthn
 * FIDO2 compliant biometric authentication
 */

import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/types';

export interface BiometricCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
  createdAt: Date;
  deviceName?: string;
}

export interface RegistrationOptions {
  rpName: string; // Relying Party name
  rpId: string; // Domain
  userId: string;
  userName: string;
  userDisplayName: string;
  timeout?: number;
  attestationType?: AttestationConveyancePreference;
}

/**
 * Checks if WebAuthn is supported in the browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    window?.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Checks if platform authenticator (biometric) is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return false;
  }
}

/**
 * Registers a new biometric credential
 */
export async function registerBiometric(
  options: RegistrationOptions
): Promise<RegistrationResponseJSON> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  try {
    // Create registration options
    const registrationOptions: PublicKeyCredentialCreationOptionsJSON = {
      rp: {
        name: options.rpName,
        id: options.rpId,
      },
      user: {
        id: options.userId,
        name: options.userName,
        displayName: options.userDisplayName,
      },
      challenge: generateChallenge(),
      pubKeyCredParams: [
        { type: 'public-key' as const, alg: -7 }, // ES256
        { type: 'public-key' as const, alg: -257 }, // RS256
      ],
      timeout: options.timeout || 60000,
      attestation: options.attestationType || 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform' as const, // Use platform authenticator (biometric)
        requireResidentKey: false,
        residentKey: 'preferred' as const,
        userVerification: 'required' as const, // Require biometric verification
      },
    };

    // Start registration ceremony
    const response = await startRegistration(registrationOptions);
    return response;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    throw new Error('Failed to register biometric credential');
  }
}

/**
 * Authenticates using biometric credential
 */
export async function authenticateBiometric(
  credentialId: string,
  rpId: string
): Promise<AuthenticationResponseJSON> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  try {
    // Create authentication options
    const authenticationOptions = {
      challenge: generateChallenge(),
      timeout: 60000,
      rpId: rpId,
      allowCredentials: [
        {
          id: credentialId,
          type: 'public-key' as const,
          transports: ['internal'] as AuthenticatorTransport[],
        },
      ],
      userVerification: 'required' as const,
    };

    // Start authentication ceremony
    const response = await startAuthentication(authenticationOptions);
    return response;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    throw new Error('Failed to authenticate with biometric');
  }
}

/**
 * Generates a cryptographically secure challenge
 */
function generateChallenge(): string {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return arrayBufferToBase64(challenge);
}

/**
 * Converts ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i] as number);
  }
  return btoa(binary);
}

/**
 * Gets authenticator info (for debugging)
 */
export async function getAuthenticatorInfo(): Promise<{
  biometricAvailable: boolean;
  conditionalMediationAvailable: boolean;
}> {
  const biometricAvailable = await isBiometricAvailable();
  
  let conditionalMediationAvailable = false;
  if (
    window?.PublicKeyCredential?.isConditionalMediationAvailable !== undefined
  ) {
    conditionalMediationAvailable =
      await window.PublicKeyCredential.isConditionalMediationAvailable();
  }

  return {
    biometricAvailable,
    conditionalMediationAvailable,
  };
}
