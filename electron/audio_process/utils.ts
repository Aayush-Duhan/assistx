import { Buffer } from "node:buffer";

const reusableBuffer = new Int16Array(480);

export function bufferToInt16(buffer: Buffer): Int16Array {
  for (let i = 0; i < buffer.length; i += 2) {
    reusableBuffer[i / 2] = (buffer[i + 1] << 8) | buffer[i];
  }
  return reusableBuffer;
}

export function calculateAverageVolume(data: Int16Array): number {
  return data.reduce((acc, val) => acc + Math.abs(val), 0) / data.length;
}

export function calculateVolume(buffer: Buffer): number {
  return calculateAverageVolume(bufferToInt16(buffer));
}
