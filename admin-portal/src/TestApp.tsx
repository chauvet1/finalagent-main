import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>🔧 Admin Portal Test</h1>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>✅ React App is Working!</h2>
        <p>This confirms that:</p>
        <ul>
          <li>✅ React is loading properly</li>
          <li>✅ TypeScript compilation is working</li>
          <li>✅ The development server is running</li>
          <li>✅ Basic routing is functional</li>
        </ul>
        
        <h3>🔍 Environment Check</h3>
        <p><strong>API URL:</strong> {process.env.REACT_APP_API_URL || 'Not set'}</p>
        <p><strong>Bypass Auth:</strong> {process.env.REACT_APP_BYPASS_AUTH || 'Not set'}</p>
        <p><strong>Node Environment:</strong> {process.env.NODE_ENV || 'Not set'}</p>
        
        <h3>🌐 API Test</h3>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('http://localhost:8000/health');
              const data = await response.json();
              alert('✅ API Connected: ' + JSON.stringify(data, null, 2));
            } catch (error) {
              alert('❌ API Error: ' + (error as Error).message);
            }
          }}
          style={{
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API Connection
        </button>
      </div>
    </div>
  );
};

export default TestApp;
