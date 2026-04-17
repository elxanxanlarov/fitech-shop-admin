import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MdSearch, MdExpandMore, MdCheck } from 'react-icons/md';

export default function SearchDropdown({
    options = [],
    value,
    onChange,
    placeholder = 'Axtar...',
    disabled = false,
    error = false,
    label = '',
    getOptionLabel = (option) => option.name || option.label || '',
    getOptionValue = (option) => option.id || option.value || '',
    searchFields = ['name'],
    className = '',
    renderOption = null,
    allowCustomValue = false,
    onSearchChange = null
}) {
    const { t } = useTranslation('admin-panel');
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayValue, setDisplayValue] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    // Update display value when value prop changes (only if not in custom input mode)
    useEffect(() => {
        if (!allowCustomValue) {
            const selectedOption = options.find(opt => getOptionValue(opt) === value);
            if (selectedOption) {
                setDisplayValue(getOptionLabel(selectedOption));
            } else {
                setDisplayValue('');
            }
        } else {
            // In custom value mode, displayValue is controlled by input
            if (value && typeof value === 'string' && !value.startsWith('PRODUCT_ID:')) {
                setDisplayValue(value);
            } else if (value && typeof value === 'string' && value.startsWith('PRODUCT_ID:')) {
                const productId = value.replace('PRODUCT_ID:', '');
                const selectedOption = options.find(opt => getOptionValue(opt) === value);
                if (selectedOption) {
                    setDisplayValue(getOptionLabel(selectedOption));
                } else {
                    setDisplayValue('');
                }
            } else {
                setDisplayValue(value || '');
            }
        }
    }, [value, options, allowCustomValue]);

    // Filter options based on search term
    const filteredOptions = options.filter(option => {
        if (!searchTerm.trim()) return true;

        const searchLower = searchTerm.toLowerCase();
        return searchFields.some(field => {
            const fieldValue = option[field];
            return fieldValue && fieldValue.toString().toLowerCase().includes(searchLower);
        });
    });

    const isOptionSelected = (option) => {
        const optionValue = getOptionValue(option);
        if (Array.isArray(value)) {
            return value.includes(optionValue);
        }
        return optionValue === value;
    };

    const selectedOption = !Array.isArray(value) ? options.find(opt => getOptionValue(opt) === value) : null;

    const handleSelect = (option) => {
        const optionValue = getOptionValue(option);
        onChange(optionValue);

        if (!Array.isArray(value)) {
            setIsOpen(false);
            setSearchTerm('');
            if (allowCustomValue) {
                const label = getOptionLabel(option);
                setDisplayValue(label);
            }
        }
    };

    const handleSearchChange = (newSearchTerm) => {
        setSearchTerm(newSearchTerm);
        if (allowCustomValue && onSearchChange) {
            onSearchChange(newSearchTerm);
        } else if (allowCustomValue && onChange) {
            // If no option matches, treat as custom value
            const matchingOption = options.find(opt => {
                const searchLower = newSearchTerm.toLowerCase();
                return searchFields.some(field => {
                    const fieldValue = opt[field];
                    return fieldValue && fieldValue.toString().toLowerCase() === searchLower;
                });
            });
            if (!matchingOption) {
                onChange(newSearchTerm);
            }
        }
    };

    const handleInputFocus = () => {
        if (!disabled) {
            setIsOpen(true);
            // Focus search input when dropdown opens
            setTimeout(() => {
                const searchInput = dropdownRef.current?.querySelector('input[type="text"]');
                if (searchInput) {
                    searchInput.focus();
                }
            }, 100);
        }
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-base font-medium text-gray-700 mb-2">
                    {label}
                </label>
            )}

            <div className="relative">
                {allowCustomValue ? (
                    <div className="relative">
                        <input
                            type="text"
                            value={isOpen ? searchTerm : (displayValue || '')}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setSearchTerm(newValue);
                                handleSearchChange(newValue);
                                if (!isOpen) {
                                    setIsOpen(true);
                                }
                            }}
                            onFocus={() => {
                                if (!disabled) {
                                    setSearchTerm(displayValue || '');
                                    setIsOpen(true);
                                }
                            }}
                            onBlur={(e) => {
                                // Delay closing to allow option click
                                setTimeout(() => {
                                    if (!dropdownRef.current?.contains(document.activeElement)) {
                                        setIsOpen(false);
                                        // Keep the typed value if no option was selected
                                        if (searchTerm && !value) {
                                            setDisplayValue(searchTerm);
                                        }
                                    }
                                }, 200);
                            }}
                            placeholder={placeholder}
                            disabled={disabled}
                            className={`
                                w-full px-4 h-10 text-left bg-white border rounded-lg 
                                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                ${error ? 'border-red-500' : 'border-gray-300'}
                                ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                                text-sm md:text-base outline-none
                            `}
                        />
                        <MdExpandMore
                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform pointer-events-none ${isOpen ? 'transform rotate-180' : ''}`}
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleInputFocus}
                        disabled={disabled}
                        className={`
                            w-full px-4 h-10 text-left bg-white border rounded-lg 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            ${error ? 'border-red-500' : 'border-gray-300'}
                            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
                            flex items-center justify-between text-sm md:text-base
                        `}
                    >
                        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
                            {selectedOption ? getOptionLabel(selectedOption) : placeholder}
                        </span>
                        <MdExpandMore
                            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                        />
                    </button>
                )}

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-[450px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Search Input - only show if not in allowCustomValue mode (main input is already the search) */}
                        {!allowCustomValue && (
                            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                                <div className="relative">
                                    <MdSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            setSearchTerm(newValue);
                                        }}
                                        placeholder={placeholder}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <div className="overflow-y-auto max-h-[380px] pb-2">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                    {t('no_results_found') || 'Nəticə tapılmadı'}
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const optionValue = getOptionValue(option);
                                    const isSelected = isOptionSelected(option);

                                    return (
                                        <button
                                            key={optionValue}
                                            type="button"
                                            onClick={() => handleSelect(option)}
                                            className={`
                                                w-full px-4 py-3 text-left
                                                transition-colors flex items-center justify-between border-b border-gray-50 last:border-0
                                                ${isSelected
                                                    ? 'bg-emerald-50 hover:bg-emerald-100'
                                                    : 'hover:bg-blue-50/50'
                                                }
                                            `}
                                        >
                                            <span className="flex-1">
                                                {renderOption ? renderOption(option) : getOptionLabel(option)}
                                            </span>
                                            {isSelected ? (
                                                <div className="flex items-center gap-2 ml-4 shrink-0">
                                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        ✓ Seçilib
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-200 ml-4 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

