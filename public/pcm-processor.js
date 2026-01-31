/**
 * AudioWorklet processor for converting audio samples to PCM format.
 * This runs in a separate thread to process audio without blocking the main UI thread.
 */
class PCMProcessor extends AudioWorkletProcessor {
    process(inputs, _outputs, _parameters) {
      // inputs[0][0] is the Float32Array of audio samples (mono).
      const input = inputs[0];
      if (!input || !input[0]) {
        return true; // No input yet, keep processor alive.
      }

      const floatSamples = input[0];

      // Convert Float32 samples (from -1.0 to 1.0) to 16-bit PCM format.
      const pcm16 = new Int16Array(floatSamples.length);
      for (let i = 0; i < floatSamples.length; i++) {
        const s = Math.max(-1, Math.min(1, floatSamples[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Send the 16-bit PCM buffer back to the main thread.
      this.port.postMessage(pcm16);
      return true; // Return true to keep the processor running.
    }
  }

  registerProcessor("pcmProcessor", PCMProcessor);
