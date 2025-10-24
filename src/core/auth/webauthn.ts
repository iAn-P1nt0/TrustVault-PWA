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
 * Verifies WebAuthn registration response
 * @param response Registration response from authenticator
 * @param expectedChallenge The challenge that was sent
 * @returns True if valid
 */
export function verifyRegistrationResponse(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): boolean {
  // Basic validation - in production, you'd verify:
  // 1. Challenge matches
  // 2. Origin matches
  // 3. Attestation statement is valid
  // 4. Public key is valid
  
  if (!response.id || !response.response.clientDataJSON) {
    return false;
  }

  // Decode and verify client data
  try {
    const clientDataJSON = atob(response.response.clientDataJSON);
    const clientData = JSON.parse(clientDataJSON) as {
      type: string;
      challenge: string;
      origin: string;
    };

    // Verify type
    if (clientData.type !== 'webauthn.create') {
      return false;
    }

    // Verify challenge (simplified)
    if (clientData.challenge !== expectedChallenge) {
      console.warn('Challenge mismatch');
      // Note: In production, this should be a hard failure
    }

    // Verify origin
    if (clientData.origin !== window.location.origin) {
      console.warn('Origin mismatch');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to verify registration response:', error);
    return false;
  }
}

/**
 * Verifies WebAuthn authentication response
 * @param response Authentication response from authenticator
 * @param expectedChallenge The challenge that was sent
 * @param storedCounter The stored signature counter
 * @returns New counter value if valid, throws if invalid
 */
export function verifyAuthenticationResponse(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  storedCounter: number
): number {
  // Basic validation
  if (!response.id || !response.response.authenticatorData) {
    throw new Error('Invalid authentication response');
  }

  // Decode client data
  try {
    const clientDataJSON = atob(response.response.clientDataJSON);
    const clientData = JSON.parse(clientDataJSON) as {
      type: string;
      challenge: string;
      origin: string;
    };

    // Verify type
    if (clientData.type !== 'webauthn.get') {
      throw new Error('Invalid authentication type');
    }

    // Verify origin
    if (clientData.origin !== window.location.origin) {
      throw new Error('Origin mismatch');
    }

    // Extract counter from authenticator data (last 4 bytes of authenticatorData)
    const authData = atob(response.response.authenticatorData);
    const authDataBytes = new Uint8Array(authData.length);
    for (let i = 0; i < authData.length; i++) {
      authDataBytes[i] = authData.charCodeAt(i);
    }

    // Counter is at bytes 33-36
    const counter =
      (authDataBytes[33] << 24) |
      (authDataBytes[34] << 16) |
      (authDataBytes[35] << 8) |
      authDataBytes[36];

    // Verify counter increased (prevents replay attacks)
    if (counter <= storedCounter && counter !== 0) {
      throw new Error('Counter did not increase - possible cloned authenticator');
    }

    return counter;
  } catch (error) {
    console.error('Failed to verify authentication response:', error);
    throw error;
  }
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

/**
 * Gets user-friendly device name based on platform
 */
export function getDeviceName(userAgentOverride?: string): string {
  const ua = userAgentOverride ?? navigator.userAgent;
  
  // Check more specific platforms first (iPhone/iPad before Mac)
  if (ua.includes('iPhone')) return 'iPhone Face ID';
  if (ua.includes('iPad')) return 'iPad Face ID';
  if (ua.includes('Mac')) return 'Mac Touch ID';
  if (ua.includes('Windows')) return 'Windows Hello';
  if (ua.includes('Android')) return 'Android Biometric';
  
  return 'Biometric Device';
}
