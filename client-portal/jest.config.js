module.exports = {
  // Use the default create-react-app Jest configuration
  ...require('react-scripts/scripts/utils/createJestConfig')(
    (filePath) => filePath.replace('<rootDir>', __dirname)
  ),
  
  // Transform ES modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],
  
  // Module name mapping for ES modules
  moduleNameMapper: {
    '^axios$': require.resolve('axios')
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Collect coverage from source files
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts'
  ]
};