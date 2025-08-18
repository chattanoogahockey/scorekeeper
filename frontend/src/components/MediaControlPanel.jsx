import React, { useState, useRef, useContext, useEffect } from 'react';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * MediaControlPanel provides DJ sound effects controls for organ music,
 * fanfare sounds, and volume management for hockey games.
 */
export default function MediaControlPanel({ gameId }) {
  const { selectedGame, selectedGameId } = useContext(GameContext);
  
  // DJ Panel State
  const [isPlaying, setIsPlaying] = useState(false);
  const currentAudioRef = useRef(null);
  const [currentOrganIndex, setCurrentOrganIndex] = useState(0);
  const [currentFanfareIndex, setCurrentFanfareIndex] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isFading, setIsFading] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  
  // Fanfare files loaded dynamically
  const [fanfareSounds, setFanfareSounds] = useState([]);
  
  // DJ Audio progress state
  const [djAudioProgress, setDjAudioProgress] = useState({ 
    current: 0, 
    duration: 0, 
    isPlaying: false,
    fileName: ''
  });

  // Use gameId prop if provided, otherwise use context
  const currentGameId = gameId || selectedGameId;

  // Dynamic organ sound URLs
  const [organUrls, setOrganUrls] = useState([]);

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Load organ list on mount and shuffle for random cycling each app open
  useEffect(() => {
    let cancelled = false;
    const loadOrgans = async () => {
      try {
        const resp = await fetch('/api/sounds/organs');
        const data = await resp.json();
        if (!cancelled && Array.isArray(data.urls)) {
          setOrganUrls(shuffle(data.urls));
          setCurrentOrganIndex(0);
        }
      } catch (e) {
        console.warn('⚠️ Failed to load organ list:', e);
      }
    };
    loadOrgans();
    return () => { cancelled = true; };
  }, []);

  // Load fanfare configuration on component mount
  useEffect(() => {
    const loadFanfareConfig = async () => {
      try {
        const response = await fetch('/sounds/fanfare/fanfare-config.json');
        const config = await response.json();
        const fanfareFilenames = config.fanfareFiles.map(file => `fanfare/${file.filename}`);
        setFanfareSounds(fanfareFilenames);
        console.log('🎺 Loaded fanfare configuration:', fanfareFilenames);
      } catch (error) {
        console.warn('⚠️ Failed to load fanfare config, using fallback:', error);
        // Fallback to default fanfare files
        setFanfareSounds([
          'fanfare/fanfare_organ.mp3',
          'fanfare/fanfare_bugle.mp3', 
          'fanfare/fanfare_trumpet.mp3',
          'fanfare/fanfare_piano.mp3'
        ]);
      }
    };

    loadFanfareConfig();
  }, []);

  // DJ Functions
  const fadeOut = () => {
    if (!currentAudioRef.current || !isPlaying) return;
    
    setIsFading(true);
    const audio = currentAudioRef.current;
    const originalVolume = audio.volume;
    const fadeSteps = 50;
    const fadeDuration = 4800; // 20% faster than 6000ms
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
        audio.volume = originalVolume;
        setIsPlaying(false);
        setIsFading(false);
        setDjAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
      }
    }, stepTime);
  };

  const playSound = (filename, extension = 'wav') => {
    if (isPlaying) {
      console.log('Audio already playing, ignoring request');
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(`/sounds/${filename}.${extension}`);
    currentAudioRef.current = audio;
    setAudioElement(audio);
    
    audio.volume = volume;
    setIsPlaying(true);
    
    audio.addEventListener('loadedmetadata', () => {
      setDjAudioProgress({ 
        current: 0, 
        duration: audio.duration, 
        isPlaying: true,
        fileName: filename 
      });
    });
    
    audio.addEventListener('timeupdate', () => {
      setDjAudioProgress(prev => ({
        ...prev,
        current: audio.currentTime
      }));
    });
    
    const resetPlaying = () => {
      setIsPlaying(false);
      currentAudioRef.current = null;
      setAudioElement(null);
      setDjAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
    };
    
    audio.addEventListener('ended', resetPlaying);
    audio.addEventListener('error', resetPlaying);
    
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      resetPlaying();
    });
  };

  const playOrganSound = () => {
    if (isPlaying) return;
    if (!organUrls || organUrls.length === 0) {
      console.warn('No organ sounds available');
      return;
    }
    const currentOrganUrl = organUrls[currentOrganIndex];
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

  const audio = new Audio(currentOrganUrl);
    currentAudioRef.current = audio;
    setAudioElement(audio);
    
    audio.volume = volume;
    setIsPlaying(true);
    
    audio.addEventListener('loadedmetadata', () => {
      setDjAudioProgress({ 
        current: 0, 
        duration: audio.duration, 
        isPlaying: true,
        fileName: 'organ' 
      });
    });
    
    audio.addEventListener('timeupdate', () => {
      setDjAudioProgress(prev => ({
        ...prev,
        current: audio.currentTime
      }));
    });
    
    const resetPlaying = () => {
      setIsPlaying(false);
      currentAudioRef.current = null;
      setAudioElement(null);
      setDjAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
    };
    
    audio.addEventListener('ended', resetPlaying);
    audio.addEventListener('error', resetPlaying);
    
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      resetPlaying();
    });

  setCurrentOrganIndex((prevIndex) => (prevIndex + 1) % organUrls.length);
  };

  const playFanfareSound = () => {
    if (isPlaying || fanfareSounds.length === 0) return;

    const currentFanfareFile = fanfareSounds[currentFanfareIndex];
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(`/sounds/${currentFanfareFile}`);
    currentAudioRef.current = audio;
    setAudioElement(audio);
    
    audio.volume = volume;
    setIsPlaying(true);
    
    audio.addEventListener('loadedmetadata', () => {
      setDjAudioProgress({ 
        current: 0, 
        duration: audio.duration, 
        isPlaying: true,
        fileName: 'fanfare' 
      });
    });
    
    audio.addEventListener('timeupdate', () => {
      setDjAudioProgress(prev => ({
        ...prev,
        current: audio.currentTime
      }));
    });
    
    const resetPlaying = () => {
      setIsPlaying(false);
      currentAudioRef.current = null;
      setAudioElement(null);
      setDjAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
    };
    
    audio.addEventListener('ended', resetPlaying);
    audio.addEventListener('error', resetPlaying);
    
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      resetPlaying();
    });

    setCurrentFanfareIndex((prevIndex) => (prevIndex + 1) % fanfareSounds.length);
  };

  // Announcer Functions
  const stopAudio = () => {
    // Stop DJ audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    setIsPlaying(false);
    setDjAudioProgress({ current: 0, duration: 0, isPlaying: false, fileName: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold flex items-center gap-2">
          DJ
        </h4>
        {/* Fade Out Button - Only show when DJ sounds are playing */}
        {isPlaying && (
          <button
            onClick={fadeOut}
            disabled={!isPlaying || isFading}
            className={`px-3 py-1 rounded-lg transition-all duration-200 text-sm font-medium ${
              isPlaying && !isFading
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isFading ? 'Fading...' : 'Fade Out'}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Row 1 */}
        <button
          onClick={() => playSound('goal_horn', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm'
          }`}
        >
          Goal Horn
        </button>
        <button
          onClick={() => playSound('whistle', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm'
          }`}
        >
          Whistle
        </button>
        
        {/* Row 2 */}
        <button
          onClick={() => playSound('dj_air_horn', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm'
          }`}
        >
          Air Horn
        </button>
        <button
          onClick={() => playSound('hockey-buzzer', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm'
          }`}
        >
          Buzzer
        </button>
        
        {/* Row 3 */}
        <button
          onClick={playOrganSound}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm'
          }`}
        >
          Organs
        </button>
        <button
          onClick={playFanfareSound}
          disabled={isPlaying || fanfareSounds.length === 0}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center ${
            isPlaying || fanfareSounds.length === 0
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm'
          }`}
          title={fanfareSounds.length === 0 ? 'Loading fanfare files...' : `Play fanfare (${fanfareSounds.length} files available)`}
        >
          {fanfareSounds.length === 0 ? 'Loading...' : 'Fanfare'}
        </button>
      </div>
      
      {/* DJ Audio Progress */}
      {djAudioProgress.isPlaying && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border">
          <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
            <span className="font-medium">{djAudioProgress.fileName}</span>
            <span>{Math.round(djAudioProgress.current)}s / {Math.round(djAudioProgress.duration)}s</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ 
                width: `${Math.min((djAudioProgress.current / djAudioProgress.duration) * 100, 100)}%` 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
