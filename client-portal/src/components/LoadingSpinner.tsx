import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

const LoadingSpinner: React.FC = () => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column">
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Loading...
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
