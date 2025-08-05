import ttsService from './ttsService.js';

console.log('🧪 Testing TTS Service with file-based credentials...');

async function testTTS() {
  try {
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!ttsService.isAvailable()) {
      console.error('❌ TTS Service not available');
      return;
    }
    
    console.log('✅ TTS Service initialized');
    console.log('🎤 Current voice:', ttsService.getCurrentVoice());
    
    // Test generating speech
    const result = await ttsService.generateSpeech('Goal scored by the Chattanooga Hockey Club!', 'test-game', 'goal');
    
    if (result && result.success) {
      console.log('✅ TTS Test successful!');
      console.log(`   - File: ${result.filename}`);
      console.log(`   - Voice: ${result.voice}`);
      console.log(`   - Size: ${result.size} bytes`);
    } else {
      console.error('❌ TTS Test failed:', result?.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  process.exit(0);
}

testTTS();
