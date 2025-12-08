import React, { useEffect } from 'react';

export default function ModalLayout({ 
    children, 
    isOpen, 
    onClose, 
    title = "Modal", 
    className = "" 
}) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            // Save current body overflow style (may be empty string or undefined)
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow =    '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 h-screen w-full bg-black/50 bg-opacity-50"
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className={`relative bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto ${className || 'max-w-md'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Body - Children content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}