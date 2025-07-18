const fetch = require('node-fetch');

async function testCreateTraining() {
  console.log('🧪 Testing Create Training API...');

  try {
    // First, test if the server is running
    console.log('1️⃣ Testing server health...');
    const healthResponse = await fetch('http://localhost:8000/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Server is running:', healthData.status);

    // Test GET trainings
    console.log('\n2️⃣ Testing GET /api/trainings...');
    const getResponse = await fetch('http://localhost:8000/api/trainings');
    const getData = await getResponse.json();
    console.log(`✅ GET trainings successful. Found ${getData.data?.length || 0} trainings`);

    // Test POST training
    console.log('\n3️⃣ Testing POST /api/trainings...');
    const newTraining = {
      title: 'API Test Training',
      description: 'This is a test training created via API',
      type: 'TECHNICAL',
      category: 'API Testing',
      duration: 60,
      isRequired: false,
      validityPeriod: 365,
      prerequisites: [],
      createdBy: 'cmd28qux7000549jhky6ck2c8' // Using an existing user ID from the database
    };

    console.log('Sending POST request with data:', JSON.stringify(newTraining, null, 2));

    const postResponse = await fetch('http://localhost:8000/api/trainings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTraining)
    });

    console.log('Response status:', postResponse.status);
    console.log('Response headers:', Object.fromEntries(postResponse.headers.entries()));

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.log('❌ Error response body:', errorText);
      throw new Error(`HTTP ${postResponse.status}: ${errorText}`);
    }

    const postData = await postResponse.json();
    console.log('✅ POST training successful:', postData);

    // Test GET trainings again to see the new training
    console.log('\n4️⃣ Testing GET /api/trainings again...');
    const getResponse2 = await fetch('http://localhost:8000/api/trainings');
    const getData2 = await getResponse2.json();
    console.log(`✅ GET trainings successful. Now found ${getData2.data?.length || 0} trainings`);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testCreateTraining();
