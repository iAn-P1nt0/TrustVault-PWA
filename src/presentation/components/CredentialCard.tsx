/**
 * Credential Card Component
 * Displays a single credential with actions
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  MoreVert,
  ContentCopy,
  Edit,
  Delete,
  Star,
  StarBorder,
  Lock,
  CreditCard,
  Key,
  Note,
  AccountBalance,
  Person,
  Code,
} from '@mui/icons-material';
import type { Credential } from '@/domain/entities/Credential';
import { copyUsername, copyPassword } from '@/presentation/utils/clipboard';
import { formatRelativeTime } from '@/presentation/utils/timeFormat';
import TotpDisplay from './TotpDisplay';

interface CredentialCardProps {
  credential: Credential;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCopySuccess: (message: string) => void;
}

export default function CredentialCard({
  credential,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopySuccess,
}: CredentialCardProps) {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleCopyUsername = async () => {
    const success = await copyUsername(credential.username);
    if (success) {
      onCopySuccess(`Username copied: ${credential.username}`);
    } else {
      onCopySuccess('Failed to copy username');
    }
  };

  const handleCopyPassword = async () => {
    const success = await copyPassword(credential.password, 30);
    if (success) {
      onCopySuccess('Password copied! Will auto-clear in 30 seconds');
    } else {
      onCopySuccess('Failed to copy password');
    }
  };

  const getCategoryIcon = () => {
    switch (credential.category) {
      case 'login':
        return <Lock fontSize="small" />;
      case 'credit_card':
        return <CreditCard fontSize="small" />;
      case 'bank_account':
        return <AccountBalance fontSize="small" />;
      case 'identity':
        return <Person fontSize="small" />;
      case 'api_key':
        return <Code fontSize="small" />;
      case 'ssh_key':
        return <Key fontSize="small" />;
      case 'secure_note':
        return <Note fontSize="small" />;
      default:
        return <Lock fontSize="small" />;
    }
  };

  const getCategoryColor = () => {
    switch (credential.category) {
      case 'login':
        return 'primary';
      case 'credit_card':
        return 'success';
      case 'bank_account':
        return 'info';
      case 'identity':
        return 'secondary';
      case 'api_key':
      case 'ssh_key':
        return 'warning';
      case 'secure_note':
        return 'default';
      default:
        return 'default';
    }
  };

  const getCategoryLabel = () => {
    switch (credential.category) {
      case 'login':
        return 'Login';
      case 'credit_card':
        return 'Card';
      case 'bank_account':
        return 'Bank';
      case 'identity':
        return 'Identity';
      case 'api_key':
        return 'API Key';
      case 'ssh_key':
        return 'SSH Key';
      case 'secure_note':
        return 'Note';
      default:
        return 'Other';
    }
  };

  const getPasswordStrengthColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              mr: 2,
              bgcolor: `${getCategoryColor()}.main`,
              width: 40,
              height: 40,
            }}
          >
            {getCategoryIcon()}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                {credential.title}
              </Typography>
              <Tooltip title={credential.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <IconButton
                  size="small"
                  onClick={() => onToggleFavorite(credential.id)}
                  sx={{ color: credential.isFavorite ? 'warning.main' : 'action.disabled' }}
                >
                  {credential.isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" color="text.secondary" noWrap>
              {credential.username}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ ml: 1 }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        {/* URL */}
        {credential.url && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 1 }}
            noWrap
          >
            {credential.url}
          </Typography>
        )}

        {/* TOTP Display */}
        {credential.totpSecret && (
          <Box sx={{ mb: 2 }}>
            <TotpDisplay totpSecret={credential.totpSecret} />
          </Box>
        )}

        {/* Metadata */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            label={getCategoryLabel()}
            size="small"
            color={getCategoryColor()}
            variant="outlined"
          />
          {credential.securityScore !== undefined && (
            <Chip
              label={`${credential.securityScore}%`}
              size="small"
              color={getPasswordStrengthColor(credential.securityScore)}
              variant="outlined"
            />
          )}
        </Box>

        {/* Tags */}
        {credential.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {credential.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="filled" />
            ))}
            {credential.tags.length > 3 && (
              <Chip label={`+${credential.tags.length - 3}`} size="small" variant="filled" />
            )}
          </Box>
        )}

        {/* Last Updated */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Updated {formatRelativeTime(credential.updatedAt)}
        </Typography>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ pt: 0 }}>
        <Button size="small" startIcon={<ContentCopy />} onClick={handleCopyUsername}>
          Username
        </Button>
        <Button size="small" startIcon={<ContentCopy />} onClick={handleCopyPassword}>
          Password
        </Button>
        <Button size="small" startIcon={<Edit />} onClick={() => onEdit(credential.id)}>
          Edit
        </Button>
      </CardActions>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => { onEdit(credential.id); setMenuAnchor(null); }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onToggleFavorite(credential.id); setMenuAnchor(null); }}>
          <ListItemIcon>
            {credential.isFavorite ? <StarBorder fontSize="small" /> : <Star fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {credential.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { onDelete(credential.id); setMenuAnchor(null); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}
