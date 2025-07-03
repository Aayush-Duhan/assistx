import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import TextareaAutosize, { TextareaAutosizeProps } from 'react-textarea-autosize';

// Base props common to both input and textarea
interface BaseInputProps {
  /**
   * If true, the component will render a <textarea> that automatically resizes
   * to fit its content. Otherwise, it renders a standard <input>.
   * @default false
   */
  multiLine?: boolean;
  /**
   * A callback function that is triggered when the input value changes.
   * It receives the new string value as its only argument.
   */
  onChange?: (value: string) => void;
}

// Props specific to the <input> element
type SingleLineInputProps = BaseInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    multiLine?: false;
  };

// Props specific to the <textarea> element, using react-textarea-autosize props
type MultiLineInputProps = BaseInputProps &
  Omit<TextareaAutosizeProps, 'onChange'> & {
    multiLine: true;
  };
// The final union type for the Input component
export type InputProps = SingleLineInputProps | MultiLineInputProps;

/**
 * A versatile input component that can render as a single-line <input> or a
 * multi-line, auto-resizing <textarea>. It forwards all standard input/textarea
 * attributes and provides a consistent `onChange` callback with the string value.
 *
 * @example
 * // Single-line input
 * <Input placeholder="Enter your name..." />
 *
 * @example
 * // Multi-line, auto-resizing textarea
 * <Input multiLine placeholder="Enter your message..." />
 */
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ className, onChange, multiLine = false, ...props }, ref) => {
    
    const handleChange = (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      onChange?.(event.target.value);
    };

    const baseClassName = cn(
      'block w-full resize-none px-4 py-2.5 focus:outline-none text-sm text-white/90',
      'placeholder:text-white/60 disabled:text-white/60',
      'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50',
      className
    );

    if (multiLine) {
      // Handle textarea case with proper typing
      const textareaProps = props as Omit<TextareaAutosizeProps, 'onChange'>;
      return (
        <TextareaAutosize
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={baseClassName}
          onChange={handleChange}
          {...textareaProps}
        />
      );
    } else {
      // Handle input case with proper typing
      const inputProps = props as Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>;
      return (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          className={baseClassName}
          onChange={handleChange}
          {...inputProps}
        />
      );
    }
  }
);

Input.displayName = 'Input';