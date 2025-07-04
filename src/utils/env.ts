/**
 * Environment variable utilities for the renderer process
 */

/**
 * Get environment variable value, checking multiple sources
 */
export function getEnvVar(key: string): string | undefined {
  // Check process.env (available through Vite define)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  // Check if running in Electron renderer (legacy)
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    return (window as any).process.env[key];
  }
  
  // Check global window object (if exposed via preload)
  if (typeof window !== 'undefined' && (window as any).env) {
    return (window as any).env[key];
  }
  
  return undefined;
}

/**
 * Get Google AI API key from environment
 */
export function getGoogleAIApiKey(): string | undefined {
    return getEnvVar('GOOGLE_GENERATIVE_AI_API_KEY');
}

/**
 * Get Deepgram API key from environment
 */
export function getDeepgramApiKey(): string | undefined {
    return getEnvVar('DEEPGRAM_API_KEY');
} 