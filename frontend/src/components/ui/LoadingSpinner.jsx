import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md',
  text = 'Loading...',
  showText = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
      {showText && (
        <p className="mt-2 text-sm text-gray-600">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
