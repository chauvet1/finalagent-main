import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Alert, Button, Box } from '@mui/material';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Special handling for toLocaleString errors
    if (error.message.includes('toLocaleString') || error.message.includes('Cannot read properties of undefined')) {
      console.error('🐛 toLocaleString error detected!');
      console.error('Error stack:', error.stack);
      console.error('Component stack:', errorInfo.componentStack);
      console.error('This error usually happens when undefined/null values are passed to toLocaleString()');
      console.error('Check for undefined timestamps, numbers, or dates in the component that crashed');

      // Log additional debugging information
      console.error('Common causes:');
      console.error('1. API response contains null/undefined timestamp fields');
      console.error('2. Date objects created from invalid date strings');
      console.error('3. Number formatting on undefined/null values');
      console.error('4. Missing null checks before calling toLocaleString()');
    }

    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send error to logging service
      console.error('Production error logged:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Something went wrong: {this.state.error?.message}
          </Alert>
          <Button 
            variant="contained" 
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
