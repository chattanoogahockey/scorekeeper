/**
 * LOCAL TTS CONNECTION TEST
 * Test Google Cloud TTS without deploying to Azure
 * 
 * This script simulates the Azure environment locally
 */

// Simulate Azure environment variables (replace with your actual values)
const AZURE_ENV_VARS = {
  GOOGLE_CLOUD_PROJECT_ID: 'hockey-announcer-tts-467921',
  GOOGLE_CLOUD_CLIENT_EMAIL: 'hockey-tts-service@hockey-announcer-tts-467921.iam.gserviceaccount.com',
  GOOGLE_CLOUD_PRIVATE_KEY_ID: '64cc399b...', // Replace with your actual key ID
  GOOGLE_CLOUD_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBg...\\n-----END PRIVATE KEY-----' // Replace with your actual private key
};

console.log('🧪 LOCAL TTS CONNECTION TEST');
console.log('============================\n');

// Prompt user to enter their actual values
console.log('📝 SETUP INSTRUCTIONS:');
console.log('1. Go to your Azure App Service Configuration');
console.log('2. Copy the EXACT values from your environment variables');
console.log('3. Replace the values in this script:');
console.log('   - GOOGLE_CLOUD_PROJECT_ID');
console.log('   - GOOGLE_CLOUD_CLIENT_EMAIL');  
console.log('   - GOOGLE_CLOUD_PRIVATE_KEY_ID');
console.log('   - GOOGLE_CLOUD_PRIVATE_KEY (including \\n characters)');
console.log('4. Run: node test-local-tts.js\n');

// Set environment variables from the values above
Object.keys(AZURE_ENV_VARS).forEach(key => {
  process.env[key] = AZURE_ENV_VARS[key];
});

async function testLocalTTS() {
  try {
    console.log('🔍 Environment Variables Check:');
    console.log(`   - GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅' : '❌'}`);
    console.log(`   - GOOGLE_CLOUD_CLIENT_EMAIL: ${process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? '✅' : '❌'}`);
    console.log(`   - GOOGLE_CLOUD_PRIVATE_KEY_ID: ${process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID ? '✅' : '❌'}`);
    console.log(`   - GOOGLE_CLOUD_PRIVATE_KEY: ${process.env.GOOGLE_CLOUD_PRIVATE_KEY ? '✅' : '❌'}\n`);
    
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || 
        !process.env.GOOGLE_CLOUD_CLIENT_EMAIL || 
        !process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID || 
        !process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
      console.log('❌ Missing environment variables. Please update the AZURE_ENV_VARS object above.');
      return;
    }
    
    console.log('🔌 Testing TTS Service Import...');
    const ttsService = await import('./ttsService.js');
    
    console.log('✅ TTS Service imported successfully');
    
    // Wait for initialization
    console.log('⏳ Waiting for TTS initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test voice selection
    console.log('\n🎭 Testing voice selection...');
    const voices = ttsService.default.getAvailableVoices();
    console.log(`Found ${voices.length} configured voices:`);
    voices.forEach(voice => {
      console.log(`   - ${voice.name} (${voice.type})`);
    });
    
    // Test voice switching
    console.log('\n🔄 Testing voice switching...');
    const testVoices = ['en-US-Studio-Q', 'en-US-Studio-O', 'en-US-Neural2-D'];
    for (const voiceName of testVoices) {
      const result = ttsService.default.setAnnouncerVoice(voiceName);
      console.log(`   - ${voiceName}: ${result ? '✅' : '❌'}`);
    }
    
    // Test speech generation
    console.log('\n🎤 Testing speech generation...');
    if (ttsService.default.client) {
      console.log('TTS client is available - testing speech generation...');
      
      const testText = "Goal scored by number 10, Johnny Hockey!";
      const filename = await ttsService.default.generateSpeech(testText, 'test-local', 'goal');
      
      if (filename) {
        console.log(`✅ Successfully generated speech: ${filename}`);
        console.log('🎉 Google Cloud TTS is working locally!');
        
        // Test penalty voice too
        const penaltyText = "Two minute minor penalty for tripping";
        const penaltyFile = await ttsService.default.generatePenaltySpeech(penaltyText, 'test-local');
        
        if (penaltyFile) {
          console.log(`✅ Successfully generated penalty speech: ${penaltyFile}`);
          console.log('🏒 Both goal and penalty voices are working!');
        }
        
      } else {
        console.log('❌ Speech generation failed - check error messages above');
      }
    } else {
      console.log('❌ TTS client not available - check initialization errors above');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testLocalTTS().then(() => {
  console.log('\n🏁 Local TTS test completed');
}).catch(error => {
  console.error('💥 Test crashed:', error);
});

export { AZURE_ENV_VARS };
