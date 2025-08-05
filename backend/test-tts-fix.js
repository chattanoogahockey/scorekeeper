/**
 * Quick test script to validate Google Cloud TTS credentials and connection
 * Run this locally to debug TTS issues before deployment
 */
import ttsService from './ttsService.js';

console.log('🧪 Testing Google Cloud TTS Fix...\n');

async function testTTSConnection() {
  try {
    console.log('1️⃣ Testing TTS service initialization...');
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n2️⃣ Testing voice selection...');
    const voices = ttsService.getAvailableVoices();
    console.log(`Found ${voices.length} configured voices:`);
    voices.forEach(voice => {
      console.log(`   - ${voice.name} (${voice.gender})`);
    });
    
    console.log('\n3️⃣ Testing voice switching...');
    const testVoices = ['en-US-Studio-Q', 'en-US-Studio-O', 'en-US-Neural2-D'];
    
    for (const voiceName of testVoices) {
      const result = ttsService.setAnnouncerVoice(voiceName);
      console.log(`   - ${voiceName}: ${result ? '✅' : '❌'}`);
    }
    
    console.log('\n4️⃣ Testing speech generation...');
    if (ttsService.client) {
      console.log('TTS client is available - testing speech generation...');
      
      const testText = "Goal scored by number 10!";
      const filename = await ttsService.generateSpeech(testText, 'test-game', 'goal');
      
      if (filename) {
        console.log(`✅ Successfully generated speech: ${filename}`);
        console.log('🎉 TTS is working correctly!');
      } else {
        console.log('❌ Speech generation failed');
      }
    } else {
      console.log('❌ TTS client not available - check error messages above');
    }
    
  } catch (error) {
    console.error('\n❌ TTS Test Failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    // Additional diagnostics
    console.log('\n🔍 Environment Diagnostics:');
    console.log(`   - GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - GOOGLE_CLOUD_CLIENT_EMAIL: ${process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - GOOGLE_CLOUD_PRIVATE_KEY: ${process.env.GOOGLE_CLOUD_PRIVATE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - GOOGLE_CLOUD_PRIVATE_KEY_ID: ${process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID ? '✅ Set' : '❌ Missing'}`);
    
    if (process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
      const key = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
      console.log('\n🔑 Private Key Analysis:');
      console.log(`   - Length: ${key.length}`);
      console.log(`   - Has \\n: ${key.includes('\\n')}`);
      console.log(`   - Has actual newlines: ${key.includes('\n')}`);
      console.log(`   - Has BEGIN: ${key.includes('-----BEGIN PRIVATE KEY-----')}`);
      console.log(`   - Has END: ${key.includes('-----END PRIVATE KEY-----')}`);
    }
  }
}

// Run the test
testTTSConnection().then(() => {
  console.log('\n✅ TTS test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 TTS test crashed:', error);
  process.exit(1);
});
