import React, { useState, useRef } from 'react';

/**
 * DJPanel provides simple sound effect controls. When the user presses a
 * button, a preloaded audio file plays through the browser. Audio files
 * should be placed in `public/sounds`. Only one sound can play at a time.
 */
export default function DJPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentAudioRef = useRef(null);

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
    
    // Reset playing state when audio ends or has an error
    const resetPlaying = () => {
      setIsPlaying(false);
      currentAudioRef.current = null;
    };
    
    audio.addEventListener('ended', resetPlaying);
    audio.addEventListener('error', resetPlaying);
    
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      resetPlaying();
    });
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
      </div>
      {isPlaying && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          🔊 Audio playing...
        </p>
      )}
    </div>
  );
}