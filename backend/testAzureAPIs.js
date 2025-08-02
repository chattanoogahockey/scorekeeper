#!/usr/bin/env node

/**
 * Azure API Test
 * Tests all APIs (goals, penalties, attendance) on Azure deployment
 */

async function testAzureAPIs() {
  console.log('☁️ Testing Azure APIs...');
  
  // Common Azure App Service URLs (update these with your actual deployment URL)
  const possibleUrls = [
    'https://scorekeeper.azurewebsites.net',
    'https://hockey-scorekeeper.azurewebsites.net', 
    'https://scorekeeper-hockey.azurewebsites.net'
  ];
  
  let workingBaseUrl = null;
  
  // Step 1: Find the working Azure URL
  console.log('\n🔍 Step 1: Finding working Azure URL...');
  for (const baseUrl of possibleUrls) {
    try {
      console.log(`Testing: ${baseUrl}`);
      const response = await fetch(`${baseUrl}/api/test`, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found working URL: ${baseUrl}`);
        console.log(`✅ Response:`, data);
        workingBaseUrl = baseUrl;
        break;
      } else {
        console.log(`❌ ${baseUrl} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${baseUrl} - Error: ${error.message}`);
    }
  }
  
  if (!workingBaseUrl) {
    console.error('❌ No working Azure URL found. Please check your deployment.');
    console.log('\n📝 Common Azure deployment URLs:');
    console.log('- https://scorekeeper.azurewebsites.net');
    console.log('- https://your-app-name.azurewebsites.net');
    console.log('\n🔧 To find your URL, check Azure Portal > App Services > Your App > URL');
    process.exit(1);
  }
  
  try {
    // Step 2: Test Health Check
    console.log('\n🏥 Step 2: Testing Health Check...');
    const healthResponse = await fetch(`${workingBaseUrl}/api/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed');
      console.log('✅ Environment variables configured:', healthData.environment);
    } else {
      console.log('⚠️ Health check failed:', healthResponse.status);
    }

    // Step 3: Get games for testing
    console.log('\n🎮 Step 3: Getting games from Azure...');
    const gamesResponse = await fetch(`${workingBaseUrl}/api/games?league=all`);
    
    if (!gamesResponse.ok) {
      throw new Error(`Games API failed: ${gamesResponse.status} ${gamesResponse.statusText}`);
    }
    
    const games = await gamesResponse.json();
    console.log('✅ Games retrieved from Azure:', games.length, 'games found');
    
    if (games.length === 0) {
      throw new Error('No games available for testing');
    }
    
    const testGame = games[0];
    console.log('✅ Using test game:', testGame.awayTeam, 'vs', testGame.homeTeam, '(ID:', testGame.id, ')');

    // Step 4: Test Goals API on Azure
    console.log('\n⚽ Step 4: Testing Goals API on Azure...');
    const goalPayload = {
      gameId: testGame.id,
      team: testGame.awayTeam,
      player: 'Azure Test Scorer',
      period: '1',
      time: '5:30',
      assist: null,
      shotType: 'Wrist Shot',
      goalType: 'Regular',
      breakaway: false
    };
    
    console.log('📦 Goal payload:', JSON.stringify(goalPayload, null, 2));
    
    const goalResponse = await fetch(`${workingBaseUrl}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalPayload),
    });
    
    console.log('📊 Goals API response status:', goalResponse.status);
    
    if (!goalResponse.ok) {
      const errorText = await goalResponse.text();
      console.error('❌ Goals API error:', errorText);
      throw new Error(`Goals API failed: ${goalResponse.status} - ${errorText}`);
    }
    
    const goalResult = await goalResponse.json();
    console.log('✅ Goal created on Azure:', goalResult.success, '- ID:', goalResult.goal.id);

    // Step 5: Test Penalties API on Azure
    console.log('\n🚨 Step 5: Testing Penalties API on Azure...');
    const penaltyPayload = {
      gameId: testGame.id,
      team: testGame.homeTeam,
      player: 'Azure Test Penalty Player',
      period: '2',
      time: '12:45',
      penaltyType: 'Tripping',
      penaltyLength: '2',
      details: { description: 'Azure test penalty' }
    };
    
    console.log('📦 Penalty payload:', JSON.stringify(penaltyPayload, null, 2));
    
    const penaltyResponse = await fetch(`${workingBaseUrl}/api/penalties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(penaltyPayload),
    });
    
    console.log('📊 Penalties API response status:', penaltyResponse.status);
    
    if (!penaltyResponse.ok) {
      const errorText = await penaltyResponse.text();
      console.error('❌ Penalties API error:', errorText);
      throw new Error(`Penalties API failed: ${penaltyResponse.status} - ${errorText}`);
    }
    
    const penaltyResult = await penaltyResponse.json();
    console.log('✅ Penalty created on Azure:', penaltyResult.success, '- ID:', penaltyResult.penalty.id);

    // Step 6: Test Attendance API on Azure
    console.log('\n📋 Step 6: Testing Attendance API on Azure...');
    const attendancePayload = {
      gameId: testGame.id,
      attendance: {
        [testGame.awayTeam]: ['Azure Player 1', 'Azure Player 2'],
        [testGame.homeTeam]: ['Azure Player A', 'Azure Player B']
      },
      totalRoster: [
        { teamName: testGame.awayTeam, teamId: testGame.awayTeam, totalPlayers: ['Azure Player 1', 'Azure Player 2', 'Azure Player 3'] },
        { teamName: testGame.homeTeam, teamId: testGame.homeTeam, totalPlayers: ['Azure Player A', 'Azure Player B', 'Azure Player C'] }
      ]
    };
    
    const attendanceResponse = await fetch(`${workingBaseUrl}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendancePayload),
    });
    
    console.log('📊 Attendance API response status:', attendanceResponse.status);
    
    if (!attendanceResponse.ok) {
      const errorText = await attendanceResponse.text();
      console.error('❌ Attendance API error:', errorText);
      throw new Error(`Attendance API failed: ${attendanceResponse.status} - ${errorText}`);
    }
    
    const attendanceResult = await attendanceResponse.json();
    console.log('✅ Attendance recorded on Azure:', attendanceResult.id);

    console.log('\n🎉 AZURE API TEST PASSED!');
    console.log(`✅ Working Azure URL: ${workingBaseUrl}`);
    console.log('✅ Goals API: WORKING on Azure');
    console.log('✅ Penalties API: WORKING on Azure');
    console.log('✅ Attendance API: WORKING on Azure');
    console.log('\n🔧 Frontend Environment Variable:');
    console.log(`VITE_API_BASE_URL=${workingBaseUrl}`);

  } catch (error) {
    console.error('❌ Azure API Test FAILED:', error);
    console.error('🔍 Error details:', error.message);
    
    if (workingBaseUrl) {
      console.log('\n🔧 Debug steps:');
      console.log(`1. Check health endpoint: ${workingBaseUrl}/api/health`);
      console.log(`2. Check test endpoint: ${workingBaseUrl}/api/test`);
      console.log('3. Review Azure App Service logs in Azure Portal');
      console.log('4. Verify environment variables are set in Azure');
    }
    
    process.exit(1);
  }
}

// Run the Azure API test
testAzureAPIs();
