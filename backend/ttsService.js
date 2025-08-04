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
    this.selectedVoice = 'en-US-Studio-Q'; // Default to female Studio voice
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
      
      // Priority 1: Base64 encoded credentials (Azure-safe approach)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
        console.log('🔑 Using Base64 encoded credentials for Google Cloud TTS');
        try {
          const base64String = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
          console.log('🔍 Base64 Credential Diagnostics:');
          console.log(`   - Base64 Length: ${base64String.length}`);
          console.log(`   - Base64 First 50 chars: "${base64String.substring(0, 50)}"`);
          
          // Decode base64 to JSON string
          const jsonString = Buffer.from(base64String, 'base64').toString('utf-8');
          console.log(`   - Decoded JSON Length: ${jsonString.length}`);
          console.log(`   - JSON First 50 chars: "${jsonString.substring(0, 50)}"`);
          console.log(`   - JSON Last 50 chars: "${jsonString.substring(jsonString.length - 50)}"`);
          
          const credentials = JSON.parse(jsonString);
          clientOptions.credentials = credentials;
          console.log('✅ Google Cloud credentials loaded from Base64');
          console.log(`   - Project: ${credentials.project_id}`);
          console.log(`   - Email: ${credentials.client_email}`);
          console.log(`   - Private Key Length: ${credentials.private_key?.length || 0} characters`);
        } catch (error) {
          console.error(`❌ Failed to process Base64 credentials: ${error.message}`);
          throw error;
        }
      }
      // Priority 2: JSON credentials (legacy support)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        console.log('🔑 Using JSON credentials for Google Cloud TTS');
        try {
          const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
          console.log('🔍 JSON Credential Diagnostics:');
          console.log(`   - Length: ${rawJson.length}`);
          console.log(`   - First 50 chars: "${rawJson.substring(0, 50)}"`);
          console.log(`   - Last 50 chars: "${rawJson.substring(rawJson.length - 50)}"`);
          console.log(`   - Starts with {: ${rawJson.startsWith('{')}`);
          console.log(`   - Ends with }: ${rawJson.endsWith('}')}`);
          
          // Try to clean up the JSON string
          let cleanJson = rawJson.trim();
          
          // Remove any potential BOM or invisible characters
          cleanJson = cleanJson.replace(/^\uFEFF/, '');
          
          // If it doesn't start with {, try to find where JSON starts
          if (!cleanJson.startsWith('{')) {
            const jsonStart = cleanJson.indexOf('{');
            if (jsonStart > 0) {
              console.log(`   - Found JSON start at position: ${jsonStart}`);
              cleanJson = cleanJson.substring(jsonStart);
            }
          }
          
          // If it doesn't end with }, try to find where JSON ends
          if (!cleanJson.endsWith('}')) {
            const jsonEnd = cleanJson.lastIndexOf('}');
            if (jsonEnd > 0) {
              console.log(`   - Found JSON end at position: ${jsonEnd}`);
              cleanJson = cleanJson.substring(0, jsonEnd + 1);
            }
          }
          
          console.log(`   - Cleaned JSON length: ${cleanJson.length}`);
          console.log(`   - Cleaned starts with {: ${cleanJson.startsWith('{')}`);
          console.log(`   - Cleaned ends with }: ${cleanJson.endsWith('}')}`);
          
          const credentials = JSON.parse(cleanJson);
          clientOptions.credentials = credentials;
          console.log('✅ Google Cloud credentials loaded from JSON');
          console.log(`   - Project: ${credentials.project_id}`);
          console.log(`   - Email: ${credentials.client_email}`);
          console.log(`   - Private Key Length: ${credentials.private_key?.length || 0} characters`);
        } catch (error) {
          console.error('❌ Failed to parse JSON credentials:', error.message);
          console.error('Raw JSON content for debugging:');
          console.error(`"${process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON}"`);
          throw error;
        }
      }
      // Priority 2: File-based credentials (local development)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('🔑 Using file-based credentials for Google Cloud TTS');
        clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      else {
        console.log('⚠️  No Google Cloud credentials found - Studio voices unavailable');
        console.log('💡 To enable Studio voices, set GOOGLE_APPLICATION_CREDENTIALS_JSON');
        this.client = null;
        return;
      }
      
      // Initialize the Google Cloud TTS client with credentials
      console.log('🔌 Initializing Google Cloud TTS client...');
      this.client = new textToSpeech.TextToSpeechClient(clientOptions);
      
      // Test connection and get available voices
      console.log('🧪 Testing Google Cloud TTS connection...');
      try {
        const [response] = await this.client.listVoices({ languageCode: 'en-US' });
        const voices = response?.voices || response || [];
        console.log(`✅ Google Cloud TTS connected! Found ${Array.isArray(voices) ? voices.length : 'unknown number of'} voices`);
        
        if (Array.isArray(voices)) {
          const studioVoices = voices.filter(v => v.name && v.name.includes('Studio'));
          const neural2Voices = voices.filter(v => v.name && v.name.includes('Neural2'));
          
          console.log('🎭 Voice Analysis:');
          console.log(`   - Studio voices: ${studioVoices.length}`);
          console.log(`   - Neural2 voices: ${neural2Voices.length}`);
          
          if (studioVoices.length > 0) {
            console.log('🎉 STUDIO VOICES AVAILABLE!');
            studioVoices.slice(0, 3).forEach(voice => {
              console.log(`   - ${voice.name} (${voice.ssmlGender})`);
            });
          } else {
            console.log('⚠️  No Studio voices found - check billing in Google Cloud');
          }
        } else {
          console.log('⚠️  Voices response format unexpected, but connection worked!');
        }
        
        console.log('✅ Google Cloud TTS client initialized successfully');
        console.log(`🎤 Default voice: ${this.selectedVoice}`);
        
      } catch (testError) {
        console.error('❌ Google Cloud TTS connection test failed:', testError.message);
        if (testError.message.includes('DECODER routines')) {
          console.error('   🔑 This indicates a private key format issue');
        } else if (testError.message.includes('UNAUTHENTICATED')) {
          console.error('   🚫 Authentication failed - check credentials');
        } else if (testError.message.includes('PERMISSION_DENIED')) {
          console.error('   🔒 Permission denied - check service account roles');
        }
        throw testError;
      }
      
      // Create audio directory if it doesn't exist
      try {
        await fs.mkdir(this.audioDir, { recursive: true });
        console.log(`📁 Audio cache directory ready: ${this.audioDir}`);
      } catch (dirError) {
        console.warn('⚠️  Could not create audio directory:', dirError.message);
      }
      
    } catch (error) {
      console.error('❌ TTS Service initialization failed:', error.message);
      this.client = null;
      throw error;
    }
  }

  /**
   * Generate speech from text using Google Cloud Text-to-Speech with Studio voices
   */
  async generateSpeech(text, gameId, type = 'announcement') {
    if (!this.client) {
      console.log('⚠️  TTS Client not available - returning silent response');
      return { success: false, message: 'TTS service not available', audioPath: null };
    }

    try {
      console.log(`🎤 Generating ${type} speech: "${text}"`);
      
      // Create filename based on content hash
      const filename = this.generateFilename(text, gameId, type);
      const audioPath = path.join(this.audioDir, filename);
      
      // Check if we already have this audio cached
      try {
        await fs.access(audioPath);
        console.log(`♻️  Using cached audio: ${filename}`);
        return { success: true, message: 'Audio generated (cached)', audioPath };
      } catch {
        // File doesn't exist, continue with generation
      }
      
      // Determine which voice to use
      let voiceToUse = this.selectedVoice;
      
      // Use more energetic voice for goals and exciting announcements
      if (type === 'goal' || text.toLowerCase().includes('goal') || text.toLowerCase().includes('score')) {
        voiceToUse = 'en-US-Studio-O'; // Energetic male voice
      }
      // Use authoritative voice for penalties and official announcements
      else if (type === 'penalty' || text.toLowerCase().includes('penalty') || text.toLowerCase().includes('minutes')) {
        voiceToUse = 'en-US-Studio-M'; // Authoritative male voice
      }
      
      // Configure voice parameters based on type
      let speakingRate = 1.0;
      let pitch = 0.0;
      let volumeGainDb = 2.0;
      
      if (type === 'goal') {
        speakingRate = 1.1; // Slightly faster for excitement
        pitch = 2.0;        // Higher pitch for excitement
        volumeGainDb = 4.0; // Louder for emphasis
      } else if (type === 'penalty') {
        speakingRate = 0.9; // Slower for authority
        pitch = -1.0;       // Lower pitch for seriousness
        volumeGainDb = 3.0; // Clear and audible
      }
      
      // Prepare the synthesis request
      const request = {
        input: { text: text },
        voice: {
          languageCode: 'en-US',
          name: voiceToUse,
          ssmlGender: voiceToUse.includes('Studio-Q') || voiceToUse.includes('Neural2-F') ? 'FEMALE' : 'MALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speakingRate,
          pitch: pitch,
          volumeGainDb: volumeGainDb,
          effectsProfileId: ['headphone-class-device'] // Optimize for headphones/speakers
        }
      };
      
      console.log(`🎙️  Using voice: ${voiceToUse} (Rate: ${speakingRate}, Pitch: ${pitch})`);
      
      // Generate the speech
      const [response] = await this.client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Google Cloud TTS');
      }
      
      // Save the audio file
      await fs.writeFile(audioPath, response.audioContent, 'binary');
      
      console.log(`✅ Speech generated successfully: ${filename} (${response.audioContent.length} bytes)`);
      return { success: true, message: 'Audio generated successfully', audioPath };
      
    } catch (error) {
      console.error('❌ Speech generation failed:', error.message);
      
      if (error.message.includes('QUOTA_EXCEEDED')) {
        console.error('   💰 Google Cloud TTS quota exceeded - check billing');
      } else if (error.message.includes('INVALID_ARGUMENT')) {
        console.error(`   📝 Invalid request - check voice name: ${this.selectedVoice}`);
      } else if (error.message.includes('UNAUTHENTICATED')) {
        console.error('   🔑 Authentication failed - TTS credentials invalid');
      }
      
      return { success: false, message: error.message, audioPath: null };
    }
  }

  /**
   * Generate speech specifically optimized for goal announcements
   */
  async generateGoalSpeech(text, gameId) {
    return this.generateSpeech(text, gameId, 'goal');
  }

  /**
   * Generate speech specifically optimized for penalty announcements
   */
  async generatePenaltySpeech(text, gameId) {
    return this.generateSpeech(text, gameId, 'penalty');
  }

  /**
   * Generate a filename based on text content
   */
  generateFilename(text, gameId, type) {
    // Create a simple hash of the text for caching
    const hash = text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    const timestamp = Date.now();
    return `${type}_${gameId}_${hash}_${timestamp}.mp3`;
  }

  /**
   * Check if TTS service is available
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Get current voice configuration
   */
  getCurrentVoice() {
    return this.selectedVoice;
  }

  /**
   * Clean up old audio files to save disk space
   */
  async cleanupOldFiles() {
    try {
      const files = await fs.readdir(this.audioDir);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const filePath = path.join(this.audioDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < oneDayAgo) {
            await fs.unlink(filePath);
            console.log(`🗑️  Cleaned up old audio file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Audio cleanup failed:', error.message);
    }
  }
}

// Create and export a singleton instance
const ttsServiceInstance = new TTSService();
export default ttsServiceInstance;
