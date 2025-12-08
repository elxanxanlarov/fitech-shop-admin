/**
 * Validation utility functions for form inputs
 */

/**
 * Validates number input in real-time
 * @param {string} field - Field name
 * @param {string} value - Input value
 * @param {Array<string>} numberFields - Array of field names that should be numbers
 * @param {Function} t - Translation function (optional)
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export const validateNumberInput = (field, value, numberFields = [], t = null) => {
    // If field is not in numberFields list, it's valid
    if (!numberFields.includes(field)) {
        return { isValid: true, error: null };
    }
    
    // Empty value is allowed (user is still typing)
    if (value === '' || value === null || value === undefined) {
        return { isValid: true, error: null };
    }
    
    // Only allow digits and decimal point (no negative sign)
    const numberRegex = /^\d*\.?\d*$/;
    if (!numberRegex.test(value)) {
        return { 
            isValid: false, 
            error: t ? t('invalid_number') : 'Yalnız rəqəm daxil edilə bilər'
        };
    }
    
    return { isValid: true, error: null };
};

/**
 * Creates a handler for input changes with number validation
 * @param {Function} setFormData - State setter for form data
 * @param {Function} setErrors - State setter for errors
 * @param {Object} errors - Current errors object
 * @param {Array<string>} numberFields - Array of field names that should be numbers
 * @param {Function} t - Translation function (optional)
 * @param {Function} customHandler - Optional custom handler function
 * @returns {Function} Input change handler
 */
export const createInputChangeHandler = (
    setFormData,
    setErrors,
    errors = {},
    numberFields = [],
    t = null,
    customHandler = null
) => {
    return (field, value) => {
        // Number field validation in real-time
        if (numberFields.includes(field)) {
            const validation = validateNumberInput(field, value, numberFields, t);
            if (!validation.isValid) {
                setErrors(prev => ({
                    ...prev,
                    [field]: validation.error
                }));
                return; // Don't update value if validation fails
            }
        }
        
        // Update form data
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing (only for valid input)
        if (errors[field] && numberFields.includes(field)) {
            const validation = validateNumberInput(field, value, numberFields, t);
            if (validation.isValid) {
                setErrors(prev => ({
                    ...prev,
                    [field]: ''
                }));
            }
        } else if (errors[field] && !numberFields.includes(field)) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
        
        // Call custom handler if provided
        if (customHandler) {
            customHandler(field, value);
        }
    };
};

