import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrillAssignment, DrillStatus, SoundEffects, SoundEffectName } from '../types';

// A constant to tune motion sensitivity. Higher means less sensitive.
const SENSITIVITY_THRESHOLD = 10;
const VIDEO_WIDTH = 480;
const VIDEO_HEIGHT = 360;

interface FaceOffTrainerProps {
  onReturnToDashboard: () => void;
  activeAssignment: DrillAssignment | null;
  onCompleteAssignment: (assignmentId: string, status: DrillStatus, results: any) => void;
  soundEffects: SoundEffects;
}

const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const FaceOffTrainer: React.FC<FaceOffTrainerProps> = ({ onReturnToDashboard, activeAssignment, onCompleteAssignment, soundEffects }) => {
  type DrillState = 'idle' | 'starting' | 'countdown' | 'set' | 'measuring' | 'result' | 'error';
  type SessionState = 'setup' | 'running' | 'finished';

  const [sessionState, setSessionState] = useState<SessionState>(activeAssignment ? 'running' : 'setup');
  const [sessionConfig, setSessionConfig] = useState<{ type: 'count' | 'timed'; value: number } | null>(null);
  const [timedDuration, setTimedDuration] = useState(5); // Default 5 minutes
  
  const [drillState, setDrillState] = useState<DrillState>('idle');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [completedDrills, setCompletedDrills] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timeRemainingRef = useRef(timeRemaining);
  timeRemainingRef.current = timeRemaining;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const sequenceTimeoutRef = useRef<number[]>([]);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearTimeouts = () => {
    sequenceTimeoutRef.current.forEach(clearTimeout);
    sequenceTimeoutRef.current = [];
  };

  useEffect(() => {
    return () => {
      stopCamera();
      clearTimeouts();
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [stopCamera]);
  
  const handleFinishSession = useCallback(() => {
    stopCamera();
    clearTimeouts();
    if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
    }

    if (activeAssignment) {
        // This is an assigned drill. We're done here. Let App.tsx handle the rest.
        onCompleteAssignment(activeAssignment.id, DrillStatus.COMPLETED, { reactionTimes });
    } else {
        // This is a self-started session. Show the summary screen.
        setDrillState('idle');
        setSessionState('finished');
    }
  }, [stopCamera, activeAssignment, onCompleteAssignment, reactionTimes]);

  useEffect(() => {
    if (sessionState === 'running' && sessionConfig?.type === 'timed') {
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleFinishSession();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }
  }, [sessionState, sessionConfig, handleFinishSession]);

  const setupCamera = async () => {
    try {
      if (mediaStreamRef.current) {
        stopCamera();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions and try again.");
      setDrillState('error');
    }
  };

  const playSound = useCallback((type: 'countdown' | 'down' | 'set' | 'whistle') => {
    if (!audioCtxRef.current) return;
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Check for custom sound, but not for 'countdown'
    const customSoundData = type !== 'countdown' ? soundEffects?.[type as SoundEffectName] : undefined;

    if (customSoundData) {
        try {
            const base64Data = customSoundData.split(',')[1];
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            audioCtx.decodeAudioData(bytes.buffer, (buffer) => {
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.start(0);
            }, (e) => {
                console.error("Error decoding custom sound data, falling back to tone.", e);
            });
        } catch (e) {
            console.error("Error processing custom sound, falling back to tone.", e);
        }
    } else {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

        if (type === 'countdown') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'down') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'set') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(550, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'whistle') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(3000, audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(1500, audioCtx.currentTime + 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        }
    }
  }, [soundEffects]);
  
  const handleDrillComplete = useCallback((time: number) => {
    setReactionTimes(prevTimes => [...prevTimes, time]);
    setCompletedDrills(prevCount => {
        const newCount = prevCount + 1;
        if ((sessionConfig?.type === 'count' || activeAssignment) && newCount >= (sessionConfig?.value ?? 1)) {
            handleFinishSession();
        }
        return newCount;
    });
  }, [sessionConfig, handleFinishSession, activeAssignment]);

  const startMotionDetection = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_METADATA) {
      setError("Video feed not ready.");
      setDrillState('error');
      return;
    }
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const referenceFrameData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const startTime = performance.now();

    const toGrayscale = (data: Uint8ClampedArray) => {
      const gray = new Uint8Array(data.length / 4);
      for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return gray;
    };
    const referenceGrayscale = toGrayscale(referenceFrameData);

    const detect = () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrameData = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const currentGrayscale = toGrayscale(currentFrameData);
      let diff = 0;
      for (let i = 0; i < referenceGrayscale.length; i++) {
        diff += Math.abs(referenceGrayscale[i] - currentGrayscale[i]);
      }
      const averageDiff = diff / referenceGrayscale.length;
      if (averageDiff > SENSITIVITY_THRESHOLD) {
        const endTime = performance.now();
        const finalTime = Math.round(endTime - startTime);
        setReactionTime(finalTime);
        setDrillState('result');
        stopCamera();
        handleDrillComplete(finalTime);
      } else {
        animationFrameIdRef.current = requestAnimationFrame(detect);
      }
    };
    animationFrameIdRef.current = requestAnimationFrame(detect);
  }, [stopCamera, handleDrillComplete]);

  const runDrillSequence = useCallback(() => {
    clearTimeouts();
    setDrillState('countdown');
    let delay = 0;
    const timeouts: number[] = [];

    for (let i = 5; i > 0; i--) {
      const count = i;
      timeouts.push(window.setTimeout(() => { setCountdown(count); playSound('countdown'); }, delay));
      delay += 1000;
    }
    timeouts.push(window.setTimeout(() => { setCountdown(0); setDrillState('set'); playSound('down'); }, delay));
    delay += 750;
    timeouts.push(window.setTimeout(() => { playSound('set'); }, delay));
    const randomDelay = Math.random() * 1000 + 500;
    delay += randomDelay;
    timeouts.push(window.setTimeout(() => { setDrillState('measuring'); playSound('whistle'); startMotionDetection(); }, delay));
    sequenceTimeoutRef.current = timeouts;
  }, [playSound, startMotionDetection]);

  const handleStartDrill = useCallback(async () => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        setError("Your browser does not support required audio features.");
        setDrillState('error');
        return;
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setDrillState('starting');
    setReactionTime(null);
    setError(null);
    await setupCamera();
    runDrillSequence();
  }, [runDrillSequence]);

  useEffect(() => {
    // This effect handles automatically starting the next drill for BOTH session types.
    if (sessionState !== 'running' || drillState !== 'result') {
        return;
    }

    const isLastDrillInCountSession = sessionConfig?.type === 'count' && completedDrills >= sessionConfig.value;
    if (isLastDrillInCountSession) {
        // The session is over. handleFinishSession was already called in handleDrillComplete.
        return;
    }

    const isTimeUpInTimedSession = sessionConfig?.type === 'timed' && timeRemainingRef.current <= 5;
    if (isTimeUpInTimedSession) {
        // Not enough time for another full drill cycle. End the session.
        handleFinishSession();
        return;
    }

    // If we've reached here, the session is active and we should start the next drill.
    const timeoutId = setTimeout(() => {
        handleStartDrill();
    }, 5000); // 5-second pause between drills

    return () => clearTimeout(timeoutId);
    
  }, [drillState, sessionState, sessionConfig, completedDrills, handleStartDrill, handleFinishSession]);


  const handleSelectSession = (type: 'count' | 'timed', value: number) => {
    setSessionConfig({ type, value });
    setSessionState('running');
    setReactionTimes([]);
    setCompletedDrills(0);
    if (type === 'timed') {
        setTimeRemaining(value * 60);
    }
    handleStartDrill();
  };

  // If this is an assigned drill, start it immediately.
  useEffect(() => {
    if (activeAssignment) {
        handleStartDrill();
    }
  }, [activeAssignment, handleStartDrill]);
  
  const handleStartNewSession = () => {
    setSessionState('setup');
    setSessionConfig(null);
    setReactionTimes([]);
    setCompletedDrills(0);
  };
  
  const getSessionStats = () => {
    if (reactionTimes.length === 0) return { average: 0, best: 0, worst: 0 };
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / reactionTimes.length);
    const best = Math.min(...reactionTimes);
    const worst = Math.max(...reactionTimes);
    return { average, best, worst };
  };

  const getStatusMessage = () => {
    switch(drillState) {
        case 'idle':
            return 'Session ended.'; // This state is hit right before the results screen.
        case 'starting': return 'Starting camera...';
        case 'countdown': return `Get Ready... ${countdown}`;
        case 'set': return 'Listen for the tones and whistle...';
        case 'measuring': return 'GO!';
        case 'result': {
            const baseMessage = `Time: ${reactionTime}ms`;
            if (activeAssignment) return baseMessage; // Simpler message for assignments

            const isCountSessionOver = sessionConfig?.type === 'count' && completedDrills >= sessionConfig.value;
            const isTimedSessionOver = sessionConfig?.type === 'timed' && timeRemainingRef.current <= 5;

            if (!isCountSessionOver && !isTimedSessionOver) {
                return `${baseMessage} | Next drill starts soon...`;
            }
            return baseMessage;
        }
        case 'error': return error;
        default: return '';
    }
  };

  if (sessionState === 'setup') {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-cyan-400">AI Face-Off Trainer</h1>
                 <button onClick={onReturnToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Return to Training Menu</button>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-semibold mb-4">Choose Your Session</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">By Drill Count</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 3, 5, 20].map(count => (
                                <button key={count} onClick={() => handleSelectSession('count', count)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition-colors">{count} Drill{count > 1 ? 's' : ''}</button>
                            ))}
                        </div>
                    </div>
                     <div className="border-t border-gray-700 my-4"></div>
                    <div>
                         <h3 className="text-lg font-semibold text-gray-300 mb-2">By Time</h3>
                         <div className="flex items-center justify-center gap-4">
                            <input
                                type="number"
                                min="1"
                                max="30"
                                value={timedDuration}
                                onChange={(e) => setTimedDuration(parseInt(e.target.value, 10))}
                                className="bg-gray-700 text-white rounded-md px-3 py-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button onClick={() => handleSelectSession('timed', timedDuration)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-colors">{timedDuration} Minute Session</button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  if (sessionState === 'finished') {
    const stats = getSessionStats();
    return (
      <div className="space-y-6 text-center">
          <h1 className="text-3xl font-bold text-cyan-400">Session Complete!</h1>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
             <h2 className="text-2xl font-semibold mb-4">Your Results ({reactionTimes.length} drills)</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                <div>
                    <p className="text-lg text-gray-400">Best Time</p>
                    <p className="text-4xl font-bold text-green-400">{stats.best}ms</p>
                </div>
                <div>
                    <p className="text-lg text-gray-400">Average Time</p>
                    <p className="text-4xl font-bold text-cyan-400">{stats.average}ms</p>
                </div>
                <div>
                    <p className="text-lg text-gray-400">Worst Time</p>
                    <p className="text-4xl font-bold text-red-400">{stats.worst}ms</p>
                </div>
             </div>
             <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold mb-2">All Reaction Times (ms)</h3>
                <div className="bg-gray-900 p-2 rounded-md max-h-40 overflow-y-auto">
                    <p className="text-gray-300 break-words">{reactionTimes.join(', ')}</p>
                </div>
             </div>
             <div className="mt-6 flex gap-4 justify-center">
                <button onClick={handleStartNewSession} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-md text-lg transition-colors">Start New Session</button>
                <button onClick={onReturnToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Return to Menu</button>
             </div>
          </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {activeAssignment && (
            <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-cyan-400 mb-4">
                <h2 className="text-lg font-bold text-cyan-400">Assigned Drill Goal:</h2>
                <p className="text-gray-300 italic">"{activeAssignment.notes}"</p>
            </div>
        )}
        <div className="flex justify-between items-center flex-wrap gap-2">
            <h1 className="text-3xl font-bold text-cyan-400">AI Face-Off Trainer</h1>
            {sessionConfig?.type === 'count' && <p className="text-xl font-semibold">Drill {Math.min(completedDrills + 1, sessionConfig.value)} of {sessionConfig.value}</p>}
            {sessionConfig?.type === 'timed' && <p className="text-xl font-semibold font-mono">Time Remaining: {formatTime(timeRemaining)}</p>}
            <button onClick={onReturnToDashboard} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">End Session</button>
        </div>
        
        <div className="w-full max-w-lg bg-gray-800 p-4 rounded-lg shadow-lg text-center mx-auto">
            <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-md overflow-hidden mb-4">
                 <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scaleX(-1)"></video>
                 <canvas ref={canvasRef} className="hidden"></canvas>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-3xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-md">{getStatusMessage()}</p>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default FaceOffTrainer;