import React, { useState } from 'react';

export default function Input({
    // Input props
    type = 'text',
    value,
    onChange,
    placeholder,
    name,
    id,
    disabled = false,
    required = false,
    autoComplete,

    // Label props
    label,
    showLabel = true,
    labelClassName = '',
    inputClassName = '',
    containerClassName = '',

    // Error handling
    error,
    errorMessage,
    helperText,

    // Icon props
    leftIcon,
    rightIcon,
    onRightIconClick,

    // Password specific
    showPasswordToggle = true,

    // Size variants
    size = 'md', // 'sm', 'md', 'lg'

    // Variants
    variant = 'default', // 'default', 'outline', 'filled', 'underline'

    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Size configurations
    const sizeClasses = {
        sm: {
            input: 'px-3 py-2 text-sm rounded-lg',
            label: 'text-xs mb-1.5',
            icon: 'w-4 h-4',
            container: 'space-y-1'
        },
        md: {
            input: 'px-4 py-3 text-sm rounded-xl',
            label: 'text-sm mb-1.5',
            icon: 'w-5 h-5',
            container: 'space-y-1'
        },
        lg: {
            input: 'px-5 py-4 text-base rounded-2xl',
            label: 'text-base mb-2',
            icon: 'w-6 h-6',
            container: 'space-y-1.5'
        }
    };

    // Variant configurations
    const variantClasses = {
        default: {
            input: 'bg-white border border-slate-200 shadow-sm hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400',
            container: ''
        },
        outline: {
            input: 'bg-transparent border-2 border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-0 placeholder:text-slate-400',
            container: ''
        },
        filled: {
            input: 'bg-slate-50 border-transparent hover:bg-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400',
            container: ''
        },
        underline: {
            input: 'bg-transparent border-0 border-b-2 border-slate-200 rounded-none px-0 hover:border-slate-300 focus:border-blue-500 focus:ring-0 placeholder:text-slate-400',
            container: ''
        }
    };

    // Get current input type (handle password toggle)
    const currentType = type === 'password' && showPassword ? 'text' : type;

    // Base classes
    const baseInputClasses = `
        w-full transition-all duration-300 ease-out
        font-medium text-slate-700
        focus:outline-none focus:scale-[1.01]
        disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-100
        ${sizeClasses[size].input}
        ${variantClasses[variant].input}
        ${error ? '!border-red-500 !focus:ring-red-500/10' : ''}
        ${leftIcon ? 'pl-11' : ''}
        ${rightIcon || (type === 'password' && showPasswordToggle) ? 'pr-11' : ''}
        ${inputClassName}
        ${props.className || ''}
    `.trim();

    const { className, ...remainingProps } = props;

    const baseLabelClasses = `
        block font-semibold text-slate-700
        ${sizeClasses[size].label}
        ${required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}
        ${error ? 'text-red-500' : ''}
        ${isFocused ? 'text-blue-600' : ''}
        ${labelClassName}
    `.trim();

    const baseContainerClasses = `
        ${sizeClasses[size].container}
        ${containerClassName}
    `.trim();

    return (
        <div className={baseContainerClasses}>
            {/* Label */}
            {showLabel && label && (
                <label
                    htmlFor={id || name}
                    className={baseLabelClasses}
                >
                    {label}
                </label>
            )}

            {/* Input Container */}
            <div className="relative group">
                {/* Input Field */}
                <input
                    type={currentType}
                    id={id || name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    autoComplete={autoComplete}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={baseInputClasses}
                    {...remainingProps}
                />

                {/* Left Icon */}
                {leftIcon && (
                    <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300 flex items-center justify-center z-10 pointer-events-none ${sizeClasses[size].icon} ${isFocused ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'}`}>
                        {leftIcon}
                    </div>
                )}

                {/* Right Icon or Password Toggle */}
                {(rightIcon || (type === 'password' && showPasswordToggle)) && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                        {type === 'password' && showPasswordToggle ? (
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-slate-400 hover:text-slate-600 focus:outline-none focus:text-blue-500 transition-colors duration-300 flex items-center justify-center"
                            >
                                {showPassword ? (
                                    <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        ) : rightIcon ? (
                            <button
                                type="button"
                                onClick={onRightIconClick}
                                className="text-slate-400 hover:text-slate-600 focus:outline-none focus:text-blue-500 transition-colors duration-300 flex items-center justify-center"
                            >
                                {typeof rightIcon === 'string' ? (
                                    <span className={sizeClasses[size].icon}>{rightIcon}</span>
                                ) : (
                                    <div className={sizeClasses[size].icon}>{rightIcon}</div>
                                )}
                            </button>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Error or Helper Message */}
            {(error || errorMessage || helperText) && (
                <div className="flex flex-col gap-1 px-1">
                    {(error || errorMessage) ? (
                        <p className="text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                            {errorMessage || error}
                        </p>
                    ) : helperText ? (
                        <p className="text-xs text-slate-500">
                            {helperText}
                        </p>
                    ) : null}
                </div>
            )}
        </div>
    );
}
