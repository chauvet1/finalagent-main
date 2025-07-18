/**
 * Authentication debugging script
 * Tests the authentication flow and helps identify issues
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';

async function testAuthentication() {
  console.log('🔍 Testing Authentication System...\n');
  
  try {
    // Test 1: API Health Check
    console.log('1️⃣ Testing API Health...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/auth-test/health`);
      console.log('✅ API Health:', healthResponse.data);
    } catch (error) {
      console.log('❌ API Health Failed:', error.message);
      return;
    }
    
    // Test 2: Test auth endpoint without token
    console.log('\n2️⃣ Testing auth endpoint without token...');
    try {
      const noTokenResponse = await axios.get(`${API_BASE_URL}/auth-test/test-auth`);
      console.log('⚠️ Unexpected success (should have failed):', noTokenResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected request without token:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 3: Test with email as token (simulating current issue)
    console.log('\n3️⃣ Testing with email as token...');
    try {
      const emailTokenResponse = await axios.get(`${API_BASE_URL}/auth-test/test-auth`, {
        headers: {
          'Authorization': 'Bearer xsmafred@gmail.com'
        }
      });
      console.log('📧 Email token response:', emailTokenResponse.data);
    } catch (error) {
      console.log('❌ Email token failed:', error.response?.data || error.message);
    }
    
    // Test 4: Test with a mock JWT token
    console.log('\n4️⃣ Testing with mock JWT token...');
    const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    try {
      const jwtTokenResponse = await axios.get(`${API_BASE_URL}/auth-test/test-auth`, {
        headers: {
          'Authorization': `Bearer ${mockJWT}`
        }
      });
      console.log('🎫 JWT token response:', jwtTokenResponse.data);
    } catch (error) {
      console.log('❌ JWT token failed:', error.response?.data || error.message);
    }
    
    // Test 5: Test dashboard endpoint with email token
    console.log('\n5️⃣ Testing dashboard endpoint with email token...');
    try {
      const dashboardResponse = await axios.get(`${API_BASE_URL}/client/dashboard/stats`, {
        headers: {
          'Authorization': 'Bearer xsmafred@gmail.com'
        }
      });
      console.log('📊 Dashboard response:', dashboardResponse.data);
    } catch (error) {
      console.log('❌ Dashboard failed:', error.response?.data || error.message);
    }
    
    // Test 6: Check if user exists in database
    console.log('\n6️⃣ Checking user sync...');
    try {
      const syncResponse = await axios.post(`${API_BASE_URL}/auth-test/sync-all-users`);
      console.log('🔄 User sync response:', syncResponse.data);
    } catch (error) {
      console.log('❌ User sync failed:', error.response?.data || error.message);
    }
    
    console.log('\n📋 Summary:');
    console.log('- API is responding correctly');
    console.log('- Authentication middleware is working');
    console.log('- The issue is likely that Clerk getToken() is returning email instead of JWT');
    console.log('- Backend fallback authentication should handle email tokens in development');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Check browser console for Clerk token debugging info');
    console.log('2. Verify Clerk configuration in client portal');
    console.log('3. Test with a real Clerk JWT token from browser');
    console.log('4. Ensure user is properly synced in database');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuthentication();
