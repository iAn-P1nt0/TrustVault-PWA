/**
 * Dashboard Page Component
 * Main credential management interface
 */

import { useState } from 'react';
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
  CardActions,
  Button,
  TextField,
  InputAdornment,
  Fab,
  Menu,
  MenuItem,
  Chip,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Lock as LockIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Favorite as FavoriteIcon,
  Security as SecurityIcon,
  CreditCard,
  Key,
  Note,
  MoreVert,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useCredentialStore } from '../store/credentialStore';

export default function DashboardPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const { user, logout } = useAuthStore();
  const { credentials, searchQuery, setSearchQuery } = useCredentialStore();

  const handleLogout = () => {
    logout();
  };

  const handleLockVault = () => {
    // Implement vault locking
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'login':
        return <LockIcon />;
      case 'credit_card':
        return <CreditCard />;
      case 'api_key':
      case 'ssh_key':
        return <Key />;
      case 'secure_note':
        return <Note />;
      default:
        return <LockIcon />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => { setDrawerOpen(!drawerOpen); }}
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
          <IconButton
            color="inherit"
            onClick={(e) => { setMenuAnchor(e.currentTarget); }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => { setMenuAnchor(null); }}
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
        onClose={() => { setDrawerOpen(false); }}
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
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search credentials..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: 600 }}
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
                <Typography variant="h4">{credentials.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Strong Passwords
                </Typography>
                <Typography variant="h4">0</Typography>
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
                  0
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
                <Typography variant="h4" color="success.main">
                  95/100
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Credentials List */}
        <Typography variant="h5" sx={{ mb: 3 }}>
          Your Credentials
        </Typography>

        {credentials.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No credentials yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Start securing your passwords by adding your first credential
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                Add Credential
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {credentials.map((credential) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={credential.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {getCategoryIcon(credential.category)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap>
                          {credential.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {credential.username}
                        </Typography>
                      </Box>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>
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
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {credential.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small">View</Button>
                    <Button size="small">Copy</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
