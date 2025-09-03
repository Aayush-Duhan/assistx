import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import TextareaAutosize, { TextareaAutosizeProps } from 'react-textarea-autosize';

interface BaseInputProps {
  multiLine?: boolean;
  onChange?: (value: string) => void;
}

type SingleLineInputProps = BaseInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    multiLine?: false;
  };

type MultiLineInputProps = BaseInputProps &
  Omit<TextareaAutosizeProps, 'onChange'> & {
    multiLine: true;
  };
export type InputProps = SingleLineInputProps | MultiLineInputProps;

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