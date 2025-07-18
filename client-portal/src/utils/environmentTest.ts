/**
 * Environment Configuration Test Utility
 * Use this to test and verify environment configuration in different environments
 */

import { getEnvironmentConfig, debugEnvironmentConfig, validateEnvironment } from '../config/environment';

/**
 * Test environment configuration
 */
export const testEnvironmentConfig = (): void => {
  console.group('🧪 Environment Configuration Test');
  
  try {
    // Test basic configuration
    const config = getEnvironmentConfig();
    console.log('✅ Environment config loaded successfully');
    
    // Test validation
    validateEnvironment();
    console.log('✅ Environment validation passed');
    
    // Test portal URLs
    console.group('Portal URLs Test');
    console.log('Client Portal URL:', config.portals.client);
    console.log('Admin Portal URL:', config.portals.admin);
    console.log('API URL:', config.portals.api);
    
    // Validate URLs are not empty
    if (!config.portals.client) {
      console.error('❌ Client portal URL is empty');
    } else {
      console.log('✅ Client portal URL is valid');
    }
    
    if (!config.portals.admin) {
      console.error('❌ Admin portal URL is empty');
    } else {
      console.log('✅ Admin portal URL is valid');
    }
    
    if (!config.portals.api) {
      console.error('❌ API URL is empty');
    } else {
      console.log('✅ API URL is valid');
    }
    console.groupEnd();
    
    // Test environment detection
    console.group('Environment Detection Test');
    console.log('NODE_ENV:', config.NODE_ENV);
    console.log('Is Production:', config.isProduction);
    console.log('Is Development:', config.isDevelopment);
    console.log('Is Test:', config.isTest);
    console.groupEnd();
    
    // Test feature flags
    console.group('Feature Flags Test');
    console.log('Debug Logs Enabled:', config.features.enableDebugLogs);
    console.log('Mock Data Enabled:', config.features.enableMockData);
    console.groupEnd();
    
    console.log('✅ All environment tests passed');
    
  } catch (error) {
    console.error('❌ Environment configuration test failed:', error);
  }
  
  console.groupEnd();
};

/**
 * Test navigation URLs
 */
export const testNavigationUrls = (): void => {
  console.group('🧭 Navigation URLs Test');
  
  try {
    const config = getEnvironmentConfig();
    
    // Test URL construction
    const clientDashboard = `${config.portals.client}/dashboard`;
    const adminDashboard = `${config.portals.admin}/dashboard`;
    const clientLogin = `${config.portals.client}/client/login`;
    const adminLogin = `${config.portals.admin}/sign-in`;
    
    console.log('Client Dashboard URL:', clientDashboard);
    console.log('Admin Dashboard URL:', adminDashboard);
    console.log('Client Login URL:', clientLogin);
    console.log('Admin Login URL:', adminLogin);
    
    // Validate URLs don't contain localhost in production
    if (config.isProduction) {
      const urls = [clientDashboard, adminDashboard, clientLogin, adminLogin];
      const hasLocalhost = urls.some(url => url.includes('localhost'));
      
      if (hasLocalhost) {
        console.error('❌ Production URLs contain localhost!');
        urls.forEach(url => {
          if (url.includes('localhost')) {
            console.error(`  - ${url}`);
          }
        });
      } else {
        console.log('✅ Production URLs are valid (no localhost)');
      }
    }
    
    console.log('✅ Navigation URL test passed');
    
  } catch (error) {
    console.error('❌ Navigation URL test failed:', error);
  }
  
  console.groupEnd();
};

/**
 * Run all tests
 */
export const runAllEnvironmentTests = (): void => {
  console.group('🚀 Running All Environment Tests');
  
  testEnvironmentConfig();
  testNavigationUrls();
  
  // Show detailed debug info
  debugEnvironmentConfig();
  
  console.log('🎉 All environment tests completed');
  console.groupEnd();
};

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Run tests after a short delay to ensure everything is loaded
  setTimeout(() => {
    runAllEnvironmentTests();
  }, 1000);
}
