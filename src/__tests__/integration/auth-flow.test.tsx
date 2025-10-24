/**
 * Authentication Flow Integration Tests
 * Tests complete signup → signin → signout flow with real components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '@/presentation/App';
import { useAuthStore } from '@/presentation/store/authStore';

describe('Authentication Flow Integration', () => {
  beforeEach(async () => {
    // Clear all stores and database before each test
    useAuthStore.getState().clearSession();
    localStorage.clear();
    sessionStorage.clear();

    // Wait for any pending operations
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  describe('Signup Flow', () => {
    it('should complete signup with valid credentials', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Wait for app to initialize and redirect to signin
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to signup page
      const signupLink = screen.getByText(/create account/i);
      await user.click(signupLink);

      // Wait for signup page to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

      // Fill signup form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^master password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmInput, 'SecurePassword123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Should navigate to dashboard
      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify authenticated state
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('newuser@example.com');
    });

    it('should reject signup with weak password', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const signupLink = screen.getByText(/create account/i);
      await user.click(signupLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

      // Try weak password
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^master password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123456');
      await user.type(confirmInput, '123456');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Should show error about weak password
      await waitFor(() => {
        expect(screen.getByText(/password.*weak/i)).toBeInTheDocument();
      });
    });

    it('should reject signup with mismatched passwords', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

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

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmInput, 'DifferentPassword123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Should show error about mismatched passwords
      await waitFor(() => {
        expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Signin Flow', () => {
    it('should signin with correct credentials after signup', async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // First, create an account
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const signupLink = screen.getByText(/create account/i);
      await user.click(signupLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

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
        <BrowserRouter>
          <App />
        </BrowserRouter>
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Create account first
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const signupLink = screen.getByText(/create account/i);
      await user.click(signupLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

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
        <BrowserRouter>
          <App />
        </BrowserRouter>
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
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
});
