/**
 * Security Audit Page
 * Shows credential health dashboard with weak, reused, and old passwords
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Warning,
  CheckCircle,
  Error,
  Info,
  Security,
  ContentCopy,
  Schedule,
} from '@mui/icons-material';
import { useCredentialStore } from '../store/credentialStore';
import { analyzePasswordStrength } from '@/core/crypto/password';

interface SecurityIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'weak' | 'reused' | 'old' | 'no-password';
  credentialTitle: string;
  details: string;
}

export default function SecurityAuditPage() {
  const navigate = useNavigate();
  const { credentials } = useCredentialStore();
  const [loading, setLoading] = useState(true);
  const [securityScore, setSecurityScore] = useState(0);
  const [issues, setIssues] = useState<SecurityIssue[]>([]);

  useEffect(() => {
    analyzeCredentials();
  }, [credentials]);

  const analyzeCredentials = () => {
    setLoading(true);

    const foundIssues: SecurityIssue[] = [];
    const passwordMap = new Map<string, string[]>(); // password -> [credential titles]
    let totalScore = 0;
    let credentialCount = credentials.length;

    // Analyze each credential
    credentials.forEach((cred) => {
      // Check if password exists
      if (!cred.password || cred.password.trim() === '') {
        foundIssues.push({
          id: `${cred.id}-no-password`,
          title: 'Missing Password',
          severity: 'medium',
          type: 'no-password',
          credentialTitle: cred.title,
          details: 'This credential has no password set.',
        });
        return;
      }

      // Check password strength
      const strength = analyzePasswordStrength(cred.password);

      if (strength.score < 60) {
        foundIssues.push({
          id: `${cred.id}-weak`,
          title: 'Weak Password',
          severity: strength.score < 40 ? 'critical' : 'high',
          type: 'weak',
          credentialTitle: cred.title,
          details: `Password strength: ${strength.strength}. ${strength.feedback.join(' ')}`,
        });
      }

      // Track for reuse detection
      if (passwordMap.has(cred.password)) {
        passwordMap.get(cred.password)!.push(cred.title);
      } else {
        passwordMap.set(cred.password, [cred.title]);
      }

      // Check password age (if updatedAt available)
      if (cred.updatedAt) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(cred.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceUpdate > 365) {
          foundIssues.push({
            id: `${cred.id}-old`,
            title: 'Password Not Updated',
            severity: daysSinceUpdate > 730 ? 'high' : 'medium',
            type: 'old',
            credentialTitle: cred.title,
            details: `Password is ${daysSinceUpdate} days old. Consider updating for better security.`,
          });
        }
      }

      // Add to total score
      totalScore += strength.score;
    });

    // Check for reused passwords
    passwordMap.forEach((titles, password) => {
      if (titles.length > 1) {
        foundIssues.push({
          id: `reused-${password.substring(0, 8)}`,
          title: 'Reused Password',
          severity: 'high',
          type: 'reused',
          credentialTitle: titles.join(', '),
          details: `This password is used on ${titles.length} accounts: ${titles.join(', ')}`,
        });
      }
    });

    // Calculate overall security score (0-100)
    const avgPasswordScore = credentialCount > 0 ? (totalScore / credentialCount) * 20 : 100; // Convert 0-5 to 0-100
    const issuesPenalty = Math.min(foundIssues.length * 5, 50); // Max 50 point penalty
    const finalScore = Math.max(0, Math.min(100, avgPasswordScore - issuesPenalty));

    setSecurityScore(Math.round(finalScore));
    setIssues(foundIssues);
    setLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <Error color="error" />;
      case 'medium':
        return <Warning color="warning" />;
      case 'low':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };

  const issuesByType = {
    weak: issues.filter((i) => i.type === 'weak').length,
    reused: issues.filter((i) => i.type === 'reused').length,
    old: issues.filter((i) => i.type === 'old').length,
    noPassword: issues.filter((i) => i.type === 'no-password').length,
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: 4 }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')}>
            <ArrowBack />
          </IconButton>
          <Security sx={{ ml: 2, mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Security Audit
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Security Score */}
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Vault Security Score
          </Typography>

          {loading ? (
            <Box sx={{ my: 4 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Analyzing {credentials.length} credentials...
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ position: 'relative', display: 'inline-flex', my: 3 }}>
                <Box
                  sx={{
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    border: `8px solid`,
                    borderColor: `${getScoreColor(securityScore)}.main`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="h2" fontWeight="bold">
                    {securityScore}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / 100
                  </Typography>
                </Box>
              </Box>

              <Typography variant="h6" color={`${getScoreColor(securityScore)}.main`} gutterBottom>
                {getScoreLabel(securityScore)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {issues.length === 0
                  ? 'All credentials are secure! Great job maintaining strong passwords.'
                  : `${issues.length} security ${issues.length === 1 ? 'issue' : 'issues'} found across ${credentials.length} credentials.`}
              </Typography>
            </>
          )}
        </Paper>

        {/* Summary Cards */}
        {!loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning color="error" />
                  <Typography variant="h6">{issuesByType.weak}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Weak Passwords
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ContentCopy color="error" />
                  <Typography variant="h6">{issuesByType.reused}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Reused Passwords
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Schedule color="warning" />
                  <Typography variant="h6">{issuesByType.old}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Old Passwords (1+ year)
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Info color="warning" />
                  <Typography variant="h6">{issuesByType.noPassword}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Missing Passwords
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Issues List */}
        {!loading && issues.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Issues
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Review and fix these issues to improve your vault security score.
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <List>
              {issues.map((issue) => (
                <ListItem
                  key={issue.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemIcon sx={{ mt: 1 }}>{getSeverityIcon(issue.severity)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2">{issue.title}</Typography>
                        <Chip
                          label={issue.severity.toUpperCase()}
                          size="small"
                          color={getSeverityColor(issue.severity) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                          {issue.credentialTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {issue.details}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* No Issues */}
        {!loading && issues.length === 0 && (
          <Alert severity="success" icon={<CheckCircle />}>
            <AlertTitle>All Clear!</AlertTitle>
            Your vault is secure. All passwords are strong, unique, and up to date.
          </Alert>
        )}

        {/* Recommendations */}
        {!loading && issues.length > 0 && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <AlertTitle>Security Recommendations</AlertTitle>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {issuesByType.weak > 0 && (
                <li>
                  <strong>Strengthen weak passwords:</strong> Use the password generator to create strong,
                  random passwords (16+ characters with mixed case, numbers, and symbols).
                </li>
              )}
              {issuesByType.reused > 0 && (
                <li>
                  <strong>Use unique passwords:</strong> Never reuse passwords across different accounts.
                  If one site is compromised, all accounts with that password are at risk.
                </li>
              )}
              {issuesByType.old > 0 && (
                <li>
                  <strong>Update old passwords:</strong> Change passwords that haven't been updated in over
                  a year, especially for sensitive accounts (email, banking, etc.).
                </li>
              )}
              {issuesByType.noPassword > 0 && (
                <li>
                  <strong>Add missing passwords:</strong> Complete your credential entries by adding
                  passwords where they're missing.
                </li>
              )}
            </ul>
          </Alert>
        )}
      </Container>
    </Box>
  );
}
