import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ClerkProvider } from './providers/ClerkProvider';
import { SessionProvider } from './providers/SessionProvider';
import { store } from './store';
import { validateEnvironment } from './utils/env';
import App from './App';

// Validate environment configuration on startup
validateEnvironment();

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Prevent browser extensions from interfering
          '& *[data-extension]': {
            display: 'none !important',
          },
          '& *[class*="extension"]': {
            display: 'none !important',
          },
          // Ensure clean layout
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        },
        // Hide any debugging overlays
        '*[id*="debug"], *[class*="debug"], *[data-debug]': {
          display: 'none !important',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
          position: 'relative',
          zIndex: 1,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ClerkProvider>
        <SessionProvider>
          <BrowserRouter
            basename="/admin"
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <App />
            </ThemeProvider>
          </BrowserRouter>
        </SessionProvider>
      </ClerkProvider>
    </Provider>
  </React.StrictMode>
);
