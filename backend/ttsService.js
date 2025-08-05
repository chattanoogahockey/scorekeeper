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
    this.selectedVoice = 'en-US-Studio-Q'; // Default to professional male Studio voice
    this.initializeClient();
  }

  /**
   * Get optimal announcer settings for each voice and scenario
   * Based on Google Cloud TTS best practices and voice-specific capabilities
   * Studio voices: No pitch, no emphasis support - rely on rate and volume
   * Neural2 voices: Full SSML support including pitch and emphasis
   */
  getVoiceSettings(voiceId, scenario = 'goal') {
    const baseSettings = {
      'en-US-Studio-Q': {
        goal: { speakingRate: 1.25, pitch: 0, volumeGainDb: 4.0, emphasis: 'none' },
        penalty: { speakingRate: 0.75, pitch: 0, volumeGainDb: 1.0, emphasis: 'none' },
        announcement: { speakingRate: 0.9, pitch: 0, volumeGainDb: 0.5, emphasis: 'none' },
        test: { speakingRate: 1.0, pitch: 0, volumeGainDb: 2.0, emphasis: 'none' }
      },
      'en-US-Studio-O': {
        goal: { speakingRate: 1.35, pitch: 0, volumeGainDb: 6.0, emphasis: 'none' },
        penalty: { speakingRate: 1.0, pitch: 0, volumeGainDb: 3.0, emphasis: 'none' },
        announcement: { speakingRate: 1.1, pitch: 0, volumeGainDb: 2.0, emphasis: 'none' },
        test: { speakingRate: 1.2, pitch: 0, volumeGainDb: 3.0, emphasis: 'none' }
      },
      'en-US-Studio-M': {
        goal: { speakingRate: 1.4, pitch: 0, volumeGainDb: 7.0, emphasis: 'none' },
        penalty: { speakingRate: 0.65, pitch: 0, volumeGainDb: 5.0, emphasis: 'none' },
        announcement: { speakingRate: 0.8, pitch: 0, volumeGainDb: 2.0, emphasis: 'none' },
        test: { speakingRate: 0.9, pitch: 0, volumeGainDb: 3.0, emphasis: 'none' }
      },
      'en-US-Neural2-F': {
        goal: { speakingRate: 1.2, pitch: 2.0, volumeGainDb: 2.0, emphasis: 'moderate' },
        penalty: { speakingRate: 0.95, pitch: -0.5, volumeGainDb: 1.0, emphasis: 'moderate' },
        announcement: { speakingRate: 1.0, pitch: 0.0, volumeGainDb: 0.0, emphasis: 'none' },
        test: { speakingRate: 1.1, pitch: 1.0, volumeGainDb: 1.0, emphasis: 'moderate' }
      },
      'en-US-Neural2-D': {
        goal: { speakingRate: 1.15, pitch: 1.5, volumeGainDb: 2.0, emphasis: 'moderate' },
        penalty: { speakingRate: 0.9, pitch: -1.0, volumeGainDb: 1.0, emphasis: 'moderate' },
        announcement: { speakingRate: 1.0, pitch: 0.0, volumeGainDb: 0.0, emphasis: 'none' },
        test: { speakingRate: 1.05, pitch: 0.5, volumeGainDb: 1.0, emphasis: 'moderate' }
      },
      'en-US-Neural2-I': {
        goal: { speakingRate: 1.2, pitch: 1.0, volumeGainDb: 3.0, emphasis: 'strong' },
        penalty: { speakingRate: 0.85, pitch: -2.0, volumeGainDb: 2.0, emphasis: 'strong' },
        announcement: { speakingRate: 0.95, pitch: -0.5, volumeGainDb: 1.0, emphasis: 'moderate' },
        test: { speakingRate: 1.0, pitch: 0.0, volumeGainDb: 2.0, emphasis: 'moderate' }
      }
    };

    return baseSettings[voiceId]?.[scenario] || baseSettings[voiceId]?.announcement || {
      speakingRate: 1.0, pitch: 0.0, volumeGainDb: 0.0, emphasis: 'none'
    };
  }

  /**
   * Create SSML markup optimized specifically for Studio voices
   * Based on Google Cloud documentation: Studio voices support SSML except:
   * - <mark> tags
   * - <emphasis> tags  
   * - <prosody pitch> attributes
   * - <lang> tags
   * 
   * Studio voices DO support:
   * - <prosody rate> and <prosody volume>
   * - <break> tags
   * - <say-as> tags
   * - <audio> and <sub> tags
   */
  createAnnouncerSSML(text, scenario = 'announcement', voiceSettings, voiceId) {
    const isStudioVoice = voiceId.includes('Studio');
    
    if (isStudioVoice) {
      // Studio voice-optimized SSML (no emphasis, no pitch)
      if (scenario === 'goal') {
        return `<speak>
          <prosody rate="${voiceSettings.speakingRate}" volume="${voiceSettings.volumeGainDb > 0 ? 'loud' : 'medium'}">
            ${text}
          </prosody>
          <break time="0.5s"/>
        </speak>`;
      } else if (scenario === 'penalty') {
        return `<speak>
          <prosody rate="${voiceSettings.speakingRate}" volume="${voiceSettings.volumeGainDb > 2 ? 'loud' : 'medium'}">
            ${text}
          </prosody>
        </speak>`;
      } else {
        return `<speak>
          <prosody rate="${voiceSettings.speakingRate}">
            ${text}
          </prosody>
        </speak>`;
      }
    } else {
      // Neural2 voices support full SSML including emphasis and pitch
      const { emphasis } = voiceSettings;
      
      if (scenario === 'goal') {
        return `<speak>
          <emphasis level="${emphasis}">
            <prosody rate="${voiceSettings.speakingRate}" pitch="${voiceSettings.pitch > 0 ? '+' : ''}${voiceSettings.pitch}st">
              ${text}
            </prosody>
          </emphasis>
          <break time="0.5s"/>
        </speak>`;
      } else if (scenario === 'penalty') {
        return `<speak>
          <prosody rate="${voiceSettings.speakingRate}" pitch="${voiceSettings.pitch > 0 ? '+' : ''}${voiceSettings.pitch}st">
            <emphasis level="${emphasis}">
              ${text}
            </emphasis>
          </prosody>
        </speak>`;
      } else {
        return `<speak>
          <prosody rate="${voiceSettings.speakingRate}" pitch="${voiceSettings.pitch > 0 ? '+' : ''}${voiceSettings.pitch}st">
            ${emphasis !== 'none' ? `<emphasis level="${emphasis}">${text}</emphasis>` : text}
          </prosody>
        </speak>`;
      }
    }
  }

  /**
   * Get list of available voices with correct gender assignments
   */
  getAvailableVoices() {
    return [
      {
        id: 'en-US-Studio-Q',
        name: 'Studio Q (Male - Professional)',
        gender: 'MALE',
        type: 'Studio', 
        description: 'Professional male voice for clear, articulate announcements (DEFAULT)'
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
        description: 'Clear, reliable male voice (PRIMARY FALLBACK)'
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
      
      // Get optimal settings for this voice and scenario
      const voiceSettings = this.getVoiceSettings(this.selectedVoice, type);
      
      // Create enhanced SSML for hyper-realistic delivery
      const ssmlText = this.createAnnouncerSSML(cleanText, type, voiceSettings, this.selectedVoice);
      
      console.log(`🎙️  Generating speech: "${cleanText}" with voice: ${this.selectedVoice}`);
      console.log(`⚙️  Settings: Rate=${voiceSettings.speakingRate}, Pitch=${voiceSettings.pitch}, Volume=${voiceSettings.volumeGainDb}, Emphasis=${voiceSettings.emphasis}`);
      
      const isStudioVoice = this.selectedVoice.includes('Studio');
      
      const request = {
        input: { ssml: ssmlText }, // Use SSML instead of plain text
        voice: {
          languageCode: 'en-US',
          name: this.selectedVoice
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: voiceSettings.speakingRate,
          // Only set pitch for Neural2 voices, Studio voices handle it internally
          ...(isStudioVoice ? {} : { pitch: voiceSettings.pitch }),
          volumeGainDb: voiceSettings.volumeGainDb,
          // Enhanced audio settings for announcer quality
          effectsProfileId: ['telephony-class-application'], // Adds clarity
          sampleRateHertz: 24000 // Higher quality audio
        }
      };

      // Add timeout for TTS requests to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TTS request timeout after 30 seconds')), 30000);
      });

      const synthesizePromise = this.client.synthesizeSpeech(request);
      
      const [response] = await Promise.race([synthesizePromise, timeoutPromise]);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Google Cloud TTS');
      }

      const filename = `${type}_${gameId}_${this.selectedVoice}_${Date.now()}.mp3`;
      const filepath = path.join(this.audioDir, filename);
      await fs.writeFile(filepath, response.audioContent, 'binary');
      
      const audioSize = response.audioContent.length;
      console.log(`✅ Enhanced speech generated: ${filename} (${audioSize} bytes)`);
      console.log(`🎯 Voice optimized for ${type} scenario with ${this.selectedVoice}`);
      
      return {
        success: true,
        filepath: filepath,
        filename: filename,
        voice: this.selectedVoice,
        size: audioSize,
        cached: false,
        settings: voiceSettings,
        scenario: type
      };

    } catch (error) {
      console.error('❌ Speech generation failed:', error.message);
      
      // If Studio voice fails, try fallback to Neural2-D
      if (this.selectedVoice.includes('Studio') && error.message.includes('timeout')) {
        console.log('🔄 Studio voice timeout, trying Neural2-D fallback...');
        const originalVoice = this.selectedVoice;
        this.selectedVoice = 'en-US-Neural2-D';
        
        try {
          const fallbackResult = await this.generateSpeech(text, gameId, type);
          this.selectedVoice = originalVoice; // Restore
          return fallbackResult;
        } catch (fallbackError) {
          this.selectedVoice = originalVoice; // Restore
          console.error('❌ Fallback also failed:', fallbackError.message);
        }
      }
      
      return {
        success: false,
        error: error.message,
        voice: this.selectedVoice,
        fallbackUsed: false
      };
    }
  }

  /**
   * Generate goal announcement using the currently selected admin voice
   */
  async generateGoalSpeech(text, gameId) {
    // Use the admin-selected voice instead of auto-switching
    const result = await this.generateSpeech(text, gameId, 'goal');
    return result;
  }

  /**
   * Generate penalty announcement using the currently selected admin voice
   */
  async generatePenaltySpeech(text, gameId) {
    // Use the admin-selected voice instead of auto-switching
    const result = await this.generateSpeech(text, gameId, 'penalty');
    return result;
  }

  /**
   * Test a voice with optimal announcer settings
   */
  async testVoiceWithOptimalSettings(voiceId, scenario = 'test') {
    const testTexts = {
      goal: "GOAL! What an incredible shot! The crowd erupts as the puck finds the back of the net!",
      penalty: "Two minutes for boarding. Player number twelve heads to the penalty box.",
      test: "Welcome to tonight's hockey game! This is your arena announcer bringing you all the action!"
    };
    
    const originalVoice = this.selectedVoice;
    this.setAnnouncerVoice(voiceId);
    
    const result = await this.generateSpeech(
      testTexts[scenario] || testTexts.test, 
      'voice-test', 
      scenario
    );
    
    this.selectedVoice = originalVoice;
    return result;
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
