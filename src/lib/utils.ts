import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
