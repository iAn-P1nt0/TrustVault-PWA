/**
 * Add Credential Page
 * Form to create a new credential entry
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  MenuItem,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ArrowBack,
  Save,
  AutoAwesome,
} from '@mui/icons-material';
import { credentialRepository } from '@/data/repositories/CredentialRepositoryImpl';
import { useAuthStore } from '@/presentation/store/authStore';
import PasswordStrengthIndicator from '@/presentation/components/PasswordStrengthIndicator';
import PasswordGeneratorDialog from '@/presentation/components/PasswordGeneratorDialog';
import TotpDisplay from '@/presentation/components/TotpDisplay';
import TagInput from '@/presentation/components/TagInput';
import { isValidTOTPSecret } from '@/core/auth/totp';
import type { CredentialCategory } from '@/domain/entities/Credential';

const CATEGORIES: { value: CredentialCategory; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'secure_note', label: 'Secure Note' },
  { value: 'identity', label: 'Identity' },
  { value: 'api_key', label: 'API Key' },
  { value: 'ssh_key', label: 'SSH Key' },
];

export default function AddCredentialPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  // Form state
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<CredentialCategory>('login');
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGeneratePassword = () => {
    setGeneratorOpen(true);
  };

  const handleUseGeneratedPassword = (generatedPassword: string) => {
    setPassword(generatedPassword);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!session?.vaultKey) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const credential = await credentialRepository.create(
        {
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          category,
          tags,
          totpSecret: totpSecret.trim() || undefined,
        },
        session.vaultKey
      );
      
      // Update favorite status after creation if needed
      if (isFavorite) {
        await credentialRepository.update(credential.id, { isFavorite: true }, session.vaultKey);
      }

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to save credential');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Add Credential
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" noValidate>
          {/* Title */}
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            margin="normal"
            required
            placeholder="e.g., Gmail Account, Work VPN"
          />

          {/* Category */}
          <TextField
            fullWidth
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CredentialCategory)}
            margin="normal"
          >
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Username */}
          <TextField
            fullWidth
            label="Username / Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={!!errors.username}
            helperText={errors.username}
            margin="normal"
            required
            placeholder="user@example.com"
          />

          {/* Password */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleGeneratePassword}
                    edge="end"
                    title="Generate password"
                    sx={{ mr: 1 }}
                  >
                    <AutoAwesome />
                  </IconButton>
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Password Strength Indicator */}
          <PasswordStrengthIndicator password={password} showFeedback />

          {/* TOTP Secret (2FA) */}
          <TextField
            fullWidth
            label="TOTP Secret (Optional)"
            value={totpSecret}
            onChange={(e) => setTotpSecret(e.target.value)}
            margin="normal"
            placeholder="Base32-encoded secret (e.g., from Google Authenticator)"
            helperText="Enter the base32-encoded secret key for 2FA/TOTP authentication"
          />

          {/* TOTP Preview */}
          {totpSecret.trim() && isValidTOTPSecret(totpSecret.trim()) && (
            <Box sx={{ mt: 2 }}>
              <TotpDisplay totpSecret={totpSecret.trim()} />
            </Box>
          )}

          {totpSecret.trim() && !isValidTOTPSecret(totpSecret.trim()) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Invalid TOTP secret format. Please enter a valid base32-encoded secret.
            </Alert>
          )}

          {/* URL */}
          <TextField
            fullWidth
            label="Website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            margin="normal"
            placeholder="https://example.com"
            type="url"
          />

          {/* Tags */}
          <Box sx={{ mt: 2, mb: 1 }}>
            <TagInput tags={tags} onChange={setTags} />
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            multiline
            rows={4}
            placeholder="Additional information..."
          />

          {/* Favorite Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
              />
            }
            label="Add to favorites"
            sx={{ mt: 2 }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={<Save />}
              fullWidth
            >
              {loading ? 'Saving...' : 'Save Credential'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Password Generator Dialog */}
      <PasswordGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onUse={handleUseGeneratedPassword}
      />
    </Container>
  );
}
