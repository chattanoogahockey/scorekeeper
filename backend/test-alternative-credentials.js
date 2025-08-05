/**
 * Alternative TTS initialization approach
 * Let's try using the JSON credentials method instead of individual variables
 */
import textToSpeech from '@google-cloud/text-to-speech';

console.log('🧪 TESTING ALTERNATIVE CREDENTIAL APPROACH');
console.log('==========================================\n');

async function testAlternativeCredentials() {
  try {
    // Get the individual environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
    const privateKeyId = process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID;
    
    if (!projectId || !clientEmail || !privateKey || !privateKeyId) {
      console.log('❌ Missing required environment variables');
      return;
    }
    
    console.log('✅ All environment variables present');
    
    // Try the JSON approach - create a complete service account JSON
    const serviceAccountJson = {
      "type": "service_account",
      "project_id": projectId,
      "private_key_id": privateKeyId,
      "private_key": privateKey.replace(/\\n/g, '\n'), // Convert escaped newlines
      "client_email": clientEmail,
      "client_id": "103020565003422938812",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
      "universe_domain": "googleapis.com"
    };
    
    console.log('🔑 Created service account JSON from environment variables');
    console.log(`   - Project: ${serviceAccountJson.project_id}`);
    console.log(`   - Email: ${serviceAccountJson.client_email}`);
    console.log(`   - Key starts with: ${serviceAccountJson.private_key.substring(0, 30)}...`);
    
    // Method 1: Direct credentials object
    console.log('\n📋 METHOD 1: Direct credentials object');
    try {
      const client1 = new textToSpeech.TextToSpeechClient({
        credentials: serviceAccountJson
      });
      
      console.log('   ✅ Client created, testing connection...');
      const [voices1] = await client1.listVoices({ languageCode: 'en-US' });
      console.log(`   ✅ SUCCESS! Found ${voices1.length} voices`);
      
      return true; // Success!
      
    } catch (error1) {
      console.log(`   ❌ Failed: ${error1.message}`);
    }
    
    // Method 2: Using GOOGLE_APPLICATION_CREDENTIALS_JSON
    console.log('\n📋 METHOD 2: GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable');
    try {
      // Set the JSON as an environment variable temporarily
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify(serviceAccountJson);
      
      const client2 = new textToSpeech.TextToSpeechClient({
        credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      });
      
      console.log('   ✅ Client created, testing connection...');
      const [voices2] = await client2.listVoices({ languageCode: 'en-US' });
      console.log(`   ✅ SUCCESS! Found ${voices2.length} voices`);
      
      return true; // Success!
      
    } catch (error2) {
      console.log(`   ❌ Failed: ${error2.message}`);
    }
    
    // Method 3: Try with different private key formats
    console.log('\n📋 METHOD 3: Alternative private key formats');
    
    const keyFormats = [
      { name: 'Original', key: privateKey },
      { name: 'Escaped newlines converted', key: privateKey.replace(/\\n/g, '\n') },
      { name: 'URL decoded', key: (() => {
        try { return decodeURIComponent(privateKey); } catch { return privateKey; }
      })() }
    ];
    
    for (const format of keyFormats) {
      try {
        console.log(`   Testing format: ${format.name}`);
        
        const testCredentials = {
          ...serviceAccountJson,
          private_key: format.key
        };
        
        const client3 = new textToSpeech.TextToSpeechClient({
          credentials: testCredentials
        });
        
        const [voices3] = await client3.listVoices({ languageCode: 'en-US' });
        console.log(`   ✅ SUCCESS with ${format.name}! Found ${voices3.length} voices`);
        
        return true; // Success!
        
      } catch (error3) {
        console.log(`   ❌ ${format.name} failed: ${error3.message}`);
      }
    }
    
    console.log('\n💥 All methods failed - there may be a fundamental issue with the credentials');
    return false;
    
  } catch (error) {
    console.error('💥 Test crashed:', error);
    return false;
  }
}

// Run the test
testAlternativeCredentials().then(success => {
  if (success) {
    console.log('\n🎉 SOLUTION FOUND! One of the methods worked.');
  } else {
    console.log('\n😞 No working solution found. The issue may be:');
    console.log('   1. Invalid service account credentials');
    console.log('   2. TTS API not enabled in Google Cloud');
    console.log('   3. Billing not set up correctly');
    console.log('   4. Service account lacks proper permissions');
  }
  process.exit(success ? 0 : 1);
});
