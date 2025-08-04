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
 * - Studio-Q: Alternative female voice option (professional, clear)
 * 
 * Studio voices are Google's most advanced TTS technology with human-like quality
 */
class TTSService {
  constructor() {
    this.client = null;
    this.audioDir = path.join(__dirname, 'audio-cache');
    this.selectedVoice = 'en-US-Studio-Q'; // Default to female Studio voice (more likely available)
    this.initializeClient();
  }

  /**
   * Set the current announcer voice
   */
  setAnnouncerVoice(voiceName) {
    const supportedVoices = [
      'en-US-Studio-O',  // Male, energetic
      'en-US-Studio-M',  // Male, authoritative 
      'en-US-Studio-Q',  // Female, professional
      'en-US-Neural2-D', // Male, clear (fallback)
      'en-US-Neural2-F', // Female, warm (fallback)
      'en-US-Neural2-I'  // Male, confident (fallback)
    ];
    
    if (supportedVoices.includes(voiceName)) {
      this.selectedVoice = voiceName;
      console.log(`🎤 Announcer voice set to: ${voiceName}`);
      return true;
    } else {
      console.log(`⚠️  Voice ${voiceName} not supported. Using default: ${this.selectedVoice}`);
      return false;
    }
  }

  /**
   * Get list of available voices
   */
  getAvailableVoices() {
    return [
      {
        id: 'en-US-Studio-Q',
        name: 'Studio Q (Female - Professional)',
        gender: 'FEMALE',
        type: 'Studio', 
        description: 'Professional female voice for clear, articulate announcements (Default)'
      },
      {
        id: 'en-US-Studio-O',
        name: 'Studio O (Male - Energetic)',
        gender: 'MALE',
        type: 'Studio',
        description: 'High-energy male voice perfect for goals and exciting moments'
      },
      {
        id: 'en-US-Studio-M',
        name: 'Studio M (Male - Authoritative)',
        gender: 'MALE', 
        type: 'Studio',
        description: 'Authoritative male voice ideal for penalties and official announcements'
      },
      {
        id: 'en-US-Neural2-F',
        name: 'Neural2 F (Female - Warm)',
        gender: 'FEMALE',
        type: 'Neural2',
        description: 'Warm, friendly female voice (fallback option)'
      },
      {
        id: 'en-US-Neural2-D',
        name: 'Neural2 D (Male - Clear)',
        gender: 'MALE',
        type: 'Neural2',
        description: 'Clear, reliable male voice (fallback option)'
      },
      {
        id: 'en-US-Neural2-I',
        name: 'Neural2 I (Male - Confident)',
        gender: 'MALE',
        type: 'Neural2',
        description: 'Confident, strong male voice (fallback option)'
      }
    ];
  }

  async initializeClient() {
    try {
      let clientOptions = {};
      
      // Priority 1: Individual environment variables (Azure approach)
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
      const privateKeyId = process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID;
      
      if (projectId && clientEmail && privateKey && privateKeyId) {
        console.log('🔑 Using individual environment variables for Google Cloud TTS');
        
        // Handle private key formatting - convert \n to actual newlines if needed
        // Check if the private key contains escaped newlines or actual newlines
        let formattedPrivateKey = privateKey;
        if (privateKey.includes('\\n')) {
          // If it contains escaped newlines, convert them
          formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
          console.log('🔧 Converted escaped newlines in private key');
        } else if (!privateKey.includes('\n')) {
          // If it doesn't contain any newlines at all, it might be base64 or malformed
          console.log('⚠️  Private key appears to be missing newlines - trying to add them');
          // Try to insert newlines in standard PEM format
          if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            formattedPrivateKey = privateKey
              .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
              .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
          }
        }
        
        console.log('🔍 Private key format check:');
        console.log(`   - Length: ${formattedPrivateKey.length}`);
        console.log(`   - Has BEGIN marker: ${formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')}`);
        console.log(`   - Has END marker: ${formattedPrivateKey.includes('-----END PRIVATE KEY-----')}`);
        console.log(`   - Has newlines: ${formattedPrivateKey.includes('\n')}`);
        
        const credentials = {
          type: "service_account",
          project_id: projectId,
          private_key_id: privateKeyId,
          private_key: formattedPrivateKey,
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
      }
      // Priority 2: JSON credentials (fallback)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        console.log('🔑 Using JSON credentials for Google Cloud TTS');
        try {
          const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          clientOptions.credentials = credentials;
          console.log('✅ Google Cloud credentials loaded from JSON');
        } catch (error) {
          console.error('❌ Failed to parse JSON credentials:', error.message);
          throw error;
        }
      }
      // Priority 3: File-based credentials (local development)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('🔑 Using file-based credentials for Google Cloud TTS');
        clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      } else {
        console.log('⚠️  No Google Cloud credentials found - Studio voices unavailable');
        console.log('💡 To enable Studio voices, set Google Cloud environment variables');
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

      // Try the selected voice first, fallback to Neural2 if not available
      let voiceConfig;
      let audioConfig;

      // Attempt to use the currently selected voice
      try {
        // Determine gender from voice name
        const isStudioQ = this.selectedVoice === 'en-US-Studio-Q';
        const isNeuralF = this.selectedVoice === 'en-US-Neural2-F';
        const isFemale = isStudioQ || isNeuralF;
        
        voiceConfig = {
          languageCode: 'en-US',
          name: this.selectedVoice,
          ssmlGender: isFemale ? 'FEMALE' : 'MALE',
        };
        
        audioConfig = {
          audioEncoding: 'MP3',
          speakingRate: 1.15, // Faster pace for more energy and excitement
          pitch: isFemale ? 1.0 : 0.5, // Higher pitch for females, moderate for males
          volumeGainDb: 4.0, // Boost volume for stadium atmosphere
          effectsProfileId: ['large-home-entertainment-class-device'],
        };

        // Test with a quick synthesis to see if voice is available
        const testRequest = {
          input: { text: 'Test' },
          voice: voiceConfig,
          audioConfig: { audioEncoding: 'MP3' }
        };
        
        await this.client.synthesizeSpeech(testRequest);
        console.log(`🎯 Using ${this.selectedVoice} voice for: "${text.substring(0, 50)}..."`);
        
      } catch (voiceError) {
        console.log(`⚠️  ${this.selectedVoice} voice not available, using Neural2-D fallback`);
        console.log('Voice error details:', voiceError.message);
        
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

      // Use the selected voice for penalty announcements (slightly more serious tone)
      let voiceConfig;
      let audioConfig;

      // Attempt to use the currently selected voice for penalties
      try {
        // Determine gender from voice name
        const isStudioQ = this.selectedVoice === 'en-US-Studio-Q';
        const isNeuralF = this.selectedVoice === 'en-US-Neural2-F';
        const isFemale = isStudioQ || isNeuralF;
        
        voiceConfig = {
          languageCode: 'en-US',
          name: this.selectedVoice,
          ssmlGender: isFemale ? 'FEMALE' : 'MALE',
        };
        
        audioConfig = {
          audioEncoding: 'MP3',
          speakingRate: 1.05, // Slightly slower than goals for authority
          pitch: isFemale ? 0.8 : 0.2, // Lower pitch for authority
          volumeGainDb: 4.0, // Strong volume for penalty announcements
          effectsProfileId: ['large-home-entertainment-class-device'],
        };

        // Test voice availability
        const testRequest = {
          input: { text: 'Test' },
          voice: voiceConfig,
          audioConfig: { audioEncoding: 'MP3' }
        };
        
        await this.client.synthesizeSpeech(testRequest);
        console.log(`🎯 Using ${this.selectedVoice} voice for penalty: "${text.substring(0, 50)}..."`);
        
      } catch (voiceError) {
        console.log(`⚠️  ${this.selectedVoice} voice not available, using Neural2-I fallback`);
        console.log('Voice error details:', voiceError.message);
        
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
