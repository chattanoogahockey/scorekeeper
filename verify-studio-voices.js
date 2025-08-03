/**
 * Studio Voice Verification Script
 * Tests if Google Cloud Studio voices are working with your Azure deployment
 */

class StudioVoiceVerifier {
  constructor() {
    this.backendUrl = 'https://scorekeeper-backend-f0f8hzgthyevhub2.eastus-01.azurewebsites.net';
    this.testGameId = 'studio-test-' + Date.now();
  }

  async testHealthEndpoint() {
    console.log('🔍 Checking backend health and TTS status...\n');
    
    try {
      const response = await fetch(`${this.backendUrl}/api/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const health = await response.json();
      console.log('✅ Backend is healthy!');
      console.log(`⏱️  Uptime: ${health.uptime} seconds`);
      console.log(`🌐 Environment: ${health.environment?.NODE_ENV || 'unknown'}`);
      
      if (health.tts) {
        console.log('\n🎙️ TTS Status:');
        console.log(`   Available: ${health.tts.available ? '✅ YES' : '❌ NO'}`);
        console.log(`   Credentials: ${health.tts.credentialsSource}`);
        console.log(`   Studio Voices Expected: ${health.tts.studioVoicesExpected ? '✅ YES' : '❌ NO'}`);
        console.log(`   Google Cloud Project: ${health.tts.googleCloudProject}`);
        
        return health.tts;
      } else {
        console.log('\n⚠️  No TTS status available in health endpoint');
        return null;
      }

    } catch (error) {
      console.error('❌ Error checking health:', error.message);
      return null;
    }
  }

  async testStudioVoiceInitialization() {
    console.log('🎙️ Testing Studio Voice Initialization...\n');
    
    try {
      // Test the TTS endpoint to see if Studio voices are available
      const testText = "Goal scored by Johnson! Studio voice test!";
      
      console.log('📡 Testing backend TTS endpoint...');
      const response = await fetch(`${this.backendUrl}/api/tts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          gameId: this.testGameId,
          type: 'goal'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ TTS Response:', result);

      if (result.audioFile) {
        console.log('🎵 Audio file generated:', result.audioFile);
        console.log('🔗 Audio URL:', `${this.backendUrl}/api/audio/${result.audioFile}`);
        
        // Check if it's using Studio voice by examining the response
        if (result.voiceUsed && result.voiceUsed.includes('Studio')) {
          console.log('🎯 SUCCESS: Studio voice detected!');
          console.log(`   Voice used: ${result.voiceUsed}`);
          return true;
        } else {
          console.log('⚠️  Fallback voice detected');
          console.log(`   Voice used: ${result.voiceUsed || 'Unknown'}`);
          return false;
        }
      } else {
        console.log('❌ No audio file generated');
        return false;
      }

    } catch (error) {
      console.error('❌ Error testing TTS:', error.message);
      return false;
    }
  }

  async checkBackendLogs() {
    console.log('\n📋 Checking for Studio Voice initialization messages...');
    
    try {
      // Try to get health/status endpoint that might show TTS status
      const response = await fetch(`${this.backendUrl}/api/health`);
      
      if (response.ok) {
        const health = await response.json();
        console.log('✅ Backend health:', health);
      } else {
        console.log('⚠️  Health endpoint not available');
      }
      
    } catch (error) {
      console.log('⚠️  Could not check backend status:', error.message);
    }
    
    console.log('\n💡 To check detailed logs:');
    console.log('1. Go to Azure Portal');
    console.log('2. Find your App Service');
    console.log('3. Go to "Log stream" or "Logs"');
    console.log('4. Look for these messages:');
    console.log('   ✅ "🔑 Using Azure environment JSON credentials for Google Cloud TTS"');
    console.log('   ✅ "✅ Google Cloud TTS client initialized successfully - Studio voices available!"');
    console.log('   🎯 "🎯 Using Studio-O voice for: ..."');
    console.log('   ⚠️  "⚠️ Studio voice not available, using Neural2-D"');
  }

  async testPenaltyVoice() {
    console.log('\n🚨 Testing Penalty Voice (Studio-M)...');
    
    try {
      const penaltyText = "Two minute penalty for tripping, number 15 Smith!";
      
      const response = await fetch(`${this.backendUrl}/api/tts/generate-penalty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: penaltyText,
          gameId: this.testGameId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Penalty TTS Response:', result);

      if (result.audioFile) {
        console.log('🎵 Penalty audio file:', result.audioFile);
        console.log('🔗 Audio URL:', `${this.backendUrl}/api/audio/${result.audioFile}`);
        
        if (result.voiceUsed && result.voiceUsed.includes('Studio')) {
          console.log('🎯 SUCCESS: Studio-M voice detected for penalties!');
          return true;
        } else {
          console.log('⚠️  Fallback voice for penalties');
          return false;
        }
      }

    } catch (error) {
      console.error('❌ Error testing penalty TTS:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🏒 STUDIO VOICE VERIFICATION for Hockey Announcer');
    console.log('=================================================\n');
    
    console.log('🔧 Configuration Check:');
    console.log(`Backend URL: ${this.backendUrl}`);
    console.log(`Test Game ID: ${this.testGameId}`);
    console.log('Expected voices: Studio-O (goals), Studio-M (penalties)\n');

    // Test goal voice
    const goalSuccess = await this.testStudioVoiceInitialization();
    
    // Test penalty voice
    const penaltySuccess = await this.testPenaltyVoice();
    
    // Check logs guidance
    await this.checkBackendLogs();

    // Final summary
    console.log('\n🎯 VERIFICATION SUMMARY:');
    console.log('========================');
    console.log(`Goal Voice (Studio-O):    ${goalSuccess ? '✅ WORKING' : '❌ FALLBACK'}`);
    console.log(`Penalty Voice (Studio-M): ${penaltySuccess ? '✅ WORKING' : '❌ FALLBACK'}`);
    
    if (goalSuccess && penaltySuccess) {
      console.log('\n🎉 SUCCESS: Studio voices are working perfectly!');
      console.log('Your hockey announcer now has hyper-realistic voice quality!');
    } else if (goalSuccess || penaltySuccess) {
      console.log('\n⚠️  PARTIAL: Some Studio voices working, others falling back');
      console.log('Check Azure logs for specific voice availability issues');
    } else {
      console.log('\n❌ ISSUE: Studio voices not working - using fallback');
      console.log('\n🔍 Troubleshooting steps:');
      console.log('1. Verify Azure environment variable GOOGLE_APPLICATION_CREDENTIALS_JSON is set');
      console.log('2. Check that JSON credentials are valid');
      console.log('3. Ensure Google Cloud billing is enabled');
      console.log('4. Verify Text-to-Speech API is enabled in Google Cloud');
      console.log('5. Check if Studio voices are available in your region');
      console.log('6. Restart Azure App Service after credential changes');
    }

    console.log('\n🔗 Quick test links:');
    if (goalSuccess) {
      console.log(`Goal audio: ${this.backendUrl}/api/audio/goal-audio-file.mp3`);
    }
    if (penaltySuccess) {
      console.log(`Penalty audio: ${this.backendUrl}/api/audio/penalty-audio-file.mp3`);
    }
  }
}

// Run the verifier
const verifier = new StudioVoiceVerifier();
verifier.run().catch(console.error);
