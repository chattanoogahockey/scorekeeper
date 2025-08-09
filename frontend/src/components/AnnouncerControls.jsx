import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import { GameContext } from '../contexts/GameContext.jsx';
import { configureUtteranceWithFallbackVoice, configureGeneralUtterance } from '../utils/voiceConfig.js';
import { announce, handleAnnouncerError } from '../services/announcerApi.js';

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
  const [randomLoading, setRandomLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  
  // Audio refs for stop functionality
  const audioElementRef = useRef(null);
  const currentAudioRef = useRef(null); // For tracking dual announcer audio
  const isDualAnnouncerPlayingRef = useRef(false); // Flag to stop dual announcer loop

  // Voice selection state - default to 'female' every time
  const [selectedVoice, setSelectedVoice] = useState('female');

  // Force female announcer as default on component mount
  useEffect(() => {
    setSelectedVoice('female');
  }, []);
  
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

  // Stop all audio playback
  const stopAudio = () => {
    // Stop browser TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    // Stop dual announcer flag
    isDualAnnouncerPlayingRef.current = false;
    
    // Stop current audio element if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Stop main audio element if playing
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    
    // Reset states
    setMessage('');
    setAudioProgress({ current: 0, duration: 0, isPlaying: false });
    releaseWakeLock();
  };

  // Voice selection handler
  const handleVoiceSelection = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
    console.log(`🎤 Voice selection changed to: ${voice}`);
  };

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
        
        // Configure voice using centralized voice config
        const voices = speechSynthesis.getVoices();
        configureGeneralUtterance(utterance, voices);
        
        // Estimate duration (rough calculation: ~150 words per minute)
        const wordCount = text.split(' ').length;
        const estimatedDuration = (wordCount / 150) * 60; // seconds
        
        utterance.onstart = () => {
          setMessage('Playing announcement...');
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
   * Play dual announcer conversation with alternating voices using backend TTS
   */
  const playDualAnnouncement = async (conversation) => {
    console.log('🎤 playDualAnnouncement called with:', conversation);
    console.log('🎤 Conversation type:', typeof conversation, 'Array?', Array.isArray(conversation));
    
    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      console.error('❌ Invalid conversation data:', { conversation, isArray: Array.isArray(conversation), length: conversation?.length });
      setError('No conversation data available');
      return;
    }

    console.log('✅ Valid conversation data, starting playback...');

    setMessage('🎤 Playing dual announcer conversation...');
    await requestWakeLock();
    
    // Set flag to indicate dual announcer is playing
    isDualAnnouncerPlayingRef.current = true;

    let totalDuration = 0;
    conversation.forEach(line => {
      const wordCount = line.text.split(' ').length;
      totalDuration += (wordCount / 150) * 60; // Estimate duration
    });

    setAudioProgress({ current: 0, duration: totalDuration, isPlaying: true });

    let currentTime = 0;
    
    try {
      for (let i = 0; i < conversation.length; i++) {
        // Check if stop was requested
        if (!isDualAnnouncerPlayingRef.current) {
          console.log('Dual announcer stopped by user');
          break;
        }
        
        const line = conversation[i];
        
        setMessage(`${line.speaker === 'male' ? '🧓' : '👩‍🦰'} ${line.speaker.charAt(0).toUpperCase() + line.speaker.slice(1)} announcer speaking...`);
        
        // Generate TTS for this line using backend with Studio voices
        try {
          const ttsUrl = import.meta.env.DEV
            ? '/api/tts/dual-line'
            : `${import.meta.env.VITE_API_BASE_URL}/api/tts/dual-line`;

          const response = await axios.post(ttsUrl, {
            text: line.text,
            speaker: line.speaker,
            gameId: gameId
          });
          
          if (response.data.success && response.data.audioPath) {
            // prepend /api/audio/ to filename
            const audioFile = response.data.audioPath;
            const audioUrl = import.meta.env.DEV
              ? `/api/audio/${audioFile}`
              : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${audioFile}`;

            // Play the generated audio
            await new Promise((resolve, reject) => {
              // Check if stop was requested before creating audio
              if (!isDualAnnouncerPlayingRef.current) {
                resolve();
                return;
              }
              
              const audio = new Audio(audioUrl);
              currentAudioRef.current = audio; // Track current audio
              
              audio.oncanplaythrough = () => {
                // Check if stop was requested before playing
                if (!isDualAnnouncerPlayingRef.current) {
                  resolve();
                  return;
                }
                audio.play().then(() => {
                  // Audio is playing
                }).catch(reject);
              };
              
              audio.onended = () => {
                currentTime += (line.text.split(' ').length / 150) * 60;
                setAudioProgress(prev => ({ ...prev, current: currentTime }));
                
                // Faster transition between speakers (reduced from 500ms to 200ms)
                setTimeout(() => {
                  resolve();
                }, 200);
              };
              
              audio.onerror = (event) => {
                console.error('Dual announcer audio error:', event);
                reject(event);
              };
            });
          } else {
            throw new Error('Failed to generate TTS for dual announcer line');
          }
        } catch (ttsError) {
          console.error('TTS generation failed, falling back to browser TTS:', ttsError);
          
          // Fallback to browser TTS if backend fails
          await new Promise((resolve, reject) => {
            // Check if stop was requested before browser TTS
            if (!isDualAnnouncerPlayingRef.current) {
              resolve();
              return;
            }
            
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(line.text);
              
              // Configure voice based on speaker using centralized voice config
              const voices = speechSynthesis.getVoices();
              configureUtteranceWithFallbackVoice(utterance, line.speaker, voices);
              
              utterance.onend = () => {
                currentTime += (line.text.split(' ').length / 150) * 60;
                setAudioProgress(prev => ({ ...prev, current: currentTime }));
                
                setTimeout(() => {
                  resolve();
                }, 500);
              };
              
              utterance.onerror = (event) => {
                console.error('Dual announcer TTS error:', event);
                reject(event);
              };
            
              speechSynthesis.speak(utterance);
            } else {
              reject(new Error('Speech synthesis not supported'));
            }
          });
        }
      }
      
      // Check if completed naturally or was stopped
      if (isDualAnnouncerPlayingRef.current) {
        setMessage('Dual announcer conversation complete');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMessage('Dual announcer stopped');
        setTimeout(() => setMessage(''), 1000);
      }
      
    } catch (error) {
      console.error('Dual announcer playback error:', error);
      setError('Failed to play dual announcer conversation');
    } finally {
      isDualAnnouncerPlayingRef.current = false;
      currentAudioRef.current = null;
      setAudioProgress({ current: 0, duration: 0, isPlaying: false });
      await releaseWakeLock();
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
      const data = await announce('goal', currentGameId, selectedVoice);
      
      if (data.success) {
        const { announcement, scoreless, conversation } = data;
        
        // Handle dual announcer mode
        const mode = selectedVoice === 'dual' ? 'dual' : 'single';
        if (mode === 'dual' && conversation) {
          await playDualAnnouncement(conversation);
          return;
        }
        
        // Single announcer mode continues as before
        // Don't show the text message, just play the audio
        // Only show status when actually playing
        
        // Play the generated audio if available, otherwise use browser TTS
        if (announcement.audioPath && typeof announcement.audioPath === 'string' && announcement.audioPath.trim() !== '') {
          try {
            const audioUrl = import.meta.env.DEV 
              ? `/api/audio/${announcement.audioPath}` 
              : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${announcement.audioPath}`;
            
            console.log('Attempting to play Studio voice audio:', audioUrl);
            
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio; // Store reference for stop functionality
            let audioPlaybackStarted = false;
            let fallbackTriggered = false;
            
            // Pre-load the audio
            audio.preload = 'auto';
            
            // Set up event handlers before attempting to play
            const setupAudioHandlers = async () => {
              audio.onloadedmetadata = async () => {
                setMessage('Playing Studio voice announcement...');
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
                console.error('Studio audio playback error:', e);
                setAudioProgress({ current: 0, duration: 0, isPlaying: false });
                // Release wake lock on error
                await releaseWakeLock();
                // Only fallback if Studio audio never started AND we haven't already triggered fallback
                if (!audioPlaybackStarted && !fallbackTriggered) {
                  fallbackTriggered = true;
                  console.log('Falling back to browser TTS...');
                  speakText(announcement.text);
                }
              };
            };

            setupAudioHandlers();
            
            // Try to play audio - this should work on mobile if triggered by user interaction
            try {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                await playPromise;
                audioPlaybackStarted = true; // Mark that Studio audio started successfully
                console.log('Studio voice audio playing successfully');
              }
            } catch (playError) {
              console.log('Studio audio autoplay blocked, using fallback:', playError);
              // Only fallback if we haven't already triggered fallback
              if (!fallbackTriggered) {
                fallbackTriggered = true;
                speakText(announcement.text);
              }
            }
          } catch (audioError) {
            console.error('Studio audio creation error:', audioError);
            // Fallback to browser TTS if audio creation fails
            console.log('Falling back to browser TTS due to audio creation error');
            speakText(announcement.text);
          }
        } else {
          // No server audio available, use browser text-to-speech
          speakText(announcement.text);
        }
      }
    } catch (err) {
      console.error('Error announcing latest goal:', err);
      
      try {
        handleAnnouncerError(err, 'goal announcement');
      } catch (handledError) {
        setError(handledError.message);
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
      const data = await announce('penalty', currentGameId, selectedVoice);
      
      if (data.success) {
        const { announcement, conversation } = data;
        
        // Handle dual announcer mode
        const mode = selectedVoice === 'dual' ? 'dual' : 'single';
        if (mode === 'dual' && conversation) {
          await playDualAnnouncement(conversation);
          return;
        }
        
        // Single announcer mode continues as before
        // Don't show the text message, just play the audio
        // Only show status when actually playing
        
        // Play the generated audio if available, otherwise use browser TTS
        if (announcement.audioPath && typeof announcement.audioPath === 'string' && announcement.audioPath.trim() !== '') {
          try {
            const audioUrl = import.meta.env.DEV 
              ? `/api/audio/${announcement.audioPath}` 
              : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${announcement.audioPath}`;
            
            console.log('Attempting to play Studio penalty audio:', audioUrl);
            
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio; // Store reference for stop functionality
            let audioPlaybackStarted = false;
            let fallbackTriggered = false;
            
            // Pre-load the audio
            audio.preload = 'auto';
            
            // Set up event handlers before attempting to play
            const setupAudioHandlers = () => {
              audio.onloadedmetadata = () => {
                setMessage('Playing Studio voice penalty announcement...');
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
                console.error('Studio penalty audio playback error:', e);
                setAudioProgress({ current: 0, duration: 0, isPlaying: false });
                // Only fallback if Studio audio never started AND we haven't already triggered fallback
                if (!audioPlaybackStarted && !fallbackTriggered) {
                  fallbackTriggered = true;
                  console.log('Falling back to browser TTS for penalty...');
                  speakText(announcement.text);
                }
              };
            };

            setupAudioHandlers();
            
            // Try to play audio - this should work on mobile if triggered by user interaction
            try {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                await playPromise;
                audioPlaybackStarted = true; // Mark that Studio audio started successfully
                console.log('Studio voice penalty audio playing successfully');
              }
            } catch (playError) {
              console.log('Studio penalty audio autoplay blocked, using fallback:', playError);
              // Only fallback if we haven't already triggered fallback
              if (!fallbackTriggered) {
                fallbackTriggered = true;
                speakText(announcement.text);
              }
            }
          } catch (audioError) {
            console.error('Studio penalty audio creation error:', audioError);
            // Fallback to browser TTS if audio creation fails
            console.log('🔄 Falling back to browser TTS due to penalty audio creation error');
            speakText(announcement.text);
          }
        } else {
          // No server audio available, use browser text-to-speech
          console.log('⚠️ No Studio penalty audio available, using browser TTS fallback');
          console.log('AudioPath received:', announcement.audioPath);
          speakText(announcement.text);
        }
      }
    } catch (err) {
      console.error('Error announcing latest penalty:', err);
      
      try {
        handleAnnouncerError(err, 'penalty announcement');
      } catch (handledError) {
        // Handle special case for no penalties
        if (err.response?.status === 404) {
          setError('No penalties recorded yet for this game');
        } else {
          setError(handledError.message);
        }
      }
      setMessage('');
    } finally {
      setPenaltyLoading(false);
    }
  };

  /**
   * Generate and announce random commentary
   */
  const announceRandomCommentary = async () => {
    if (!currentGameId) {
      setError('No game selected. Please select a game first.');
      return;
    }

    setRandomLoading(true);
    setError(null);
    setMessage('Generating random commentary...');
    
    try {
      const data = await announce('random', currentGameId, selectedVoice);
      console.log('Random commentary response:', data);
      
      if (data.success) {
        const { text, audioPath, conversation } = data;
        console.log('🎙️ Random commentary data received:', { text, audioPath, conversation });
        
        // Handle dual announcer mode
        const mode = selectedVoice === 'dual' ? 'dual' : 'single';
        if (mode === 'dual' && conversation) {
          console.log('🎙️ Processing dual mode conversation:', conversation);
          console.log('🎙️ Conversation type:', typeof conversation, 'Array?', Array.isArray(conversation));
          if (Array.isArray(conversation)) {
            console.log('🎙️ Conversation length:', conversation.length);
            conversation.forEach((line, index) => {
              console.log(`🎙️ Line ${index}:`, line);
            });
          }
          
          try {
            await playDualAnnouncement(conversation);
            setMessage('Random commentary complete!');
            setTimeout(() => setMessage(''), 2000);
          } catch (dualError) {
            console.error('❌ Error in dual announcer playback:', dualError);
            console.error('❌ Conversation data that failed:', conversation);
            setError('Failed to play dual announcer conversation');
          }
          return;
        }
        
        // Single announcer mode - play the generated audio if available
        if (audioPath && typeof audioPath === 'string' && audioPath.trim() !== '') {
          try {
            const audioUrl = import.meta.env.DEV 
              ? `/api/audio/${audioPath}` 
              : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${audioPath}`;
            
            console.log('Playing random commentary audio:', audioUrl);
            setMessage('Playing random commentary...');
            
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio; // Store reference for stop functionality
            
            // Set up event handlers
            audio.onloadedmetadata = async () => {
              setAudioProgress({ current: 0, duration: audio.duration, isPlaying: true });
              await requestWakeLock();
            };
            
            audio.ontimeupdate = () => {
              setAudioProgress(prev => ({
                ...prev,
                current: audio.currentTime
              }));
            };
            
            audio.onended = async () => {
              setMessage('Random commentary complete!');
              setTimeout(() => setMessage(''), 2000);
              setAudioProgress({ current: 0, duration: 0, isPlaying: false });
              await releaseWakeLock();
            };
            
            audio.onerror = async (e) => {
              console.error('Random commentary audio error:', e);
              setAudioProgress({ current: 0, duration: 0, isPlaying: false });
              await releaseWakeLock();
              // Fallback to browser TTS
              console.log('Falling back to browser TTS...');
              speakText(text);
            };

            // Try to play the audio
            try {
              await audio.play();
              console.log('✅ Random commentary audio playing successfully');
            } catch (playError) {
              console.log('Audio autoplay blocked, using browser TTS fallback:', playError);
              speakText(text);
            }
          } catch (audioError) {
            console.error('Random commentary audio creation error:', audioError);
            console.log('🔄 Falling back to browser TTS due to audio creation error');
            speakText(text);
          }
        } else {
          // No server audio available, use browser text-to-speech
          console.log('⚠️ No Studio audio available, using browser TTS fallback');
          console.log('AudioPath received:', audioPath);
          speakText(text);
        }
      } else {
        // Handle case where success is false but we might have text
        console.log('API response without success flag:', data);
        if (data.text) {
          console.log('📢 Using text from response for browser TTS');
          speakText(data.text);
        } else {
          throw new Error('No valid response data received');
        }
      }
    } catch (err) {
      console.error('Error generating random commentary:', err);
      
      try {
        handleAnnouncerError(err, 'random commentary');
      } catch (handledError) {
        setError(handledError.message);
      }
      setMessage('');
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <div className="border rounded shadow p-3">
      <h4 className="text-lg font-semibold mb-2">
        Announcer
      </h4>
      
      {/* 2x3 Grid Layout matching DJ panel exactly */}
      <div className="grid grid-cols-2 gap-1 mb-3">
        <button
          onClick={() => handleVoiceSelection('male')}
          className={`min-w-20 h-8 px-2 py-1 rounded transition-all duration-200 text-xs border-2 ${
            selectedVoice === 'male'
              ? 'bg-white text-blue-800 border-blue-800 font-semibold'
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white border-blue-700'
          }`}
          title="Male Voice"
        >
          🧓
        </button>
        
        <button
          onClick={announceLatestGoal}
          disabled={goalLoading || !currentGameId}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            goalLoading || !currentGameId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
          title="Announce Latest Goal"
        >
          {goalLoading ? 'Loading...' : 'Goal'}
        </button>
        
        <button
          onClick={() => handleVoiceSelection('female')}
          className={`min-w-20 h-8 px-2 py-1 rounded transition-all duration-200 text-xs border-2 ${
            selectedVoice === 'female'
              ? 'bg-white text-blue-800 border-blue-800 font-semibold'
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white border-blue-700'
          }`}
          title="Female Voice"
        >
          👩‍🦰
        </button>
        
        <button
          onClick={announceLatestPenalty}
          disabled={penaltyLoading || !currentGameId}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            penaltyLoading || !currentGameId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
          title="Announce Latest Penalty"
        >
          {penaltyLoading ? 'Loading...' : 'Penalty'}
        </button>
        
        <button
          onClick={() => handleVoiceSelection('dual')}
          className={`min-w-20 h-8 px-2 py-1 rounded transition-all duration-200 text-xs border-2 ${
            selectedVoice === 'dual'
              ? 'bg-white text-blue-800 border-blue-800 font-semibold'
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white border-blue-700'
          }`}
          title="Dual Announcer Mode"
        >
          <span>🧓</span><span>👩‍🦰</span>
        </button>
        
        <button
          onClick={announceRandomCommentary}
          disabled={randomLoading || !currentGameId}
          className={`min-w-20 h-8 px-2 py-1 text-white rounded transition-all duration-200 text-xs ${
            randomLoading || !currentGameId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
          }`}
          title="Random Commentary"
        >
          {randomLoading ? 'Loading...' : 'Random'}
        </button>
      </div>
      
      {/* Conditional elements - only show when needed (matching DJ panel pattern) */}
      {!currentGameId && (
        <p className="text-yellow-600 mb-2 text-xs">No game selected</p>
      )}
      {error && <p className="text-red-500 mb-2 text-xs">{error}</p>}
      
      {/* Audio Progress Bar - Compact (matching DJ panel style) */}
      {audioProgress.isPlaying && (
        <div className="mt-2 p-2 bg-gray-50 rounded border">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Audio Progress</span>
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
      
      {/* Stop button - only show when audio is playing */}
      {audioProgress.isPlaying && (
        <div className="mt-2">
          <button
            onClick={stopAudio}
            className="flex items-center justify-center w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
            title="Stop Audio"
          >
            Stop
          </button>
        </div>
      )}
      
      {/* Message display - only when there's a message AND not playing audio */}
      {message && !audioProgress.isPlaying && (
        <p className="text-sm mt-2 italic text-gray-600 text-center">
          {message}
        </p>
      )}
    </div>
  );
}