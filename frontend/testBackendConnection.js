// Simple test to verify frontend-backend connectivity
// Run this in browser console to test

async function testBackendConnection() {
  try {
    console.log('Testing backend connection...');
    
    // Test basic connectivity
    const testResponse = await fetch('http://localhost:3001/api/test');
    console.log('Test endpoint response status:', testResponse.status);
    const testData = await testResponse.json();
    console.log('Test endpoint response data:', testData);
    
    // Test goals endpoint with minimal data
    const goalData = {
      gameId: "1",
      team: "Test Team",
      player: "Test Player",
      period: "1",
      time: "5:30"
    };
    
    console.log('Testing goals endpoint with data:', goalData);
    
    const goalResponse = await fetch('http://localhost:3001/api/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData),
    });
    
    console.log('Goals endpoint response status:', goalResponse.status);
    console.log('Goals endpoint response ok:', goalResponse.ok);
    
    if (!goalResponse.ok) {
      const errorText = await goalResponse.text();
      console.error('Goals endpoint error response:', errorText);
    } else {
      const goalResult = await goalResponse.json();
      console.log('Goals endpoint response data:', goalResult);
    }
    
  } catch (error) {
    console.error('Backend connection test failed:', error);
  }
}

// Run the test
testBackendConnection();
