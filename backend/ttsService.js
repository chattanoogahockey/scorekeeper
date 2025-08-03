const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');

/**
 * Google Cloud Text-to-Speech service for generating high-quality announcer voices
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

      // Configure the TTS request for an exciting announcer voice
      const request = {
        input: { text: text },
        // Use a voice that sounds like a sports announcer
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-D', // Male voice, good for sports announcing
          ssmlGender: 'MALE',
        },
        // Configure audio format
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.1, // Slightly faster for excitement
          pitch: 0.5, // Slightly lower pitch for authority
          volumeGainDb: 2.0, // Boost volume for stadium feel
          effectsProfileId: ['headphone-class-device'], // Optimize for headphones
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
          name: 'en-US-Neural2-A', // Different voice for penalties
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95, // Slightly slower for seriousness
          pitch: -0.5, // Lower pitch for authority
          volumeGainDb: 1.5,
          effectsProfileId: ['headphone-class-device'],
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

module.exports = new TTSService();
