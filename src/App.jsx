import React, { useState, useEffect, useRef } from 'react';
import { questionsData } from './questions';
import confetti from 'canvas-confetti';
import Paho from 'paho-mqtt';

// dicebear avatars seeds
const AVATAR_SEEDS = ['Cplusplus', 'Compiler', 'Algorithm', 'Pointer', 'Recursion', 'Matrix', 'Binary', 'Lambda'];

// AI competitor configs
const AI_PLAYERS_POOL = [
  { username: 'BjarneBot', avatar: 'Compiler', isAi: true, delayMin: 4000, delayMax: 8000, accuracy: { easy: 0.90, medium: 0.75, hard: 0.55 } },
  { username: 'LovelaceBot', avatar: 'Algorithm', isAi: true, delayMin: 3000, delayMax: 7000, accuracy: { easy: 0.95, medium: 0.80, hard: 0.65 } },
  { username: 'LinusBot', avatar: 'Recursion', isAi: true, delayMin: 5000, delayMax: 9000, accuracy: { easy: 0.85, medium: 0.70, hard: 0.50 } }
];

// Web Audio API Context
let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

export default function App() {
  // Navigation & User State
  const [gameState, setGameState] = useState('login'); // 'login' | 'dashboard' | 'lobby' | 'playing' | 'summary'
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_SEEDS[0]);
  const [history, setHistory] = useState([]);

  // Theme & Sound Settings
  const [activeTheme, setActiveTheme] = useState('synthwave'); // 'synthwave' | 'matrix' | 'dracula'
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Multiplayer Connection State
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [connectionMode, setConnectionMode] = useState('internet'); // 'internet' (PieSocket) | 'local' (ws://localhost:8080) | 'fallback' (BroadcastChannel)
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  // Customizable Lobby Rules (Controlled by Host, Synced to Clients)
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const [antiCheatPenalties, setAntiCheatPenalties] = useState(20); // -10, -20, or -50
  const [ruleTabSwitch, setRuleTabSwitch] = useState(true);
  const [ruleMouseLeave, setRuleMouseLeave] = useState(true);
  const [ruleInspectBlock, setRuleInspectBlock] = useState(true);
  const [ruleSpeedRun, setRuleSpeedRun] = useState(false); // 15-second timer per question

  // Active Quiz State
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [difficulty, setDifficulty] = useState('easy');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null); // 1-based index
  const [hasAnswered, setHasAnswered] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [usedQuestionTexts, setUsedQuestionTexts] = useState(new Set());

  // Speed Run Question Timer
  const [timeLeft, setTimeLeft] = useState(15);

  // Anti-Cheat State
  const [cheatCount, setCheatCount] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [cheatReason, setCheatReason] = useState('');
  const [cheatLogs, setCheatLogs] = useState([]); // List of alerts displayed in the side panel

  // Onboarding & Confirmation Modal States (Basic Features Review)
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const aiTimersRef = useRef([]);
  const questionTimerRef = useRef(null);
  const mqttClientRef = useRef(null);

  // State refs for event handlers to access current values
  const stateRef = useRef({
    score, streak, difficulty, currentRound, cheatCount, isDisqualified, gameState,
    antiCheatEnabled, antiCheatPenalties, ruleTabSwitch, ruleMouseLeave, ruleInspectBlock, ruleSpeedRun,
    hasAnswered, showQuitConfirm, showHelpModal
  });

  useEffect(() => {
    stateRef.current = {
      score, streak, difficulty, currentRound, cheatCount, isDisqualified, gameState,
      antiCheatEnabled, antiCheatPenalties, ruleTabSwitch, ruleMouseLeave, ruleInspectBlock, ruleSpeedRun,
      hasAnswered, showQuitConfirm, showHelpModal
    };
  }, [
    score, streak, difficulty, currentRound, cheatCount, isDisqualified, gameState,
    antiCheatEnabled, antiCheatPenalties, ruleTabSwitch, ruleMouseLeave, ruleInspectBlock, ruleSpeedRun,
    hasAnswered, showQuitConfirm, showHelpModal
  ]);

  // Load username & stats history from LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('quiz_username');
    const savedAvatar = localStorage.getItem('quiz_avatar');
    const savedHistory = localStorage.getItem('quiz_history');
    const savedTheme = localStorage.getItem('quiz_theme');
    const savedSound = localStorage.getItem('quiz_sound');

    if (savedUser) {
      setUsername(savedUser);
      setGameState('dashboard');
    }
    if (savedAvatar) {
      setSelectedAvatar(savedAvatar);
    }
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    if (savedTheme) {
      setActiveTheme(savedTheme);
    }
    if (savedSound) {
      setSoundEnabled(savedSound === 'true');
    }
  }, []);

  // Sync theme changes to LocalStorage
  const handleThemeChange = (theme) => {
    setActiveTheme(theme);
    localStorage.setItem('quiz_theme', theme);
  };

  const handleSoundToggle = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('quiz_sound', String(nextVal));
  };

  // Synthesize Sound Effects via Web Audio API
  const playSoundEffect = (type) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'correct') {
        // High ascending double chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'wrong') {
        // Low buzzing drone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'streak') {
        // High sweep combo sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'dq') {
        // Falling alarm siren
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.linearRampToValueAtTime(100, now + 1.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 1.4);
        osc.start(now);
        osc.stop(now + 1.4);
      }
    } catch (e) {
      console.warn('Audio Context failed to compile:', e);
    }
  };

  // Speed Run Question Timer Effect
  useEffect(() => {
    if (gameState !== 'playing' || !ruleSpeedRun || hasAnswered || isDisqualified) {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      return;
    }

    setTimeLeft(15);
    questionTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(questionTimerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [gameState, currentQuestion, hasAnswered, isDisqualified, ruleSpeedRun]);

  const handleTimeOut = () => {
    playSoundEffect('wrong');
    setHasAnswered(true);
    setSelectedAnswer(null);
    setStreak(0);
    setEarnedPoints(0);

    let newDifficulty = difficulty;
    if (difficulty === 'hard') newDifficulty = 'medium';
    else if (difficulty === 'medium') newDifficulty = 'easy';
    setDifficulty(newDifficulty);

    setSessionLogs(prev => [
      ...prev,
      {
        question: currentQuestion.text,
        options: currentQuestion.options,
        correctIndex: currentQuestion.correctIndex,
        userIndex: -1, // Timed out
        isCorrect: false,
        points: 0,
        difficulty,
        feedback: "Time limit exceeded! You did not select an option in time."
      }
    ]);

    if (isMultiplayer) {
      sendSocketOrBroadcast({
        type: 'PLAYER_STATE_UPDATE',
        sender: username,
        payload: {
          score: stateRef.current.score,
          streak: 0,
          difficulty: newDifficulty,
          round: currentRound
        }
      });
    }
  };

  // Dual-Layer Network Connection Handler
  useEffect(() => {
    if (!isMultiplayer || !roomCode) {
      setConnectionStatus('Disconnected');
      return;
    }

    setConnectionStatus('Connecting...');

    if (connectionMode === 'internet') {
      // Connect to the public secure EMQX WSS Broker (zero configuration, works over HTTPS)
      const clientId = `quiz-${roomCode}-${Math.random().toString(36).substring(2, 9)}`;
      const client = new Paho.Client('broker.emqx.io', 8084, '/mqtt', clientId);
      mqttClientRef.current = client;

      client.onConnectionLost = (responseObject) => {
        if (responseObject.errorCode !== 0) {
          console.warn('[MQTT CONNECTION LOST]', responseObject.errorMessage);
          setConnectionStatus('Disconnected');
          setConnectionMode('fallback');
        }
      };

      client.onMessageArrived = (message) => {
        try {
          const data = JSON.parse(message.payloadString);
          if (data.code !== roomCode) return;
          if (data.sender === username) return; // Prevent loop back to self
          handleIncomingMessage(data);
        } catch (err) {
          console.warn('Error parsing incoming MQTT payload:', err);
        }
      };

      client.connect({
        useSSL: true,
        timeout: 10,
        keepAliveInterval: 60,
        cleanSession: true,
        onSuccess: () => {
          setConnectionStatus('Connected (Internet)');
          client.subscribe(`quiz/room/${roomCode}`);

          // Broadcast Join Lobby immediately
          const joinMsg = {
            code: roomCode,
            type: 'JOIN_LOBBY',
            sender: username,
            payload: {
              username,
              avatar: selectedAvatar,
              score: 0,
              streak: 0,
              difficulty: 'easy',
              round: 1,
              cheatCount: 0,
              isDisqualified: false,
              status: 'ready'
            }
          };
          const pahoMsg = new Paho.Message(JSON.stringify(joinMsg));
          pahoMsg.destinationName = `quiz/room/${roomCode}`;
          client.send(pahoMsg);
        },
        onFailure: (err) => {
          console.error('[MQTT CONNECTION FAILED]', err);
          setConnectionStatus('Disconnected');
          setConnectionMode('fallback');
        }
      });

      return () => {
        try {
          if (client && client.isConnected()) {
            client.disconnect();
          }
        } catch (e) {}
      };
    }

    if (connectionMode === 'local') {
      const wsUrl = `ws://localhost:8080`;
      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus('Connected (Local Host)');
          ws.send(JSON.stringify({
            code: roomCode,
            type: 'JOIN_LOBBY',
            sender: username,
            payload: {
              username,
              avatar: selectedAvatar,
              score: 0,
              streak: 0,
              difficulty: 'easy',
              round: 1,
              cheatCount: 0,
              isDisqualified: false,
              status: 'ready'
            }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
          } catch (err) {
            console.warn('Error parsing incoming WS message:', err);
          }
        };

        ws.onerror = (e) => {
          console.warn('[WS ERROR] Socket encountered error:', e);
        };

        ws.onclose = () => {
          setConnectionStatus('Disconnected');
          setConnectionMode('internet');
        };
      } catch (e) {
        console.warn('Local WS setup failed, falling back to Internet...', e);
        setConnectionMode('internet');
      }

      return () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }

    if (connectionMode === 'fallback') {
      setConnectionStatus('Connected (Local Multi-Tab)');
      broadcastChannelRef.current = new BroadcastChannel(`quiz_room_${roomCode}`);
      broadcastChannelRef.current.onmessage = (event) => {
        handleIncomingMessage(event.data);
      };
      
      setTimeout(() => {
        broadcastChannelRef.current.postMessage({
          code: roomCode,
          sender: username,
          type: 'JOIN_LOBBY',
          payload: {
            username,
            avatar: selectedAvatar,
            score: 0,
            streak: 0,
            difficulty: 'easy',
            round: 1,
            cheatCount: 0,
            isDisqualified: false,
            status: 'ready'
          }
        });
      }, 500);

      return () => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.close();
        }
      };
    }
  }, [isMultiplayer, roomCode, connectionMode, username, selectedAvatar]);

  // Unified Sending Interface (decides whether to send via WS, Paho MQTT, or BroadcastChannel)
  const sendSocketOrBroadcast = (messageObj) => {
    const fullMsg = { ...messageObj, code: roomCode };

    if (connectionMode === 'fallback') {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(fullMsg);
      }
    } else if (connectionMode === 'internet') {
      if (mqttClientRef.current && mqttClientRef.current.isConnected()) {
        const pahoMsg = new Paho.Message(JSON.stringify(fullMsg));
        pahoMsg.destinationName = `quiz/room/${roomCode}`;
        mqttClientRef.current.send(pahoMsg);
      }
    } else {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(fullMsg));
      }
    }
  };

  // Handle incoming packets (Lobby, Leaderboards, Sync Settings, Anti-cheat logs)
  const handleIncomingMessage = (msgData) => {
    const { type, sender, payload } = msgData;

    switch (type) {
      case 'JOIN_LOBBY':
        setRoomPlayers(prev => {
          if (prev.some(p => p.username === sender)) return prev;
          return [...prev, { ...payload, isAi: false }];
        });
        
        // Sync our local state back
        sendSocketOrBroadcast({
          type: 'SYNC_LOBBY_STATE',
          sender: username,
          payload: {
            username,
            avatar: selectedAvatar,
            score: stateRef.current.score,
            streak: stateRef.current.streak,
            difficulty: stateRef.current.difficulty,
            round: stateRef.current.currentRound,
            cheatCount: stateRef.current.cheatCount,
            isDisqualified: stateRef.current.isDisqualified,
            status: 'ready'
          }
        });
        
        // Hosts will sync current rules to new player
        if (isHost) {
          sendSocketOrBroadcast({
            type: 'UPDATE_ROOM_SETTINGS',
            sender: username,
            payload: {
              antiCheatEnabled: stateRef.current.antiCheatEnabled,
              antiCheatPenalties: stateRef.current.antiCheatPenalties,
              ruleTabSwitch: stateRef.current.ruleTabSwitch,
              ruleMouseLeave: stateRef.current.ruleMouseLeave,
              ruleInspectBlock: stateRef.current.ruleInspectBlock,
              ruleSpeedRun: stateRef.current.ruleSpeedRun
            }
          });
        }
        break;

      case 'SYNC_LOBBY_STATE':
        setRoomPlayers(prev => {
          const index = prev.findIndex(p => p.username === sender);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...payload };
            return updated;
          }
          return [...prev, { ...payload, isAi: false }];
        });
        break;

      case 'UPDATE_ROOM_SETTINGS':
        // Apply settings changes pushed by Host
        if (!isHost) {
          setAntiCheatEnabled(payload.antiCheatEnabled);
          setAntiCheatPenalties(payload.antiCheatPenalties);
          setRuleTabSwitch(payload.ruleTabSwitch);
          setRuleMouseLeave(payload.ruleMouseLeave);
          setRuleInspectBlock(payload.ruleInspectBlock);
          setRuleSpeedRun(payload.ruleSpeedRun);
        }
        break;

      case 'START_GAME':
        if (!isHost) {
          startQuizGameplay();
        }
        break;

      case 'PLAYER_STATE_UPDATE':
        setRoomPlayers(prev => {
          return prev.map(p => {
            if (p.username === sender) {
              const updated = { ...p, ...payload };
              // Log anti-cheat infractions in developer console
              if (payload.cheatCount !== undefined && payload.cheatCount > p.cheatCount) {
                const action = payload.isDisqualified ? 'DISQUALIFIED' : 'PENALIZED';
                logCheatAlert(`[ANTI-CHEAT] ${sender} was ${action} (${payload.cheatCount}/3 warning)`);
              }
              return updated;
            }
            return p;
          });
        });
        break;

      case 'PLAYER_LEAVE':
        setRoomPlayers(prev => prev.filter(p => p.username !== sender));
        break;

      default:
        break;
    }
  };

  // Dev Cheat Logger
  const logCheatAlert = (msg) => {
    setCheatLogs(prev => [msg, ...prev].slice(0, 10));
  };

  // Sync Host rule adjustments immediately
  const handleHostSettingChange = (settingName, value) => {
    if (!isHost) return;

    // Apply locally
    if (settingName === 'antiCheatEnabled') setAntiCheatEnabled(value);
    else if (settingName === 'antiCheatPenalties') setAntiCheatPenalties(value);
    else if (settingName === 'ruleTabSwitch') setRuleTabSwitch(value);
    else if (settingName === 'ruleMouseLeave') setRuleMouseLeave(value);
    else if (settingName === 'ruleInspectBlock') setRuleInspectBlock(value);
    else if (settingName === 'ruleSpeedRun') setRuleSpeedRun(value);

    // Sync
    sendSocketOrBroadcast({
      type: 'UPDATE_ROOM_SETTINGS',
      sender: username,
      payload: {
        antiCheatEnabled: settingName === 'antiCheatEnabled' ? value : stateRef.current.antiCheatEnabled,
        antiCheatPenalties: settingName === 'antiCheatPenalties' ? value : stateRef.current.antiCheatPenalties,
        ruleTabSwitch: settingName === 'ruleTabSwitch' ? value : stateRef.current.ruleTabSwitch,
        ruleMouseLeave: settingName === 'ruleMouseLeave' ? value : stateRef.current.ruleMouseLeave,
        ruleInspectBlock: settingName === 'ruleInspectBlock' ? value : stateRef.current.ruleInspectBlock,
        ruleSpeedRun: settingName === 'ruleSpeedRun' ? value : stateRef.current.ruleSpeedRun
      }
    });
  };

  // Anti-Cheat Detectors
  useEffect(() => {
    if (gameState !== 'playing' || !antiCheatEnabled || isDisqualified) return;

    const triggerCheatViolation = (reason) => {
      if (isDisqualified) return;

      playSoundEffect('wrong');
      const nextCheatCount = stateRef.current.cheatCount + 1;
      setCheatCount(nextCheatCount);
      setCheatReason(reason);

      if (nextCheatCount >= 3) {
        playSoundEffect('dq');
        setIsDisqualified(true);
        setScore(0);
        setStreak(0);
        setEarnedPoints(0);
        setHasAnswered(true);
        setSelectedAnswer(null);
        
        broadcastStateUpdate({
          score: 0,
          streak: 0,
          cheatCount: nextCheatCount,
          isDisqualified: true
        });
        logCheatAlert(`[ANTI-CHEAT] You were DISQUALIFIED: ${reason}`);
      } else {
        const penalty = antiCheatPenalties;
        setScore(prev => Math.max(0, prev - penalty));
        
        broadcastStateUpdate({
          score: Math.max(0, stateRef.current.score - penalty),
          cheatCount: nextCheatCount
        });
        setShowCheatWarning(true);
        logCheatAlert(`[ANTI-CHEAT] Infraction detected: ${reason} (Warning ${nextCheatCount}/3)`);
      }
    };

    // Rule 1: Tab Switching / Hiding Page
    const onVisibilityChange = () => {
      if (document.hidden && ruleTabSwitch) {
        triggerCheatViolation('Tab switch detected');
      }
    };

    // Rule 2: Clicking away (blur)
    const onWindowBlur = () => {
      if (ruleInspectBlock) {
        triggerCheatViolation('Window lost focus (clicked away)');
      }
    };

    // Rule 3: Mouse leaving window boundary
    const onMouseLeave = () => {
      if (ruleMouseLeave) {
        triggerCheatViolation('Cursor left browser window boundary');
      }
    };

    // Rule 4: Text copy blocker
    const onCopyAttempt = (e) => {
      if (ruleInspectBlock) {
        e.preventDefault();
        triggerCheatViolation('Attempted to copy question text');
      }
    };

    // Rule 5: Developer tool key triggers block
    const onKeyDown = (e) => {
      if (ruleInspectBlock) {
        const isInspectorKey = e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
          (e.ctrlKey && (e.key === 'U' || e.key === 'u'));
        if (isInspectorKey) {
          e.preventDefault();
          triggerCheatViolation('DevTools inspect keys blocked');
        }
      }
    };

    // Rule 6: Right-click blocker
    const onRightClick = (e) => {
      if (ruleInspectBlock) {
        e.preventDefault();
        triggerCheatViolation('Right-click block triggered');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('copy', onCopyAttempt);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('contextmenu', onRightClick);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('copy', onCopyAttempt);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('contextmenu', onRightClick);
    };
  }, [gameState, isDisqualified, antiCheatEnabled, ruleTabSwitch, ruleInspectBlock, ruleMouseLeave, antiCheatPenalties]);

  // Clean up AI bot timers
  useEffect(() => {
    return () => {
      clearAllAiTimers();
    };
  }, []);

  const clearAllAiTimers = () => {
    aiTimersRef.current.forEach(timer => clearTimeout(timer));
    aiTimersRef.current = [];
  };

  const broadcastStateUpdate = (updates) => {
    if (!isMultiplayer) return;
    sendSocketOrBroadcast({
      type: 'PLAYER_STATE_UPDATE',
      sender: username,
      payload: updates
    });
  };

  // Registration & Users (with strict input sanitization)
  const handleLogin = (e) => {
    e.preventDefault();
    const sanitized = username.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitized.length < 3) {
      alert('Code Name must be at least 3 characters (letters, numbers, underscores only).');
      return;
    }
    if (sanitized.length > 15) {
      alert('Code Name must be 15 characters or less.');
      return;
    }
    setUsername(sanitized);
    localStorage.setItem('quiz_username', sanitized);
    localStorage.setItem('quiz_avatar', selectedAvatar);
    setGameState('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('quiz_username');
    localStorage.removeItem('quiz_avatar');
    setUsername('');
    setGameState('login');
  };

  // Host multiplayer room setup
  const handleCreateRoom = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(code);
    setIsHost(true);
    setIsMultiplayer(true);
    setRoomPlayers([]);
    setCheatLogs([]);
    setGameState('lobby');

    // Bot seed timer if room is lonely
    const timer = setTimeout(() => {
      setRoomPlayers(prev => {
        if (prev.filter(p => !p.isAi).length > 0) {
          return [...prev, { ...AI_PLAYERS_POOL[0], score: 0, streak: 0, difficulty: 'easy', round: 1, cheatCount: 0, isDisqualified: false }];
        }
        return [
          ...prev,
          { ...AI_PLAYERS_POOL[0], score: 0, streak: 0, difficulty: 'easy', round: 1, cheatCount: 0, isDisqualified: false },
          { ...AI_PLAYERS_POOL[1], score: 0, streak: 0, difficulty: 'easy', round: 1, cheatCount: 0, isDisqualified: false }
        ];
      });
    }, 4500);
    aiTimersRef.current.push(timer);
  };

  // Join room setup (with validation)
  const handleJoinRoom = (e) => {
    e.preventDefault();
    const cleanRoomCode = roomCode.trim().replace(/[^0-9]/g, '');
    if (cleanRoomCode.length !== 4) {
      alert('Room Code must be a 4-digit number.');
      return;
    }
    setRoomCode(cleanRoomCode);
    setIsHost(false);
    setIsMultiplayer(true);
    setRoomPlayers([]);
    setCheatLogs([]);
    setGameState('lobby');
  };

  const handlePlaySolo = () => {
    setIsMultiplayer(false);
    setRoomCode('');
    setIsHost(false);
    startQuizGameplay();
  };

  const handleLeaveLobby = () => {
    sendSocketOrBroadcast({
      type: 'PLAYER_LEAVE',
      sender: username
    });
    clearAllAiTimers();
    setGameState('dashboard');
  };

  const handleStartGame = () => {
    sendSocketOrBroadcast({
      type: 'START_GAME',
      sender: username
    });
    startQuizGameplay();
  };

  // Game Loop
  const startQuizGameplay = () => {
    setCurrentRound(1);
    setScore(0);
    setStreak(0);
    setDifficulty('easy');
    setCheatCount(0);
    setIsDisqualified(false);
    setShowCheatWarning(false);
    setSessionLogs([]);
    setUsedQuestionTexts(new Set());
    setHasAnswered(false);
    setSelectedAnswer(null);

    const firstQ = selectQuestion('easy', new Set());
    setCurrentQuestion(firstQ);
    setGameState('playing');

    if (isMultiplayer) {
      setRoomPlayers(prev => prev.map(p => ({
        ...p,
        score: 0,
        streak: 0,
        difficulty: 'easy',
        round: 1,
        cheatCount: 0,
        isDisqualified: false
      })));
      startSimulatingAiPlayers();
    }
  };

  const selectQuestion = (level, usedSet) => {
    const pool = questionsData[level].filter(q => !usedSet.has(q.text));
    const activePool = pool.length > 0 ? pool : questionsData[level];
    const randomIndex = Math.floor(Math.random() * activePool.length);
    const selected = activePool[randomIndex];
    
    usedSet.add(selected.text);
    setUsedQuestionTexts(new Set(usedSet));
    return selected;
  };

  // Simulated bots
  const startSimulatingAiPlayers = () => {
    clearAllAiTimers();
    setRoomPlayers(prev => {
      prev.forEach(player => {
        if (player.isAi) {
          scheduleNextAiTurn(player, 1);
        }
      });
      return prev;
    });
  };

  const scheduleNextAiTurn = (aiPlayer, round) => {
    if (round > 5) return;

    const delay = Math.floor(
      Math.random() * (aiPlayer.delayMax - aiPlayer.delayMin) + aiPlayer.delayMin
    );

    const timer = setTimeout(() => {
      setRoomPlayers(prev => {
        const playerIndex = prev.findIndex(p => p.username === aiPlayer.username);
        if (playerIndex === -1) return prev;

        const p = prev[playerIndex];
        if (p.isDisqualified) return prev;

        const currentDiff = p.difficulty;
        const roll = Math.random();
        const isCorrect = roll < aiPlayer.accuracy[currentDiff];

        let nextDifficulty = currentDiff;
        let nextStreak = p.streak;
        let pointsEarned = 0;
        let nextCheatCount = p.cheatCount;
        let nextDisqualified = p.isDisqualified;

        // Visual AI Cheating Simulation (5% chance if anti-cheat is toggled on)
        if (stateRef.current.antiCheatEnabled && Math.random() < 0.05) {
          nextCheatCount += 1;
          if (nextCheatCount >= 3) {
            nextDisqualified = true;
            p.score = 0;
            p.streak = 0;
            logCheatAlert(`[ANTI-CHEAT] ${aiPlayer.username} was DISQUALIFIED (Lobby settings rule enforced)`);
          } else {
            p.score = Math.max(0, p.score - stateRef.current.antiCheatPenalties);
            logCheatAlert(`[ANTI-CHEAT] ${aiPlayer.username} penalized -${stateRef.current.antiCheatPenalties}pts for cursor-leave`);
          }
        }

        if (!nextDisqualified) {
          if (isCorrect) {
            nextStreak += 1;
            const base = currentDiff === 'easy' ? 10 : currentDiff === 'medium' ? 30 : 50;
            pointsEarned = base + nextStreak * 5;
            p.score += pointsEarned;
            p.streak = nextStreak;

            if (currentDiff === 'easy') nextDifficulty = 'medium';
            else if (currentDiff === 'medium') nextDifficulty = 'hard';
          } else {
            nextStreak = 0;
            p.streak = 0;

            if (currentDiff === 'hard') nextDifficulty = 'medium';
            else if (currentDiff === 'medium') nextDifficulty = 'easy';
          }
        }

        const updatedPlayer = {
          ...p,
          round: round,
          streak: p.streak,
          score: p.score,
          difficulty: nextDifficulty,
          cheatCount: nextCheatCount,
          isDisqualified: nextDisqualified
        };

        const updatedList = [...prev];
        updatedList[playerIndex] = updatedPlayer;

        scheduleNextAiTurn(updatedPlayer, round + 1);

        return updatedList;
      });
    }, delay);

    aiTimersRef.current.push(timer);
  };

  const handleAnswerSubmit = (optionIndex) => {
    if (hasAnswered || isDisqualified) return;

    setSelectedAnswer(optionIndex);
    setHasAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    let newDifficulty = difficulty;
    let newStreak = streak;
    let points = 0;

    if (isCorrect) {
      newStreak += 1;
      points = calculatePoints(difficulty, newStreak);
      setScore(prev => prev + points);
      setStreak(newStreak);
      setEarnedPoints(points);
      playSoundEffect('correct');

      if (newStreak % 3 === 0) {
        playSoundEffect('streak');
      }

      if (difficulty === 'easy') newDifficulty = 'medium';
      else if (difficulty === 'medium') newDifficulty = 'hard';
    } else {
      newStreak = 0;
      setStreak(0);
      setEarnedPoints(0);
      playSoundEffect('wrong');

      if (difficulty === 'hard') newDifficulty = 'medium';
      else if (difficulty === 'medium') newDifficulty = 'easy';
    }

    setDifficulty(newDifficulty);

    setSessionLogs(prev => [
      ...prev,
      {
        question: currentQuestion.text,
        options: currentQuestion.options,
        correctIndex: currentQuestion.correctIndex,
        userIndex: optionIndex,
        isCorrect,
        points,
        difficulty,
        feedback: currentQuestion.feedback
      }
    ]);

    if (isMultiplayer) {
      broadcastStateUpdate({
        score: isCorrect ? stateRef.current.score + points : stateRef.current.score,
        streak: newStreak,
        difficulty: newDifficulty,
        round: currentRound,
        cheatCount: cheatCount,
        isDisqualified: isDisqualified
      });
    }
  };

  const calculatePoints = (level, currentStreak) => {
    const base = level === 'easy' ? 10 : level === 'medium' ? 30 : 50;
    const streakBonus = currentStreak * 5;
    return base + streakBonus;
  };

  const handleNextRound = () => {
    if (currentRound >= 5 || isDisqualified) {
      const newGameResult = {
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: score,
        accuracy: Math.round((sessionLogs.filter(log => log.isCorrect).length / 5) * 100),
        maxStreak: Math.max(...sessionLogs.map((_, i) => {
          let run = 0;
          for (let j = 0; j <= i; j++) {
            run = sessionLogs[j].isCorrect ? run + 1 : 0;
          }
          return run;
        }), 0)
      };

      const updatedHistory = [newGameResult, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('quiz_history', JSON.stringify(updatedHistory));

      if (!isDisqualified) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ff007f']
        });
      }

      if (isMultiplayer) {
        broadcastStateUpdate({
          status: 'finished',
          score: score
        });
      }

      setGameState('summary');
    } else {
      setCurrentRound(prev => prev + 1);
      setHasAnswered(false);
      setSelectedAnswer(null);

      const nextQ = selectQuestion(difficulty, usedQuestionTexts);
      setCurrentQuestion(nextQ);

      if (isMultiplayer) {
        broadcastStateUpdate({
          round: currentRound + 1
        });
      }
    }
  };

  const stats = getDashboardStats();
  function getDashboardStats() {
    if (history.length === 0) return { highScore: 0, avgScore: 0, avgAccuracy: 0 };
    const scores = history.map(h => h.score);
    const accuracies = history.map(h => h.accuracy);
    return {
      highScore: Math.max(...scores),
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / history.length),
      avgAccuracy: Math.round(accuracies.reduce((a, b) => a + b, 0) / history.length)
    };
  }

  return (
    <div className={`theme-${activeTheme}`} style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: (gameState === 'playing' || gameState === 'lobby') && isMultiplayer ? '1000px' : '650px', justifyContent: 'center', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      
      {/* MAIN GAME CARD */}
      <div className="glass-card" style={{ flexGrow: 1, userSelect: (antiCheatEnabled && ruleInspectBlock && gameState === 'playing') ? 'none' : 'auto' }}>
        
        {/* HEADER TOOLBAR (Themes and Sounds) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
          {/* Audio toggle */}
          <button onClick={handleSoundToggle} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {soundEnabled ? '🔊 Sound On' : '🔇 Muted'}
          </button>
          
          {/* Visual Theme Selector */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['synthwave', 'matrix', 'dracula'].map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                  border: activeTheme === t ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                  background: activeTheme === t ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: 'white',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* LOGO (Acts as Return to Home link) */}
        <div 
          style={{ textAlign: 'center', marginBottom: '20px', cursor: gameState !== 'login' ? 'pointer' : 'default' }}
          onClick={() => {
            if (gameState === 'login') return;
            if (gameState === 'playing' && !isDisqualified) {
              setShowQuitConfirm(true);
            } else {
              if (gameState === 'lobby') {
                handleLeaveLobby();
              } else {
                setGameState('dashboard');
              }
            }
          }}
        >
          <h1>ADAPTIVE QUIZ ARENA</h1>
          <p className="subtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            C++ Concept &amp; Memory Integrity Platform
            {gameState !== 'login' && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(Click Arena Title to go Home)</span>}
          </p>
        </div>

        {/* HELP / HOW TO PLAY MODAL OVERLAY */}
        {showHelpModal && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 23, 0.95)',
            zIndex: 1000,
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            padding: '30px',
            backdropFilter: 'blur(12px)',
            animation: 'slideIn 0.3s',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.4rem', marginBottom: '15px', textAlign: 'center' }}>
              ❓ HOW TO PLAY &amp; ARENA RULES
            </h2>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, textAlign: 'left', paddingRight: '5px' }}>
              <div>
                <strong>1. Adaptive Difficulty Engine:</strong>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>Your starting difficulty is EASY. Answering correctly raises the level (Easy → Medium → Hard). Answering incorrectly lowers the level (Hard → Medium → Easy).</p>
              </div>
              <div>
                <strong>2. Points and Combos:</strong>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>Base Points: Easy = 10 pts | Medium = 30 pts | Hard = 50 pts. Consecutive correct answers stack a Streak Combo multiplier (+5 pts per streak level added to base points!). Incorrect answers break the streak.</p>
              </div>
              <div>
                <strong>3. Strict Anti-Cheat Protocols:</strong>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>If active, the system detects tab switching, cursor departures from the viewport, DevTools activations (Inspect or F12), and right-clicks. Each warning deducts points. A 3rd infraction triggers automatic disqualification (score locked to 0).</p>
              </div>
              <div>
                <strong>4. Speed Run Mode:</strong>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>When enabled, you have exactly 15 seconds per question. Failure to select an option in time counts as an incorrect answer and resets your streak combo.</p>
              </div>
              <div>
                <strong>5. Real-Time Multiplayer:</strong>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>In Internet Mode, rooms are hosted on EMQX secure cloud servers. Anyone anywhere on the internet can join with your 4-digit room code to play together in real-time!</p>
              </div>
            </div>
            <button className="btn-primary" onClick={() => setShowHelpModal(false)} style={{ marginTop: '20px', width: '100%' }}>
              Close Rules
            </button>
          </div>
        )}

        {/* QUIT GAME CONFIRMATION OVERLAY */}
        {showQuitConfirm && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 23, 0.95)',
            zIndex: 1000,
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'slideIn 0.3s'
          }}>
            <div style={{ fontSize: '3rem', color: 'var(--color-hard)', marginBottom: '15px' }}>🚨</div>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.4rem', marginBottom: '10px' }}>
              ABORT ACTIVE QUIZ?
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '25px', maxWidth: '340px' }}>
              Are you sure you want to quit the game? Your current score and progress in this round will be lost.
            </p>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button className="btn-secondary" onClick={() => setShowQuitConfirm(false)} style={{ flexGrow: 1 }}>
                Resume Play
              </button>
              <button className="btn-primary" onClick={() => {
                setShowQuitConfirm(false);
                if (questionTimerRef.current) clearInterval(questionTimerRef.current);
                setGameState('dashboard');
                if (isMultiplayer) {
                  sendSocketOrBroadcast({
                    type: 'PLAYER_LEAVE',
                    sender: username
                  });
                }
              }} style={{ flexGrow: 1, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}>
                Quit &amp; Exit
              </button>
            </div>
          </div>
        )}

        {/* RESET RECORDS CONFIRMATION OVERLAY */}
        {showResetConfirm && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 23, 0.95)',
            zIndex: 1000,
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'slideIn 0.3s'
          }}>
            <div style={{ fontSize: '3rem', color: 'var(--color-medium)', marginBottom: '15px' }}>🗑️</div>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.4rem', marginBottom: '10px' }}>
              CLEAR TERMINAL HISTORY?
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '25px', maxWidth: '340px' }}>
              This will permanently delete all your past quiz deployment records. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button className="btn-secondary" onClick={() => setShowResetConfirm(false)} style={{ flexGrow: 1 }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => {
                setShowResetConfirm(false);
                setHistory([]);
                localStorage.removeItem('quiz_history');
              }} style={{ flexGrow: 1, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)' }}>
                Clear Records
              </button>
            </div>
          </div>
        )}

        {/* CHEAT PENALTY WARNING MODAL OVERLAY */}
        {showCheatWarning && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 23, 0.95)',
            zIndex: 999,
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'slideIn 0.3s'
          }}>
            <div style={{ fontSize: '3rem', color: 'var(--color-error)', marginBottom: '15px' }}>⚠️</div>
            <h2 style={{ color: 'var(--color-error)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '10px' }}>
              ARENA PROTOCOL VIOLATION!
            </h2>
            <p style={{ fontSize: '1.05rem', marginBottom: '15px', color: 'white' }}>
              {cheatReason || 'Tab switch, mouse leave, or focus loss detected.'}
            </p>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--color-error)',
              borderRadius: '12px',
              padding: '12px 20px',
              marginBottom: '25px',
              color: 'var(--color-error)',
              fontSize: '0.95rem',
              fontWeight: 600
            }}>
              Score Penalty: -{antiCheatPenalties} Points | Warnings: {cheatCount}/3
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '30px', maxWidth: '380px' }}>
              System tracks visibility, mouse boundaries, DevTools, key triggers, and right-clicks. Standard rooms enforce a 3rd violation disqualification rule.
            </p>
            <button className="btn-primary" onClick={() => setShowCheatWarning(false)}>
              I Acknowledge (Resume Battle)
            </button>
          </div>
        )}

        {/* LOGIN SCREEN */}
        {gameState === 'login' && (
          <form onSubmit={handleLogin} style={{ animation: 'slideIn 0.4s' }}>
            <div className="form-group">
              <label className="form-label">Select Hacker Avatar</label>
              <div className="avatar-grid">
                {AVATAR_SEEDS.map((seed) => (
                  <div
                    key={seed}
                    className={`avatar-option ${selectedAvatar === seed ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(seed)}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=0f172a`}
                      alt={seed}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="username">Enter Code Name</label>
              <input
                id="username"
                type="text"
                className="text-input"
                placeholder="e.g. LambdaHacker"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Enter Arena Gateway
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowHelpModal(true)} className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}>
                ❓ How to Play &amp; Arena Rules
              </button>
            </div>
          </form>
        )}

        {/* DASHBOARD SCREEN */}
        {gameState === 'dashboard' && (
          <div style={{ animation: 'slideIn 0.4s' }}>
            {/* Profile Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatar}&backgroundColor=0f172a`}
                alt={username}
                style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--color-primary)', boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)' }}
              />
              <div style={{ flexGrow: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Terminal: {username}</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                  <button 
                    onClick={handleLogout} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--color-text-muted)', 
                      cursor: 'pointer', 
                      fontSize: '0.8rem', 
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Disconnect Terminal
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                  <button 
                    onClick={() => setShowHelpModal(true)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--color-primary)', 
                      cursor: 'pointer', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      padding: 0
                    }}
                  >
                    ❓ Help Guide
                  </button>
                </div>
              </div>
              <button onClick={handlePlaySolo} className="btn-primary">
                Solo Deployment
              </button>
            </div>

            {/* Multiplayer Creation Panel */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                  Arena Room Battle
                </h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {/* Local vs Internet Toggle */}
                  <button
                    onClick={() => setConnectionMode('internet')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      borderRadius: '6px',
                      border: connectionMode === 'internet' ? '1px solid var(--color-success)' : '1px solid transparent',
                      background: connectionMode === 'internet' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: connectionMode === 'internet' ? 'var(--color-success)' : 'var(--color-text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    🌎 Internet Mode
                  </button>
                  <button
                    onClick={() => setConnectionMode('local')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      borderRadius: '6px',
                      border: connectionMode === 'local' ? '1px solid var(--color-primary)' : '1px solid transparent',
                      background: connectionMode === 'local' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: connectionMode === 'local' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    💻 Local LAN Mode
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={handleCreateRoom} className="btn-secondary" style={{ flexGrow: 1, padding: '12px' }}>
                  Host Room ({connectionMode === 'internet' ? 'Internet' : 'LAN'})
                </button>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>or</div>
                <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '8px', flexGrow: 1.5 }}>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Enter Room Code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.slice(0, 6))}
                    style={{ padding: '10px 14px', fontSize: '0.9rem' }}
                    required
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                    Join
                  </button>
                </form>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="stats-dashboard-grid">
              <div className="stat-dashboard-box">
                <div className="val">{history.length}</div>
                <div className="lbl">Deployments</div>
              </div>
              <div className="stat-dashboard-box">
                <div className="val">{stats.highScore}</div>
                <div className="lbl">High Record</div>
              </div>
              <div className="stat-dashboard-box">
                <div className="val">{stats.avgAccuracy}%</div>
                <div className="lbl">Precision</div>
              </div>
            </div>

            {/* History Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Past Arena Logs
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: 0
                    }}
                  >
                    🗑️ Clear History
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                  Terminal log empty. Deploy to register quiz runs.
                </p>
              ) : (
                <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 4px' }}>Timestamp</th>
                        <th style={{ textAlign: 'right', padding: '8px 4px' }}>Score</th>
                        <th style={{ textAlign: 'right', padding: '8px 4px' }}>Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((game, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px 4px', color: 'var(--color-text-muted)' }}>{game.date}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{game.score}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', color: game.accuracy > 70 ? 'var(--color-success)' : 'white' }}>{game.accuracy}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOBBY SCREEN (Settings, Toggles, Connections details) */}
        {gameState === 'lobby' && (
          <div style={{ animation: 'slideIn 0.4s' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.75rem', color: connectionStatus.includes('Connected') ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: connectionStatus.includes('Connected') ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block' }}></span>
                {connectionStatus}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '8px 0' }}>
                Room Code: <span style={{ color: 'white', fontFamily: 'var(--font-mono)', padding: '4px 12px', background: 'rgba(99, 102, 241, 0.12)', border: '1px dashed var(--color-primary)', borderRadius: '8px' }}>{roomCode}</span>
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {connectionMode === 'internet' 
                  ? 'Connect with players across the internet using this Room Code!' 
                  : 'Open another local tab on this machine or same network to play.'}
              </p>
            </div>

            {/* CUSTOMIZABLE ROOM SETTINGS PANEL */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                Room Configurations {isHost ? '(Host controls)' : '(Guest view)'}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
                
                {/* Master Anti Cheat Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="antiCheatToggle"
                    checked={antiCheatEnabled}
                    onChange={(e) => handleHostSettingChange('antiCheatEnabled', e.target.checked)}
                    disabled={!isHost}
                  />
                  <label htmlFor="antiCheatToggle" style={{ fontWeight: 600, color: 'white' }}>⚠️ Anti-Cheat Active</label>
                </div>

                {/* Score Penalties select */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Score Penalty:</span>
                  <select
                    value={antiCheatPenalties}
                    onChange={(e) => handleHostSettingChange('antiCheatPenalties', Number(e.target.value))}
                    disabled={!isHost || !antiCheatEnabled}
                    style={{ background: '#0f172a', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', padding: '2px 6px' }}
                  >
                    <option value={10}>-10 Pts</option>
                    <option value={20}>-20 Pts</option>
                    <option value={50}>-50 Pts</option>
                  </select>
                </div>

                {/* Tab Switch Rule */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="ruleTabSwitchToggle"
                    checked={ruleTabSwitch}
                    onChange={(e) => handleHostSettingChange('ruleTabSwitch', e.target.checked)}
                    disabled={!isHost || !antiCheatEnabled}
                  />
                  <label htmlFor="ruleTabSwitchToggle" style={{ color: 'var(--color-text-muted)' }}>Tab-Switch Penalty</label>
                </div>

                {/* Mouse Leave Rule */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="ruleMouseLeaveToggle"
                    checked={ruleMouseLeave}
                    onChange={(e) => handleHostSettingChange('ruleMouseLeave', e.target.checked)}
                    disabled={!isHost || !antiCheatEnabled}
                  />
                  <label htmlFor="ruleMouseLeaveToggle" style={{ color: 'var(--color-text-muted)' }}>Cursor Boundaries</label>
                </div>

                {/* Inspect blocker key rule */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="ruleInspectBlockToggle"
                    checked={ruleInspectBlock}
                    onChange={(e) => handleHostSettingChange('ruleInspectBlock', e.target.checked)}
                    disabled={!isHost || !antiCheatEnabled}
                  />
                  <label htmlFor="ruleInspectBlockToggle" style={{ color: 'var(--color-text-muted)' }}>Block F12 / Right-click</label>
                </div>

                {/* Speed Run 15s timer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="ruleSpeedRunToggle"
                    checked={ruleSpeedRun}
                    onChange={(e) => handleHostSettingChange('ruleSpeedRun', e.target.checked)}
                    disabled={!isHost}
                  />
                  <label htmlFor="ruleSpeedRunToggle" style={{ fontWeight: 600, color: ruleSpeedRun ? 'var(--color-medium)' : 'var(--color-text-muted)' }}>⚡ Speed Run (15s limit)</label>
                </div>

              </div>
            </div>

            {/* COMPETITORS LIST */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '30px'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                Competitors Connected ({roomPlayers.length + 1})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Local Player */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '10px 16px' }}>
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatar}&backgroundColor=0f172a`}
                    alt={username}
                    style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                  />
                  <div style={{ flexGrow: 1, fontWeight: 700 }}>
                    {username} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(You)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-success)', color: 'white', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {isHost ? 'Host / Ready' : 'Ready'}
                  </span>
                </div>

                {/* Other connected Players */}
                {roomPlayers.map((player, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '10px 16px' }}>
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatar}&backgroundColor=0f172a`}
                      alt={player.username}
                      style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                    />
                    <div style={{ flexGrow: 1, fontWeight: 700 }}>
                      {player.username} {player.isAi && <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>AI</span>}
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text-muted)', borderRadius: '6px', fontWeight: 600 }}>
                      Ready
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleLeaveLobby} className="btn-secondary" style={{ flexGrow: 1 }}>
                Leave Lobby
              </button>
              {isHost && (
                <button onClick={handleStartGame} className="btn-primary" style={{ flexGrow: 1.5 }}>
                  Launch Arena Battle
                </button>
              )}
            </div>
          </div>
        )}

        {/* QUIZ ACTIVE STATE */}
        {gameState === 'playing' && currentQuestion && (
          <div style={{ animation: 'slideIn 0.3s' }}>
            {/* Disqualification Banner */}
            {isDisqualified && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--color-error)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '20px',
                color: 'var(--color-error)',
                fontSize: '0.9rem',
                textAlign: 'center',
                fontWeight: 700
              }}>
                🚫 DISQUALIFIED: Code integrity breach. Score finalized to 0. Proceed to finish round.
              </div>
            )}

            {/* Header Stats */}
            <div className="stats-header">
              <span className={`badge badge-${difficulty}`}>
                Difficulty: {difficulty}
              </span>
              
              {/* SPEED RUN TIMER DISPLAY */}
              {ruleSpeedRun && !hasAnswered && !isDisqualified && (
                <span style={{
                  color: timeLeft <= 5 ? 'var(--color-error)' : 'var(--color-medium)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  animation: timeLeft <= 5 ? 'pulse 0.5s infinite alternate' : 'none'
                }}>
                  ⏱️ {timeLeft}s
                </span>
              )}

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="game-stat">Score: <span>{isDisqualified ? 0 : score}</span></div>
                <div className="game-stat">Round: <span>{currentRound}/5</span></div>
                <button
                  onClick={() => setShowQuitConfirm(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--color-hard)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'var(--color-error)'; e.target.style.color = 'black'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.color = 'var(--color-hard)'; }}
                >
                  🚪 Abort
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${(currentRound / 5) * 100}%` }}></div>
            </div>

            {/* Streak notification */}
            {streak > 0 && !isDisqualified && (
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="streak-combo">
                  🔥 STREAK COMBO: {streak}x
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  +{streak * 5} bonus pts active
                </span>
              </div>
            )}

            {/* Question Text */}
            <div className="question-text" style={{ userSelect: 'none' }}>
              Q: {currentQuestion.text}
            </div>

            {/* Options Grid */}
            <div className="options-list">
              {currentQuestion.options.map((option, idx) => {
                const optionNum = idx + 1;
                let btnClass = '';
                
                if (hasAnswered) {
                  if (optionNum === currentQuestion.correctIndex) {
                    btnClass = 'correct';
                  } else if (optionNum === selectedAnswer) {
                    btnClass = 'incorrect';
                  }
                }

                return (
                  <button
                    key={idx}
                    className={`option-button ${btnClass}`}
                    onClick={() => handleAnswerSubmit(optionNum)}
                    disabled={hasAnswered || isDisqualified}
                  >
                    <span className="option-prefix">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback / Explanation box */}
            {hasAnswered && (
              <div>
                {!isDisqualified && (
                  <div className="feedback-box">
                    {selectedAnswer === null ? (
                      <div className="feedback-title error">
                        <span>⏱️ Time Ran Out</span>
                      </div>
                    ) : selectedAnswer === currentQuestion.correctIndex ? (
                      <div className="feedback-title success">
                        <span>✓ Correct!</span>
                        <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 'normal' }}>
                          (+{earnedPoints} points)
                        </span>
                      </div>
                    ) : (
                      <div className="feedback-title error">
                        <span>✗ Incorrect</span>
                      </div>
                    )}
                    <div className="feedback-desc">
                      {currentQuestion.feedback}
                    </div>
                  </div>
                )}

                {/* Action Button to advance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {isDisqualified 
                      ? 'Disqualified (Integrity Check Failed)' 
                      : antiCheatEnabled 
                        ? `Warnings: ${cheatCount}/3` 
                        : 'Anti-cheat disabled by Host'}
                  </div>
                  <button onClick={handleNextRound} className="btn-primary">
                    {currentRound >= 5 ? 'Finish Arena' : 'Continue Round'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUIZ SUMMARY SCREEN */}
        {gameState === 'summary' && (
          <div style={{ animation: 'slideIn 0.4s' }}>
            <div className="results-header">
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
                {isDisqualified ? 'Arena Disqualification!' : 'Quiz Arena Completed!'}
              </h2>
              <p className="subtitle">
                {isDisqualified ? 'Anti-cheat integrity parameters breached' : 'Visual performance diagnostic summary'}
              </p>
            </div>

            {/* Score details */}
            <div className="results-score-circle" style={{ borderColor: isDisqualified ? 'var(--color-error)' : 'rgba(99, 102, 241, 0.3)', boxShadow: isDisqualified ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 30px rgba(99, 102, 241, 0.2)' }}>
              <div className="results-score-number" style={{ color: isDisqualified ? 'var(--color-error)' : 'white' }}>
                {isDisqualified ? 0 : score}
              </div>
              <div className="results-score-label">Final Score</div>
            </div>

            <div className="stats-dashboard-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-dashboard-box">
                <div className="val">
                  {isDisqualified ? '0/5' : `${sessionLogs.filter(log => log.isCorrect).length}/5`}
                </div>
                <div className="lbl">Correct Answers</div>
              </div>
              <div className="stat-dashboard-box">
                <div className="val">
                  {isDisqualified ? '0%' : `${Math.round((sessionLogs.filter(log => log.isCorrect).length / 5) * 100)}%`}
                </div>
                <div className="lbl">Accuracy</div>
              </div>
              <div className="stat-dashboard-box">
                <div className="val">
                  {isDisqualified ? '0x' : `${Math.max(...sessionLogs.map((_, i) => {
                    let run = 0;
                    for (let j = 0; j <= i; j++) {
                      run = sessionLogs[j].isCorrect ? run + 1 : 0;
                    }
                    return run;
                  }), 0)}x`}
                </div>
                <div className="lbl">Max Streak</div>
              </div>
            </div>

            {/* Review Logs List */}
            {!isDisqualified && (
              <>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  Diagnostics &amp; Explanations
                </h3>
                <div className="review-list">
                  {sessionLogs.map((log, index) => (
                    <div key={index} className="review-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Round {index + 1} ({log.difficulty.toUpperCase()})
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: log.isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
                          {log.isCorrect ? `+${log.points} pts` : '0 pts'}
                        </span>
                      </div>
                      <div className="review-question">Q: {log.question}</div>
                      <div className="review-choices">
                        <div className={`choice-tag user ${log.isCorrect ? 'correct' : ''}`}>
                          Your answer: {log.userIndex === -1 ? 'Timed Out' : log.options[log.userIndex - 1]}
                        </div>
                        {!log.isCorrect && (
                          <div className="choice-tag correct-answer">
                            Correct: {log.options[log.correctIndex - 1]}
                          </div>
                        )}
                      </div>
                      <div className="review-explanation">
                        <strong>Explanation:</strong> {log.feedback}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isDisqualified && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '30px',
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                textAlign: 'center',
                lineHeight: 1.6
              }}>
                <p style={{ color: 'var(--color-error)', fontWeight: 700, marginBottom: '8px' }}>Code Integrity Breach Flagged</p>
                This terminal exceeded 3 anti-cheat warning infractions during an active game session. Lobby regulations finalized your score to 0. Practice integrity in the coding arena!
              </div>
            )}

            {/* Return button */}
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setGameState('dashboard')} className="btn-primary" style={{ width: '100%' }}>
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Footer / Branding */}
        <div className="footer">
          C++ Adaptive Quiz System Engine | Integrated Sound Synth &amp; Integrity Controls
        </div>
      </div>

      {/* MULTIPLAYER LEADERBOARD & REAL-TIME DEV CONSOLE PANEL */}
      {gameState === 'playing' && isMultiplayer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '320px', flexShrink: 0 }}>
          
          {/* LEADERBOARD CARD */}
          <div className="glass-card" style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', animation: 'slideIn 0.4s' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '0.05em', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
              Arena Competitors
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto' }}>
              {[
                {
                  username,
                  avatar: selectedAvatar,
                  score,
                  streak,
                  difficulty,
                  round: currentRound,
                  cheatCount,
                  isDisqualified,
                  isLocal: true
                },
                ...roomPlayers
              ]
              .sort((a, b) => {
                if (a.isDisqualified && !b.isDisqualified) return 1;
                if (!a.isDisqualified && b.isDisqualified) return -1;
                return b.score - a.score;
              })
              .map((player, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: player.isLocal ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: player.isLocal ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  opacity: player.isDisqualified ? 0.6 : 1,
                  position: 'relative'
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: index === 0 ? 'var(--color-medium)' : 'var(--color-text-muted)' }}>
                    #{index + 1}
                  </span>

                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatar}&backgroundColor=0f172a`}
                    alt={player.username}
                    style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                  />

                  <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: player.isLocal ? 'white' : 'var(--color-text-main)' }}>
                      {player.username}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      <span>Rd {player.round || 1}/5</span>
                      <span style={{ textTransform: 'capitalize', color: player.difficulty === 'hard' ? 'var(--color-hard)' : player.difficulty === 'medium' ? 'var(--color-medium)' : 'var(--color-easy)' }}>
                        {player.difficulty || 'easy'}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {player.isDisqualified ? 0 : player.score}
                    </div>
                    {player.streak > 0 && !player.isDisqualified && (
                      <div style={{ fontSize: '0.65rem', color: '#ff007f', fontWeight: 700 }}>
                        🔥 {player.streak}x
                      </div>
                    )}
                  </div>

                  {player.cheatCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-4px',
                      background: 'var(--color-error)',
                      color: 'white',
                      fontSize: '0.55rem',
                      fontWeight: 900,
                      borderRadius: '4px',
                      padding: '2px 4px',
                      border: '1px solid #0f172a',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                      {player.isDisqualified ? 'DQ' : `WARN ${player.cheatCount}`}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              marginTop: '15px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '12px',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              Room Code: <strong>{roomCode}</strong> ({connectionMode === 'internet' ? 'Internet' : 'LAN'})
            </div>
          </div>

          {/* REAL-TIME SECURITY LOG CONSOLE CARD */}
          <div className="glass-card" style={{ padding: '20px', height: '180px', display: 'flex', flexDirection: 'column', width: '100%', animation: 'slideIn 0.4s' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-error)', letterSpacing: '0.05em', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
              🛡️ Security Cheat log
            </h3>
            <div style={{
              flexGrow: 1,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {cheatLogs.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.15)', fontStyle: 'italic', textAlign: 'center', marginTop: '30px' }}>
                  No integrity alerts logged.
                </div>
              ) : (
                cheatLogs.map((log, index) => (
                  <div key={index} style={{
                    color: log.includes('DISQUALIFIED') ? 'var(--color-error)' : log.includes('penalized') ? 'var(--color-medium)' : 'var(--color-success)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
}
