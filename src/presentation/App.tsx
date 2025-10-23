/**
 * Main App Component
 * Root component with theme provider and routing
 */

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './theme/theme';
import { useAuthStore } from './store/authStore';
import SigninPage from './pages/SigninPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AddCredentialPage from './pages/AddCredentialPage';
import EditCredentialPage from './pages/EditCredentialPage';
import SettingsPage from './pages/SettingsPage';
import { useEffect, useState } from 'react';
import { initializeDatabase } from '@/data/storage/database';
import { Box, CircularProgress } from '@mui/material';
import { useAutoLock, getDefaultAutoLockConfig } from './hooks/useAutoLock';
import ClipboardNotification from './components/ClipboardNotification';

function AppRoutes() {
  const { isAuthenticated, isLocked, user } = useAuthStore();

  // Setup auto-lock with user's security settings (must be inside BrowserRouter)
  const autoLockConfig = getDefaultAutoLockConfig(user?.securitySettings?.sessionTimeoutMinutes);
  useAutoLock(autoLockConfig);

  return (
    <>
      <Routes>
        {/* Signin route */}
        <Route
          path="/signin"
          element={!isAuthenticated ? <SigninPage /> : <Navigate to="/dashboard" replace />}
        />

        {/* Signup route */}
        <Route
          path="/signup"
          element={!isAuthenticated ? <SignupPage /> : <Navigate to="/dashboard" replace />}
        />

        {/* Dashboard route */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated && !isLocked ? (
              <DashboardPage />
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />

        {/* Add Credential route */}
        <Route
          path="/credentials/add"
          element={
            isAuthenticated && !isLocked ? (
              <AddCredentialPage />
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />

        {/* Edit Credential route */}
        <Route
          path="/credentials/:id/edit"
          element={
            isAuthenticated && !isLocked ? (
              <EditCredentialPage />
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />

        {/* Settings route */}
        <Route
          path="/settings"
          element={
            isAuthenticated && !isLocked ? (
              <SettingsPage />
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />

        {/* Legacy /login redirect to /signin */}
        <Route path="/login" element={<Navigate to="/signin" replace />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/signin" replace />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>

      {/* Global Clipboard Notification */}
      <ClipboardNotification />
    </>
  );
}

function AppContent() {
  const { isAuthenticated, isLocked } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('App mounted, initializing database...');

    let mounted = true;
    let hasCompleted = false;

    const completeInitialization = (source: string) => {
      if (mounted && !hasCompleted) {
        hasCompleted = true;
        console.log(`Database initialization completed via ${source}`);
        setIsInitialized(true);
      }
    };

    // Initialize database with a timeout (2 seconds max)
    const initTimeout = setTimeout(() => {
      console.warn('Database initialization timeout - proceeding without persistence');
      completeInitialization('timeout');
    }, 2000);

    // Try to initialize database
    initializeDatabase()
      .then(() => {
        clearTimeout(initTimeout);
        completeInitialization('success');
      })
      .catch((error) => {
        console.error('Database initialization error:', error);
        clearTimeout(initTimeout);
        completeInitialization('error');
      });

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(initTimeout);
    };
  }, []);

  console.log('App rendering - isAuthenticated:', isAuthenticated, 'isLocked:', isLocked, 'isInitialized:', isInitialized);

  if (!isInitialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#121212',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Box sx={{ color: 'white', textAlign: 'center' }}>
          <div>Initializing TrustVault...</div>
        </Box>
      </Box>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', flexDirection: 'column' }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
