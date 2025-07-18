import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { store } from '../../../src/store';
import DashboardPage from '../../../src/pages/dashboard/DashboardPage';

const theme = createTheme();

describe('DashboardPage', () => {
  it('should render without crashing', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <DashboardPage />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );
    // Vérification basique d’un élément du dashboard
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
});
