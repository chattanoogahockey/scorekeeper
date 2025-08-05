import React, { useState, useContext, useRef } from 'react';
import axios from 'axios';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * AnnouncerControls provides buttons for the scorekeeper to trigger Google
 * Text-to-Speech announcements based on the latest goal or penalty or
 * generic game messages. It fetches data from the backend and plays
 * synthesized speech via audio.
 */
export default function AnnouncerControls({ gameId }) {
  const { selectedGame, selectedGameId } = useContext(GameContext);
  const [goalLoading, setGoalLoading] = useState(false);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  
  // Audio progress state
  const [audioProgress, setAudioProgress] = useState({ 
    current: 0, 
    duration: 0, 
    isPlaying: false 
  });

  // Wake lock for keeping screen active during long announcements
  const wakeLockRef = useRef(null);

  // Use gameId prop if provided, otherwise use context
  const currentGameId = gameId || selectedGameId;

  // Request wake lock to keep screen active
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

  // Release wake lock
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

  /**
   * Use browser text-to-speech to speak the announcement text
   * Enhanced for mobile compatibility, especially iOS
   */
  const speakText = async (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      // Request wake lock to keep screen active
      await requestWakeLock();
      
      // Wait a moment for cancel to take effect on iOS
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0; // Full volume for mobile
        
        // Use a voice that works well on iOS
        const voices = speechSynthesis.getVoices();
        const preferredVoices = voices.filter(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.includes('Samantha') || voice.name.includes('Daniel') || voice.default)
        );
        if (preferredVoices.length > 0) {
          utterance.voice = preferredVoices[0];
        }
        
        // Estimate duration (rough calculation: ~150 words per minute)
        const wordCount = text.split(' ').length;
        const estimatedDuration = (wordCount / 150) * 60; // seconds
        
        utterance.onstart = () => {
          setMessage('🔊 Playing announcement...');
          setAudioProgress({ current: 0, duration: estimatedDuration, isPlaying: true });
          
          // Update progress simulation for TTS (since we can't get real progress)
          const progressInterval = setInterval(() => {
            setAudioProgress(prev => {
              if (prev.current >= prev.duration) {
                clearInterval(progressInterval);
                return prev;
              }
              return { ...prev, current: prev.current + 0.1 };
            });
          }, 100);
          
          // Store interval ID so we can clear it on end
          utterance.progressInterval = progressInterval;
        };
        
        utterance.onend = async () => {
          setMessage('');
          setAudioProgress({ current: 0, duration: 0, isPlaying: false });
          if (utterance.progressInterval) {
            clearInterval(utterance.progressInterval);
          }
          // Release wake lock when speech ends
          await releaseWakeLock();
        };
        
        utterance.onerror = async (event) => {
          console.error('Speech synthesis error:', event);
          setError('Text-to-speech failed');
          setMessage('');
          setAudioProgress({ current: 0, duration: 0, isPlaying: false });
          if (utterance.progressInterval) {
            clearInterval(utterance.progressInterval);
          }
          // Release wake lock on error
          await releaseWakeLock();
        };
        
        speechSynthesis.speak(utterance);
      }, 100);
    } else {
      setError('Text-to-speech not supported in this browser');
      setTimeout(() => setError(null), 3000);
    }
  };

  /**
   * Announce the latest goal using AI-generated announcement
   * Or generate scoreless commentary if no goals yet
   */
  const announceLatestGoal = async () => {
    if (!currentGameId) {
      setError('No game selected. Please select a game first.');
      return;
    }

    setGoalLoading(true);
    setError(null);
    setMessage('Generating goal announcement...');
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/goals/announce-last' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/goals/announce-last`;
      
      const response = await axios.post(apiUrl, { gameId: currentGameId });
      
      if (response.data.success) {
        const { announcement, scoreless } = response.data;
        
        // Don't show the text message, just play the audio
        // Only show status when actually playing
        
        // Play the generated audio if available, otherwise use browser TTS
        if (announcement.audioPath) {
          try {
            const audioUrl = import.meta.env.DEV 
              ? `/api/audio/${announcement.audioPath}` 
              : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${announcement.audioPath}`;
            
            const audio = new Audio(audioUrl);
            
            // Pre-load the audio
            audio.preload = 'auto';
            
            // Set up event handlers before attempting to play
            const setupAudioHandlers = async () => {
              audio.onloadedmetadata = async () => {
                setMessage('🔊 Playing announcement...');
                setAudioProgress({ current: 0, duration: audio.duration, isPlaying: true });
                // Request wake lock for long audio
                await requestWakeLock();
              };
              
              audio.ontimeupdate = () => {
                setAudioProgress(prev => ({
                  ...prev,
                  current: audio.currentTime
                }));
              };
              
              audio.onended = async () => {
                setMessage('');
                setAudioProgress({ current: 0, duration: 0, isPlaying: false });
                // Release wake lock when audio ends
                await releaseWakeLock();
              };
              
              audio.onerror = async (e) => {
                console.error('Audio playback error:', e);
                setAudioProgress({ current: 0, duration: 0, isPlaying: false });
                // Release wake lock on error
                await releaseWakeLock();
                // Immediately fallback to browser TTS
                speakText(announcement.text);
              };
            };
            
            setupAudioHandlers();
            
            // Try to play audio - this should work on mobile if triggered by user interaction
            try {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                await playPromise;
              }
            } catch (playError) {
              console.log('Audio autoplay blocked, falling back to TTS:', playError);
              // Fallback to browser TTS if audio play fails
              speakText(announcement.text);
            }
          } catch (audioError) {
            console.error('Audio creation error:', audioError);
            // Fallback to browser TTS if audio creation fails
            speakText(announcement.text);
          }
        } else {
          // No server audio available, use browser text-to-speech
          speakText(announcement.text);
        }
      }
    } catch (err) {
      console.error('Error announcing latest goal:', err);
      
      // Handle fallback when announcer service isn't available
      if (err.response?.status === 503 && err.response?.data?.fallback) {
        setError('AI announcer not available in current deployment');
        setMessage('Using fallback: Goal announcement service temporarily unavailable');
      } else {
        setError(err.response?.data?.error || 'Failed to generate announcement');
      }
      setMessage('');
    } finally {
      setGoalLoading(false);
    }
  };

  /**
   * Announce the latest penalty using AI-generated announcement
   */
  const announceLatestPenalty = async () => {
    if (!currentGameId) {
      setError('No game selected. Please select a game first.');
      return;
    }

    setPenaltyLoading(true);
    setError(null);
    setMessage('Generating penalty announcement...');
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/penalties/announce-last' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/penalties/announce-last`;
      
      const response = await axios.post(apiUrl, { gameId: currentGameId });
      
      if (response.data.success) {
        const { announcement } = response.data;
        
        // Don't show the text message, just play the audio
        // Only show status when actually playing
        
        // Play the generated audio if available, otherwise use browser TTS
        if (announcement.audioPath) {
          try {
            const audioUrl = import.meta.env.DEV 
              ? `/api/audio/${announcement.audioPath}` 
              : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${announcement.audioPath}`;
            
            const audio = new Audio(audioUrl);
            
            // Pre-load the audio
            audio.preload = 'auto';
            
            // Set up event handlers before attempting to play
            const setupAudioHandlers = () => {
              audio.onloadedmetadata = () => {
                setMessage('🔊 Playing penalty announcement...');
                setAudioProgress({ current: 0, duration: audio.duration, isPlaying: true });
              };
              
              audio.ontimeupdate = () => {
                setAudioProgress(prev => ({
                  ...prev,
                  current: audio.currentTime
                }));
              };
              
              audio.onended = () => {
                setMessage('');
                setAudioProgress({ current: 0, duration: 0, isPlaying: false });
              };
              
              audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                setAudioProgress({ current: 0, duration: 0, isPlaying: false });
                // Immediately fallback to browser TTS
                speakText(announcement.text);
              };
            };
            
            setupAudioHandlers();
            
            // Try to play audio - this should work on mobile if triggered by user interaction
            try {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                await playPromise;
              }
            } catch (playError) {
              console.log('Audio autoplay blocked, falling back to TTS:', playError);
              // Fallback to browser TTS if audio play fails
              speakText(announcement.text);
            }
          } catch (audioError) {
            console.error('Audio creation error:', audioError);
            // Fallback to browser TTS if audio creation fails
            speakText(announcement.text);
          }
        } else {
          // No server audio available, use browser text-to-speech
          speakText(announcement.text);
        }
      }
    } catch (err) {
      console.error('Error announcing latest penalty:', err);
      
      // Handle fallback when announcer service isn't available
      if (err.response?.status === 503 && err.response?.data?.fallback) {
        setError('AI penalty announcer not available in current deployment');
        setMessage('Using fallback: Penalty announcement service temporarily unavailable');
      } else if (err.response?.status === 404) {
        setError('No penalties recorded yet for this game');
      } else {
        setError(err.response?.data?.error || 'Failed to generate penalty announcement');
      }
      setMessage('');
    } finally {
      setPenaltyLoading(false);
    }
  };

  return (
    <div className="border rounded shadow p-4">
      <h4 className="text-xl font-semibold mb-2">Announcer Controls</h4>
      {!currentGameId && (
        <p className="text-yellow-600 mb-2 text-sm">⚠️ No game selected. Please select a game to use announcer features.</p>
      )}
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <div className="space-y-2">
        <button
          onClick={announceLatestGoal}
          disabled={goalLoading || !currentGameId}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {goalLoading ? 'Generating...' : 'AI Commentary (Goal/Scoreless)'}
        </button>
        <button
          onClick={announceLatestPenalty}
          disabled={penaltyLoading || !currentGameId}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          {penaltyLoading ? 'Generating...' : 'AI Penalty Announcement'}
        </button>
      </div>
      
      {/* Audio Progress Bar */}
      {audioProgress.isPlaying && (
        <div className="mt-3 p-2 bg-gray-50 rounded border">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>🎵 Audio Progress</span>
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
      
      {message && (
        <p className="text-sm mt-3 italic text-gray-600">Latest announcement: {message}</p>
      )}
    </div>
  );
}