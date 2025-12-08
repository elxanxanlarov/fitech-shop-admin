import { useTranslation } from 'react-i18next';
import Alert from './Alert';

const AlertDemo = () => {
  const { t } = useTranslation('admin-panel');

  const showSuccessAlert = () => {
    Alert.success(
      t('alert.add_success'),
      t('alert.add_success_text'),
      {
        confirmButtonColor: '#10B981',
        background: '#F0FDF4',
        color: '#065F46'
      }
    );
  };

  const showErrorAlert = () => {
    Alert.error(
      t('alert.error'),
      t('alert.error_text'),
      {
        confirmButtonColor: '#EF4444',
        background: '#FEF2F2',
        color: '#991B1B'
      }
    );
  };

  const showWarningAlert = () => {
    Alert.warning(
      'Warning!',
      'This is a warning message.',
      {
        confirmButtonColor: '#F59E0B',
        background: '#FFFBEB',
        color: '#92400E'
      }
    );
  };

  const showInfoAlert = () => {
    Alert.info(
      'Information',
      'This is an information message.',
      {
        confirmButtonColor: '#3B82F6',
        background: '#EFF6FF',
        color: '#1E40AF'
      }
    );
  };

  const showConfirmAlert = () => {
    Alert.confirm(
      t('alert.delete_confirm'),
      t('alert.delete_confirm_text'),
      {
        confirmText: t('alert.yes'),
        cancelText: t('alert.no'),
        confirmColor: '#EF4444',
        cancelColor: '#6B7280',
        background: '#FFFFFF',
        color: '#374151'
      }
    );
  };

  const showCustomAlert = () => {
    Alert.custom({
      title: 'Custom Alert',
      text: 'This is a fully customizable alert!',
      icon: 'question',
      iconColor: '#8B5CF6',
      confirmButtonColor: '#8B5CF6',
      background: '#FAF5FF',
      color: '#6B21A8',
      showCancelButton: true,
      confirmButtonText: 'Custom Yes',
      cancelButtonText: 'Custom No'
    });
  };

  const showToast = () => {
    Alert.toast('This is a toast notification!', 'success');
  };

  const showLoadingAlert = () => {
    Alert.loading('Processing...', {
      background: '#FFFFFF',
      color: '#374151'
    });
    
    // Auto close after 3 seconds
    setTimeout(() => {
      Alert.close();
      Alert.success('Done!', 'Process completed successfully.');
    }, 3000);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Alert Component Demo</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={showSuccessAlert}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Success Alert
        </button>
        
        <button
          onClick={showErrorAlert}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Error Alert
        </button>
        
        <button
          onClick={showWarningAlert}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
        >
          Warning Alert
        </button>
        
        <button
          onClick={showInfoAlert}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Info Alert
        </button>
        
        <button
          onClick={showConfirmAlert}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          Confirm Dialog
        </button>
        
        <button
          onClick={showCustomAlert}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Custom Alert
        </button>
        
        <button
          onClick={showToast}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          Toast Notification
        </button>
        
        <button
          onClick={showLoadingAlert}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Loading Alert
        </button>
      </div>
    </div>
  );
};

export default AlertDemo;
