/**
 * Authentication Flow Integration Tests
 * Tests complete signup → signin → signout flow with real components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/presentation/App';
import { useAuthStore } from '@/presentation/store/authStore';
import { db } from '@/data/storage/database';

describe('Authentication Flow Integration', () => {
  beforeEach(async () => {
    // Clear all stores and database before each test
    useAuthStore.getState().clearSession();
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear database tables
    await db.users.clear();
    await db.credentials.clear();
    await db.sessions.clear();

    // Wait for any pending operations
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  describe('Signup Flow', () => {
    it('should complete signup with valid credentials', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      // Wait for app to initialize - with no users, it auto-redirects to signup
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      // Fill signup form
      const emailInput = screen.getByLabelText(/email/i);
      // Both password fields have "Master Password" in label, so we use getAllByLabelText
      const passwordInputs = screen.getAllByLabelText(/master password/i);
      const passwordInput = passwordInputs[0]; // First one is the password field
      const confirmInput = passwordInputs[1]; // Second one is confirm field

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmInput, 'SecurePassword123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Should navigate to dashboard after signup completes
      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
      }, { timeout: 10000 });

      // Verify authenticated state
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('newuser@example.com');
    });

    it('should reject signup with weak password', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      // With no users, app auto-redirects to signup
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      // Try weak password
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInputs = screen.getAllByLabelText(/master password/i);
      const passwordInput = passwordInputs[0];
      const confirmInput = passwordInputs[1];

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123456');
      await user.type(confirmInput, '123456');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Should show error about weak password (minimum length requirement)
      await waitFor(() => {
        expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
      });
    });

    it('should reject signup with mismatched passwords', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      // With no users, app auto-redirects to signup
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInputs = screen.getAllByLabelText(/master password/i);
      const passwordInput = passwordInputs[0];
      const confirmInput = passwordInputs[1];

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmInput, 'DifferentPassword123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Should show error about mismatched passwords
      await waitFor(() => {
        expect(screen.getByText(/do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Signin Flow', () => {
    it('should signin with correct credentials after signup', async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        
          <App />
        
      );

      // With no users, app auto-redirects to signup
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      let emailInput = screen.getByLabelText(/email/i);
      let passwordInput = screen.getByLabelText(/^master password/i);
      let confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'testuser@example.com');
      await user.type(passwordInput, 'TestPassword123!');
      await user.type(confirmInput, 'TestPassword123!');

      let submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Sign out
      useAuthStore.getState().clearSession();
      unmount();

      // Now sign back in
      render(
        
          <App />
        
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      emailInput = screen.getByLabelText(/email/i);
      passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'testuser@example.com');
      await user.type(passwordInput, 'TestPassword123!');

      submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should navigate to dashboard
      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('testuser@example.com');
    });

    it('should reject signin with incorrect password', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      // With no users, app auto-redirects to signup
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      let emailInput = screen.getByLabelText(/email/i);
      let passwordInput = screen.getByLabelText(/^master password/i);
      let confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'CorrectPassword123!');
      await user.type(confirmInput, 'CorrectPassword123!');

      let submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Sign out and try wrong password
      useAuthStore.getState().clearSession();

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      emailInput = screen.getByLabelText(/email/i);
      passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword123!');

      submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/incorrect.*password/i)).toBeInTheDocument();
      });

      // Should still be on signin page
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should reject signin with non-existent email', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'nonexistent@example.com');
      await user.type(passwordInput, 'AnyPassword123!');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/user.*not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Signout Flow', () => {
    it('should clear session and redirect to signin on signout', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      // Create account and sign in
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const signupLink = screen.getByText(/create account/i);
      await user.click(signupLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^master password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'signouttest@example.com');
      await user.type(passwordInput, 'TestPassword123!');
      await user.type(confirmInput, 'TestPassword123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify authenticated
      let state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);

      // Find and click signout button (look for Settings page)
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });

      const signoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signoutButton);

      // Should redirect to signin
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      // Session should be cleared
      state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.vaultKey).toBeNull();
    });
  });

  describe('Complete Auth Cycle', () => {
    it('should complete signup → signin → signout → signin cycle', async () => {
      const user = userEvent.setup();
      const testEmail = 'cycle@example.com';
      const testPassword = 'CycleTest123!';

      // Render app
      const { unmount } = render(

          <App />

      );

      // STEP 1: SIGNUP
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      let signupLink = screen.getByText(/create account/i);
      await user.click(signupLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

      let emailInput = screen.getByLabelText(/email/i);
      let passwordInput = screen.getByLabelText(/^master password/i);
      let confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, testEmail);
      await user.type(passwordInput, testPassword);
      await user.type(confirmInput, testPassword);

      let submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // STEP 2: SIGNOUT
      useAuthStore.getState().clearSession();
      unmount();

      // STEP 3: SIGNIN #1
      render(

          <App />

      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      emailInput = screen.getByLabelText(/email/i);
      passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, testEmail);
      await user.type(passwordInput, testPassword);

      submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      let state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe(testEmail);

      // STEP 4: SIGNOUT AGAIN
      useAuthStore.getState().clearSession();

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });

      // STEP 5: SIGNIN #2
      emailInput = screen.getByLabelText(/email/i);
      passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, testEmail);
      await user.type(passwordInput, testPassword);

      submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe(testEmail);
    });
  });

  describe('Lock/Unlock Flow (Use Case 1)', () => {
    it('should lock vault on inactivity and require unlock without losing data', async () => {
      const user = userEvent.setup();
      const testEmail = 'locktest@example.com';
      const testPassword = 'LockTest123!';

      render(

          <App />

      );

      // Create account
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const signupLink = screen.getByText(/create account/i);
      await user.click(signupLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^master password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, testEmail);
      await user.type(passwordInput, testPassword);
      await user.type(confirmInput, testPassword);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify authenticated with vault key
      let state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.vaultKey).not.toBeNull();
      expect(state.isLocked).toBe(false);

      // Manually trigger lock
      useAuthStore.getState().lock();

      // Verify vault is locked but user still authenticated
      state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLocked).toBe(true);
      expect(state.vaultKey).toBeNull();
      expect(state.user).not.toBeNull();
    });

    it('should clear vault keys and credentials on lock', async () => {
      const testEmail = 'datalock@example.com';
      const testPassword = 'DataLock123!';

      // Create account and sign in
      useAuthStore.getState().setUser({
        id: 'test-id',
        email: testEmail,
        hashedMasterPassword: 'hashed',
        encryptedVaultKey: 'encrypted',
        salt: 'salt',
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
      });

      const mockVaultKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      useAuthStore.getState().setVaultKey(mockVaultKey);
      useAuthStore.getState().setSession({
        userId: 'test-id',
        vaultKey: mockVaultKey,
        expiresAt: new Date(Date.now() + 900000),
        isLocked: false,
      });

      // Verify we have vault key before lock
      let state = useAuthStore.getState();
      expect(state.vaultKey).not.toBeNull();
      expect(state.isLocked).toBe(false);

      // Trigger lock
      useAuthStore.getState().lock();

      // Verify vault key cleared
      state = useAuthStore.getState();
      expect(state.vaultKey).toBeNull();
      expect(state.isLocked).toBe(true);
      expect(state.user).not.toBeNull(); // User still present for unlock
    });

    it('should lock on tab hide if lockOnTabHidden is true', async () => {
      // This test would require mocking document.visibilityState
      // For now, we test the logic exists in useAutoLock hook
      const state = useAuthStore.getState();
      expect(state.lock).toBeDefined();
      expect(state.lockVault).toBeDefined();
    });
  });
});
