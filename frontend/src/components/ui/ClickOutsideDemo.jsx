import { useState } from 'react';
import { useClickOutside } from '../../hooks';
import { Menu, X, Settings, User, LogOut } from 'lucide-react';

const ClickOutsideDemo = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Use the custom hook for different elements
  const dropdownRef = useClickOutside(showDropdown, () => setShowDropdown(false));
  const modalRef = useClickOutside(showModal, () => setShowModal(false));
  const tooltipRef = useClickOutside(showTooltip, () => setShowTooltip(false));

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Click Outside Hook Demo</h2>
      
      {/* Dropdown Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Dropdown Menu</h3>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
          
          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                <button className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 text-red-600">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Modal</h3>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Open Modal
        </button>
        
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Modal Title</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                This modal will close when you click outside of it.
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tooltip</h3>
        <div className="relative" ref={tooltipRef}>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Hover for Tooltip
          </button>
          
          {showTooltip && (
            <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap">
              This tooltip will close when you click outside
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">How to Use:</h3>
        <pre className="text-sm text-gray-700 overflow-x-auto">
{`import { useClickOutside } from '../../hooks';

const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(isOpen, () => setIsOpen(false));
  
  return (
    <div ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle
      </button>
      {isOpen && <div>Content</div>}
    </div>
  );
};`}
        </pre>
      </div>
    </div>
  );
};

export default ClickOutsideDemo;
