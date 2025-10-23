/**
 * Dashboard Page Component
 * Main credential management interface
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Card,
  CardContent,
  Button,
  Fab,
  Menu,
  MenuItem,
  Avatar,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Menu as MenuIcon,
  Add as AddIcon,
  Lock as LockIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Favorite as FavoriteIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { credentialRepository } from '@/data/repositories/CredentialRepositoryImpl';
import CredentialCard from '@/presentation/components/CredentialCard';
import DeleteConfirmDialog from '@/presentation/components/DeleteConfirmDialog';
import SearchBar from '@/presentation/components/SearchBar';
import FilterChips from '@/presentation/components/FilterChips';
import SortDropdown, { type SortOption } from '@/presentation/components/SortDropdown';
import type { Credential, CredentialCategory } from '@/domain/entities/Credential';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, session } = useAuthStore();

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Filter and sort state
  const [selectedCategory, setSelectedCategory] = useState<CredentialCategory | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');

  // Credentials state
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
  }, [session?.vaultKey]);

  const loadCredentials = async () => {
    if (!session?.vaultKey) {
      setError('No vault key available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const creds = await credentialRepository.findAll(session.vaultKey);
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleLockVault = () => {
    // TODO: Implement vault locking (Phase 2)
    showSnackbar('Vault locking coming soon');
  };

  const handleEdit = (id: string) => {
    navigate(`/credentials/${id}/edit`);
  };

  const handleDeleteRequest = (id: string) => {
    setCredentialToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!credentialToDelete) return;

    setDeleting(true);
    try {
      await credentialRepository.delete(credentialToDelete);
      setCredentials((prev) => prev.filter((c) => c.id !== credentialToDelete));
      showSnackbar('Credential deleted successfully');
      setDeleteDialogOpen(false);
      setCredentialToDelete(null);
    } catch (err) {
      console.error('Failed to delete credential:', err);
      showSnackbar('Failed to delete credential');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    if (!session?.vaultKey) return;

    try {
      const credential = credentials.find((c) => c.id === id);
      if (!credential) return;

      await credentialRepository.update(
        id,
        { ...credential },
        session.vaultKey
      );

      // Update local state
      setCredentials((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
      );

      showSnackbar(credential.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      showSnackbar('Failed to update favorite');
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // Filter and sort credentials with useMemo for performance
  const filteredAndSortedCredentials = useMemo(() => {
    let filtered = [...credentials];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (credential) =>
          credential.title.toLowerCase().includes(query) ||
          credential.username.toLowerCase().includes(query) ||
          credential.url?.toLowerCase().includes(query) ||
          credential.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((credential) => credential.category === selectedCategory);
    }

    // Apply favorites filter
    if (favoritesOnly) {
      filtered = filtered.filter((credential) => credential.isFavorite);
    }

    // Apply sorting
    switch (sortBy) {
      case 'title-asc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'updated-desc':
        filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      case 'created-desc':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'favorites-first':
        filtered.sort((a, b) => {
          if (a.isFavorite === b.isFavorite) {
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          }
          return a.isFavorite ? -1 : 1;
        });
        break;
    }

    return filtered;
  }, [credentials, searchQuery, selectedCategory, favoritesOnly, sortBy]);

  // Calculate stats
  const totalCredentials = credentials.length;
  const strongPasswords = credentials.filter((c) => (c.securityScore || 0) >= 80).length;
  const weakPasswords = credentials.filter((c) => (c.securityScore || 0) < 60).length;
  const averageScore = totalCredentials > 0
    ? Math.round(credentials.reduce((sum, c) => sum + (c.securityScore || 0), 0) / totalCredentials)
    : 0;

  const getCredentialToDelete = () => {
    return credentials.find((c) => c.id === credentialToDelete);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            TrustVault
          </Typography>
          <IconButton color="inherit" onClick={handleLockVault}>
            <LockIcon />
          </IconButton>
          <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItemButton selected>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="All Credentials" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <FavoriteIcon />
              </ListItemIcon>
              <ListItemText primary="Favorites" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <SecurityIcon />
              </ListItemIcon>
              <ListItemText primary="Security Audit" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          bgcolor: 'background.default',
        }}
      >
        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search credentials..."
            debounceMs={300}
          />
        </Box>

        {/* Filter Chips */}
        <Box sx={{ mb: 3 }}>
          <FilterChips
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            favoritesOnly={favoritesOnly}
            onFavoritesToggle={() => setFavoritesOnly(!favoritesOnly)}
          />
        </Box>

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Credentials
                </Typography>
                <Typography variant="h4">{totalCredentials}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Strong Passwords
                </Typography>
                <Typography variant="h4" color="success.main">
                  {strongPasswords}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Weak Passwords
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {weakPasswords}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Security Score
                </Typography>
                <Typography variant="h4" color={averageScore >= 70 ? 'success.main' : 'warning.main'}>
                  {averageScore}/100
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Credentials List Header with Sort */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5">
            {searchQuery || selectedCategory !== 'all' || favoritesOnly
              ? `Found ${filteredAndSortedCredentials.length} credential${
                  filteredAndSortedCredentials.length !== 1 ? 's' : ''
                }`
              : 'Your Credentials'}
          </Typography>
          <SortDropdown value={sortBy} onChange={setSortBy} />
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
            <Button size="small" onClick={loadCredentials} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        )}

        {/* Empty State */}
        {!loading && !error && credentials.length === 0 && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No credentials yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Start securing your passwords by adding your first credential
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/credentials/add')}
              >
                Add Credential
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && !error && credentials.length > 0 && filteredAndSortedCredentials.length === 0 && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" gutterBottom>
                No credentials found
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Try adjusting your search or filters
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setFavoritesOnly(false);
                }}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Credentials Grid */}
        {!loading && !error && filteredAndSortedCredentials.length > 0 && (
          <Grid container spacing={2}>
            {filteredAndSortedCredentials.map((credential) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={credential.id}>
                <CredentialCard
                  credential={credential}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  onToggleFavorite={handleToggleFavorite}
                  onCopySuccess={showSnackbar}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => navigate('/credentials/add')}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <AddIcon />
      </Fab>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        credentialTitle={getCredentialToDelete()?.title || 'this credential'}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setCredentialToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
