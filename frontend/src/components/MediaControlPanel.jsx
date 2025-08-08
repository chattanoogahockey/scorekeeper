import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * MediaControlPanel combines DJ sound effects and Announcer TTS controls
 * into a single unified panel with improved layout and styling.
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
  
  // DJ Audio progress state
  const [djAudioProgress, setDjAudioProgress] = useState({ 
    current: 0, 
    duration: 0, 
    isPlaying: false,
    fileName: ''
  });

  // Announcer State
  const [goalLoading, setGoalLoading] = useState(false);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('female');
  const announcerAudioRef = useRef(null);
  const isDualAnnouncerPlayingRef = useRef(false);
  const wakeLockRef = useRef(null);
  
  // Announcer Audio progress state
  const [announcerAudioProgress, setAnnouncerAudioProgress] = useState({ 
    current: 0, 
    duration: 0, 
    isPlaying: false 
  });

  // Use gameId prop if provided, otherwise use context
  const currentGameId = gameId || selectedGameId;

  // Force female announcer as default on component mount
  useEffect(() => {
    setSelectedVoice('female');
  }, []);

  // DJ Sound files
  const organSounds = [
    'organ_charge.mp3',
    'organ_lets_go_uppity.mp3', 
    'organ_mexican_hat_dance.mp3',
    'organ_bull_fight_rally.mp3',
    'organ_build_up.mp3',
    'organ_happy_know_it.mp3',
    'organ_toro.mp3',
    'circus_organ_grinder.mp3',
    'organ_10.mp3',
    'organ_7.mp3'
  ];

  const fanfareSounds = [
    'organ_charge.mp3',
    'bugle_call.mp3',
    'trumpet_fanfare.mp3',
    'piano_flourish.mp3'
  ];

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

    const currentOrganFile = organSounds[currentOrganIndex];
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(`/sounds/${currentOrganFile}`);
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

    setCurrentOrganIndex((prevIndex) => (prevIndex + 1) % organSounds.length);
  };

  const playFanfareSound = () => {
    if (isPlaying) return;

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
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    isDualAnnouncerPlayingRef.current = false;
    
    if (announcerAudioRef.current) {
      announcerAudioRef.current.pause();
      announcerAudioRef.current.currentTime = 0;
      announcerAudioRef.current = null;
    }
    
    setMessage('');
    setAnnouncerAudioProgress({ current: 0, duration: 0, isPlaying: false });
    releaseWakeLock();
  };

  const handleVoiceSelection = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
    console.log(`🎤 Voice selection changed to: ${voice}`);
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired - screen will stay active');
      }
    } catch (err) {
      console.log('Wake lock not supported or failed:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake lock released');
      } catch (err) {
        console.log('Error releasing wake lock:', err);
      }
    }
  };

  const announceLatestGoal = async () => {
    if (!currentGameId) {
      setError('No game selected');
      return;
    }

    setGoalLoading(true);
    setError(null);
    
    try {
      await requestWakeLock();
      
      const apiUrl = import.meta.env.DEV 
        ? '/api/tts/goal' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/tts/goal`;
      
      const response = await axios.post(apiUrl, {
        gameId: currentGameId,
        speaker: selectedVoice
      });
      
      if (response.data && response.data.audioUrl) {
        const audio = new Audio(response.data.audioUrl);
        announcerAudioRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          setAnnouncerAudioProgress({ 
            current: 0, 
            duration: audio.duration, 
            isPlaying: true 
          });
        });
        
        audio.addEventListener('timeupdate', () => {
          setAnnouncerAudioProgress(prev => ({
            ...prev,
            current: audio.currentTime
          }));
        });
        
        audio.addEventListener('ended', () => {
          setAnnouncerAudioProgress({ current: 0, duration: 0, isPlaying: false });
          releaseWakeLock();
        });
        
        await audio.play();
        setMessage(response.data.text || 'Goal announcement played');
      }
    } catch (error) {
      console.error('Error announcing goal:', error);
      setError(error.response?.data?.error || 'Failed to announce goal');
      releaseWakeLock();
    } finally {
      setGoalLoading(false);
    }
  };

  const announceLatestPenalty = async () => {
    if (!currentGameId) {
      setError('No game selected');
      return;
    }

    setPenaltyLoading(true);
    setError(null);
    
    try {
      await requestWakeLock();
      
      const apiUrl = import.meta.env.DEV 
        ? '/api/tts/penalty' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/tts/penalty`;
      
      const response = await axios.post(apiUrl, {
        gameId: currentGameId,
        speaker: selectedVoice
      });
      
      if (response.data && response.data.audioUrl) {
        const audio = new Audio(response.data.audioUrl);
        announcerAudioRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          setAnnouncerAudioProgress({ 
            current: 0, 
            duration: audio.duration, 
            isPlaying: true 
          });
        });
        
        audio.addEventListener('timeupdate', () => {
          setAnnouncerAudioProgress(prev => ({
            ...prev,
            current: audio.currentTime
          }));
        });
        
        audio.addEventListener('ended', () => {
          setAnnouncerAudioProgress({ current: 0, duration: 0, isPlaying: false });
          releaseWakeLock();
        });
        
        await audio.play();
        setMessage(response.data.text || 'Penalty announcement played');
      }
    } catch (error) {
      console.error('Error announcing penalty:', error);
      setError(error.response?.data?.error || 'Failed to announce penalty');
      releaseWakeLock();
    } finally {
      setPenaltyLoading(false);
    }
  };

  const announceRandomMessage = async () => {
    if (!currentGameId) {
      setError('No game selected');
      return;
    }

    setRandomLoading(true);
    setError(null);
    
    try {
      await requestWakeLock();
      
      const apiUrl = import.meta.env.DEV 
        ? '/api/tts/random' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/tts/random`;
      
      const response = await axios.post(apiUrl, {
        gameId: currentGameId,
        speaker: selectedVoice
      });
      
      if (response.data && response.data.audioUrl) {
        const audio = new Audio(response.data.audioUrl);
        announcerAudioRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          setAnnouncerAudioProgress({ 
            current: 0, 
            duration: audio.duration, 
            isPlaying: true 
          });
        });
        
        audio.addEventListener('timeupdate', () => {
          setAnnouncerAudioProgress(prev => ({
            ...prev,
            current: audio.currentTime
          }));
        });
        
        audio.addEventListener('ended', () => {
          setAnnouncerAudioProgress({ current: 0, duration: 0, isPlaying: false });
          releaseWakeLock();
        });
        
        await audio.play();
        setMessage(response.data.text || 'Random announcement played');
      }
    } catch (error) {
      console.error('Error announcing random message:', error);
      setError(error.response?.data?.error || 'Failed to announce random message');
      releaseWakeLock();
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <div className="border rounded-lg shadow-lg p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Media Control Center</h3>
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
      
      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - DJ Panel */}
        <div className="bg-white rounded-lg p-3 shadow-inner border border-gray-200">
          <h4 className="text-lg font-semibold mb-3 text-center text-blue-700">DJ Sounds</h4>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Row 1 */}
            <button
              onClick={() => playSound('goal_horn', 'mp3')}
              disabled={isPlaying}
              className={`px-2 py-3 text-white rounded-lg transition-all duration-200 text-xs font-medium ${
                isPlaying 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm'
              }`}
            >
              Goal Horn
            </button>
            <button
              onClick={() => playSound('whistle', 'mp3')}
              disabled={isPlaying}
              className={`px-2 py-3 text-white rounded-lg transition-all duration-200 text-xs font-medium ${
                isPlaying 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm'
              }`}
            >
              Whistle
            </button>
            
            {/* Row 2 */}
            <button
              onClick={() => playSound('dj_air_horn', 'mp3')}
              disabled={isPlaying}
              className={`px-2 py-3 text-white rounded-lg transition-all duration-200 text-xs font-medium ${
                isPlaying 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm'
              }`}
            >
              Air Horn
            </button>
            <button
              onClick={() => playSound('buzzer')}
              disabled={isPlaying}
              className={`px-2 py-3 text-white rounded-lg transition-all duration-200 text-xs font-medium ${
                isPlaying 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm'
              }`}
            >
              Buzzer
            </button>
            
            {/* Row 3 */}
            <button
              onClick={playOrganSound}
              disabled={isPlaying}
              className={`px-2 py-3 text-white rounded-lg transition-all duration-200 text-xs font-medium ${
                isPlaying 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm'
              }`}
            >
              Organs
            </button>
            <button
              onClick={playFanfareSound}
              disabled={isPlaying}
              className={`px-2 py-3 text-white rounded-lg transition-all duration-200 text-xs font-medium ${
                isPlaying 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm'
              }`}
            >
              Fanfare
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

        {/* Right Side - Announcer Panel */}
        <div className="bg-white rounded-lg p-3 shadow-inner border border-gray-200">
          <h4 className="text-lg font-semibold mb-3 text-center text-purple-700">Announcer</h4>
          
          {/* Voice Selection - Above buttons */}
          <div className="mb-3">
            <div className="flex justify-center gap-2">
              <button
                onClick={() => handleVoiceSelection('male')}
                className={`flex items-center justify-center px-3 py-2 rounded-lg border-2 transition-all duration-200 text-xs font-medium ${
                  selectedVoice === 'male'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                title="Male Voice"
              >
                Male
              </button>
              <button
                onClick={() => handleVoiceSelection('female')}
                className={`flex items-center justify-center px-3 py-2 rounded-lg border-2 transition-all duration-200 text-xs font-medium ${
                  selectedVoice === 'female'
                    ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-md'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                title="Female Voice"
              >
                Female
              </button>
              <button
                onClick={() => handleVoiceSelection('dual')}
                className={`flex items-center justify-center px-3 py-2 rounded-lg border-2 transition-all duration-200 text-xs font-medium ${
                  selectedVoice === 'dual'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                title="Dual Announcer Mode"
              >
                Dual
              </button>
            </div>
          </div>

          {/* Announcer Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={announceLatestGoal}
              disabled={goalLoading || !currentGameId}
              className={`px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                goalLoading || !currentGameId
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm'
              }`}
            >
              {goalLoading ? 'Loading...' : 'Goal'}
            </button>
            <button
              onClick={announceLatestPenalty}
              disabled={penaltyLoading || !currentGameId}
              className={`px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                penaltyLoading || !currentGameId
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-sm'
              }`}
            >
              {penaltyLoading ? 'Loading...' : 'Penalty'}
            </button>
            <button
              onClick={announceRandomMessage}
              disabled={randomLoading || !currentGameId}
              className={`px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                randomLoading || !currentGameId
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm'
              }`}
            >
              {randomLoading ? 'Loading...' : 'Random'}
            </button>
          </div>

          {/* Stop button - only show when announcer audio is playing */}
          {announcerAudioProgress.isPlaying && (
            <div className="mt-3">
              <button
                onClick={stopAudio}
                className="w-full px-2 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                title="Stop Audio"
              >
                Stop
              </button>
            </div>
          )}

          {/* Announcer Audio Progress */}
          {announcerAudioProgress.isPlaying && (
            <div className="mt-3 p-2 bg-purple-50 rounded-lg border">
              <div className="flex items-center justify-between text-xs text-purple-600 mb-1">
                <span className="font-medium">Audio Progress</span>
                <span>{Math.round(announcerAudioProgress.current)}s / {Math.round(announcerAudioProgress.duration)}s</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-100"
                  style={{ 
                    width: `${Math.min((announcerAudioProgress.current / announcerAudioProgress.duration) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Error and Status Messages */}
          {!currentGameId && (
            <p className="text-yellow-600 mt-2 text-xs text-center">No game selected</p>
          )}
          {error && <p className="text-red-500 mt-2 text-xs text-center">{error}</p>}
          {message && (
            <p className="text-sm mt-2 italic text-gray-600 text-center">Latest: {message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
