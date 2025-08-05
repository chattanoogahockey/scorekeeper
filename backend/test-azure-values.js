/**
 * LOCAL TEST USING EXACT AZURE VALUES
 * This script pulls the exact values from Azure CLI and tests them locally
 */

import { execSync } from 'child_process';
import textToSpeech from '@google-cloud/text-to-speech';

console.log('🔄 AZURE-TO-LOCAL TTS TEST');
console.log('==========================\n');

async function testWithAzureValues() {
  try {
    console.log('📡 Fetching values from Azure CLI...');
    
    // Get the values directly from Azure CLI
    const resourceGroup = 'scorekeeperRG';
    const appName = 'scorekeeper';
    
    console.log(`   Resource Group: ${resourceGroup}`);
    console.log(`   App Service: ${appName}`);
    
    // Fetch each environment variable from Azure
    const getAzureValue = (varName) => {
      try {
        const cmd = `az webapp config appsettings list --resource-group ${resourceGroup} --name ${appName} --query "[?name=='${varName}'].value" --output tsv`;
        const result = execSync(cmd, { encoding: 'utf8' }).trim();
        return result;
      } catch (error) {
        console.log(`   ❌ Failed to get ${varName}: ${error.message}`);
        return null;
      }
    };
    
    const projectId = getAzureValue('GOOGLE_CLOUD_PROJECT_ID');
    const clientEmail = getAzureValue('GOOGLE_CLOUD_CLIENT_EMAIL');
    const privateKeyId = getAzureValue('GOOGLE_CLOUD_PRIVATE_KEY_ID');
    const privateKey = getAzureValue('GOOGLE_CLOUD_PRIVATE_KEY');
    
    console.log('\n📋 Retrieved values:');
    console.log(`   Project ID: ${projectId || '❌ Missing'}`);
    console.log(`   Client Email: ${clientEmail || '❌ Missing'}`);
    console.log(`   Private Key ID: ${privateKeyId || '❌ Missing'}`);
    console.log(`   Private Key: ${privateKey ? `${privateKey.substring(0, 50)}...` : '❌ Missing'}`);
    
    if (!projectId || !clientEmail || !privateKeyId || !privateKey) {
      console.log('\n❌ Missing required values from Azure');
      return false;
    }
    
    console.log('\n🔍 Analyzing private key format...');
    console.log(`   Length: ${privateKey.length}`);
    console.log(`   Has \\n: ${privateKey.includes('\\n')}`);
    console.log(`   Has actual newlines: ${privateKey.includes('\n')}`);
    console.log(`   First 100 chars: ${privateKey.substring(0, 100)}`);
    console.log(`   Last 100 chars: ${privateKey.substring(privateKey.length - 100)}`);
    
    // Format the private key - try different strategies
    console.log('\n🔧 Testing private key formats...');
    
    const formats = [
      { name: 'Original', key: privateKey },
      { name: 'Replace \\n with newlines', key: privateKey.replace(/\\n/g, '\n') },
      { name: 'Decode URI component', key: (() => {
        try { return decodeURIComponent(privateKey); } catch { return privateKey; }
      })() }
    ];
    
    for (const format of formats) {
      console.log(`\n   Testing: ${format.name}`);
      console.log(`   Length: ${format.key.length}`);
      console.log(`   Lines: ${format.key.split('\n').length}`);
      
      try {
        // Create credentials
        const credentials = {
          type: "service_account",
          project_id: projectId,
          private_key_id: privateKeyId,
          private_key: format.key,
          client_email: clientEmail,
          client_id: "103020565003422938812",
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
          universe_domain: "googleapis.com"
        };
        
        // Test TTS client
        const client = new textToSpeech.TextToSpeechClient({ credentials });
        const [voices] = await client.listVoices({ languageCode: 'en-US' });
        
        console.log(`   ✅ SUCCESS! Found ${voices.length} voices`);
        
        // Check for Studio voices
        const studioVoices = voices.filter(v => v.name.includes('Studio'));
        console.log(`   🎭 Studio voices: ${studioVoices.length}`);
        
        if (studioVoices.length > 0) {
          console.log('   🎉 Studio voices are available!');
          studioVoices.slice(0, 3).forEach(voice => {
            console.log(`      - ${voice.name}`);
          });
        }
        
        // Test speech generation
        console.log('   🎤 Testing speech generation...');
        const testRequest = {
          input: { text: 'Test announcement' },
          voice: {
            languageCode: 'en-US',
            name: studioVoices.length > 0 ? studioVoices[0].name : 'en-US-Neural2-D',
            ssmlGender: 'MALE'
          },
          audioConfig: { audioEncoding: 'MP3' }
        };
        
        const [response] = await client.synthesizeSpeech(testRequest);
        console.log(`   ✅ Generated ${response.audioContent.length} bytes of audio`);
        
        console.log('\n🎉 THIS FORMAT WORKS! The issue is likely in Azure environment handling.');
        console.log('💡 Solution: The credentials are correct, but Azure might be processing them differently.');
        
        return true;
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        
        if (error.message.includes('DECODER routines')) {
          console.log('   🔑 Private key format issue detected');
        }
      }
    }
    
    console.log('\n❌ None of the formats worked. There may be a fundamental issue with the credentials.');
    return false;
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  }
}

// Run the test
testWithAzureValues().then(success => {
  if (success) {
    console.log('\n🎯 CONCLUSION: The credentials work locally but fail in Azure.');
    console.log('   This suggests Azure is modifying the environment variables.');
    console.log('   Next steps:');
    console.log('   1. Try the JSON environment variable approach instead');
    console.log('   2. Check Azure App Service platform settings');
    console.log('   3. Consider using Azure Key Vault for sensitive values');
  } else {
    console.log('\n❌ The credentials themselves have issues that need to be resolved.');
  }
}).catch(error => {
  console.error('💥 Test crashed:', error);
});
