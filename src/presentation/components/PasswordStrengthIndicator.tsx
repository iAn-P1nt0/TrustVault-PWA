/**
 * Password Strength Indicator Component
 * Displays visual strength indicator and feedback for passwords
 */

import { Box, LinearProgress, Typography, Chip } from '@mui/material';
import { analyzePasswordStrength } from '@/core/crypto/password';
import { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  showFeedback = true,
}: PasswordStrengthIndicatorProps) {
  const analysis = useMemo(() => {
    if (!password) {
      return { score: 0, strength: 'very_weak' as const, feedback: [] };
    }
    return analyzePasswordStrength(password);
  }, [password]);

  const getStrengthColor = () => {
    switch (analysis.strength) {
      case 'very_strong':
        return '#4caf50'; // Green
      case 'strong':
        return '#8bc34a'; // Light green
      case 'fair':
        return '#ff9800'; // Orange
      case 'weak':
        return '#ff5722'; // Deep orange
      case 'very_weak':
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  };

  const getStrengthLabel = () => {
    switch (analysis.strength) {
      case 'very_strong':
        return 'Very Strong';
      case 'strong':
        return 'Strong';
      case 'fair':
        return 'Fair';
      case 'weak':
        return 'Weak';
      case 'very_weak':
        return 'Very Weak';
      default:
        return 'Unknown';
    }
  };

  if (!password) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={analysis.score}
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: getStrengthColor(),
              borderRadius: 4,
            },
          }}
        />
        <Chip
          label={getStrengthLabel()}
          size="small"
          sx={{
            backgroundColor: getStrengthColor(),
            color: 'white',
            fontWeight: 600,
            minWidth: 90,
          }}
        />
      </Box>

      {showFeedback && analysis.feedback.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {analysis.feedback.map((feedback, index) => (
            <Typography
              key={index}
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ fontSize: '0.75rem', lineHeight: 1.5 }}
            >
              • {feedback}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
