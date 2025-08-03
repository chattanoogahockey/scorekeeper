import textToSpeech from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Google Cloud Text-to-Speech service for generating high-quality announcer voices
 * 
 * Voice Configuration:
 * - Studio-O: Primary announcer voice for goals and general commentary (expressive, engaging)
 * - Studio-M: Secondary voice for penalties and serious announcements (authoritative, clear)
 * 
 * Studio voices are Google's most advanced TTS technology with human-like quality
 */
class TTSService {
  constructor() {
    this.client = null;
    this.audioDir = path.join(__dirname, 'audio-cache');
    this.initializeClient();
  }

  async initializeClient() {
    try {
      let clientOptions = {};
      
      // Enhanced debugging for Azure environment
      console.log('🔍 Debugging Google Cloud credentials:');
      console.log('   GOOGLE_CLOUD_PROJECT_ID:', !!process.env.GOOGLE_CLOUD_PROJECT_ID);
      console.log('   GOOGLE_CLOUD_CLIENT_EMAIL:', !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL);
      console.log('   GOOGLE_CLOUD_PRIVATE_KEY:', !!process.env.GOOGLE_CLOUD_PRIVATE_KEY);
      console.log('   GOOGLE_CLOUD_PRIVATE_KEY_ID:', !!process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID);
      console.log('   GOOGLE_APPLICATION_CREDENTIALS_JSON exists:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      console.log('   GOOGLE_APPLICATION_CREDENTIALS exists:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        console.log('   JSON credentials length:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length);
        console.log('   JSON starts with:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.substring(0, 50) + '...');
      }
      
      // Method 1: Individual environment variables (proper approach for Azure)
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
      const privateKeyId = process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID;
      
      if (projectId && clientEmail && privateKey && privateKeyId) {
        console.log('🔑 Using individual environment variables for Google Cloud TTS');
        console.log('   Project ID:', projectId);
        console.log('   Client Email:', clientEmail);
        console.log('   Private Key ID:', privateKeyId);
        console.log('   Private Key length:', privateKey.length);
        
        try {
          const credentials = {
            type: "service_account",
            project_id: projectId,
            private_key_id: privateKeyId,
            private_key: privateKey,
            client_email: clientEmail,
            client_id: "103020565003422938812",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
            universe_domain: "googleapis.com"
          };
          
          clientOptions.credentials = credentials;
          console.log('✅ Google Cloud credentials assembled from individual variables');
        } catch (error) {
          console.error('❌ Failed to assemble credentials from individual variables:', error.message);
          throw error;
        }
      }
      // Method 2: Azure-style JSON credentials (fallback)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        console.log('🔑 Using Azure environment JSON credentials for Google Cloud TTS');
        try {
          const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          clientOptions.credentials = credentials;
          console.log('✅ Google Cloud credentials parsed successfully');
          console.log('   Project ID:', credentials.project_id);
          console.log('   Client Email:', credentials.client_email);
        } catch (parseError) {
          console.error('❌ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseError.message);
          console.error('   JSON content preview:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.substring(0, 200));
          throw parseError;
        }
      }
      // Method 3: Standard credentials file path (local development)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('🔑 Using GOOGLE_APPLICATION_CREDENTIALS file path');
      }
      // No credentials configured
      else {
        console.log('⚠️  No Google Cloud credentials found - Studio voices unavailable');
        console.log('💡 To enable Studio voices (choose one method):');
        console.log('   1. Azure: Set individual GOOGLE_CLOUD_* environment variables (recommended)');
        console.log('   2. Azure: Set GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable');
        console.log('   3. Local: Set GOOGLE_APPLICATION_CREDENTIALS file path');
        this.client = null;
        return;
      }
      
      // Initialize the Google Cloud TTS client with credentials
      this.client = new textToSpeech.TextToSpeechClient(clientOptions);
      
      // Test connection with a simple list voices call
      await this.client.listVoices({ languageCode: 'en-US' });
      
      // Ensure audio cache directory exists
      await fs.mkdir(this.audioDir, { recursive: true });
      
      console.log('✅ Google Cloud TTS client initialized successfully - Studio voices available!');
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud TTS:', error.message);
      console.log('💡 Falling back to browser TTS. Error details:');
      console.log('   - Error:', error.message);
      console.log('   - Check Google Cloud project billing and API enablement');
      console.log('   - Verify credentials are valid for Text-to-Speech API');
      this.client = null;
    }
  }

  /**
   * Generate speech audio file from text using Google Cloud TTS
   * @param {string} text - The text to convert to speech
   * @param {string} gameId - Game ID for caching purposes
   * @param {string} type - Type of announcement (goal, penalty, etc.)
   * @returns {Promise<string|null>} - Path to generated audio file or null if failed
   */
  async generateSpeech(text, gameId, type = 'announcement') {
    if (!this.client) {
      console.log('🔄 Google TTS not available, will use browser TTS fallback');
      return null;
    }

    try {
      // Create a unique filename based on content and timestamp
      const timestamp = Date.now();
      const filename = `${gameId}-${type}-${timestamp}.mp3`;
      const filePath = path.join(this.audioDir, filename);

      // Try Studio voice first, fallback to Neural2 if not available
      let voiceConfig;
      let audioConfig;

      // Attempt Studio voice first (use working Studio voice)
      try {
        voiceConfig = {
          languageCode: 'en-US',
          name: 'en-US-Studio-M', // Studio-M: Male voice that should be available
          ssmlGender: 'MALE',
        };
        
        audioConfig = {
          audioEncoding: 'MP3',
          speakingRate: 1.15, // Faster pace for more energy and excitement
          pitch: 0.5, // Higher pitch for more energy and enthusiasm
          volumeGainDb: 4.0, // Boost volume for stadium atmosphere
          effectsProfileId: ['large-home-entertainment-class-device'],
        };

        // Test with a quick synthesis to see if Studio voice is available
        const testRequest = {
          input: { text: 'Test' },
          voice: voiceConfig,
          audioConfig: { audioEncoding: 'MP3' }
        };
        
        await this.client.synthesizeSpeech(testRequest);
        console.log(`🎯 Using Studio-O voice for: "${text.substring(0, 50)}..."`);
        
      } catch (studioError) {
        console.log('⚠️  Studio voice not available, using Neural2-D (still excellent quality)');
        
        // Fallback to best Neural2 voice
        voiceConfig = {
          languageCode: 'en-US',
          name: 'en-US-Neural2-D', // Best Neural2 male voice
          ssmlGender: 'MALE',
        };
        
        audioConfig = {
          audioEncoding: 'MP3',
          speakingRate: 1.05, // Slightly faster for Neural2
          pitch: 0.3, // Small pitch boost for excitement
          volumeGainDb: 3.5, // Higher volume for Neural2
          effectsProfileId: ['large-home-entertainment-class-device'],
        };
        
        console.log(`🎤 Using Neural2-D voice for: "${text.substring(0, 50)}..."`);
      }

      // Configure the final TTS request
      const request = {
        input: { text: text },
        voice: voiceConfig,
        audioConfig: audioConfig,
      };

      console.log(`🎤 Generating TTS for: "${text.substring(0, 50)}..."`);

      // Make the TTS request
      const [response] = await this.client.synthesizeSpeech(request);

      // Save the audio file
      await fs.writeFile(filePath, response.audioContent, 'binary');

      console.log(`✅ Generated TTS audio: ${filename}`);
      return filename; // Return just the filename for the API endpoint

    } catch (error) {
      console.error('❌ Failed to generate TTS audio:', error.message);
      return null;
    }
  }

  /**
   * Alternative voice for penalty announcements (more serious tone)
   */
  async generatePenaltySpeech(text, gameId) {
    if (!this.client) {
      return null;
    }

    try {
      const timestamp = Date.now();
      const filename = `${gameId}-penalty-${timestamp}.mp3`;
      const filePath = path.join(this.audioDir, filename);

      // Try Studio voice first, fallback to Neural2 if not available
      let voiceConfig;
      let audioConfig;

      // Attempt Studio voice first (same male voice for consistency)
      try {
        voiceConfig = {
          languageCode: 'en-US',
          name: 'en-US-Studio-M', // Studio-M: Same male voice for consistency
          ssmlGender: 'MALE',
        };
        
        audioConfig = {
          audioEncoding: 'MP3',
          speakingRate: 1.05, // Slightly slower than goals but still energetic
          pitch: 0.2, // Lower than goals for authority but still energetic
          volumeGainDb: 4.0, // Strong volume for penalty announcements
          effectsProfileId: ['large-home-entertainment-class-device'],
        };

        // Test Studio voice availability
        const testRequest = {
          input: { text: 'Test' },
          voice: voiceConfig,
          audioConfig: { audioEncoding: 'MP3' }
        };
        
        await this.client.synthesizeSpeech(testRequest);
        console.log(`🎯 Using Studio-M voice for penalty: "${text.substring(0, 50)}..."`);
        
      } catch (studioError) {
        console.log('⚠️  Studio voice not available, using Neural2-I (authoritative fallback)');
        
        // Fallback to best Neural2 authoritative voice
        voiceConfig = {
          languageCode: 'en-US',
          name: 'en-US-Neural2-I', // Most confident Neural2 voice
          ssmlGender: 'MALE',
        };
        
        audioConfig = {
          audioEncoding: 'MP3',
          speakingRate: 0.9, // Slower for seriousness
          pitch: -0.8, // Lower pitch for authority
          volumeGainDb: 3.5, // Higher volume for Neural2
          effectsProfileId: ['large-home-entertainment-class-device'],
        };
        
        console.log(`🎤 Using Neural2-I voice for penalty: "${text.substring(0, 50)}..."`);
      }

      const request = {
        input: { text: text },
        voice: voiceConfig,
        audioConfig: audioConfig,
      };

      const [response] = await this.client.synthesizeSpeech(request);
      await fs.writeFile(filePath, response.audioContent, 'binary');

      console.log(`✅ Generated penalty TTS audio: ${filename}`);
      return filename;

    } catch (error) {
      console.error('❌ Failed to generate penalty TTS audio:', error.message);
      return null;
    }
  }

  /**
   * Clean up old audio files to prevent disk space issues
   */
  async cleanupOldFiles() {
    try {
      const files = await fs.readdir(this.audioDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.audioDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old TTS file: ${file}`);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up TTS files:', error.message);
    }
  }
}

const ttsServiceInstance = new TTSService();
export default ttsServiceInstance;
