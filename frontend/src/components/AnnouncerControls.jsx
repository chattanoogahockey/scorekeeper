import React, { useState, useContext, useRef, useEffect } from 'react';
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
  const [randomLoading, setRandomLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  
  // Audio refs for stop functionality
  const audioElementRef = useRef(null);
  const currentAudioRef = useRef(null); // For tracking dual announcer audio
  const isDualAnnouncerPlayingRef = useRef(false); // Flag to stop dual announcer loop

  // Voice selection state - get from localStorage or default to 'female'
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('selectedVoice') || 'female';
  });

  // Force female announcer as default on first load
  useEffect(() => {
    if (!localStorage.getItem('selectedVoice')) {
      localStorage.setItem('selectedVoice', 'female');
      setSelectedVoice('female');
    }
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
    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      setError('No conversation data available');
      return;
    }

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
        
        setMessage(`${line.speaker === 'male' ? '👨' : '👩'} ${line.speaker.charAt(0).toUpperCase() + line.speaker.slice(1)} announcer speaking...`);
        
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
                
                // Small pause between speakers
                setTimeout(() => {
                  resolve();
                }, 500);
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
              
              // Configure voice based on speaker with improved settings
              const voices = speechSynthesis.getVoices();
              if (line.speaker === 'male') {
                const maleVoices = voices.filter(voice => 
                  voice.lang.startsWith('en') && 
                  (voice.name.includes('Daniel') || voice.name.includes('David') || voice.name.includes('Alex'))
                );
                if (maleVoices.length > 0) utterance.voice = maleVoices[0];
                utterance.rate = 0.95;
                utterance.pitch = 0.65;
              } else {
                const femaleVoices = voices.filter(voice => 
                  voice.lang.startsWith('en') && 
                  (voice.name.includes('Samantha') || voice.name.includes('Karen') || voice.name.includes('Moira'))
                );
                if (femaleVoices.length > 0) utterance.voice = femaleVoices[0];
                utterance.rate = 1.0;
                utterance.pitch = 1.1;
              }
              utterance.volume = 1.0;
              
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
      const apiUrl = import.meta.env.DEV 
        ? '/api/goals/announce-last' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/goals/announce-last`;
      
      const response = await axios.post(apiUrl, { 
        gameId: currentGameId,
        voiceGender: selectedVoice, // Include selected voice
        announcerMode: selectedVoice // Add announcer mode for backend
      });
      
      if (response.data.success) {
        const { announcement, scoreless, conversation } = response.data;
        
        // Handle dual announcer mode
        if (selectedVoice === 'dual' && conversation) {
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
          console.log('⚠️ No Studio audio available, using browser TTS fallback');
          console.log('AudioPath received:', announcement.audioPath);
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
      
      const response = await axios.post(apiUrl, { 
        gameId: currentGameId,
        voiceGender: selectedVoice, // Include selected voice
        announcerMode: selectedVoice // Add announcer mode for backend
      });
      
      if (response.data.success) {
        const { announcement, conversation } = response.data;
        
        // Handle dual announcer mode
        if (selectedVoice === 'dual' && conversation) {
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
      const apiUrl = import.meta.env.DEV 
        ? '/api/randomCommentary' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/randomCommentary`;
      
      const response = await axios.post(apiUrl, { 
        gameId: currentGameId,
        voiceGender: selectedVoice, // Include selected voice
        announcerMode: selectedVoice // Add announcer mode for backend
      });
      
      if (response.data.success) {
        const { text, audioPath, conversation } = response.data;
        
        // Handle dual announcer mode
        if (selectedVoice === 'dual' && conversation) {
          await playDualAnnouncement(conversation);
          return;
        }
        
        // Single announcer mode continues as before
        // Play the generated audio if available, otherwise use browser TTS
        if (audioPath && typeof audioPath === 'string' && audioPath.trim() !== '') {
          try {
            const audioUrl = import.meta.env.DEV 
              ? `/api/audio/${audioPath}` 
              : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${audioPath}`;
            
            console.log('Attempting to play random commentary audio:', audioUrl);
            
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio; // Store reference for stop functionality
            let audioPlaybackStarted = false;
            let fallbackTriggered = false;
            
            // Pre-load the audio
            audio.preload = 'auto';
            
            // Set up event handlers before attempting to play
            const setupAudioHandlers = async () => {
              audio.onloadedmetadata = async () => {
                setMessage('Playing random commentary...');
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
                console.error('Random commentary audio playback error:', e);
                setAudioProgress({ current: 0, duration: 0, isPlaying: false });
                // Release wake lock on error
                await releaseWakeLock();
                // Only fallback if Studio audio never started AND we haven't already triggered fallback
                if (!audioPlaybackStarted && !fallbackTriggered) {
                  fallbackTriggered = true;
                  console.log('Falling back to browser TTS...');
                  speakText(text);
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
                console.log('✅ Random commentary audio playing successfully');
              }
            } catch (playError) {
              console.log('Random commentary autoplay blocked, using fallback:', playError);
              // Only fallback if we haven't already triggered fallback
              if (!fallbackTriggered) {
                fallbackTriggered = true;
                speakText(text);
              }
            }
          } catch (audioError) {
            console.error('Random commentary audio creation error:', audioError);
            // Fallback to browser TTS if audio creation fails
            console.log('🔄 Falling back to browser TTS due to audio creation error');
            speakText(text);
          }
        } else {
          // No server audio available, use browser text-to-speech
          console.log('⚠️ No Studio audio available for random commentary, using browser TTS fallback');
          console.log('AudioPath received:', audioPath);
          speakText(text);
        }
      } else if (response.data.text) {
        // API returned just text without audio processing
        console.log('📢 Random commentary text received, using browser TTS');
        speakText(response.data.text);
      }
    } catch (err) {
      console.error('Error generating random commentary:', err);
      
      // Handle fallback when random commentary service isn't available
      if (err.response?.status === 503) {
        setError('Random commentary service not available in current deployment');
        setMessage('Random commentary feature temporarily unavailable');
      } else if (err.response?.status === 404) {
        setError('Random commentary endpoint not found');
      } else {
        setError(err.response?.data?.error || 'Failed to generate random commentary');
      }
      setMessage('');
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <div className="border rounded shadow p-3">
      <h4 className="text-lg font-semibold mb-3">Announcer</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Left column: Voice selection */}
        <div>
          <div className="mb-3">
            <div className="flex gap-1">
              <button
                onClick={() => handleVoiceSelection('male')}
                className={`flex items-center justify-center px-2 py-1 rounded border-2 transition-colors text-lg ${
                  selectedVoice === 'male'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                title="Male Voice"
              >
                👨
              </button>
              <button
                onClick={() => handleVoiceSelection('female')}
                className={`flex items-center justify-center px-2 py-1 rounded border-2 transition-colors text-lg ${
                  selectedVoice === 'female'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                title="Female Voice"
              >
                👩
              </button>
              <button
                onClick={() => handleVoiceSelection('dual')}
                className={`flex items-center justify-center px-2 py-1 rounded border-2 transition-colors text-lg ${
                  selectedVoice === 'dual'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                title="Dual Announcer Mode"
              >
                👨👩
              </button>
            </div>
          </div>
          {!currentGameId && (
            <p className="text-yellow-600 mb-2 text-xs">⚠️ No game selected</p>
          )}
          {error && <p className="text-red-500 mb-2 text-xs">{error}</p>}
        </div>
        {/* Right column: Announcer buttons */}
        <div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={announceLatestGoal}
              disabled={goalLoading || !currentGameId}
              className="px-2 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 text-sm font-medium transition-colors"
              title="Announce Latest Goal"
            >
              {goalLoading ? 'Loading...' : 'Goal'}
            </button>
            <button
              onClick={announceLatestPenalty}
              disabled={penaltyLoading || !currentGameId}
              className="px-2 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 text-sm font-medium transition-colors"
              title="Announce Latest Penalty"
            >
              {penaltyLoading ? 'Loading...' : 'Penalty'}
            </button>
            <button
              onClick={announceRandomCommentary}
              disabled={randomLoading || !currentGameId}
              className="px-2 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 text-sm font-medium transition-colors"
              title="Random Commentary"
            >
              {randomLoading ? 'Loading...' : 'Random'}
            </button>
          </div>
          
          {/* Stop button - only show when audio is playing */}
          {audioProgress.isPlaying && (
            <div className="mt-2">
              <button
                onClick={stopAudio}
                className="w-full px-2 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white rounded text-sm font-medium transition-colors"
                title="Stop Audio"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Audio Progress Bar */}
      {audioProgress.isPlaying && (
        <div className="mt-3 p-2 bg-gray-50 rounded border">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Audio Progress</span>
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