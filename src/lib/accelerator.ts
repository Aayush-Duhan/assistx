/**
 * Utility functions for converting keyboard events to Electron accelerator strings
 */

// Modifier keys that should not be valid on their own
const MODIFIER_KEYS = new Set([
    'Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock'
]);

// Map browser key names to Electron accelerator key names
const KEY_MAP: Record<string, string> = {
    // Arrow keys
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    // Special keys
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Enter': 'Enter',
    'Tab': 'Tab',
    'Escape': 'Escape',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'Insert': 'Insert',
    ' ': 'Space',
    // Function keys are passed through (F1-F12)
};

// System shortcuts that might conflict with OS functionality
const SYSTEM_SHORTCUTS = new Set([
    'CommandOrControl+C',
    'CommandOrControl+V',
    'CommandOrControl+X',
    'CommandOrControl+Z',
    'CommandOrControl+A',
    'CommandOrControl+S',
    'CommandOrControl+W',
    'CommandOrControl+Q',
    'CommandOrControl+Tab',
    'CommandOrControl+N',
    'CommandOrControl+T',
    'Alt+F4',
    'Alt+Tab',
]);

export interface AcceleratorResult {
    accelerator: string;
    isModifierOnly: boolean;
    isSystemShortcut: boolean;
}

/**
 * Convert a KeyboardEvent to an Electron-compatible accelerator string
 * @param event - The keyboard event to convert
 * @returns AcceleratorResult or null if the key should be ignored
 */
export function keyboardEventToAccelerator(event: KeyboardEvent): AcceleratorResult | null {
    const parts: string[] = [];

    // Check for modifiers
    if (event.ctrlKey || event.metaKey) {
        parts.push('CommandOrControl');
    }
    if (event.shiftKey) {
        parts.push('Shift');
    }
    if (event.altKey) {
        parts.push('Alt');
    }

    // Get the main key
    const key = event.key;

    // Check if it's a modifier-only press
    if (MODIFIER_KEYS.has(key)) {
        return {
            accelerator: parts.join('+'),
            isModifierOnly: true,
            isSystemShortcut: false,
        };
    }

    // Map the key to Electron format
    let electronKey: string;

    if (KEY_MAP[key]) {
        electronKey = KEY_MAP[key];
    } else if (key.startsWith('F') && /^F\d+$/.test(key)) {
        // Function keys (F1-F12)
        electronKey = key;
    } else if (key === '\\') {
        electronKey = '\\';
    } else if (key.length === 1) {
        // Single character - use uppercase
        electronKey = key.toUpperCase();
    } else {
        // Unknown key, try to use as-is
        electronKey = key;
    }

    parts.push(electronKey);
    const accelerator = parts.join('+');

    return {
        accelerator,
        isModifierOnly: false,
        isSystemShortcut: SYSTEM_SHORTCUTS.has(accelerator),
    };
}

/**
 * Format an accelerator string for display (more human-readable)
 * @param accelerator - The Electron accelerator string
 * @param platform - The platform (darwin for Mac, win32 for Windows)
 */
export function formatAcceleratorForDisplay(accelerator: string, platform: string = 'win32'): string {
    if (!accelerator) return '';

    const isMac = platform === 'darwin';

    return accelerator
        .replace(/CommandOrControl/g, isMac ? '⌘' : 'Ctrl')
        .replace(/Shift/g, isMac ? '⇧' : 'Shift')
        .replace(/Alt/g, isMac ? '⌥' : 'Alt')
        .replace(/\+/g, isMac ? '' : ' + ')
        .replace(/Up/g, '↑')
        .replace(/Down/g, '↓')
        .replace(/Left/g, '←')
        .replace(/Right/g, '→')
        .replace(/\\\\/g, '\\');
}

/**
 * Check if the given accelerator is a system shortcut
 */
export function isSystemShortcut(accelerator: string): boolean {
    return SYSTEM_SHORTCUTS.has(accelerator);
}
