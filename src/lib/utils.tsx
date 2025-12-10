import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { IS_MAC } from './constants';
import { ReactNode } from 'react';
import { IconCmd, IconArrowCornerDownLeft, IconArrowLeft, IconArrowRight, IconArrowDown, IconArrowUp } from "@central-icons-react/round-filled-radius-2-stroke-1.5";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a unique key by appending a counter if the key already exists in the provided array.
 * 
 * @param key - The original key
 * @param existingKeys - Array of existing keys to check against
 * @returns A unique key
 * 
 * @example
 * ```typescript
 * generateUniqueKey("item", ["item", "item1"]); // "item2"
 * ```
 */
export function generateUniqueKey(key: string, existingKeys: string[]): string {
  let newKey = key;
  let counter = 1;

  while (existingKeys.includes(newKey)) {
    const baseKey = key.replace(/\d+$/, "");
    const hasOriginalNumber = key !== baseKey;
    if (hasOriginalNumber) {
      const originalNumber = parseInt(key.match(/\d+$/)?.[0] || "0");
      newKey = baseKey + (originalNumber + counter);
    } else {
      newKey = baseKey + counter;
    }
    counter++;
  }
  return newKey;
}

/**
 * Type guard to check if a value is a string.
 * 
 * @param value - The value to check
 * @returns True if the value is a string, false otherwise
 */
export const isString = (value: any): value is string =>
  typeof value === "string";


export function electronAcceleratorToLabels(accelerator: string) {
  const parts = accelerator.split("+");
  return parts.map((part) => ELECTRON_ACCELERATOR_PART_TO_LABEL[part] ?? part);
}

const ELECTRON_ACCELERATOR_PART_TO_LABEL: Record<string, ReactNode> = {
  Control: "Ctrl",
  CommandOrControl: IS_MAC ? <IconCmd /> : "^",
  Shift: "⇧",
  Enter: <IconArrowCornerDownLeft />,
  Left: <IconArrowLeft />,
  Right: <IconArrowRight />,
  Down: <IconArrowDown />,
  Up: <IconArrowUp />,
  Capslock: "Caps Lock",
  Scrolllock: "Scroll Lock",
  Numlock: "Num Lock",
  Escape: "Esc",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Insert: "Ins",
  Delete: "Del",

  num0: "Num 0",
  num1: "Num 1",
  num2: "Num 2",
  num3: "Num 3",
  num4: "Num 4",
  num5: "Num 5",
  num6: "Num 6",
  num7: "Num 7",
  num8: "Num 8",
  num9: "Num 9",
  numadd: "Num +",
  numsub: "Num -",
  nummult: "Num *",
  numdiv: "Num /",
  numdec: "Num .",

  VolumeUp: "Volume Up",
  VolumeDown: "Volume Down",
  VolumeMute: "Mute",
};