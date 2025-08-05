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
  
  // Audio progress state
  const [audioProgress, setAudioProgress] = useState({ 
    current: 0, 
    duration: 0, 
    isPlaying: false,
    fileName: ''
  });
  
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
    <div className="border rounded shadow p-4">
      <h4 className="text-xl font-semibold mb-2">DJ Panel</h4>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => playSound('goal_horn', 'mp3')}
          disabled={isPlaying}
          className={`px-4 py-2 text-white rounded transition-all duration-200 ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
        >
          Goal Horn
        </button>
        <button
          onClick={() => playSound('whistle')}
          disabled={isPlaying}
          className={`px-4 py-2 text-white rounded transition-all duration-200 ${
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
          className={`px-4 py-2 text-white rounded transition-all duration-200 ${
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
          className={`px-4 py-2 text-white rounded transition-all duration-200 ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
        >
          Period Buzzer
        </button>
        <button
          onClick={playOrganSound}
          disabled={isPlaying}
          className={`px-4 py-2 text-white rounded transition-all duration-200 col-span-2 ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900'
          }`}
        >
          🎹 Organ
        </button>
      </div>
      
      {/* Audio Progress Bar */}
      {audioProgress.isPlaying && (
        <div className="mt-3 p-2 bg-gray-50 rounded border">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>🎵 Playing: {audioProgress.fileName}</span>
            <span>{Math.round(audioProgress.current)}s / {Math.round(audioProgress.duration)}s</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
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