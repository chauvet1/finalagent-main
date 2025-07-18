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
    if (error.message.includes('toLocaleString')) {
      console.error('🐛 toLocaleString error detected!');
      console.error('Error stack:', error.stack);
      console.error('Component stack:', errorInfo.componentStack);

      // Try to identify the problematic data
      console.error('This error usually happens when undefined/null values are passed to toLocaleString()');
      console.error('Check for undefined timestamps, numbers, or dates in the component that crashed');
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
