import textToSpeech from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TTSService {
  constructor() {
    this.client = null;
    this.audioDir = path.join(__dirname, 'audio-cache');
    this.selectedVoice = 'en-US-Studio-Q';
    this.initializeClient();
  }

  /**
   * Get list of available voices with correct gender assignments
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
        name: 'Studio O (Female - Energetic)', 
        gender: 'FEMALE',  // FIXED: Studio-O is actually female
        type: 'Studio',
        description: 'High-energy female voice perfect for goals and exciting moments'
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

  setAnnouncerVoice(voiceName) {
    const supportedVoices = this.getAvailableVoices().map(v => v.id);
    
    if (supportedVoices.includes(voiceName)) {
      this.selectedVoice = voiceName;
      console.log(`🎤 Announcer voice set to: ${voiceName}`);
      return true;
    } else {
      console.log(`⚠️  Voice ${voiceName} not supported. Using default: ${this.selectedVoice}`);
      return false;
    }
  }

  async initializeClient() {
    try {
      console.log('🔑 Initializing Google Cloud TTS with credential file approach');
      
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log(`✅ GOOGLE_APPLICATION_CREDENTIALS found: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      } else {
        console.log('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set, using default credential chain');
      }
      
      this.client = new textToSpeech.TextToSpeechClient();
      
      console.log('🧪 Testing Google Cloud TTS connection...');
      const [response] = await this.client.listVoices({ languageCode: 'en-US' });
      const voices = response?.voices || [];
      console.log(`✅ Google Cloud TTS connected! Found ${voices.length} voices`);
      
      const studioVoices = voices.filter(v => v.name && v.name.includes('Studio'));
      console.log(`🎉 Studio voices available: ${studioVoices.length}`);
      
      await fs.mkdir(this.audioDir, { recursive: true });
      console.log(`📁 Audio cache directory ready: ${this.audioDir}`);
      
    } catch (error) {
      console.error('❌ TTS Service initialization failed:', error.message);
      this.client = null;
      throw error;
    }
  }

  async generateSpeech(text, gameId, type = 'announcement') {
    if (!this.client) {
      console.warn('⚠️  TTS Service not available');
      return null;
    }

    try {
      const cleanText = text.replace(/[^\w\s.,!?;:()-]/g, '').substring(0, 500);
      console.log(`🎙️  Generating speech: "${cleanText}" with voice: ${this.selectedVoice}`);
      
      const request = {
        input: { text: cleanText },
        voice: {
          languageCode: 'en-US',
          name: this.selectedVoice
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0
        }
      };

      const [response] = await this.client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Google Cloud TTS');
      }

      const filename = `${type}_${gameId}_${Date.now()}.mp3`;
      const filepath = path.join(this.audioDir, filename);
      await fs.writeFile(filepath, response.audioContent, 'binary');
      
      const audioSize = response.audioContent.length;
      console.log(`✅ Speech generated successfully: ${filename} (${audioSize} bytes)`);
      
      return {
        success: true,
        filepath: filepath,
        filename: filename,
        voice: this.selectedVoice,
        size: audioSize,
        cached: false
      };

    } catch (error) {
      console.error('❌ Speech generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        voice: this.selectedVoice
      };
    }
  }

  isAvailable() {
    return this.client !== null;
  }

  getCurrentVoice() {
    return {
      voice: this.selectedVoice,
      available: this.isAvailable()
    };
  }
}

const ttsService = new TTSService();
export default ttsService;
