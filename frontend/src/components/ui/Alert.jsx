import Swal from 'sweetalert2';

// Alert configuration presets
const alertConfigs = {
  success: {
    icon: 'success',
    iconColor: '#10B981',
    confirmButtonColor: '#10B981',
    background: '#F0FDF4',
    color: '#065F46'
  },
  error: {
    icon: 'error',
    iconColor: '#EF4444',
    confirmButtonColor: '#EF4444',
    background: '#FEF2F2',
    color: '#991B1B'
  },
  warning: {
    icon: 'warning',
    iconColor: '#F59E0B',
    confirmButtonColor: '#F59E0B',
    background: '#FFFBEB',
    color: '#92400E'
  },
  info: {
    icon: 'info',
    iconColor: '#3B82F6',
    confirmButtonColor: '#3B82F6',
    background: '#EFF6FF',
    color: '#1E40AF'
  },
  question: {
    icon: 'question',
    iconColor: '#8B5CF6',
    confirmButtonColor: '#8B5CF6',
    background: '#FAF5FF',
    color: '#6B21A8'
  }
};

class Alert {
  // Success alert
  static success(title, text = '', options = {}) {
    return Swal.fire({
      title,
      text,
      ...alertConfigs.success,
      ...options
    });
  }

  // Error alert
  static error(title, text = '', options = {}) {
    return Swal.fire({
      title,
      text,
      ...alertConfigs.error,
      ...options
    });
  }

  // Warning alert
  static warning(title, text = '', options = {}) {
    return Swal.fire({
      title,
      text,
      ...alertConfigs.warning,
      ...options
    });
  }

  // Info alert
  static info(title, text = '', options = {}) {
    return Swal.fire({
      title,
      text,
      ...alertConfigs.info,
      ...options
    });
  }

  // Confirmation dialog
  static confirm(title, text = '', options = {}) {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'Yes',
      cancelButtonText: options.cancelText || 'No',
      confirmButtonColor: options.confirmColor || '#EF4444',
      cancelButtonColor: options.cancelColor || '#6B7280',
      background: options.background || '#FFFFFF',
      color: options.color || '#374151',
      ...options
    });
  }

  // Custom alert with full control
  static custom(options = {}) {
    return Swal.fire({
      background: '#FFFFFF',
      color: '#374151',
      confirmButtonColor: '#3B82F6',
      ...options
    });
  }

  // Loading alert
  static loading(title = 'Loading...', options = {}) {
    return Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      showCancelButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
      ...options
    });
  }

  // Toast notification
  static toast(title, type = 'success', options = {}) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    return Toast.fire({
      title,
      icon: type,
      ...alertConfigs[type],
      ...options
    });
  }

  // Close any open alert
  static close() {
    if (Swal.isVisible()) {
      Swal.close();
    }
  }

  // Check if alert is open
  static isOpen() {
    return Swal.isVisible();
  }

  // Prompt dialog for user input
  static prompt(title, text = '', options = {}) {
    return Swal.fire({
      title,
      text,
      input: options.inputType || 'text',
      inputPlaceholder: options.placeholder || '',
      inputValue: options.defaultValue || '',
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'OK',
      cancelButtonText: options.cancelText || 'Cancel',
      confirmButtonColor: options.confirmColor || '#3B82F6',
      cancelButtonColor: options.cancelColor || '#6B7280',
      background: options.background || '#FFFFFF',
      color: options.color || '#374151',
      inputValidator: options.validator || ((value) => {
        if (!value || !value.trim()) {
          return 'Bu sahə tələb olunur';
        }
        return null;
      }),
      ...options
    }).then((result) => {
      return {
        isConfirmed: result.isConfirmed,
        value: result.value || ''
      };
    });
  }
}

export default Alert;
