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
      // Initialize the Google Cloud TTS client
      // If GOOGLE_APPLICATION_CREDENTIALS is set, it will use that
      // Otherwise, it will try to use default credentials
      this.client = new textToSpeech.TextToSpeechClient();
      
      // Ensure audio cache directory exists
      await fs.mkdir(this.audioDir, { recursive: true });
      
      console.log('✅ Google Cloud TTS client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud TTS:', error.message);
      console.log('💡 Falling back to browser TTS. To enable Google TTS:');
      console.log('   1. Set up Google Cloud project with TTS API enabled');
      console.log('   2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
      console.log('   3. Or provide service account key JSON');
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

      // Configure the TTS request for Studio-O announcer voice
      const request = {
        input: { text: text },
        // Use Google's most advanced Studio voice for maximum realism
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Studio-O', // Studio-O: Premium male voice, perfect for sports announcing
          ssmlGender: 'MALE',
        },
        // Configure audio for maximum realism and excitement
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.1, // Optimal pace for clear, exciting announcements
          pitch: 0.8, // Slightly elevated for energy while maintaining authority
          volumeGainDb: 4.0, // Stadium-level volume for impact
          effectsProfileId: ['large-home-entertainment-class-device'], // Best quality/realism
        },
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

      const request = {
        input: { text: text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Studio-M', // Studio-M: Authoritative male voice, perfect for penalties
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95, // Deliberate pace for serious announcements
          pitch: -0.5, // Lower pitch for authority while maintaining clarity
          volumeGainDb: 3.2, // Clear, commanding volume
          effectsProfileId: ['large-home-entertainment-class-device'], // Maximum realism
        },
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
