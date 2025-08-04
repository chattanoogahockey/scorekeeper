/**
 * TEST BASE64 DECODED GOOGLE CLOUD JSON LOCALLY
 */

import textToSpeech from '@google-cloud/text-to-speech';

const BASE64_CREDENTIALS = "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiaG9ja2V5LWFubm91bmNlci10dHMtNDY3OTIxIiwKICAicHJpdmF0ZV9rZXlfaWQiOiAiNjRjYzM5OWI4NThiNTg0MjI4MGEwOTE3MTg0OTIyODQ2ZTJlZGZmNSIsCiAgInByaXZhdGVfa2V5IjogIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZBSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS1l3Z2dTaUFnRUFBb0lCQVFDbytGUll1VmhDb0kyYlxuU0RhamNxSXFyNTYvUm5ONVc0UGFlRFo1d3M0N0R1Mzc2ejhYdnpIYVd2emQvMXJpK2F5Q1ZiNzY4ZFpNV3lBVlxudmFtbjJkUzhzdWt6ZVVLbXRza1plYlBZbVBpWUpjcU9YdzlBa25VaFVoN2JZSDM3Y3VZcEdLUGxRT05XRHppd1xuR3R6QzZmUmVteHdqektHQ0dCT2lVb1lPd0VCOW9KQTFlNTdBYWhEWmJNendtUXBQaTNDamNkb08yc2hqWEMrWlxuT2xYM1czT2ZQdVBMUVh3L3Z6c3hOVS80Q2VDUHFNc1RnNW1DYmc5R05YUUk1S1R0clpnSXRvU0g2L3Jtbkl0OFxuYzVlMGp3dW52bFREMGN4OTdRcDM3bVFOVWU4ZHFCSXNXMnhrT2pFeU1BVEw5dTJ3TE5ZZk5mTEF2K2h5bFBpd1xueE9wZkF1NFRBZ01CQUFFQ2dnRUFBaHVTNWNadUdPcXF5WWlWa2VWZ3EzcWtWc3Q0cmtkYmRqS3dyMFVrVUcxSFxudjdBNENjSkxTMmQrSndERDcvZmdWSUhnVDM0THg4a05OZWczUVE1QkRwZUd2Q3NqanpQUmYxMWF4blZtQ0hQVVxuT29GcURjcWw1bVFCV1lnekdodGRUcDd0a0hNR1F2RU9xbmV6VUVVZDFMNUhsQlM5NFFNTzM2UDY0eDAzMExsV1xuVWdrN2gvb2tYOVJuTFNaMjIvSnlRZS9GMExsSFNvY29FT2FlT0ZwV1FJV0kvZk5qcmYzbGErc3VqeExBYTNKRlxuRnJreE04ak1xcFo5TEdLVVdLOG93cVJIZ1psYko3S1hway8vYTJyVVl5WVh5NlpIYy9CRDdFQWEyOEY0eUw1NVxuUXNHdHl2VFdwV0p6SkRaRUpWaElWT21Tcmtrb2NHZWE4T21kV1pSZWlRS0JnUURYYU0zb1FKeEpCd2swM2hjRlxubFlJMUV1eitkSVdrY2QxNTY1K1BjVk5BaDY2Rk9ZSDZZUlg3SXBITGNRRi9SajIzSVBtQVE2YlVvRlZOTUtDd1xuWVIxdjJ6OHZKQ25LQUtHb05kaFp5dkJwNEErV01XVkRTVkE1cFNab25LNU1oOGNIOUs5UDYxSGMzZ3hIY0hLOFxuQ2VDRWxNRU1CNy81Sk5qcDhEdWpQN3N2ZVFLQmdRREl6MUxnM1ltM2pBQUNydUhXNE1WZkpNa3p3WEpxVGx3N1xuMkVxNlVkL3RUYzQyVllEK09qdlUzSUNieHZtQjh1MzJxNFhrOU4vVHFDenl2cW9nVHJiWksyc1RDajJtSi9vblxuR2ovaTBBVVgyQ0VQd2lmc2ovdm1iUCt3VStId2ZmKzZJclhOckRrWENieU1kSmpvQmswTHpkQlAxQ05BRTZHbFxuRHZaOEkraXE2d0tCZ0VhOVFqRnRWbVdkQytieXNEakRPbmxYZDhDd1gxcjdrYklDTU9vWVd6Q3IzaUllR3BNd1xuNHRrUUp6VGFMWld3YVlBRU1pdHZEQkJ6ZnMvVWtsQ1o4K0xSNjFQOTJrTmVKYmhweGx6bWlrRWF0Y09yQVFneFxud1VqTTlXb1JXaVFEeXRiUUFlcUs2dDFQaGxUSGxzWXRzQytaOGpPVEwvWVBwYlJka2hnd1M3WnhBb0dBUU5lQlxuWVk3bnExY1BvYzRxcXFJRjJZVWRXeEw2Q1Eyb2hzSit6czhsU1pFNEp4OVErY2FBRDJuc05XRDRyRmR2TTVtTFxuTUxWSm1TVFM3c2RXVS94VzJxVkVlKzl3bkxpSDlCeHJ5S2QzSFkzeWp3NFlxakNNSEluUnZuUTNudHB3dXYvK1xuU0oxMkNkUmhCOUdXbGtXQ2wyOHI5cnIvYnU5bjRNNkdGT3ZiYzJVQ2dZQUo1TVk1OFVvVFIyeklONXArT09ZVlxuWElhUWJCcjU3dHd1dk5pOUJEZTgxd3d5LzJQM1ZIT1dkUC9sekNzcGxjUVZ6clU2NjlDZnBoaDRsc2pqbWVmZlxuVVJBN01pYW5aaXEyYjQvZyttZS81YzBHT1ZsZDQ3aFY0TVl5NkVtNmp4bGZBZlB6YS9ONUN4N1lJeGhTeW1zbFxuRDVmUUc0dlNGMGZUTjNUckdRSDNGUT09XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAiaG9ja2V5LXR0cy1zZXJ2aWNlQGhvY2tleS1hbm5vdW5jZXItdHRzLTQ2NzkyMS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgImNsaWVudF9pZCI6ICIxMDMwMjA1NjUwMDM0MjI5Mzg4MTIiLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2hvY2tleS10dHMtc2VydmljZSU0MGhvY2tleS1hbm5vdW5jZXItdHRzLTQ2NzkyMS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQ==";

console.log('🎯 TESTING BASE64 DECODED GOOGLE CLOUD JSON');
console.log('===========================================\n');

async function testBase64JSON() {
  try {
    console.log('📊 Base64 Analysis:');
    console.log(`   Base64 Length: ${BASE64_CREDENTIALS.length} characters`);
    console.log(`   Base64 First 50 chars: "${BASE64_CREDENTIALS.substring(0, 50)}"`);
    
    // Decode base64 to JSON string
    const jsonString = Buffer.from(BASE64_CREDENTIALS, 'base64').toString('utf-8');
    console.log(`   Decoded JSON Length: ${jsonString.length} characters`);
    console.log(`   JSON First 50 chars: "${jsonString.substring(0, 50)}"`);
    console.log(`   JSON Last 50 chars: "${jsonString.substring(jsonString.length - 50)}"`);
    
    const credentials = JSON.parse(jsonString);
    console.log('✅ JSON Parsing successful!');
    console.log(`   Project ID: ${credentials.project_id}`);
    console.log(`   Client Email: ${credentials.client_email}`);
    console.log(`   Private Key Length: ${credentials.private_key.length} characters`);
    console.log(`   Private Key ID: ${credentials.private_key_id}`);
    
    console.log('\n🔌 Creating TTS Client...');
    const client = new textToSpeech.TextToSpeechClient({
      credentials: credentials
    });
    
    console.log('✅ Client created successfully');
    
    console.log('\n🧪 Testing connection...');
    const [voicesResponse] = await client.listVoices({ languageCode: 'en-US' });
    const voices = voicesResponse?.voices || voicesResponse || [];
    console.log(`✅ CONNECTION SUCCESS! Found ${Array.isArray(voices) ? voices.length : 'unknown number of'} voices`);
    
    if (!Array.isArray(voices)) {
      console.log('⚠️  Voices response format unexpected, but connection worked!');
      console.log('\n🎉 BASE64 TEST SUCCESSFUL!');
      console.log('   The base64 decoded credentials work perfectly.');
      console.log('   Ready to deploy to Azure!');
      return true;
    }
    
    // Check for Studio voices
    const studioVoices = voices.filter(v => v.name.includes('Studio'));
    const neural2Voices = voices.filter(v => v.name.includes('Neural2'));
    
    console.log(`\n🎭 Voice Analysis:`);
    console.log(`   Studio voices: ${studioVoices.length}`);
    console.log(`   Neural2 voices: ${neural2Voices.length}`);
    
    if (studioVoices.length > 0) {
      console.log('\n🎉 STUDIO VOICES AVAILABLE!');
      studioVoices.slice(0, 5).forEach(voice => {
        console.log(`   - ${voice.name} (${voice.ssmlGender})`);
      });
    } else {
      console.log('\n⚠️  No Studio voices found - check billing in Google Cloud');
    }
    
    console.log('\n🎤 Testing speech generation...');
    const testText = "Goal scored by Johnny Hockey!";
    const voiceToUse = studioVoices.length > 0 ? studioVoices[0] : neural2Voices[0];
    
    const request = {
      input: { text: testText },
      voice: {
        languageCode: 'en-US',
        name: voiceToUse.name,
        ssmlGender: voiceToUse.ssmlGender
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.1,
        pitch: 0.5,
        volumeGainDb: 4.0
      }
    };
    
    const [response] = await client.synthesizeSpeech(request);
    console.log(`✅ Generated ${response.audioContent.length} bytes of audio`);
    console.log(`   Using voice: ${voiceToUse.name}`);
    
    console.log('\n🎉 BASE64 TEST SUCCESSFUL!');
    console.log('   The base64 decoded credentials work perfectly.');
    console.log('   Ready to deploy to Azure!');
    
    return true;
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(`   Error code: ${error.code}`);
    
    if (error.message.includes('DECODER routines')) {
      console.error('   🔑 Still a private key format issue');
    } else if (error.message.includes('UNAUTHENTICATED')) {
      console.error('   🚫 Authentication failed - check credentials');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.error('   🔒 Permission denied - check service account roles');
    }
    
    return false;
  }
}

testBase64JSON().then(success => {
  if (success) {
    console.log('\n🚀 READY FOR AZURE DEPLOYMENT!');
    console.log('   The base64 credentials are valid and working.');
  } else {
    console.log('\n❌ Need to fix credentials before Azure deployment.');
  }
});
