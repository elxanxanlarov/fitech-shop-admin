import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle click outside events
 * @param {boolean} isOpen - Whether the element is currently open/visible
 * @param {function} onClose - Function to call when clicking outside
 * @returns {object} ref - Reference to attach to the element
 */
const useClickOutside = (isOpen, onClose) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return ref;
};

export default useClickOutside;
