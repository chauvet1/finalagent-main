import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';

/**
 * Test page to verify admin portal routing is working
 */
const TestPage: React.FC = () => {
  const handleGoToSignIn = () => {
    window.location.href = '/admin/sign-in';
  };

  const handleGoToDashboard = () => {
    window.location.href = '/admin/dashboard';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: 2
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ padding: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            🎉 Admin Portal is Working!
          </Typography>
          
          <Typography variant="body1" paragraph>
            If you can see this page, it means the admin portal routing is working correctly.
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Debug Information:
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Current URL:</strong> {window.location.href}<br/>
              <strong>Pathname:</strong> {window.location.pathname}<br/>
              <strong>Environment:</strong> {process.env.NODE_ENV}<br/>
              <strong>Clerk Key:</strong> {process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Missing'}<br/>
            </Typography>
          </Box>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={handleGoToSignIn}
              color="primary"
            >
              Go to Sign In
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleGoToDashboard}
              color="primary"
            >
              Go to Dashboard
            </Button>
            <Button 
              variant="text" 
              onClick={() => window.location.href = '/'}
              color="secondary"
            >
              Back to Landing
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TestPage;
