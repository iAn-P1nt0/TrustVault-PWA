/**
 * Filter Chips Component
 * Category and favorite filters with chips UI
 */

import { Box, Chip } from '@mui/material';
import {
  Star as StarIcon,
  Lock,
  CreditCard,
  AccountBalance,
  Person,
  Code,
  Key,
  Note,
} from '@mui/icons-material';
import type { CredentialCategory } from '@/domain/entities/Credential';

interface FilterChipsProps {
  selectedCategory: CredentialCategory | 'all';
  onCategoryChange: (category: CredentialCategory | 'all') => void;
  favoritesOnly: boolean;
  onFavoritesToggle: () => void;
}

const CATEGORY_OPTIONS: Array<{
  value: CredentialCategory | 'all';
  label: string;
  icon?: React.ReactElement;
}> = [
  { value: 'all', label: 'All' },
  { value: 'login', label: 'Login', icon: <Lock fontSize="small" /> },
  { value: 'credit_card', label: 'Cards', icon: <CreditCard fontSize="small" /> },
  { value: 'bank_account', label: 'Bank', icon: <AccountBalance fontSize="small" /> },
  { value: 'identity', label: 'Identity', icon: <Person fontSize="small" /> },
  { value: 'api_key', label: 'API Keys', icon: <Code fontSize="small" /> },
  { value: 'ssh_key', label: 'SSH Keys', icon: <Key fontSize="small" /> },
  { value: 'secure_note', label: 'Notes', icon: <Note fontSize="small" /> },
];

export default function FilterChips({
  selectedCategory,
  onCategoryChange,
  favoritesOnly,
  onFavoritesToggle,
}: FilterChipsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Category Filters */}
      {CATEGORY_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          icon={option.icon}
          onClick={() => onCategoryChange(option.value)}
          color={selectedCategory === option.value ? 'primary' : 'default'}
          variant={selectedCategory === option.value ? 'filled' : 'outlined'}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              backgroundColor:
                selectedCategory === option.value
                  ? 'primary.dark'
                  : 'action.hover',
            },
          }}
        />
      ))}

      {/* Favorites Filter */}
      <Chip
        label="Favorites"
        icon={<StarIcon fontSize="small" />}
        onClick={onFavoritesToggle}
        color={favoritesOnly ? 'warning' : 'default'}
        variant={favoritesOnly ? 'filled' : 'outlined'}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: favoritesOnly ? 'warning.dark' : 'action.hover',
          },
        }}
      />
    </Box>
  );
}
