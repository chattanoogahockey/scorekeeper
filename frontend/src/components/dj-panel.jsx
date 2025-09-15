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
  const fadeDuration = 5100; // 15% faster than 6000ms
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
  const organPoolRef = useRef([]);

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
        // Use local audio files instead of API call
        const localOrganUrls = [
          '/sounds/organs/Arabian Organ.mp3',
          '/sounds/organs/Comes to Town Organ.mp3',
          '/sounds/organs/Coo Caracha Organ.mp3',
          '/sounds/organs/Lets Go Team Organ 2.mp3',
          '/sounds/organs/Lets Go Team Organ.mp3',
          '/sounds/organs/Long Organ Synth.mp3',
          '/sounds/organs/Long Organ.mp3',
          '/sounds/organs/Organ 3.mp3',
          '/sounds/organs/Organ 5.mp3',
          '/sounds/organs/Organ and Fans 2.mp3',
          '/sounds/organs/Organ and Fans.mp3',
          '/sounds/organs/Organ Claps.mp3',
          '/sounds/organs/Organ Crowd.mp3',
          '/sounds/organs/Organ Long.mp3',
          '/sounds/organs/Organ March.mp3',
          '/sounds/organs/Organ Synths.mp3',
          '/sounds/organs/organ_10.mp3',
          '/sounds/organs/organ_7.mp3',
          '/sounds/organs/organ_build_up.mp3',
          '/sounds/organs/organ_bull_fight_rally.mp3',
          '/sounds/organs/organ_charge.mp3',
          '/sounds/organs/organ_happy_know_it.mp3',
          '/sounds/organs/organ_lets_go_uppity.mp3',
          '/sounds/organs/organ_mexican_hat_dance.mp3',
          '/sounds/organs/organ_toro.mp3',
          '/sounds/organs/Pop The Weasel Organ.mp3'
        ];
        if (!cancelled) {
          const shuffled = shuffle(localOrganUrls);
          setOrganUrls(shuffled);
          // Build initial pool ensuring first track differs from last session's start
          const lastStart = localStorage.getItem('dj_lastOrganStart') || '';
          let pool = [...shuffled];
          if (pool.length > 1 && pool[0] === lastStart) {
            // rotate to avoid same starting track
            pool.push(pool.shift());
          }
          organPoolRef.current = pool;
          setCurrentOrganIndex(0);
        }
      } catch (e) {
        console.warn('Failed to load organ sounds list', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Dynamically loaded fanfare sounds
  const [fanfareUrls, setFanfareUrls] = useState([]);
  const fanfarePoolRef = useRef([]);

  // Load fanfare list on mount and shuffle so each app open has a new order
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Use local audio files instead of API call
        const localFanfareUrls = [
          '/sounds/fanfare/Banjo On My Knee Organ Crowd.mp3',
          '/sounds/fanfare/Charge Trumpet Fanfare.mp3',
          '/sounds/fanfare/circus_organ_grinder.mp3',
          '/sounds/fanfare/Fanfare Long Trumpet Charge.mp3',
          '/sounds/fanfare/Fanfare Monkey Chased the Weasel.mp3',
          '/sounds/fanfare/Fanfare Organ 3.mp3',
          '/sounds/fanfare/Fanfare Organ Mixer.mp3',
          '/sounds/fanfare/Fanfare Trumpet.mp3',
          '/sounds/fanfare/fanfare_bugle.mp3',
          '/sounds/fanfare/fanfare_organ.mp3',
          '/sounds/fanfare/fanfare_piano.mp3',
          '/sounds/fanfare/fanfare_trumpet.mp3',
          '/sounds/fanfare/Horn Fanfare.mp3',
          '/sounds/fanfare/Organ Fanfare 1.mp3',
          '/sounds/fanfare/Organ Fanfare 3.mp3',
          '/sounds/fanfare/Organ Fanfare 4.mp3'
        ];
        if (!cancelled) {
          const shuffled = shuffle(localFanfareUrls);
          setFanfareUrls(shuffled);
          const lastStart = localStorage.getItem('dj_lastFanfareStart') || '';
          let pool = [...shuffled];
          if (pool.length > 1 && pool[0] === lastStart) {
            pool.push(pool.shift());
          }
          fanfarePoolRef.current = pool;
          setCurrentFanfareIndex(0);
        }
      } catch (e) {
        console.warn('Failed to load fanfare sounds list', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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
    // Draw from pool; if empty, rebuild a new shuffled pool
    if (!organPoolRef.current || organPoolRef.current.length === 0) {
      const newPool = shuffle(organUrls);
      organPoolRef.current = newPool;
    }
    const currentOrganUrl = organPoolRef.current.shift();
    
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

  // Remember last start to avoid same first track next session
  try { localStorage.setItem('dj_lastOrganStart', currentOrganUrl); } catch {}
  // Maintain legacy index increment for UI consistency (no functional impact now)
  setCurrentOrganIndex((prevIndex) => (prevIndex + 1) % Math.max(organUrls.length, 1));
  };

  const playFanfareSound = () => {
    // If audio is already playing, ignore the new request
    if (isPlaying) {
      console.log('Audio already playing, ignoring request');
      return;
    }

    if (!fanfareUrls || fanfareUrls.length === 0) {
      console.warn('No fanfare sounds available');
      return;
    }
    // Draw from pool; if empty, rebuild a new shuffled pool
    if (!fanfarePoolRef.current || fanfarePoolRef.current.length === 0) {
      const newPool = shuffle(fanfareUrls);
      fanfarePoolRef.current = newPool;
    }
    const currentFanfareUrl = fanfarePoolRef.current.shift();
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

  const audio = new Audio(currentFanfareUrl);
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

  // Remember last start to avoid same first track next session
  try { localStorage.setItem('dj_lastFanfareStart', currentFanfareUrl); } catch {}
  setCurrentFanfareIndex((prevIndex) => (prevIndex + 1) % Math.max(fanfareUrls.length, 1));
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