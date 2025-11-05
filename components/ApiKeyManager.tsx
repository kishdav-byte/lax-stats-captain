import React, { useState } from 'react';
import { setApiKey } from '../services/apiKeyService';

interface ApiKeyManagerProps {
  onApiKeySet: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setError('API Key cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await setApiKey(apiKey);
      onApiKeySet();
    } catch (e: any) {
      console.error("Failed to save API key:", e);
      setError(e.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-xl w-full bg-gray-800 p-8 rounded-lg shadow-2xl border border-cyan-500/30">
        <h1 className="text-4xl font-bold text-center text-cyan-400 mb-2">LAX Keeper AI Setup</h1>
        <p className="text-center text-gray-400 mb-6">Welcome! To enable all AI-powered features, please provide your Gemini API key.</p>
        
        <div className="bg-gray-900 p-4 rounded-md mb-6">
            <h2 className="text-lg font-semibold mb-2">How to get your API Key:</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-1 text-sm">
                <li>Visit the Google AI Studio website.</li>
                <li>Click on <span className="font-bold text-cyan-400">"Get API key"</span>.</li>
                <li>Click <span className="font-bold text-cyan-400">"Create API key in new project"</span>.</li>
                <li>Copy the generated API key and paste it below.</li>
            </ol>
             <a 
                href="https://aistudio.google.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-3 inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors"
            >
                Go to Google AI Studio
            </a>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-1">
              Your Gemini API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your API key here"
              className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleSaveKey}
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500"
          >
            {isLoading ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
         <p className="text-xs text-gray-500 mt-4 text-center">
            Your API key is stored securely in your environment or browser session and is not exposed in the client-side code.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyManager;