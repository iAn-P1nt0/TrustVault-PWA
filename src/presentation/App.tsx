/**
 * Main App Component
 * Root component with theme provider and routing
 */

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './theme/theme';
import { useAuthStore } from './store/authStore';
import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { initializeDatabase } from '@/data/storage/database';
import { Box, CircularProgress } from '@mui/material';
import { useAutoLock, getDefaultAutoLockConfig } from './hooks/useAutoLock';
import ClipboardNotification from './components/ClipboardNotification';
import MobileNavigation from './components/MobileNavigation';
import { initPerformanceMonitoring } from './utils/performance';

// Lazy load page components for code splitting
const SigninPage = lazy(() => import('./pages/SigninPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AddCredentialPage = lazy(() => import('./pages/AddCredentialPage'));
const EditCredentialPage = lazy(() => import('./pages/EditCredentialPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Loading fallback component
function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function AppRoutes() {
  const { user, isAuthenticated, isLocked } = useAuthStore();

  // Setup auto-lock with user's security settings (must be inside BrowserRouter)
  const autoLockConfig = useMemo(
    () => getDefaultAutoLockConfig(user?.securitySettings?.sessionTimeoutMinutes),
    [user?.securitySettings?.sessionTimeoutMinutes]
  );
  useAutoLock(autoLockConfig);

  return (
    <>
      {/* Global components */}
      <ClipboardNotification />
      <MobileNavigation />
      
      <Suspense fallback={<PageLoader />}>
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
              <Box sx={{ pb: { xs: 8, md: 0 } }}>
                <DashboardPage />
              </Box>
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
              <Box sx={{ pb: { xs: 8, md: 0 } }}>
                <AddCredentialPage />
              </Box>
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
              <Box sx={{ pb: { xs: 8, md: 0 } }}>
                <EditCredentialPage />
              </Box>
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
              <Box sx={{ pb: { xs: 8, md: 0 } }}>
                <SettingsPage />
              </Box>
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />

        {/* Legacy /login redirect to /signin */}
        <Route path="/login" element={<Navigate to="/signin" replace />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/signin"} replace />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

function AppContent() {
  const { isAuthenticated, isLocked } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize performance monitoring (development only)
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

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
