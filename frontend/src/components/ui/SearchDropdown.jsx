import React, { useState, useRef, useEffect } from 'react';
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
    renderOption = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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

    // Filter options based on search term
    const filteredOptions = options.filter(option => {
        if (!searchTerm.trim()) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return searchFields.some(field => {
            const fieldValue = option[field];
            return fieldValue && fieldValue.toString().toLowerCase().includes(searchLower);
        });
    });

    const selectedOption = options.find(opt => getOptionValue(opt) === value);

    const handleSelect = (option) => {
        onChange(getOptionValue(option));
        setIsOpen(false);
        setSearchTerm('');
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
                <button
                    type="button"
                    onClick={handleInputFocus}
                    disabled={disabled}
                    className={`
                        w-full px-4 py-2.5 text-left bg-white border rounded-lg 
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${error ? 'border-red-500' : 'border-gray-300'}
                        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
                        flex items-center justify-between text-base
                    `}
                >
                    <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedOption ? getOptionLabel(selectedOption) : placeholder}
                    </span>
                    <MdExpandMore 
                        className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                            <div className="relative">
                                <MdSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto max-h-48">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                    Nəticə tapılmadı
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const optionValue = getOptionValue(option);
                                    const isSelected = optionValue === value;
                                    
                                    return (
                                        <button
                                            key={optionValue}
                                            type="button"
                                            onClick={() => handleSelect(option)}
                                            className={`
                                                w-full px-4 py-2 text-left hover:bg-blue-50 
                                                transition-colors flex items-center justify-between
                                                ${isSelected ? 'bg-blue-50' : ''}
                                            `}
                                        >
                                            <span className="flex-1">
                                                {renderOption ? renderOption(option) : getOptionLabel(option)}
                                            </span>
                                            {isSelected && (
                                                <MdCheck className="w-5 h-5 text-blue-600 ml-2" />
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

