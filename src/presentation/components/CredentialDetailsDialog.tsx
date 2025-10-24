/**
 * Credential Details Dialog Component
 * Full-screen dialog for viewing credential details on mobile
 */

import React from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Slide,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import {
  Close,
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
import { formatRelativeTime } from '@/presentation/utils/timeFormat';
import TotpDisplay from './TotpDisplay';

interface CredentialDetailsDialogProps {
  open: boolean;
  credential: Credential | null;
  onClose: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  const { appear, enter, exit, ...otherProps } = props;
  return (
    <Slide 
      direction="up" 
      ref={ref} 
      appear={appear === undefined ? true : appear}
      enter={enter === undefined ? true : enter}
      exit={exit === undefined ? true : exit}
      {...otherProps}
    />
  );
});

export default function CredentialDetailsDialog({
  open,
  credential,
  onClose,
  onCopyUsername,
  onCopyPassword,
  onEdit,
  onDelete,
  onToggleFavorite,
}: CredentialDetailsDialogProps) {
  if (!credential) return null;

  const getCategoryIcon = () => {
    switch (credential.category) {
      case 'login':
        return <Lock />;
      case 'credit_card':
        return <CreditCard />;
      case 'bank_account':
        return <AccountBalance />;
      case 'identity':
        return <Person />;
      case 'api_key':
        return <Code />;
      case 'ssh_key':
        return <Key />;
      case 'secure_note':
        return <Note />;
      default:
        return <Lock />;
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

  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      {/* App Bar */}
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Credential Details
          </Typography>
          <IconButton
            color="inherit"
            onClick={onToggleFavorite}
            aria-label={credential.isFavorite ? 'remove from favorites' : 'add to favorites'}
          >
            {credential.isFavorite ? <Star /> : <StarBorder />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ p: 2, pb: 10 }}>
        {/* Header with Icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              mr: 2,
              bgcolor: `${getCategoryColor()}.main`,
              width: 56,
              height: 56,
            }}
          >
            {getCategoryIcon()}
          </Avatar>
          <Box>
            <Typography variant="h5" gutterBottom>
              {credential.title}
            </Typography>
            <Chip label={getCategoryLabel()} size="small" color={getCategoryColor()} />
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Credential Information */}
        <List>
          {/* Username */}
          <ListItem>
            <ListItemText primary="Username" secondary={credential.username} />
          </ListItem>

          {/* URL */}
          {credential.url && (
            <ListItem>
              <ListItemText
                primary="Website"
                secondary={
                  <a
                    href={credential.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit' }}
                  >
                    {credential.url}
                  </a>
                }
              />
            </ListItem>
          )}

          {/* Password (masked) */}
          <ListItem>
            <ListItemText primary="Password" secondary="••••••••••••" />
          </ListItem>

          {/* TOTP */}
          {credential.totpSecret && (
            <ListItem>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary">
                  Two-Factor Authentication
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <TotpDisplay totpSecret={credential.totpSecret} />
                </Box>
              </Box>
            </ListItem>
          )}

          {/* Tags */}
          {credential.tags.length > 0 && (
            <ListItem>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {credential.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="filled" />
                  ))}
                </Box>
              </Box>
            </ListItem>
          )}

          {/* Notes */}
          {credential.notes && (
            <ListItem>
              <ListItemText primary="Notes" secondary={credential.notes} />
            </ListItem>
          )}

          {/* Last Updated */}
          <ListItem>
            <ListItemText
              primary="Last Updated"
              secondary={formatRelativeTime(credential.updatedAt)}
            />
          </ListItem>
        </List>
      </Box>

      {/* Bottom Action Bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          p: 2,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ContentCopy />}
          onClick={onCopyUsername}
          fullWidth
        >
          Username
        </Button>
        <Button
          variant="outlined"
          startIcon={<ContentCopy />}
          onClick={onCopyPassword}
          fullWidth
        >
          Password
        </Button>
        <Button variant="outlined" startIcon={<Edit />} onClick={onEdit} fullWidth>
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={onDelete}
          fullWidth
        >
          Delete
        </Button>
      </Box>
    </Dialog>
  );
}
