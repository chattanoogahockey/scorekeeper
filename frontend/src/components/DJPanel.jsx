import React, { useState, useRef } from 'react';

/**
 * DJPanel provides simple sound effect controls. When the user presses a
 * button, a preloaded audio file plays through the browser. Audio files
 * should be placed in `public/sounds`. Only one sound can play at a time.
 */
export default function DJPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentAudioRef = useRef(null);
  const [currentOrganIndex, setCurrentOrganIndex] = useState(0);
  const [volume, setVolume] = useState(1.0); // Default to 100% volume
  const [isFading, setIsFading] = useState(false);
  
  // Audio progress state
  const [audioProgress, setAudioProgress] = useState({ 
    current: 0, 
    duration: 0, 
    isPlaying: false,
    fileName: ''
  });

  // Fade-out function
  const fadeOut = () => {
    if (!currentAudioRef.current || !isPlaying) return;
    
    setIsFading(true);
    const audio = currentAudioRef.current;
    const originalVolume = audio.volume;
    const fadeSteps = 50;
    const fadeDuration = 6000; // 6 seconds (3x longer than before)
    const stepTime = fadeDuration / fadeSteps;
    const volumeStep = originalVolume / fadeSteps;

    let step = 0;
    const fadeInterval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, originalVolume - (volumeStep * step));
      
      if (step >= fadeSteps || audio.volume <= 0) {
        clearInterval(fadeInterval);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = originalVolume; // Reset volume for next play
        setIsPlaying(false);
        setIsFading(false);
        setAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
      }
    }, stepTime);
  };
  
  // Array of organ sound files
  const organSounds = [
    'organ_toro.mp3',
    'organ_mexican_hat_dance.mp3', 
    'organ_lets_go_uppity.mp3',
    'organ_happy_know_it.mp3',
    'organ_charge.mp3',
    'organ_bull_fight_rally.mp3',
    'organ_build_up.mp3'
  ];

  // Prevent audio from stopping during re-renders
  const [audioElement, setAudioElement] = useState(null);

  const playSound = (filename, extension = 'wav') => {
    // If audio is already playing, ignore the new request
    if (isPlaying) {
      console.log('Audio already playing, ignoring request');
      return;
    }

    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(`/sounds/${filename}.${extension}`);
    currentAudioRef.current = audio;
    setAudioElement(audio); // Store audio element in state to prevent garbage collection
    
    // Set volume based on the fader
    audio.volume = volume;
    
    setIsPlaying(true);
    
    // Update progress bar when audio loads
    audio.addEventListener('loadedmetadata', () => {
      setAudioProgress({ 
        current: 0, 
        duration: audio.duration, 
        isPlaying: true,
        fileName: filename 
      });
    });
    
    // Update progress during playback
    audio.addEventListener('timeupdate', () => {
      setAudioProgress(prev => ({
        ...prev,
        current: audio.currentTime
      }));
    });
    
    // Reset playing state when audio ends or has an error
    const resetPlaying = () => {
      setIsPlaying(false);
      currentAudioRef.current = null;
      setAudioElement(null);
      setAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
    };
    
    audio.addEventListener('ended', resetPlaying);
    audio.addEventListener('error', resetPlaying);
    
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      resetPlaying();
    });
  };

  const playOrganSound = () => {
    // If audio is already playing, ignore the new request
    if (isPlaying) {
      console.log('Audio already playing, ignoring request');
      return;
    }

    // Get the current organ sound file
    const currentOrganFile = organSounds[currentOrganIndex];
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(`/sounds/${currentOrganFile}`);
    currentAudioRef.current = audio;
    setAudioElement(audio); // Store audio element in state to prevent garbage collection
    
    // Set volume based on the fader
    audio.volume = volume;
    
    setIsPlaying(true);
    
    // Update progress bar when audio loads
    audio.addEventListener('loadedmetadata', () => {
      setAudioProgress({ 
        current: 0, 
        duration: audio.duration, 
        isPlaying: true,
        fileName: 'organ' 
      });
    });
    
    // Update progress during playback
    audio.addEventListener('timeupdate', () => {
      setAudioProgress(prev => ({
        ...prev,
        current: audio.currentTime
      }));
    });
    
    // Reset playing state when audio ends or has an error
    const resetPlaying = () => {
      setIsPlaying(false);
      currentAudioRef.current = null;
      setAudioElement(null);
      setAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
    };
    
    audio.addEventListener('ended', resetPlaying);
    audio.addEventListener('error', resetPlaying);
    
    audio.play().catch((error) => {
      console.error('Error playing organ audio:', error);
      resetPlaying();
    });

    // Move to next organ sound, loop back to 0 after the last one
    setCurrentOrganIndex((prevIndex) => (prevIndex + 1) % organSounds.length);
  };

  return (
    <div className="border rounded shadow p-3">
      <h4 className="text-lg font-semibold mb-2">DJ</h4>
      
      {/* 2x3 Grid Layout */}
      <div className="grid grid-cols-2 gap-1 mb-3">
        <button
          onClick={() => playSound('goal_horn', 'mp3')}
          disabled={isPlaying}
          className={`px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
        >
          Goal Horn
        </button>
        <button
          onClick={() => playSound('whistle', 'mp3')}
          disabled={isPlaying}
          className={`px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
        >
          Whistle
        </button>
        <button
          onClick={() => playSound('dj_air_horn', 'mp3')}
          disabled={isPlaying}
          className={`px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
        >
          Air Horn
        </button>
        <button
          onClick={() => playSound('buzzer')}
          disabled={isPlaying}
          className={`px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
        >
          Buzzer
        </button>
        <button
          onClick={playOrganSound}
          disabled={isPlaying}
          className={`px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
        >
          Organs
        </button>
        <button
          onClick={fadeOut}
          disabled={!isPlaying || isFading}
          className={`px-2 py-1 rounded transition-colors text-xs ${
            isPlaying && !isFading
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isFading ? 'Fading...' : 'Fade Out'}
        </button>
      </div>
      
      {/* Audio Progress Bar - Compact */}
      {audioProgress.isPlaying && (
        <div className="mt-2 p-2 bg-gray-50 rounded border">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{audioProgress.fileName}</span>
            <span>{Math.round(audioProgress.current)}s / {Math.round(audioProgress.duration)}s</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-100"
              style={{ 
                width: `${Math.min((audioProgress.current / audioProgress.duration) * 100, 100)}%` 
              }}
            ></div>
          </div>
        </div>
      )}
      
      {isPlaying && !audioProgress.isPlaying && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          Audio playing...
        </p>
      )}
    </div>
  );
}