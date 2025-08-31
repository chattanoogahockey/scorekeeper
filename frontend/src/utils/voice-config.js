/**
 * Frontend voice configuration utilities
 * Mirrors backend voiceConfig.js for browser TTS fallback functionality
 */

/**
 * Browser TTS fallback voice configuration for dual announcer mode
 * Centralized configuration matching backend/voiceConfig.js
 */
const FALLBACK_VOICE_CONFIG = {
  male: {
    preferredNames: ['Daniel', 'David', 'Alex'],
    settings: {
      rate: 0.95,
      pitch: 0.65,
      volume: 1.0
    }
  },
  female: {
    preferredNames: ['Samantha', 'Karen', 'Moira'],
    settings: {
      rate: 1.0,
      pitch: 1.1,
      volume: 1.0
    }
  }
};

/**
 * Get fallback browser TTS voice configuration for dual announcer mode
 * @param {string} speaker - 'male' or 'female'
 * @param {SpeechSynthesisVoice[]} availableVoices - Available browser voices
 * @returns {object} Voice configuration with selected voice and settings
 */
export function getFallbackVoice(speaker, availableVoices = []) {
  const config = FALLBACK_VOICE_CONFIG[speaker];
  if (!config) {
    throw new Error(`Invalid speaker type: ${speaker}. Must be 'male' or 'female'.`);
  }

  let selectedVoice = null;

  // Find preferred voice from available voices
  if (availableVoices && availableVoices.length > 0) {
    const matchingVoices = availableVoices.filter(voice => 
      voice.lang.startsWith('en') && 
      config.preferredNames.some(name => voice.name.includes(name))
    );
    
    if (matchingVoices.length > 0) {
      selectedVoice = matchingVoices[0];
    }
  }

  return {
    voice: selectedVoice,
    settings: { ...config.settings },
    preferredNames: [...config.preferredNames]
  };
}

/**
 * Configure SpeechSynthesisUtterance with fallback voice settings
 * @param {SpeechSynthesisUtterance} utterance - The utterance to configure
 * @param {string} speaker - 'male' or 'female'
 * @param {SpeechSynthesisVoice[]} availableVoices - Available browser voices
 * @returns {SpeechSynthesisUtterance} Configured utterance
 */
export function configureUtteranceWithFallbackVoice(utterance, speaker, availableVoices) {
  const voiceConfig = getFallbackVoice(speaker, availableVoices);
  
  // Set voice if found
  if (voiceConfig.voice) {
    utterance.voice = voiceConfig.voice;
  }
  
  // Apply settings
  utterance.rate = voiceConfig.settings.rate;
  utterance.pitch = voiceConfig.settings.pitch;
  utterance.volume = voiceConfig.settings.volume;
  
  return utterance;
}

/**
 * Get a general-purpose browser TTS voice for single announcements
 * Uses a mix of preferred voices that work well on iOS and other platforms
 * @param {SpeechSynthesisVoice[]} availableVoices - Available browser voices
 * @returns {SpeechSynthesisVoice|null} Selected voice or null if none found
 */
export function getGeneralFallbackVoice(availableVoices = []) {
  if (!availableVoices || availableVoices.length === 0) {
    return null;
  }

  // Look for high-quality voices that work well across platforms
  const preferredVoices = availableVoices.filter(voice => 
    voice.lang.startsWith('en') && 
    (voice.name.includes('Samantha') || voice.name.includes('Daniel') || voice.default)
  );

  return preferredVoices.length > 0 ? preferredVoices[0] : null;
}

/**
 * Configure SpeechSynthesisUtterance for general single-speaker announcements
 * @param {SpeechSynthesisUtterance} utterance - The utterance to configure
 * @param {SpeechSynthesisVoice[]} availableVoices - Available browser voices
 * @returns {SpeechSynthesisUtterance} Configured utterance
 */
export function configureGeneralUtterance(utterance, availableVoices) {
  const voice = getGeneralFallbackVoice(availableVoices);
  
  if (voice) {
    utterance.voice = voice;
  }
  
  // General settings optimized for clarity and mobile compatibility
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  return utterance;
}
