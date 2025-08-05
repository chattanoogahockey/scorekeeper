/**
 * TEST COMPLETE GOOGLE CLOUD JSON LOCALLY
 */

const COMPLETE_GOOGLE_JSON = {
  "type": "service_account",
  "project_id": "hockey-announcer-tts-467921",
  "private_key_id": "64cc399b858b5842280a0917184922846e2edff5",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCo+FRYuVhCoI2b\nSDajcqIqr56/RnN5W4PaeDZ5ws47Du376z8XvzHaWvzd/1ri+ayCVb768dZMWyAV\nvamn2dS8sukzeUKmtskZebPYmPiYJcqOXw9AknUhUh7bYH37cuYpGKPlQONWDziw\nGtzC6fRemxwjzKGCGBOiUoYOwEB9oJA1e57AahDZbMzwmQpPi3CjcdoO2shjXC+Z\nOlX3W3OfPuPLQXw/vzsxNU/4CeCPqMsTg5mCbg9GNXQI5KTtrZgItoSH6/rmnIt8\nc5e0jwunvlTD0cx97Qp37mQNUe8dqBIsW2xkOjEyMATL9u2wLNYfNfLAv+hylPiw\nxOpfAu4TAgMBAAECggEAAhuS5cZuGOqqyYiVkeVgq3qkVst4rkdbdjKwr0UkUG1H\nv7A4CcJLS2d+JwDD7/fgVIHgT34Lx8kNNeg3QQ5BDpeGvCsjjzPRf11axnVmCHPU\nOoFqDcql5mQBWYgzGhtdTp7tkHMGQvEOqnezUEUd1L5HlBS94QMO36P64x030LlW\nUgk7h/okX9RnLSZ22/JyQe/F0LlHSocoEOaeOFpWQIWI/fNjrf3la+sujxLAa3JF\nFrkxM8jMqpZ9LGKUWK8owqRHgZlbJ7KXpk//a2rUYyYXy6ZHc/BD7EAa28F4yL55\nQsGtyvTWpWJzJDZEJVhIVOmSrkkocGea8OmdWZReiQKBgQDXaM3oQJxJBwk03hcF\nlYI1Euz+dIWkcd1565+PcVNAh66FOYH6YRX7IpHLcQF/Rj23IPmAQ6bUoFVNMKCw\nYR1v2z8vJCnKAKGoNdhZyvBp4A+WMWVDSVA5pSZonK5Mh8cH9K9P61Hc3gxHcHK8\nCeCElMEMB7/5JNjp8DujP7sveQKBgQDIz1Lg3Ym3jAACruHW4MVfJMkzwXJqTlw7\n2Eq6Ud/tTc42VYD+OjvU3ICbxvmB8u32q4Xk9N/TqCzyvqogTrbZK2sTCj2mJ/on\nGj/i0AUX2CEPwifsj/vmbP+wU+Hwff+6IrXNrDkXCbyMdJjoBk0LzdBP1CNAE6Gl\nDvZ8I+iq6wKBgEa9QjFtVmWdC+bysDjDOnlXd8CwX1r7kbICMOoYWzCr3iIeGpMw\n4tkQJzTaLZWwaYAEMitvDBBzfs/UklCZ8+LR61P92kNeJbhpxlzmikEatcOrAQgx\nwUjM9WoRWiQDytbQAeqK6t1PhlTHlsYtsC+Z8jOTL/YPpbRdkhgwS7ZxAoGAQNeB\nYY7nq1cPoc4qqqIF2YUdWxL6CQ2ohsJ+zs8lSZE4Jx9Q+caAD2nsNWD4rFdvM5mL\nMLVJmSTS7sdWU/xW2qVEe+9wnLiH9BxryKd3HY3yjw4YqjCMHInRvnQ3ntpwuv/+\nSJ12CdRhB9GWlkWCl28r9rr/bu9n4M6GFOvbc2UCgYAJ5MY58UoTR2zIN5p+OOYV\nXIaQbBr57twuvNi9BDe81wwy/2P3VHOWdP/lzCsplcQVzrU669Cfphh4lsjjmeff\nURA7MianZiq2b4/g+me/5c0GOVld47hV4MYy6Em6jxlfAfPza/N5Cx7YIxhSymsl\nD5fQG4vSF0fTN3TrGQH3FQ==\n-----END PRIVATE KEY-----\n",
  "client_email": "hockey-tts-service@hockey-announcer-tts-467921.iam.gserviceaccount.com",
  "client_id": "103020565003422938812",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/hockey-tts-service%40hockey-announcer-tts-467921.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

import textToSpeech from '@google-cloud/text-to-speech';

console.log('🎯 TESTING COMPLETE GOOGLE CLOUD JSON');
console.log('====================================\n');

async function testCompleteJSON() {
  try {
    console.log('📊 JSON Analysis:');
    console.log(`   Project ID: ${COMPLETE_GOOGLE_JSON.project_id}`);
    console.log(`   Client Email: ${COMPLETE_GOOGLE_JSON.client_email}`);
    console.log(`   Private Key Length: ${COMPLETE_GOOGLE_JSON.private_key.length} characters`);
    console.log(`   Private Key ID: ${COMPLETE_GOOGLE_JSON.private_key_id}`);
    
    const privateKey = COMPLETE_GOOGLE_JSON.private_key;
    console.log(`   Private Key Lines: ${privateKey.split('\n').length}`);
    console.log(`   Starts with: ${privateKey.substring(0, 30)}...`);
    console.log(`   Ends with: ...${privateKey.substring(privateKey.length - 30)}`);
    
    console.log('\n🔌 Creating TTS Client...');
    const client = new textToSpeech.TextToSpeechClient({
      credentials: COMPLETE_GOOGLE_JSON
    });
    
    console.log('✅ Client created successfully');
    
    console.log('\n🧪 Testing connection...');
    const [voicesResponse] = await client.listVoices({ languageCode: 'en-US' });
    const voices = voicesResponse?.voices || voicesResponse || [];
    console.log(`✅ CONNECTION SUCCESS! Found ${Array.isArray(voices) ? voices.length : 'unknown number of'} voices`);
    
    if (!Array.isArray(voices)) {
      console.log('⚠️  Voices response format unexpected, but connection worked!');
      console.log('\n🎉 LOCAL TEST SUCCESSFUL!');
      console.log('   The complete JSON works perfectly.');
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
    
    console.log('\n🎉 LOCAL TEST SUCCESSFUL!');
    console.log('   The complete JSON works perfectly.');
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

testCompleteJSON().then(success => {
  if (success) {
    console.log('\n🚀 READY FOR AZURE DEPLOYMENT!');
    console.log('   The JSON credentials are valid and working.');
  } else {
    console.log('\n❌ Need to fix credentials before Azure deployment.');
  }
});
