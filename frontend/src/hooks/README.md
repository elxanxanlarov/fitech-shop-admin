# Custom Hooks

This directory contains reusable custom hooks for the application.

## useClickOutside

A custom hook that handles click outside events for dropdowns, modals, tooltips, and other overlay components.

### Usage

```jsx
import { useClickOutside } from '../../hooks';

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
};
```

### Parameters

- `isOpen` (boolean): Whether the element is currently open/visible
- `onClose` (function): Function to call when clicking outside

### Returns

- `ref` (object): Reference to attach to the element that should trigger the click outside behavior

### Examples

#### Dropdown Menu
```jsx
const [showDropdown, setShowDropdown] = useState(false);
const dropdownRef = useClickOutside(showDropdown, () => setShowDropdown(false));

return (
  <div ref={dropdownRef}>
    <button onClick={() => setShowDropdown(!showDropdown)}>Menu</button>
    {showDropdown && <div>Dropdown Content</div>}
  </div>
);
```

#### Modal
```jsx
const [showModal, setShowModal] = useState(false);
const modalRef = useClickOutside(showModal, () => setShowModal(false));

return (
  <>
    <button onClick={() => setShowModal(true)}>Open Modal</button>
    {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div ref={modalRef} className="bg-white p-6 rounded-lg">
          Modal Content
        </div>
      </div>
    )}
  </>
);
```

#### Tooltip
```jsx
const [showTooltip, setShowTooltip] = useState(false);
const tooltipRef = useClickOutside(showTooltip, () => setShowTooltip(false));

return (
  <div ref={tooltipRef}>
    <button onMouseEnter={() => setShowTooltip(true)}>
      Hover me
    </button>
    {showTooltip && <div>Tooltip content</div>}
  </div>
);
```

### Features

- ✅ Automatic cleanup of event listeners
- ✅ Memory leak prevention
- ✅ TypeScript support (if using TypeScript)
- ✅ Lightweight and performant
- ✅ Easy to use and understand
