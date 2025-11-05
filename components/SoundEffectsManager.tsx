
import React, { useRef } from 'react';
import { SoundEffects, SoundEffectName } from '../types';
import { View } from '../services/storageService';

interface SoundEffectsManagerProps {
    soundEffects: SoundEffects;
    onUpdateSoundEffect: (name: SoundEffectName, data: string | undefined) => void;
    onReturnToDashboard: (view: View) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const playBase64Audio = (base64Audio: string) => {
    if (!base64Audio) return;
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const base64Data = base64Audio.split(',')[1];
        if (!base64Data) {
            throw new Error("Invalid Base64 audio format.");
        }
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        audioContext.decodeAudioData(bytes.buffer)
            .then(buffer => {
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(0);
            })
            .catch(e => {
                console.error("Error with decoding audio data", e)
                alert("Could not decode audio. The file might be corrupted or in an unsupported format.");
            });
    } catch (e) {
        console.error("Error playing audio", e);
        alert("Could not play audio. The file might be corrupted or in an unsupported format.");
    }
};


const SoundEffectRow: React.FC<{
  name: SoundEffectName;
  label: string;
  soundData: string | undefined;
  onUpdate: (name: SoundEffectName, data: string | undefined) => void;
}> = ({ name, label, soundData, onUpdate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                onUpdate(name, base64);
            } catch (error) {
                console.error("Error converting file to Base64:", error);
                alert("Could not load the selected file.");
            }
        }
    };

    return (
        <div className="bg-gray-700 p-4 rounded-md flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-semibold w-24">{label}</h3>
            <div className="flex-grow text-center sm:text-left">
                {soundData ? (
                     <p className="text-green-400 font-mono text-sm">Custom sound loaded</p>
                ) : (
                    <p className="text-gray-400 text-sm">Using default tone</p>
                )}
            </div>
            <div className="flex space-x-2">
                <input
                    type="file"
                    accept="audio/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Upload
                </button>
                <button
                    onClick={() => playBase64Audio(soundData!)}
                    disabled={!soundData}
                    className="bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    Play
                </button>
                <button
                    onClick={() => onUpdate(name, undefined)}
                    disabled={!soundData}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};


const SoundEffectsManager: React.FC<SoundEffectsManagerProps> = ({ soundEffects, onUpdateSoundEffect, onReturnToDashboard }) => {
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-cyan-400">Sound Effects Manager</h1>
            <button onClick={() => onReturnToDashboard('dashboard')} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                Return to Main Menu
            </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <p className="text-gray-400 mb-6">
                Upload custom audio files for the training drills. Supported formats include MP3, WAV, and OGG.
                If no custom sound is uploaded, the system will use the default synthesized tones.
            </p>

            <div className="space-y-4">
                <SoundEffectRow
                    name="down"
                    label="Down"
                    soundData={soundEffects.down}
                    onUpdate={onUpdateSoundEffect}
                />
                <SoundEffectRow
                    name="set"
                    label="Set"
                    soundData={soundEffects.set}
                    onUpdate={onUpdateSoundEffect}
                />
                <SoundEffectRow
                    name="whistle"
                    label="Whistle"
                    soundData={soundEffects.whistle}
                    onUpdate={onUpdateSoundEffect}
                />
            </div>
        </div>
    </div>
  );
};

export default SoundEffectsManager;
