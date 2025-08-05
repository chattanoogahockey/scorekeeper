/**
 * QUICK TTS TEST - Copy your Azure values here and run locally
 */

// 🔥 PASTE YOUR AZURE VALUES HERE:
const YOUR_AZURE_VALUES = {
  GOOGLE_CLOUD_PROJECT_ID: 'YOUR_PROJECT_ID_HERE',
  GOOGLE_CLOUD_CLIENT_EMAIL: 'YOUR_CLIENT_EMAIL_HERE',
  GOOGLE_CLOUD_PRIVATE_KEY_ID: 'YOUR_KEY_ID_HERE',
  GOOGLE_CLOUD_PRIVATE_KEY: 'YOUR_PRIVATE_KEY_HERE_WITH_\\n_CHARACTERS'
};

// Set environment variables
Object.assign(process.env, YOUR_AZURE_VALUES);

import textToSpeech from '@google-cloud/text-to-speech';

console.log('🚀 QUICK TTS TEST');
console.log('================\n');

async function quickTest() {
  console.log('📋 Step 1: Check environment variables...');
  const hasAll = Object.keys(YOUR_AZURE_VALUES).every(key => {
    const hasValue = YOUR_AZURE_VALUES[key] && !YOUR_AZURE_VALUES[key].includes('YOUR_');
    console.log(`   ${key}: ${hasValue ? '✅' : '❌'}`);
    return hasValue;
  });
  
  if (!hasAll) {
    console.log('\n❌ Please update YOUR_AZURE_VALUES with your actual Azure environment variable values');
    console.log('💡 Get them from: Azure Portal > App Service > Configuration > Application settings');
    return;
  }
  
  console.log('\n🔧 Step 2: Format private key...');
  const privateKey = YOUR_AZURE_VALUES.GOOGLE_CLOUD_PRIVATE_KEY;
  console.log(`   Original length: ${privateKey.length}`);
  console.log(`   Has \\n: ${privateKey.includes('\\n')}`);
  console.log(`   Has actual newlines: ${privateKey.includes('\n')}`);
  
  // Convert \n to actual newlines
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  console.log(`   Formatted length: ${formattedKey.length}`);
  console.log(`   Lines after format: ${formattedKey.split('\n').length}`);
  
  console.log('\n🔗 Step 3: Create TTS client...');
  try {
    const credentials = {
      type: "service_account",
      project_id: YOUR_AZURE_VALUES.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: YOUR_AZURE_VALUES.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: formattedKey,
      client_email: YOUR_AZURE_VALUES.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: "103020565003422938812",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(YOUR_AZURE_VALUES.GOOGLE_CLOUD_CLIENT_EMAIL)}`,
      universe_domain: "googleapis.com"
    };
    
    const client = new textToSpeech.TextToSpeechClient({ credentials });
    console.log('   ✅ Client created');
    
    console.log('\n🧪 Step 4: Test connection...');
    const [voices] = await client.listVoices({ languageCode: 'en-US' });
    console.log(`   ✅ SUCCESS! Found ${voices.length} voices`);
    
    // Check for Studio voices
    const studioVoices = voices.filter(v => v.name.includes('Studio'));
    const neural2Voices = voices.filter(v => v.name.includes('Neural2'));
    
    console.log(`   🎭 Studio voices: ${studioVoices.length}`);
    console.log(`   🧠 Neural2 voices: ${neural2Voices.length}`);
    
    if (studioVoices.length > 0) {
      console.log('   🎉 Studio voices are available!');
      studioVoices.slice(0, 3).forEach(voice => {
        console.log(`      - ${voice.name} (${voice.ssmlGender})`);
      });
    } else {
      console.log('   ⚠️  No Studio voices found - check billing');
    }
    
    console.log('\n🎤 Step 5: Test speech generation...');
    const testText = "Goal scored!";
    const request = {
      input: { text: testText },
      voice: {
        languageCode: 'en-US',
        name: studioVoices.length > 0 ? studioVoices[0].name : 'en-US-Neural2-D',
        ssmlGender: 'MALE'
      },
      audioConfig: { audioEncoding: 'MP3' }
    };
    
    const [response] = await client.synthesizeSpeech(request);
    console.log(`   ✅ Generated ${response.audioContent.length} bytes of audio`);
    console.log('   🎉 TTS is working perfectly!');
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    
    if (error.message.includes('DECODER routines')) {
      console.log('\n🔑 PRIVATE KEY FORMAT ISSUE:');
      console.log('   The private key has encoding problems');
      console.log('   Try these fixes:');
      console.log('   1. Copy the private key exactly from Azure portal');
      console.log('   2. Make sure \\n characters are included');
      console.log('   3. Check for any missing characters');
    }
    
    return false;
  }
}

quickTest().then(success => {
  if (success) {
    console.log('\n🎉 SUCCESS! Your TTS credentials work perfectly.');
    console.log('   The issue is likely in how Azure is handling the environment variables.');
    console.log('   Try restarting your Azure App Service.');
  } else {
    console.log('\n❌ The credentials have an issue that needs to be fixed first.');
  }
});
