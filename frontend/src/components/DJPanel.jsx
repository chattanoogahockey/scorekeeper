import React, { useState, useRef, useEffect } from 'react';

/**
 * DJPanel provides simple sound effect controls. When the user presses a
 * button, a preloaded audio file plays through the browser. Audio files
 * should be placed in `public/sounds`. Only one sound can play at a time.
 */
export default function DJPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentAudioRef = useRef(null);
  const [currentOrganIndex, setCurrentOrganIndex] = useState(0);
  const [currentFanfareIndex, setCurrentFanfareIndex] = useState(0);
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
  
  // Dynamically loaded organ sounds (full URLs from /sounds/...)
  const [organUrls, setOrganUrls] = useState([]);

  // Shuffle helper
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Load organ list on mount and shuffle so each app open has a new order
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await fetch('/api/sounds/organs');
        const data = await resp.json();
        if (!cancelled && Array.isArray(data.urls)) {
          setOrganUrls(shuffle(data.urls));
          setCurrentOrganIndex(0);
        }
      } catch (e) {
        console.warn('Failed to load organ sounds list', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Array of fanfare sound files
  const fanfareSounds = [
    'fanfare_organ.mp3',
    'fanfare_bugle.mp3',
    'fanfare_trumpet.mp3',
    'fanfare_piano.mp3'
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

    if (!organUrls || organUrls.length === 0) {
      console.warn('No organ sounds available');
      return;
    }
    // Get the current organ sound URL (already includes /sounds/organs/...)
    const currentOrganUrl = organUrls[currentOrganIndex];
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

  const audio = new Audio(currentOrganUrl);
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
  setCurrentOrganIndex((prevIndex) => (prevIndex + 1) % organUrls.length);
  };

  const playFanfareSound = () => {
    // If audio is already playing, ignore the new request
    if (isPlaying) {
      console.log('Audio already playing, ignoring request');
      return;
    }

    // Get the current fanfare sound file
    const currentFanfareFile = fanfareSounds[currentFanfareIndex];
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(`/sounds/${currentFanfareFile}`);
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
        fileName: 'fanfare' 
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
      console.error('Error playing fanfare audio:', error);
      resetPlaying();
    });

    // Move to next fanfare sound, loop back to 0 after the last one
    setCurrentFanfareIndex((prevIndex) => (prevIndex + 1) % fanfareSounds.length);
  };

  return (
    <div className="p-3">
      <h4 className="text-lg font-semibold mb-2">DJ</h4>
      
      {/* 2x4 Grid Layout */}
      <div className="grid grid-cols-2 gap-1 mb-3">
        <button
          onClick={() => playSound('goal_horn', 'mp3')}
          disabled={isPlaying}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          Goal Horn
        </button>
        <button
          onClick={() => playSound('whistle', 'mp3')}
          disabled={isPlaying}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          Whistle
        </button>
        <button
          onClick={() => playSound('dj_air_horn', 'mp3')}
          disabled={isPlaying}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          Air Horn
        </button>
        <button
          onClick={() => playSound('hockey-buzzer', 'mp3')}
          disabled={isPlaying}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          Buzzer
        </button>
        <button
          onClick={playOrganSound}
          disabled={isPlaying}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          Organs
        </button>
        <button
          onClick={playFanfareSound}
          disabled={isPlaying}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          Fanfare
        </button>
        <div></div> {/* Empty space to maintain grid layout */}
        <div></div> {/* Empty space to maintain grid layout */}
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