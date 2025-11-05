
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrillAssignment, DrillStatus, SoundEffects, SoundEffectName } from '../types';

// --- Constants ---
const SENSITIVITY_THRESHOLD = 10;
const VIDEO_WIDTH = 480;
const VIDEO_HEIGHT = 360;

// --- Helper Components ---

const DraggableResizableOverlay: React.FC<{
  overlay: { x: number, y: number, width: number, height: number };
  setOverlay: React.Dispatch<React.SetStateAction<{ x: number, y: number, width: number, height: number }>>;
}> = ({ overlay, setOverlay }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, action: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'drag') setIsDragging(true);
    if (action === 'resize') setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOverlay(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    if (isResizing) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOverlay(prev => ({ ...prev, width: Math.max(50, prev.width + dx), height: Math.max(50, prev.height + dy) }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, dragStart, setOverlay]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={overlayRef}
      className="absolute border-4 border-cyan-400 border-dashed cursor-move grid grid-cols-3 grid-rows-3"
      style={{ left: overlay.x, top: overlay.y, width: overlay.width, height: overlay.height }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
    >
      {[...Array(9)].map((_, i) => (
        <div key={i} className="w-full h-full border border-cyan-400 border-opacity-50"></div>
      ))}
      <div
        className="absolute -bottom-2 -right-2 w-4 h-4 bg-cyan-400 cursor-se-resize rounded-full"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
      ></div>
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded">
        Drag or Resize
      </div>
    </div>
  );
};

const ShotChart: React.FC<{ history: number[] }> = ({ history }) => {
    const counts = history.reduce((acc, zone) => {
        acc[zone] = (acc[zone] || 0) + 1;
        return acc;
    }, {} as {[key: number]: number});

    const maxCount = Math.max(0, ...Object.values(counts));

    const getColor = (count: number) => {
        if (count === 0 || maxCount === 0) return 'bg-gray-700 bg-opacity-50';
        return `bg-cyan-400`
    };

    return (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-64 h-64 mx-auto bg-gray-900 p-1 rounded-md">
            {[...Array(9)].map((_, i) => {
                 const count = counts[i] || 0;
                 const opacity = count > 0 ? 0.2 + (count / maxCount) * 0.8 : 0.1;
                 return (
                    <div key={i} className={`flex items-center justify-center rounded-sm ${getColor(count)}`} style={{opacity}}>
                        <span className="text-4xl font-bold text-white">{count > 0 ? count : ''}</span>
                    </div>
                 )
            })}
        </div>
    );
};


interface ShootingDrillProps {
    onReturnToDashboard: () => void;
    activeAssignment: DrillAssignment | null;
    onCompleteAssignment: (assignmentId: string, status: DrillStatus, results: any) => void;
    soundEffects: SoundEffects;
}

const ShootingDrill: React.FC<ShootingDrillProps> = ({ onReturnToDashboard, activeAssignment, onCompleteAssignment, soundEffects }) => {
    type DrillMode = 'release' | 'placement';
    type SessionState = 'setup' | 'calibration' | 'running' | 'finished';
    type DrillState = 'idle' | 'starting' | 'countdown' | 'set' | 'measuring' | 'result' | 'error' | 'log_shot';

    // Session State
    const [sessionState, setSessionState] = useState<SessionState>('setup');
    const [drillMode, setDrillMode] = useState<DrillMode>('release');
    const [totalShots, setTotalShots] = useState(10);

    // Drill State
    const [drillState, setDrillState] = useState<DrillState>('idle');
    const [shotTime, setShotTime] = useState<number | null>(null);
    const [shotHistory, setShotHistory] = useState<number[]>([]); // For placement zones or release times
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    // UI/Hardware State
    const [overlay, setOverlay] = useState({ x: 50, y: 50, width: 200, height: 150 });
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

    const handleSessionEnd = useCallback(() => {
        stopCamera();
        clearTimeouts();
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (activeAssignment) {
            onCompleteAssignment(activeAssignment.id, DrillStatus.COMPLETED, { shotHistory });
        } else {
            setSessionState('finished');
        }
    }, [stopCamera, activeAssignment, onCompleteAssignment, shotHistory]);

    // Functions involved in a dependency cycle are declared as regular hoisted functions
    // to prevent initialization errors that occur with `useCallback`.
    
    function handleMotionDetected(time: number) {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        setShotTime(time);
        if (drillMode === 'release') {
            const newHistory = [...shotHistory, time];
            setShotHistory(newHistory);
            setDrillState('result');

            if (newHistory.length >= totalShots) {
                handleSessionEnd();
            } else {
                sequenceTimeoutRef.current.push(window.setTimeout(startDrill, 3000));
            }
        } else { // placement mode
            setDrillState('log_shot');
        }
    }

    function startMotionDetection() {
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
            if (!videoRef.current || !context) return;
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const currentFrameData = context.getImageData(0, 0, canvas.width, canvas.height).data;
            const currentGrayscale = toGrayscale(currentFrameData);
            let diff = 0;
            for (let i = 0; i < referenceGrayscale.length; i++) {
                diff += Math.abs(referenceGrayscale[i] - currentGrayscale[i]);
            }
            const averageDiff = diff / referenceGrayscale.length;

            if (averageDiff > SENSITIVITY_THRESHOLD) {
                const endTime = performance.now();
                handleMotionDetected(Math.round(endTime - startTime));
            } else {
                animationFrameIdRef.current = requestAnimationFrame(detect);
            }
        };
        animationFrameIdRef.current = requestAnimationFrame(detect);
    }

    function runDrillSequence() {
        clearTimeouts();
        setDrillState('countdown');
        let delay = 0;
        const timeouts: number[] = [];

        for (let i = 3; i > 0; i--) {
            const count = i;
            timeouts.push(window.setTimeout(() => { 
                setCountdown(count); 
                playSound('countdown');
            }, delay));
            delay += 1000;
        }

        timeouts.push(window.setTimeout(() => {
            setCountdown(0);
            setDrillState('set');
            playSound('set');
        }, delay));
        
        const randomDelay = Math.random() * 1500 + 500; // Wait 0.5-2 seconds after "set"
        delay += randomDelay;
        
        timeouts.push(window.setTimeout(() => {
            setDrillState('measuring');
            playSound('whistle');
            startMotionDetection();
        }, delay));
        
        sequenceTimeoutRef.current = timeouts;
    }
    
    async function startDrill() {
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
        setShotTime(null);
        setError(null);
        if (!mediaStreamRef.current) {
            await setupCamera();
        }
        runDrillSequence();
    }
    
    function handleLogShotPlacement(zone: number) {
        const newHistory = [...shotHistory, zone];
        setShotHistory(newHistory);
        setDrillState('result');
        if (newHistory.length >= totalShots) {
            handleSessionEnd();
        } else {
            sequenceTimeoutRef.current.push(window.setTimeout(startDrill, 3000));
        }
    }
    
    // Non-cyclic functions can remain as `useCallback` for optimization
    const setupCamera = useCallback(async () => {
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
    }, [stopCamera]);

    const playSound = useCallback((type: SoundEffectName | 'countdown') => {
        if (!audioCtxRef.current) return;
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') audioCtx.resume();
    
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
                });
            } catch (e) {
                 console.error("Error playing custom sound", e);
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
    
    useEffect(() => {
        if (activeAssignment) {
            setDrillMode('placement'); // Assuming assignments are for placement
            const match = activeAssignment.notes.match(/(\\d+)\\s*(shots|reps)/i);
            if (match && match[1]) {
                setTotalShots(parseInt(match[1], 10));
            }
            setSessionState('calibration');
        }
    }, [activeAssignment]);
    
    useEffect(() => {
        return () => { // Cleanup on unmount
            stopCamera();
            clearTimeouts();
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [stopCamera]);
    
    useEffect(() => {
        if (sessionState === 'calibration') {
            setupCamera();
        }
    }, [sessionState, setupCamera]);
    
    const getStatusMessage = () => {
        switch (drillState) {
            case 'idle': return 'Session ended.';
            case 'starting': return 'Starting camera...';
            case 'countdown': return `Get Ready... ${countdown}`;
            case 'set': return 'Listen for the whistle...';
            case 'measuring': return 'GO!';
            case 'log_shot': return 'Tap where your shot went.';
            case 'result': {
                if (drillMode === 'release') {
                    return `Release Time: ${shotTime}ms | Next shot soon...`;
                }
                return `Shot logged! | Next shot soon...`;
            }
            case 'error': return error;
            default: return '';
        }
    };

    if (sessionState === 'setup') {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-cyan-400">AI Shooting Drills</h1>
                    <button onClick={onReturnToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Return to Training Menu</button>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-semibold mb-4">Choose Your Drill</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div onClick={() => setDrillMode('release')} className={`p-4 rounded-lg border-2 cursor-pointer ${drillMode === 'release' ? 'border-cyan-400 bg-gray-700' : 'border-gray-600'}`}>
                            <h3 className="text-xl font-bold">Quick Release</h3>
                            <p className="text-sm text-gray-400">Measure how fast you can get your shot off after the whistle.</p>
                        </div>
                        <div onClick={() => setDrillMode('placement')} className={`p-4 rounded-lg border-2 cursor-pointer ${drillMode === 'placement' ? 'border-cyan-400 bg-gray-700' : 'border-gray-600'}`}>
                            <h3 className="text-xl font-bold">Shot Placement</h3>
                            <p className="text-sm text-gray-400">Track where your shots land on the goal to build a heatmap of your accuracy.</p>
                        </div>
                    </div>
                    <div className="mt-6">
                        <label htmlFor="total-shots" className="block text-lg font-semibold text-gray-300 mb-2">Number of Shots</label>
                        <input
                            id="total-shots"
                            type="number"
                            min="1"
                            max="50"
                            value={totalShots}
                            onChange={(e) => setTotalShots(parseInt(e.target.value, 10))}
                            className="bg-gray-700 text-white rounded-md px-3 py-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <button onClick={() => setSessionState('calibration')} className="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-md text-lg transition-colors">
                        Start Calibration
                    </button>
                </div>
            </div>
        );
    }

    if (sessionState === 'calibration') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-cyan-400">Calibrate Your Goal</h1>
                    <button onClick={onReturnToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                </div>
                <div className="w-full max-w-lg bg-gray-800 p-4 rounded-lg shadow-lg text-center mx-auto">
                    <p className="mb-4 text-gray-300">Position your device so the goal is visible. Drag and resize the box to cover the entire goal frame.</p>
                    <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-md overflow-hidden mb-4">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                        <DraggableResizableOverlay overlay={overlay} setOverlay={setOverlay} />
                    </div>
                    <button onClick={() => { setSessionState('running'); startDrill(); }} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-md text-lg transition-colors">
                        Start Drill
                    </button>
                </div>
            </div>
        );
    }

    if (sessionState === 'finished') {
        const avgReleaseTime = drillMode === 'release' && shotHistory.length > 0
            ? Math.round(shotHistory.reduce((a, b) => a + b, 0) / shotHistory.length)
            : 0;

        return (
            <div className="space-y-6 text-center">
                <h1 className="text-3xl font-bold text-cyan-400">Session Complete!</h1>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
                    <h2 className="text-2xl font-semibold mb-4">Your Results ({shotHistory.length} shots)</h2>
                    {drillMode === 'placement' ? (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Shot Placement Chart</h3>
                            <ShotChart history={shotHistory} />
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Average Release Time</h3>
                            <p className="text-5xl font-bold text-cyan-400">{avgReleaseTime}ms</p>
                        </div>
                    )}
                    <div className="mt-8 flex gap-4 justify-center">
                        <button onClick={() => setSessionState('setup')} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-md text-lg transition-colors">Start New Session</button>
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
                <h1 className="text-3xl font-bold text-cyan-400">AI Shooting Drill</h1>
                <p className="text-xl font-semibold">Shot {shotHistory.length + 1} of {totalShots}</p>
                <button onClick={handleSessionEnd} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">End Session</button>
            </div>
            
            <div className="w-full max-w-lg bg-gray-800 p-4 rounded-lg shadow-lg text-center mx-auto">
                <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-md overflow-hidden mb-4">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-3xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-md">{getStatusMessage()}</p>
                    </div>
                    {drillState === 'log_shot' && (
                        <div 
                            className="absolute grid grid-cols-3 grid-rows-3 cursor-pointer"
                            style={{ left: overlay.x, top: overlay.y, width: overlay.width, height: overlay.height }}
                        >
                            {[...Array(9)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="w-full h-full border border-cyan-400 border-opacity-50 hover:bg-cyan-400 hover:bg-opacity-50 transition-colors"
                                    onClick={() => handleLogShotPlacement(i)}
                                ></div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShootingDrill;
