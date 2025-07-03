import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    className,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen]);

    const selectedOption = options.find(option => option.value === value);

    const handleOptionClick = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={selectRef} className={clsx("relative", className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={clsx(
                    "w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-left",
                    "text-white/90 text-xs font-medium",
                    "transition-colors duration-200",
                    "flex items-center justify-between",
                    !disabled && "hover:bg-white/15 hover:border-white/30 cursor-pointer",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "border-white/40 bg-white/15"
                )}
            >
                <span className={clsx(
                    selectedOption ? "text-white/90" : "text-white/60",
                    "truncate"
                )}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown 
                    size={14} 
                    className={clsx(
                        "text-white/60 transition-transform duration-200 ml-2 flex-shrink-0",
                        isOpen && "transform rotate-180"
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-black/95 backdrop-blur-sm border border-white/20 rounded-md shadow-xl">
                    <div className="py-1 max-h-48 overflow-auto">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOptionClick(option.value)}
                                className={clsx(
                                    "w-full px-3 py-2 text-left text-xs",
                                    "transition-colors duration-200",
                                    "flex items-center justify-between",
                                    "hover:bg-white/10",
                                    option.value === value
                                        ? "bg-white/20 text-white"
                                        : "text-white/90"
                                )}
                            >
                                <span className="truncate">{option.label}</span>
                                {option.value === value && (
                                    <Check size={14} className="text-white/80 ml-2 flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}; 