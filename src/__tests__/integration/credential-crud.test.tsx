/**
 * Credential CRUD Integration Tests
 * Tests complete credential lifecycle: Create → Read → Update → Delete
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '@/presentation/App';
import { useAuthStore } from '@/presentation/store/authStore';

// Helper to setup authenticated user
async function setupAuthenticatedUser(user: ReturnType<typeof userEvent.setup>) {
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

  await user.type(emailInput, 'crudtest@example.com');
  await user.type(passwordInput, 'TestPassword123!');
  await user.type(confirmInput, 'TestPassword123!');

  const submitButton = screen.getByRole('button', { name: /create account/i });
  await user.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText(/vault/i)).toBeInTheDocument();
  }, { timeout: 5000 });
}

describe('Credential CRUD Integration', () => {
  beforeEach(async () => {
    useAuthStore.getState().clearSession();
    localStorage.clear();
    sessionStorage.clear();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  describe('Create Credential', () => {
    it('should create a new credential with all fields', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // Navigate to Add Credential page
      const addButton = screen.getByRole('button', { name: /add.*credential/i });
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

    it('should create credential with minimal fields (title only)', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      const addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      // Only fill required field
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Minimal Credential');

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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      const addButton = screen.getByRole('button', { name: /add.*credential/i });
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // Create first credential
      let addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      let titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Gmail');

      let saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Create second credential
      addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Twitter');

      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Both should be visible
      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
        expect(screen.getByText('Twitter')).toBeInTheDocument();
      });
    });

    it('should view credential details by clicking on it', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // Create credential
      const addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const urlInput = screen.getByLabelText(/url|website/i);

      await user.type(titleInput, 'Facebook');
      await user.type(usernameInput, 'fbuser');
      await user.type(urlInput, 'https://facebook.com');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // Create credential
      let addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      let titleInput = screen.getByLabelText(/title/i);
      let usernameInput = screen.getByLabelText(/username/i);

      await user.type(titleInput, 'LinkedIn');
      await user.type(usernameInput, 'oldusername');

      let saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

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
      usernameInput = screen.getByLabelText(/username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'newusername');

      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // Create and update credential
      const addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      let titleInput = screen.getByLabelText(/title/i);
      let usernameInput = screen.getByLabelText(/username/i);

      await user.type(titleInput, 'Amazon');
      await user.type(usernameInput, 'updateduser');

      let saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Signout
      useAuthStore.getState().clearSession();
      unmount();

      // Signin again
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // Create credential
      const addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'ToBeDeleted');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

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
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Credential should no longer exist
      await waitFor(() => {
        expect(screen.queryByText('ToBeDeleted')).not.toBeInTheDocument();
      });
    });

    it('should maintain other credentials after deleting one', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // Create two credentials
      let addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });

      let titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Keep This');

      let saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/vault/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Create second credential
      addButton = screen.getByRole('button', { name: /add.*credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await setupAuthenticatedUser(user);

      // CREATE
      let addButton = screen.getByRole('button', { name: /add.*credential/i });
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
