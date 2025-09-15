import React, { useState, useRef, useContext, useEffect } from 'react';
import { GameContext } from '../contexts/game-context.jsx';

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
  
  // Fanfare sound URLs loaded dynamically
  const [fanfareSounds, setFanfareSounds] = useState([]);
  const fanfarePoolRef = useRef([]);
  
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
  const organPoolRef = useRef([]);

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
          const lastStart = localStorage.getItem('mcp_lastOrganStart') || '';
          let pool = [...shuffled];
          if (pool.length > 1 && pool[0] === lastStart) {
            pool.push(pool.shift());
          }
          organPoolRef.current = pool;
          setCurrentOrganIndex(0);
        }
      } catch (e) {
        console.warn('⚠️ Failed to load organ list:', e);
      }
    };
    loadOrgans();
    return () => { cancelled = true; };
  }, []);

  // Load dynamic fanfare list on mount and shuffle for random cycling
  useEffect(() => {
    let cancelled = false;
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const loadFanfare = async () => {
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
          setFanfareSounds(shuffled);
          const lastStart = localStorage.getItem('mcp_lastFanfareStart') || '';
          let pool = [...shuffled];
          if (pool.length > 1 && pool[0] === lastStart) {
            pool.push(pool.shift());
          }
          fanfarePoolRef.current = pool;
          setCurrentFanfareIndex(0);
        }
      } catch (e) {
        console.warn('⚠️ Failed to load fanfare list:', e);
        setFanfareSounds([]);
      }
    };
    loadFanfare();
    return () => { cancelled = true; };
  }, []);

  // DJ Functions
  const fadeOut = () => {
    if (!currentAudioRef.current || !isPlaying) return;
    
    setIsFading(true);
    const audio = currentAudioRef.current;
    const originalVolume = audio.volume;
    const fadeSteps = 50;
  const fadeDuration = 4080; // 15% faster than prior 4800ms
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
    if (!organPoolRef.current || organPoolRef.current.length === 0) {
      organPoolRef.current = shuffle(organUrls);
    }
    const currentOrganUrl = organPoolRef.current.shift();
    
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

  try { localStorage.setItem('mcp_lastOrganStart', currentOrganUrl); } catch {}
  setCurrentOrganIndex((prevIndex) => (prevIndex + 1) % Math.max(organUrls.length, 1));
  };

  const playFanfareSound = () => {
    if (isPlaying || fanfareSounds.length === 0) return;

  if (!fanfarePoolRef.current || fanfarePoolRef.current.length === 0) {
    fanfarePoolRef.current = shuffle(fanfareSounds);
  }
  const currentFanfareUrl = fanfarePoolRef.current.shift();
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

  const audio = new Audio(currentFanfareUrl);
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

  try { localStorage.setItem('mcp_lastFanfareStart', currentFanfareUrl); } catch {}
  setCurrentFanfareIndex((prevIndex) => (prevIndex + 1) % Math.max(fanfareSounds.length, 1));
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
    <section aria-labelledby="dj-panel-heading" role="region">
      <div className="flex justify-between items-center mb-4">
        <h4 id="dj-panel-heading" className="text-lg font-semibold flex items-center gap-2">
          DJ
        </h4>
        {/* Fade Out Button - Only show when DJ sounds are playing */}
        {isPlaying && (
          <button
            onClick={fadeOut}
            disabled={!isPlaying || isFading}
            className={`px-3 py-1 rounded-lg transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isPlaying && !isFading
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md focus:ring-orange-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            aria-label={isFading ? "Currently fading out audio" : "Fade out current audio"}
            aria-describedby="fade-description"
          >
            {isFading ? 'Fading...' : 'Fade Out'}
          </button>
        )}
        <div id="fade-description" className="sr-only">
          Gradually reduce volume and stop the currently playing audio
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="DJ sound effects controls">
        {/* Row 1 */}
        <button
          onClick={() => playSound('goal_horn', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPlaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm focus:ring-blue-500'
          }`}
          aria-label="Play goal horn sound effect"
          aria-describedby="goal-horn-description"
        >
          Goal Horn
        </button>
        <div id="goal-horn-description" className="sr-only">
          Play a celebratory horn sound for scoring goals
        </div>

        <button
          onClick={() => playSound('whistle', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPlaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm focus:ring-blue-500'
          }`}
          aria-label="Play referee whistle sound effect"
          aria-describedby="whistle-description"
        >
          Whistle
        </button>
        <div id="whistle-description" className="sr-only">
          Play a referee whistle sound to signal game events
        </div>

        {/* Row 2 */}
        <button
          onClick={() => playSound('dj_air_horn', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPlaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm focus:ring-blue-500'
          }`}
          aria-label="Play air horn sound effect"
          aria-describedby="air-horn-description"
        >
          Air Horn
        </button>
        <div id="air-horn-description" className="sr-only">
          Play a loud air horn sound for dramatic effect
        </div>

        <button
          onClick={() => playSound('hockey-buzzer', 'mp3')}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPlaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm focus:ring-blue-500'
          }`}
          aria-label="Play hockey buzzer sound effect"
          aria-describedby="buzzer-description"
        >
          Buzzer
        </button>
        <div id="buzzer-description" className="sr-only">
          Play a buzzer sound to signal end of period or timeout
        </div>

        {/* Row 3 */}
        <button
          onClick={playOrganSound}
          disabled={isPlaying}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPlaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm focus:ring-blue-500'
          }`}
          aria-label="Play random organ music"
          aria-describedby="organ-description"
        >
          Organs
        </button>
        <div id="organ-description" className="sr-only">
          Play randomly selected organ music for background atmosphere
        </div>

        <button
          onClick={playFanfareSound}
          disabled={isPlaying || fanfareSounds.length === 0}
          className={`px-3 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPlaying || fanfareSounds.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-sm focus:ring-blue-500'
          }`}
          aria-label={fanfareSounds.length === 0 ? "Loading fanfare files" : `Play fanfare (${fanfareSounds.length} files available)`}
          aria-describedby="fanfare-description"
        >
          {fanfareSounds.length === 0 ? 'Loading...' : 'Fanfare'}
        </button>
        <div id="fanfare-description" className="sr-only">
          Play celebratory fanfare music for special occasions
        </div>
      </div>

      {/* DJ Audio Progress */}
      {djAudioProgress.isPlaying && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border" role="status" aria-live="polite" aria-label="Audio playback progress">
          <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
            <span className="font-medium">{djAudioProgress.fileName}</span>
            <span aria-label={`Playback time: ${Math.round(djAudioProgress.current)} seconds of ${Math.round(djAudioProgress.duration)} seconds`}>
              {Math.round(djAudioProgress.current)}s / {Math.round(djAudioProgress.duration)}s
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2" role="progressbar"
               aria-valuenow={Math.round((djAudioProgress.current / djAudioProgress.duration) * 100)}
               aria-valuemin="0"
               aria-valuemax="100"
               aria-label={`Audio progress: ${Math.round((djAudioProgress.current / djAudioProgress.duration) * 100)}% complete`}>
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
              style={{
                width: `${Math.min((djAudioProgress.current / djAudioProgress.duration) * 100, 100)}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </section>
  );
}
