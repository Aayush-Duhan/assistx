// src/lib/utils.ts

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * A utility function to conditionally join class names.
 * It uses `clsx` for conditional logic and `tailwind-merge` to resolve
 * conflicting Tailwind CSS classes.
 *
 * @param inputs - A list of class names or conditional objects.
 * @returns A single string of merged class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}