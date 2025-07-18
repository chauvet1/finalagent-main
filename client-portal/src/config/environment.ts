/**
 * Environment Configuration
 * Centralized configuration for all environment-specific settings
 * Handles both local development and production deployment seamlessly
 */

export interface EnvironmentConfig {
  NODE_ENV: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  
  // Portal URLs
  portals: {
    client: string;
    admin: string;
    api: string;
  };
  
  // Authentication
  auth: {
    clerkPublishableKey: string;
  };
  
  // App metadata
  app: {
    name: string;
    version: string;
  };
  
  // Feature flags
  features: {
    enableDebugLogs: boolean;
    enableMockData: boolean;
  };
}

/**
 * Get current origin safely (works in SSR and browser environments)
 */
const getCurrentOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

/**
 * Get environment-specific portal URLs
 */
const getPortalUrls = () => {
  const currentOrigin = getCurrentOrigin();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Development defaults
  const developmentDefaults = {
    client: 'http://localhost:3000',
    admin: 'http://localhost:3002',
    api: 'http://localhost:8000'
  };
  
  // Production defaults (use current domain)
  const productionDefaults = {
    client: currentOrigin,
    admin: `${currentOrigin}/admin`,
    api: `${currentOrigin}/api`
  };
  
  const defaults = isProduction ? productionDefaults : developmentDefaults;
  
  // Environment variables take precedence
  return {
    client: process.env.REACT_APP_CLIENT_PORTAL_URL || defaults.client,
    admin: process.env.REACT_APP_ADMIN_PORTAL_URL || defaults.admin,
    api: process.env.REACT_APP_API_URL || defaults.api
  };
};

/**
 * Create environment configuration
 */
const createEnvironmentConfig = (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    NODE_ENV: nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    
    portals: getPortalUrls(),
    
    auth: {
      clerkPublishableKey: process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || ''
    },
    
    app: {
      name: process.env.REACT_APP_NAME || 'BahinLink',
      version: process.env.REACT_APP_VERSION || '1.0.0'
    },
    
    features: {
      enableDebugLogs: nodeEnv === 'development' || process.env.REACT_APP_ENABLE_DEBUG === 'true',
      enableMockData: nodeEnv === 'development' && process.env.REACT_APP_ENABLE_MOCK_DATA === 'true'
    }
  };
};

// Singleton pattern for environment config
let _environmentConfig: EnvironmentConfig | null = null;

/**
 * Get environment configuration (singleton)
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  if (!_environmentConfig) {
    _environmentConfig = createEnvironmentConfig();
  }
  return _environmentConfig;
};

/**
 * Reset environment configuration (useful for testing)
 */
export const resetEnvironmentConfig = (): void => {
  _environmentConfig = null;
};

/**
 * Debug function to log environment configuration
 */
export const debugEnvironmentConfig = (): void => {
  const config = getEnvironmentConfig();
  
  console.group('🌐 Environment Configuration');
  console.log('Environment:', config.NODE_ENV);
  console.log('Is Production:', config.isProduction);
  console.log('Is Development:', config.isDevelopment);
  console.log('Current Origin:', getCurrentOrigin() || 'N/A (SSR)');
  
  console.group('Portal URLs');
  console.log('Client Portal:', config.portals.client);
  console.log('Admin Portal:', config.portals.admin);
  console.log('API URL:', config.portals.api);
  console.groupEnd();
  
  console.group('Environment Variables');
  console.log('REACT_APP_CLIENT_PORTAL_URL:', process.env.REACT_APP_CLIENT_PORTAL_URL || 'not set');
  console.log('REACT_APP_ADMIN_PORTAL_URL:', process.env.REACT_APP_ADMIN_PORTAL_URL || 'not set');
  console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL || 'not set');
  console.log('REACT_APP_CLERK_PUBLISHABLE_KEY:', process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ? 'set' : 'not set');
  console.groupEnd();
  
  console.group('App Configuration');
  console.log('Name:', config.app.name);
  console.log('Version:', config.app.version);
  console.groupEnd();
  
  console.group('Feature Flags');
  console.log('Debug Logs:', config.features.enableDebugLogs);
  console.log('Mock Data:', config.features.enableMockData);
  console.groupEnd();
  
  console.groupEnd();
};

// Export commonly used values for convenience
export const ENV = getEnvironmentConfig();
export const PORTAL_URLS = ENV.portals;
export const IS_PRODUCTION = ENV.isProduction;
export const IS_DEVELOPMENT = ENV.isDevelopment;

// Validate required environment variables
export const validateEnvironment = (): void => {
  const config = getEnvironmentConfig();
  const errors: string[] = [];
  
  if (!config.auth.clerkPublishableKey) {
    errors.push('REACT_APP_CLERK_PUBLISHABLE_KEY is required');
  }
  
  if (config.isProduction) {
    if (!config.portals.client) {
      errors.push('Client portal URL is required in production');
    }
    if (!config.portals.api) {
      errors.push('API URL is required in production');
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (config.isProduction) {
      throw new Error('Environment validation failed in production');
    }
  } else if (config.features.enableDebugLogs) {
    console.log('✅ Environment validation passed');
  }
};

// Auto-validate on import in production
if (IS_PRODUCTION) {
  validateEnvironment();
}
