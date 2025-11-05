// This service is the single source of truth for the Gemini API key.
// It abstracts away the storage mechanism, trying the aistudio environment
// first and falling back to sessionStorage if it's not available.

let apiKey: string | null = null;

/**
 * Initializes the API key from storage.
 * @returns {Promise<boolean>} True if a key was successfully loaded, false otherwise.
 */
export async function initializeApiKey(): Promise<boolean> {
  // 1. Try to get key from aistudio environment
  if ((window as any).aistudio && typeof (window as any).aistudio.getApiKey === 'function') {
    try {
      const key = await (window as any).aistudio.getApiKey();
      if (key && key.trim() !== '') {
        apiKey = key;
        return true;
      }
    } catch (e) {
      console.warn("Could not get API key from aistudio, trying session storage.", e);
    }
  }

  // 2. If aistudio fails, try session storage
  try {
    const key = sessionStorage.getItem('gemini_api_key');
    if (key && key.trim() !== '') {
      apiKey = key;
      return true;
    }
  } catch (e) {
      console.error("Could not read from session storage.", e);
  }

  // 3. No key found
  apiKey = null;
  return false;
}

/**
 * Gets the loaded API key.
 * @throws {Error} If the API key has not been initialized.
 * @returns {string} The API key.
 */
export function getApiKey(): string {
  if (!apiKey) {
    throw new Error("API Key has not been set. Please configure it in the app setup.");
  }
  return apiKey;
}

/**
 * Sets the API key, trying aistudio first then falling back to sessionStorage.
 * @param {string} key The API key to set.
 */
export async function setApiKey(key: string): Promise<void> {
  if (!key || !key.trim()) {
    throw new Error("API Key cannot be empty.");
  }

  apiKey = key;

  // 1. Try to set in aistudio environment
  try {
    if ((window as any).aistudio && typeof (window as any).aistudio.setApiKey === 'function') {
        await (window as any).aistudio.setApiKey(key);
        // Also clear session storage if we successfully use aistudio
        sessionStorage.removeItem('gemini_api_key');
        return;
    }
  } catch (e) {
     console.warn("Could not set API key in aistudio, falling back to session storage.", e);
  }

  // 2. Fallback to session storage
  try {
    sessionStorage.setItem('gemini_api_key', key);
  } catch(e) {
    console.error("Failed to save API key to session storage.", e);
    apiKey = null; // Invalidate cache if save fails
    throw new Error("Could not save API key. Your browser might have storage disabled.");
  }
}

/**
 * Clears the API key from all possible storage locations.
 */
export async function clearApiKey(): Promise<void> {
  apiKey = null;
  
  // 1. Clear from aistudio
  try {
     if ((window as any).aistudio && typeof (window as any).aistudio.setApiKey === 'function') {
        await (window as any).aistudio.setApiKey(null);
     }
  } catch (e) {
    console.warn("Could not clear API key from aistudio.", e);
  }

  // 2. Clear from session storage
  try {
    sessionStorage.removeItem('gemini_api_key');
  } catch(e) {
      console.error("Could not clear API key from session storage.", e);
  }
}
