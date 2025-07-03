// UI Components Index
// This file exports all UI components as a single UI object

import { Button } from './Button';
import { HeadlessButton } from './HeadlessButton';
import { Shortcut, InlineShortcut } from './Shortcut';
import { ScrollableArea } from './ScrollableArea';
import { Tooltip } from './Tooltip';
import { CopyButton, ResetButton } from './CopyButton';
import { Markdown } from './Markdown';
import { Input } from './Input';
import { WindowTitle } from './WindowTitle';
import { WindowFooter } from './WindowFooter';
import { WindowMessage } from './WindowMessage';

import { Select } from './Select';

export const UI = {
    Button,
    HeadlessButton,
    Shortcut,
    ScrollableArea,
    Tooltip,
    CopyButton,
    ResetButton,
    Markdown,
    Input,
    WindowTitle,
    InlineShortcut,
    WindowFooter,
    WindowMessage,
    Select,
};

// Also export individual components for direct imports
export {
    Button,
    HeadlessButton,
    Shortcut,
    ScrollableArea,
    Tooltip,
    CopyButton,
    ResetButton,
    Markdown,
    Input,
    WindowTitle,
    InlineShortcut,
    WindowFooter,
    WindowMessage,
}; 