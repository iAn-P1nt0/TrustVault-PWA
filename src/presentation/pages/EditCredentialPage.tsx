/**
 * Edit Credential Page
 * Form to edit an existing credential entry
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ArrowBack,
  Save,
  Delete,
  AutoAwesome,
} from '@mui/icons-material';
import { credentialRepository } from '@/data/repositories/CredentialRepositoryImpl';
import { useAuthStore } from '@/presentation/store/authStore';
import PasswordStrengthIndicator from '@/presentation/components/PasswordStrengthIndicator';
import DeleteConfirmDialog from '@/presentation/components/DeleteConfirmDialog';
import PasswordGeneratorDialog from '@/presentation/components/PasswordGeneratorDialog';
import TotpDisplay from '@/presentation/components/TotpDisplay';
import { isValidTOTPSecret } from '@/core/auth/totp';
import type { CredentialCategory, Credential } from '@/domain/entities/Credential';

const CATEGORIES: { value: CredentialCategory; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'secure_note', label: 'Secure Note' },
  { value: 'identity', label: 'Identity' },
  { value: 'api_key', label: 'API Key' },
  { value: 'ssh_key', label: 'SSH Key' },
];

export default function EditCredentialPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { session } = useAuthStore();

  // Loading state
  const [loadingCredential, setLoadingCredential] = useState(true);
  const [credential, setCredential] = useState<Credential | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<CredentialCategory>('login');
  const [tags, setTags] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load credential on mount
  useEffect(() => {
    const loadCredential = async () => {
      if (!id || !session?.vaultKey) {
        setError('Invalid credential or session expired');
        setLoadingCredential(false);
        return;
      }

      try {
        const cred = await credentialRepository.findById(id, session.vaultKey);
        if (!cred) {
          setError('Credential not found');
          setLoadingCredential(false);
          return;
        }

        // Pre-fill form
        setCredential(cred);
        setTitle(cred.title);
        setUsername(cred.username);
        setPassword(cred.password);
        setUrl(cred.url || '');
        setNotes(cred.notes || '');
        setCategory(cred.category);
        setTags(cred.tags.join(', '));
        setIsFavorite(cred.isFavorite);
        setTotpSecret(cred.totpSecret || '');
        setLoadingCredential(false);
      } catch (err) {
        console.error('Failed to load credential:', err);
        setError(err instanceof Error ? err.message : 'Failed to load credential');
        setLoadingCredential(false);
      }
    };

    loadCredential();
  }, [id, session?.vaultKey]);

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

    if (!session?.vaultKey || !id) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await credentialRepository.update(
        id,
        {
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          category,
          tags: tagArray,
          totpSecret: totpSecret.trim() || undefined,
        },
        session.vaultKey
      );

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to update credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to update credential');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      setError('Invalid credential ID');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await credentialRepository.delete(id);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to delete credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete credential');
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Loading state
  if (loadingCredential) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Error state
  if (!credential) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">{error || 'Credential not found'}</Alert>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            sx={{ mt: 2 }}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Edit Credential
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading || deleting}
          >
            Delete
          </Button>
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
          <TextField
            fullWidth
            label="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            margin="normal"
            placeholder="personal, work, finance (comma-separated)"
            helperText="Separate multiple tags with commas"
          />

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
              disabled={loading || deleting}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading || deleting}
              startIcon={<Save />}
              fullWidth
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        credentialTitle={credential.title}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Password Generator Dialog */}
      <PasswordGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onUse={handleUseGeneratedPassword}
      />
    </Container>
  );
}
