/**
 * Settings Page
 * Comprehensive settings for user preferences and security
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Button,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useCredentialStore } from '../store/credentialStore';
import { userRepository } from '@/data/repositories/UserRepositoryImpl';
import AutoLockSettings from '../components/AutoLockSettings';
import ClipboardSettings from '../components/ClipboardSettings';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { clearCredentials } = useCredentialStore();

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Security settings state
  const [sessionTimeout, setSessionTimeout] = useState(
    user?.securitySettings?.sessionTimeoutMinutes ?? 15
  );
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(
    user?.securitySettings?.clipboardClearSeconds ?? 30
  );
  const [requirePasswordOnWake, setRequirePasswordOnWake] = useState(
    user?.securitySettings?.requirePasswordOnWake ?? true
  );
  const [biometricEnabled, setBiometricEnabled] = useState(
    user?.securitySettings?.biometricEnabled ?? false
  );

  // Display settings state
  const [showPasswordStrength, setShowPasswordStrength] = useState(true);
  const [cardDensity, setCardDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Password generator defaults state
  const [defaultLength, setDefaultLength] = useState(20);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  // Save settings to database
  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      // Update security settings
      await userRepository.updateSecuritySettings(user.id, {
        sessionTimeoutMinutes: sessionTimeout,
        clipboardClearSeconds: clipboardClearSeconds,
        requirePasswordOnWake: requirePasswordOnWake,
        biometricEnabled: biometricEnabled,
      });

      // Update user in store
      const updatedUser = {
        ...user,
        securitySettings: {
          sessionTimeoutMinutes: sessionTimeout,
          clipboardClearSeconds: clipboardClearSeconds,
          requirePasswordOnWake: requirePasswordOnWake,
          biometricEnabled: biometricEnabled,
        },
      };

      updateUser(updatedUser);

      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when settings change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        saveSettings();
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [
    sessionTimeout,
    clipboardClearSeconds,
    requirePasswordOnWake,
    biometricEnabled,
  ]);

  const handleClearAllData = async () => {
    const firstConfirm = window.confirm(
      'Are you sure you want to clear all data? This action cannot be undone.'
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      'This will permanently delete ALL your credentials and account data. Are you absolutely sure?'
    );

    if (!secondConfirm) return;

    try {
      // Clear all data
      const { clearAllData } = await import('@/data/storage/debugUtils');
      await clearAllData();

      // Clear stores
      clearCredentials();
      useAuthStore.getState().signout();

      // Navigate to signup
      navigate('/signup', { replace: true });
    } catch (err) {
      console.error('Failed to clear data:', err);
      setError('Failed to clear data. Please try again.');
    }
  };

  if (!user) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: 4 }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Settings
          </Typography>
          {saving && <CircularProgress size={24} color="inherit" />}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Save message */}
        {saveMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {saveMessage}
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Security Settings */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Security Settings
        </Typography>

        <AutoLockSettings
          sessionTimeoutMinutes={sessionTimeout}
          lockOnTabHidden={requirePasswordOnWake}
          onSave={(timeout, lockOnHidden) => {
            setSessionTimeout(timeout);
            setRequirePasswordOnWake(lockOnHidden);
          }}
        />

        <ClipboardSettings
          clipboardClearSeconds={clipboardClearSeconds}
          onSave={(seconds) => setClipboardClearSeconds(seconds)}
        />

        {/* Biometric Authentication - Placeholder */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Biometric Authentication
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enable fingerprint or face recognition for quick signin. (Coming soon)
          </Typography>
          <Alert severity="info">
            Biometric authentication will be available in a future update.
          </Alert>
        </Paper>

        <Divider sx={{ my: 4 }} />

        {/* Display Settings */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Display Settings
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Theme
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose your preferred color theme. (Currently Dark theme only)
          </Typography>
          <Alert severity="info">
            Light theme and system theme will be available in a future update.
          </Alert>
        </Paper>

        <Divider sx={{ my: 4 }} />

        {/* Password Generator Defaults */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Password Generator Defaults
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These settings are stored locally and will be remembered when you use the password
            generator.
          </Typography>
          <Alert severity="info">
            Password generator preferences are automatically saved when you use the generator.
          </Alert>
        </Paper>

        <Divider sx={{ my: 4 }} />

        {/* Data Management */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Data Management
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Export & Import
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Backup your vault or import credentials from another device. (Coming soon)
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button variant="outlined" disabled>
              Export Vault
            </Button>
            <Button variant="outlined" disabled>
              Import Vault
            </Button>
          </Box>

          <Alert severity="info">
            Import/Export functionality will be available in a future update.
          </Alert>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Clear All Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently delete all credentials and account data from this device. This action cannot
            be undone.
          </Typography>

          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Warning: This will delete everything
            </Typography>
            <Typography variant="caption">
              All your credentials, settings, and account information will be permanently removed.
              You will need to create a new account to use TrustVault again.
            </Typography>
          </Alert>

          <Button variant="contained" color="error" onClick={handleClearAllData}>
            Clear All Data
          </Button>
        </Paper>

        <Divider sx={{ my: 4 }} />

        {/* Account Information */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Account
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Master Password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Change your master password. This will re-encrypt all credentials. (Coming soon)
          </Typography>
          <Button variant="outlined" disabled>
            Change Master Password
          </Button>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account Information
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">{user.email}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Account Created
              </Typography>
              <Typography variant="body1">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Last Login
              </Typography>
              <Typography variant="body1">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never'}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
