import { LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { Buffer } from 'buffer';
import { makeObservable, observable } from 'mobx';

// --- Imports ---
import { getDeepgramClient } from './DeepGramClient';
import { AudioCaptureService } from './AudioCaptureService';
import { AudioSource, AudioTranscription, Transcription, ITranscriptionService, BufferState } from '../types';

type ServiceState =
  | { state: 'loading'; abortController: AbortController }
  | { state: 'running'; connection: LiveClient; abortController: AbortController; partialText: string | null }
  | { state: 'error'; error: 'permission' | 'network' | 'unknown' }
  | { state: 'not-running' };

// --- Constants ---
const DEEPGRAM_HEARTBEAT_TIMEOUT = 10000; // 10 seconds

/**
 * Manages a real-time transcription session with Deepgram.
 * It handles WebSocket connection, audio data streaming, and lifecycle events.
 */
export class DeepgramTranscriptionService implements ITranscriptionService {
  public state: ServiceState = { state: 'loading', abortController: new AbortController() };
  private transcriptionListeners = new Set<(transcription: AudioTranscription) => void>();
  private cleanUpOnChunk: () => void;
  private commitPromise: Promise<void> | null = null;
  private commitPromiseResolve: (() => void) | null = null;

  constructor(
    private audioCaptureService: AudioCaptureService,
    public readonly source: AudioSource
  ) {
    makeObservable(this, {
      state: observable,
    });

    // Subscribe to raw audio data from the capture service.
    this.cleanUpOnChunk = this.audioCaptureService.onData((data) => {
      if (this.state.state === 'running' && this.state.connection) {
        // Deepgram SDK expects a Buffer or ArrayBuffer.
        const buffer = Buffer.from(data.pcm16Base64, 'base64');
        this.state.connection.send(buffer);
      }
    });

    this.connect();
  }

  public dispose() {
    this.abortLoadingOrRunning();
    this.cleanUpOnChunk();
    this.commitPromiseResolve?.();
  }

  public get buffer(): BufferState | null {
    if (this.state.state === 'running' && this.state.partialText != null) {
      return { partialText: this.state.partialText };
    }
    return null;
  }

  private setState(newState: ServiceState) {
    this.state = newState;
  }

  private abortLoadingOrRunning() {
    if (this.state.state === 'loading' || this.state.state === 'running') {
      this.state.abortController.abort();
      if (this.state.state === 'running') {
        this.state.connection?.disconnect();
      }
    }
  }

  private async connect() {
    if (this.state.state !== 'loading') return;
    const { abortController } = this.state;

    try {
      console.log(`DeepgramTranscriptionService (${this.source}): Starting connection...`);
      const deepgram = await getDeepgramClient(abortController.signal);
      if (abortController.signal.aborted) return;

      console.log(`DeepgramTranscriptionService (${this.source}): Creating live connection...`);
      const connection = deepgram.listen.live({
        model: 'nova-3-general',
        language: 'multi',
        smart_format: true,
        vad_events: true,
        interim_results: true,
        punctuate: true,
        encoding: 'linear16',
        sample_rate: 16000, // Standard sample rate
        channels: 1,
      });

      const { refreshHeartbeatTimeout } = this.initHeartbeatCheck(abortController.signal);

      connection.on(LiveTranscriptionEvents.Open, () => {
        if (abortController.signal.aborted) return;
        console.log(`DeepgramTranscriptionService (${this.source}): Connection opened, transitioning to running state`);
        this.setState({
          state: 'running',
          connection,
          abortController,
          partialText: null,
        });
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        if (abortController.signal.aborted) return;
        if (this.state.state !== 'running') return;

        refreshHeartbeatTimeout();

        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim() ?? '';
        
        if (data.is_final) {
          console.log(`DeepgramTranscriptionService (${this.source}): Final transcript:`, transcript);
          this.setState({ ...this.state, partialText: null });
          if (transcript.length > 0) {
            const finalTranscription = new Transcription({ source: this.source, text: transcript });
            this.transcriptionListeners.forEach(listener => listener(finalTranscription));
          }
          if (data.from_finalize && this.commitPromiseResolve) {
            this.commitPromiseResolve();
          }
        } else if (transcript.length > 0) {
          console.log(`DeepgramTranscriptionService (${this.source}): Interim transcript:`, transcript);
          this.setState({ ...this.state, partialText: transcript });
        }
      });

      connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
        if (abortController.signal.aborted) return;
        console.log(`DeepgramTranscriptionService (${this.source}): Speech started`);
        if (this.state.state === 'running' && this.state.partialText === null) {
          this.setState({ ...this.state, partialText: '' });
        }
      });

      connection.on(LiveTranscriptionEvents.Error, (error) => {
        if (abortController.signal.aborted) return;
        console.error(`DeepgramTranscriptionService (${this.source}): Deepgram error:`, error);
        this.abortLoadingOrRunning();
        this.setState({ state: 'error', error: 'unknown' });
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        if (abortController.signal.aborted) return;
        console.warn(`DeepgramTranscriptionService (${this.source}): Deepgram connection closed prematurely.`);
        this.abortLoadingOrRunning();
        this.setState({ state: 'error', error: 'unknown' });
      });

    } catch (error) {
      if (abortController.signal.aborted) return;
      this.abortLoadingOrRunning();
      console.error(`DeepgramTranscriptionService (${this.source}): Failed to connect to Deepgram:`, error);
      const isNetworkError = error instanceof Error && error.message.includes('Failed to fetch');
      this.setState({ state: 'error', error: isNetworkError ? 'network' : 'unknown' });
    }
  }

  public onTranscription(callback: (transcription: AudioTranscription) => void): () => void {
    this.transcriptionListeners.add(callback);
    return () => this.transcriptionListeners.delete(callback);
  }

  public async commitTranscription(): Promise<void> {
    if (this.state.state !== 'running') return;
    if (this.commitPromise) return this.commitPromise;

    this.state.connection.send(JSON.stringify({ type: 'Finalize' }));

    const timeout = setTimeout(() => {
      if (this.commitPromiseResolve) {
        console.warn('Timeout finalizing transcription.');
        this.commitPromiseResolve();
      }
    }, 1000);

    this.commitPromise = new Promise<void>((resolve) => {
      this.commitPromiseResolve = () => {
        console.log('Finalizing transcription.');
        clearTimeout(timeout);
        resolve();
        this.commitPromise = null;
        this.commitPromiseResolve = null;
      };
    });

    return this.commitPromise;
  }

  private initHeartbeatCheck(abortSignal: AbortSignal) {
    let heartbeatTimeout: NodeJS.Timeout;

    const refreshHeartbeatTimeout = () => {
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = setTimeout(() => {
        console.error('No heartbeat received from Deepgram within timeout.');
        this.abortLoadingOrRunning();
        this.setState({ state: 'error', error: 'unknown' });
      }, DEEPGRAM_HEARTBEAT_TIMEOUT);
    };

    refreshHeartbeatTimeout(); // Start the first timeout

    abortSignal.addEventListener('abort', () => {
      clearTimeout(heartbeatTimeout);
    });

    return { refreshHeartbeatTimeout };
  }
}