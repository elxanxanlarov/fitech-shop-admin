import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

export default function NumericInput({
    value,
    onChange,
    min = 0,
    max,
    step = 1,
    placeholder = '0',
    disabled = false,
    className = '',
    size = 'md', // 'sm', 'md'
    allowEmpty = true,
    suffix = '',
    label = ''
}) {
    // Treat null/undefined/empty string as 0 internally if allowEmpty is false
    const [inputValue, setInputValue] = useState(value !== undefined && value !== null ? value.toString() : '');

    useEffect(() => {
        setInputValue(value !== undefined && value !== null ? value.toString() : '');
    }, [value]);

    const handleInputChange = (e) => {
        const val = e.target.value;

        // Allow empty string if allowEmpty is true
        if (val === '' && allowEmpty) {
            setInputValue('');
            onChange('');
            return;
        }

        // Only allow numbers
        if (val !== '' && !/^\d+$/.test(val)) {
            return;
        }

        const numVal = parseInt(val) || 0;

        // Check max
        if (max !== undefined && numVal > max) {
            setInputValue(max.toString());
            onChange(max);
            return;
        }

        setInputValue(val);
        // We only trigger onChange if it's a valid number or empty
        if (val !== '') {
            onChange(numVal);
        } else if (!allowEmpty) {
            onChange(0);
        }
    };

    const increment = () => {
        if (disabled) return;
        const currentVal = parseInt(inputValue) || 0;
        const newVal = currentVal + step;
        if (max !== undefined && newVal > max) return;
        setInputValue(newVal.toString());
        onChange(newVal);
    };

    const decrement = () => {
        if (disabled) return;
        const currentVal = parseInt(inputValue) || 0;
        const newVal = currentVal - step;
        if (newVal < min) return;
        setInputValue(newVal.toString());
        onChange(newVal);
    };

    const handleBlur = () => {
        if (inputValue === '' && !allowEmpty) {
            setInputValue(min.toString());
            onChange(min);
        }
    };

    const sizeClasses = {
        sm: {
            container: 'h-8',
            btn: 'w-8 h-8',
            input: 'px-2 text-xs',
            icon: 'w-3 h-3'
        },
        md: {
            container: 'h-10',
            btn: 'w-10 h-10',
            input: 'px-3 text-sm',
            icon: 'w-4 h-4'
        }
    };

    const currentSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>}
            <div className={`flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all ${currentSize.container}`}>
                <button
                    type="button"
                    onClick={decrement}
                    disabled={disabled || (parseInt(inputValue) || 0) <= min}
                    className={`${currentSize.btn} flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-gray-100`}
                >
                    <Minus className={currentSize.icon} />
                </button>

                <div className="flex-1 flex items-center relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        disabled={disabled}
                        placeholder={placeholder}
                        className={`w-full h-full border-none focus:ring-0 font-bold text-gray-900 bg-transparent ${currentSize.input} ${suffix ? 'text-right pr-10' : 'text-center'}`}
                    />
                    {suffix && inputValue !== '' && (
                        <span className="absolute right-2 text-[10px] font-bold text-gray-400 pointer-events-none uppercase">
                            {suffix}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={increment}
                    disabled={disabled || (max !== undefined && (parseInt(inputValue) || 0) >= max)}
                    className={`${currentSize.btn} flex items-center justify-center text-gray-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-l border-gray-100`}
                >
                    <Plus className={currentSize.icon} />
                </button>
            </div>
        </div>
    );
}
