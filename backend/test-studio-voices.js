import textToSpeech from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';

/**
 * Test script to verify Google Cloud Studio voices are available
 * This will test both Studio-O and Studio-M voices
 */

async function testStudioVoices() {
  console.log('🎤 Testing Google Cloud Studio Voices...\n');
  
  try {
    const client = new textToSpeech.TextToSpeechClient();
    
    // Test Studio-O voice
    console.log('Testing Studio-O voice...');
    try {
      const studioORequest = {
        input: { text: 'Goal scored by number 23 Johnson!' },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Studio-O',
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 3.0,
        },
      };
      
      const [response] = await client.synthesizeSpeech(studioORequest);
      await fs.writeFile('test-studio-o.mp3', response.audioContent, 'binary');
      console.log('✅ Studio-O voice SUCCESS! File saved as test-studio-o.mp3');
      
    } catch (error) {
      console.log('❌ Studio-O voice FAILED:', error.message);
      
      // Check specific error types
      if (error.message.includes('Invalid voice name')) {
        console.log('   - Studio-O voice not available in this region/project');
      } else if (error.message.includes('permission')) {
        console.log('   - Permission/billing issue');
      }
    }
    
    console.log('');
    
    // Test Studio-M voice  
    console.log('Testing Studio-M voice...');
    try {
      const studioMRequest = {
        input: { text: 'Two minute penalty for tripping, number 15 Smith!' },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Studio-M',
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: -0.3,
          volumeGainDb: 3.0,
        },
      };
      
      const [response] = await client.synthesizeSpeech(studioMRequest);
      await fs.writeFile('test-studio-m.mp3', response.audioContent, 'binary');
      console.log('✅ Studio-M voice SUCCESS! File saved as test-studio-m.mp3');
      
    } catch (error) {
      console.log('❌ Studio-M voice FAILED:', error.message);
      
      // Check specific error types
      if (error.message.includes('Invalid voice name')) {
        console.log('   - Studio-M voice not available in this region/project');
      } else if (error.message.includes('permission')) {
        console.log('   - Permission/billing issue');
      }
    }
    
    console.log('');
    
    // Test fallback Neural2-D voice for comparison
    console.log('Testing Neural2-D fallback voice...');
    try {
      const neural2Request = {
        input: { text: 'Goal scored by number 23 Johnson!' },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-D',
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.05,
          pitch: 0.3,
          volumeGainDb: 3.5,
        },
      };
      
      const [response] = await client.synthesizeSpeech(neural2Request);
      await fs.writeFile('test-neural2-d.mp3', response.audioContent, 'binary');
      console.log('✅ Neural2-D voice SUCCESS! File saved as test-neural2-d.mp3');
      
    } catch (error) {
      console.log('❌ Neural2-D voice FAILED:', error.message);
    }
    
    console.log('\n📋 Test Summary:');
    console.log('- Check the generated MP3 files to compare voice quality');
    console.log('- Studio voices should sound significantly more natural than Neural2');
    console.log('- If Studio voices failed, check Google Cloud project settings');
    
  } catch (error) {
    console.error('❌ Failed to initialize Google Cloud TTS client:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Verify GOOGLE_APPLICATION_CREDENTIALS is set');
    console.log('2. Check Google Cloud project has TTS API enabled');
    console.log('3. Verify billing is enabled for the project');
    console.log('4. Check if Studio voices are available in your region');
  }
}

testStudioVoices().catch(console.error);
