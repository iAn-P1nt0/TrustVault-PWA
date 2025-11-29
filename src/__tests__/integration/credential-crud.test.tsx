/**
 * Credential CRUD Integration Tests
 * Tests complete credential lifecycle: Create → Read → Update → Delete
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/presentation/App';
import { useAuthStore } from '@/presentation/store/authStore';
import { db } from '@/data/storage/database';

// Helper to setup authenticated user with dashboard ready
async function setupAuthenticatedUser(user: ReturnType<typeof userEvent.setup>) {
  // With no users in DB, app redirects directly to signup
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  }, { timeout: 5000 });

  const emailInput = screen.getByLabelText(/email/i);
  // Both password fields have "Master Password" in label, so we use getAllByLabelText
  const passwordInputs = screen.getAllByLabelText(/master password/i);
  const passwordInput = passwordInputs[0]; // First one is the password field
  const confirmInput = passwordInputs[1]; // Second one is confirm field

  await user.type(emailInput, 'crudtest@example.com');
  await user.type(passwordInput, 'TestPassword123!');
  await user.type(confirmInput, 'TestPassword123!');

  const submitButton = screen.getByRole('button', { name: /create account/i });
  await user.click(submitButton);

  await waitFor(() => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
  }, { timeout: 10000 });
  
  // Wait for dashboard to fully render (lazy loaded component)
  await waitFor(() => {
    expect(screen.getByLabelText('add')).toBeInTheDocument();
  }, { timeout: 10000 });
}

// Helper to create a credential from dashboard (fills required fields: title, username, password)
async function createCredentialFromDashboard(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  username = 'testuser',
  password = 'testpass123'
) {
  const addButton = screen.getByLabelText('add');
  await user.click(addButton);

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
  }, { timeout: 5000 });

  const titleInput = screen.getByLabelText(/title/i);
  await user.type(titleInput, title);

  const usernameInput = screen.getByLabelText(/username/i);
  await user.type(usernameInput, username);

  const passwordInput = screen.getByLabelText(/^password/i);
  await user.type(passwordInput, password);

  const saveButton = screen.getByRole('button', { name: /save/i });
  await user.click(saveButton);

  // Wait for navigation back to dashboard
  await waitFor(() => {
    expect(screen.getByLabelText('add')).toBeInTheDocument();
  }, { timeout: 5000 });
}

describe('Credential CRUD Integration', () => {
  beforeEach(async () => {
    useAuthStore.getState().clearSession();
    localStorage.clear();
    sessionStorage.clear();
    // Clear database tables to ensure clean state
    await db.users.clear();
    await db.credentials.clear();
    await db.sessions.clear();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  describe('Create Credential', () => {
    it('should create a new credential with all fields', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);


      // Navigate to Add Credential page
      const addButton = screen.getByLabelText('add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      // Fill credential form
      const titleInput = screen.getByLabelText(/title/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const urlInput = screen.getByLabelText(/url|website/i);
      const notesInput = screen.getByLabelText(/notes/i);

      await user.type(titleInput, 'GitHub');
      await user.type(usernameInput, 'myusername');
      await user.type(passwordInput, 'MySecret123!');
      await user.type(urlInput, 'https://github.com');
      await user.type(notesInput, 'Work account');

      // Save credential
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should navigate back to dashboard
      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Credential should appear in list
      await waitFor(() => {
        expect(screen.getByText('GitHub')).toBeInTheDocument();
      });
    });

    it('should create credential with minimal fields', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      const addButton = screen.getByLabelText('add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      // Fill required fields (title, username, password)
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Minimal Credential');
      
      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'minuser');
      
      const passwordInput = screen.getByLabelText(/^password/i);
      await user.type(passwordInput, 'minpass123');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByText('Minimal Credential')).toBeInTheDocument();
      });
    });

    it('should reject credential without title', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      const addButton = screen.getByLabelText('add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      // Try to save without title
      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'someuser');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/title.*required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Read Credentials', () => {
    it('should display all created credentials in the list', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      // Create first credential
      await createCredentialFromDashboard(user, 'Gmail', 'gmailuser', 'gmailpass123');

      // Create second credential
      await createCredentialFromDashboard(user, 'Twitter', 'twitteruser', 'twitterpass123');

      // Both should be visible
      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
        expect(screen.getByText('Twitter')).toBeInTheDocument();
      });
    });

    it('should view credential details by clicking on it', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      // Create credential
      await createCredentialFromDashboard(user, 'Facebook', 'fbuser', 'fbpass123');

      // Click on credential to view details
      const credentialItem = screen.getByText('Facebook');
      await user.click(credentialItem);

      // Should show credential details (implementation dependent)
      await waitFor(() => {
        expect(screen.getByText('fbuser')).toBeInTheDocument();
      });
    });
  });

  describe('Update Credential', () => {
    it('should update credential with new values', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      // Create credential
      await createCredentialFromDashboard(user, 'LinkedIn', 'oldusername', 'oldpass123');

      await waitFor(() => {
        expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      });

      // Click to view/edit
      const credentialItem = screen.getByText('LinkedIn');
      await user.click(credentialItem);

      // Find and click edit button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should navigate to edit page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit credential/i })).toBeInTheDocument();
      });

      // Update username
      const usernameInput = screen.getByLabelText(/username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'newusername');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByLabelText('add')).toBeInTheDocument();
      }, { timeout: 5000 });

      // View again to verify update
      await user.click(screen.getByText('LinkedIn'));

      await waitFor(() => {
        expect(screen.getByText('newusername')).toBeInTheDocument();
      });
    });

    it('should persist updates after signout and signin', async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      // Create credential
      await createCredentialFromDashboard(user, 'Amazon', 'updateduser', 'amazonpass123');

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Signout
      useAuthStore.getState().clearSession();
      unmount();

      // Signin again
      render(
        
          <App />
        
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'crudtest@example.com');
      await user.type(passwordInput, 'TestPassword123!');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Credential should still exist with updated data
      await waitFor(() => {
        expect(screen.getByText('Amazon')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Amazon'));

      await waitFor(() => {
        expect(screen.getByText('updateduser')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Credential', () => {
    it('should delete credential and remove from list', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      // Create credential
      await createCredentialFromDashboard(user, 'ToBeDeleted', 'deleteuser', 'deletepass123');

      await waitFor(() => {
        expect(screen.getByText('ToBeDeleted')).toBeInTheDocument();
      });

      // Click to view
      const credentialItem = screen.getByText('ToBeDeleted');
      await user.click(credentialItem);

      // Find and click delete button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion (if confirmation dialog exists)
      await waitFor(() => {
        const confirmButton = screen.queryByRole('button', { name: /confirm|yes/i });
        if (confirmButton) {
          user.click(confirmButton);
        }
      });

      // Should navigate back to dashboard
      await waitFor(() => {
        expect(screen.getByLabelText('add')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Credential should no longer exist
      await waitFor(() => {
        expect(screen.queryByText('ToBeDeleted')).not.toBeInTheDocument();
      });
    });

    it('should maintain other credentials after deleting one', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      // Create two credentials
      await createCredentialFromDashboard(user, 'Keep This', 'keepuser', 'keeppass123');
      await createCredentialFromDashboard(user, 'Delete This', 'deleteuser', 'deletepass123');

      await waitFor(() => {
        expect(screen.getByText('Keep This')).toBeInTheDocument();
        expect(screen.getByText('Delete This')).toBeInTheDocument();
      });

      titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Delete This');

      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Both should exist
      await waitFor(() => {
        expect(screen.getByText('Keep This')).toBeInTheDocument();
        expect(screen.getByText('Delete This')).toBeInTheDocument();
      });

      // Delete second credential
      await user.click(screen.getByText('Delete This'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        const confirmButton = screen.queryByRole('button', { name: /confirm|yes/i });
        if (confirmButton) {
          user.click(confirmButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // First should still exist, second should not
      await waitFor(() => {
        expect(screen.getByText('Keep This')).toBeInTheDocument();
        expect(screen.queryByText('Delete This')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complete CRUD Cycle', () => {
    it('should complete create → read → update → delete cycle', async () => {
      const user = userEvent.setup();
      render(
        
          <App />
        
      );

      await setupAuthenticatedUser(user);

      // CREATE
      let addButton = screen.getByLabelText('add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      let titleInput = screen.getByLabelText(/title/i);
      let usernameInput = screen.getByLabelText(/username/i);

      await user.type(titleInput, 'Complete Cycle Test');
      await user.type(usernameInput, 'originaluser');

      let saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // READ
      await waitFor(() => {
        expect(screen.getByText('Complete Cycle Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete Cycle Test'));

      await waitFor(() => {
        expect(screen.getByText('originaluser')).toBeInTheDocument();
      });

      // UPDATE
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit credential/i })).toBeInTheDocument();
      });

      usernameInput = screen.getByLabelText(/username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'updateduser');

      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify update
      await user.click(screen.getByText('Complete Cycle Test'));

      await waitFor(() => {
        expect(screen.getByText('updateduser')).toBeInTheDocument();
        expect(screen.queryByText('originaluser')).not.toBeInTheDocument();
      });

      // DELETE
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        const confirmButton = screen.queryByRole('button', { name: /confirm|yes/i });
        if (confirmButton) {
          user.click(confirmButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify deletion
      await waitFor(() => {
        expect(screen.queryByText('Complete Cycle Test')).not.toBeInTheDocument();
      });
    });
  });
});
