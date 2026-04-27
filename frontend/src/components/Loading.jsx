import React from 'react';
import LoadingSpinner from './ui/LoadingSpinner';

const Loading = () => {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
            <LoadingSpinner size="lg" text="Yüklənir..." />
        </div>
    );
};

export default Loading;
