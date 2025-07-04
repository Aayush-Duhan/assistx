import { createClient, DeepgramClient } from '@deepgram/sdk';
import { getDeepgramApiKey } from '../utils/env';

/**
 * Gets the Deepgram API key from environment variables.
 * Throws an error if the key is not configured.
 */
function getDeepgramToken(): string {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error('Deepgram API key not found. Please set DEEPGRAM_API_KEY in your environment variables.');
  }
  return apiKey;
}

/**
 * Creates and returns a singleton instance of the Deepgram client.
 * Uses the API key from environment variables.
 * @param signal - An AbortSignal to cancel if needed (for consistency with previous API).
 */
export async function getDeepgramClient(signal?: AbortSignal): Promise<DeepgramClient> {
  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  const token = getDeepgramToken();
  
  const deepgram = createClient(token);

  return deepgram;
}