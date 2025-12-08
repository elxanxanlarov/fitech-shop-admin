import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { activityLogApi } from '../../api';
import Alert from '../ui/Alert';
import { 
  ArrowLeft,
  User,
  FileText,
  Activity,
  Clock,
  Info,
  Tag,
  ArrowRight,
  Minus
} from 'lucide-react';

export default function ActivityLogDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const logId = searchParams.get('id');
  const { t } = useTranslation('activityLog');
  const { t: tAlert } = useTranslation('alert');

  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLog = async () => {
      if (!logId) {
        Alert.error(tAlert('error') || 'Xəta!', t('log_id_required') || 'Log ID tələb olunur');
        navigate('/admin/activity-log');
        return;
      }

      try {
        setLoading(true);
        const response = await activityLogApi.getById(logId);
        
        if (response.success && response.data) {
          setLog(response.data);
        } else {
          Alert.error(tAlert('error') || 'Xəta!', t('log_not_found') || 'Log tapılmadı');
          navigate('/admin/activity-log');
        }
      } catch (error) {
        console.error('Error fetching log:', error);
        Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text'));
        navigate('/admin/activity-log');
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [logId, navigate, t, tAlert]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      case 'SALE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETURN':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? (t('yes') || 'Bəli') : (t('no') || 'Xeyr');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderChanges = (changes) => {
    if (!changes) return null;

    // Əgər changes obyekti old və new strukturu ilədirsə (UPDATE üçün)
    if (changes.old && changes.new) {
      const oldData = changes.old;
      const newData = changes.new;
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

      return (
        <div className="space-y-4">
          {Array.from(allKeys).map((key) => {
            const oldValue = oldData[key];
            const newValue = newData[key];
            const hasChanged = oldValue !== newValue;

            return (
              <div key={key} className="border-b border-gray-200 pb-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <div className="space-y-2">
                      {hasChanged ? (
                        <>
                          <div className="flex items-start gap-2">
                            <Minus className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">{t('old_value') || 'Köhnə dəyər'}:</p>
                              <p className="text-sm text-gray-700 bg-red-50 p-2 rounded border border-red-200">
                                {formatValue(oldValue)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">{t('new_value') || 'Yeni dəyər'}:</p>
                              <p className="text-sm text-gray-700 bg-green-50 p-2 rounded border border-green-200">
                                {formatValue(newValue)}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                              {formatValue(oldValue)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Əgər changes sadə obyektdirsə (CREATE üçün)
    if (typeof changes === 'object' && !Array.isArray(changes)) {
      return (
        <div className="space-y-3">
          {Object.entries(changes).map(([key, value]) => (
            <div key={key} className="border-b border-gray-200 pb-3 last:border-b-0">
              <p className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                {formatValue(value)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // Əgər başqa formatdırsa, JSON kimi göstər
    return (
      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono overflow-x-auto">
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('loading') || 'Yüklənir...'}</div>
      </div>
    );
  }

  if (!log) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/activity-log')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('back') || 'Geri'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-8 h-8" />
            {t('detail_title') || 'Əməliyyat Detalları'}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Action Badge */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className={`px-4 py-2 rounded-lg font-semibold ${getActionBadgeColor(log.action)}`}>
            {t(`actions.${log.action}`) || log.action}
          </div>
          <div className="text-sm text-gray-500">
            {t(`entity_types.${log.entityType}`) || log.entityType}
          </div>
        </div>

        {/* İşçi Məlumatları */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            {t('staff_info') || 'İşçi Məlumatları'}
          </h2>
          {log.staff ? (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('staff_name')}:</p>
                  <p className="text-base font-medium text-gray-900">
                    {log.staff.name} {log.staff.surName || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email:</p>
                  <p className="text-base text-gray-900">{log.staff.email}</p>
                </div>
                {log.staff.role && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('role')}:</p>
                    <p className="text-base text-gray-900">{log.staff.role.name}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">{t('no_staff') || 'İşçi məlumatı yoxdur'}</p>
            </div>
          )}
        </div>

        {/* Əməliyyat Məlumatları */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-gray-600" />
            {t('operation_info') || 'Əməliyyat Məlumatları'}
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('action')}:</p>
                <p className="text-base font-medium text-gray-900">
                  {t(`actions.${log.action}`) || log.action}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('entity_type')}:</p>
                <p className="text-base text-gray-900">
                  {t(`entity_types.${log.entityType}`) || log.entityType}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-1">Məlumat ID:</p>
                <p className="text-base font-mono text-gray-900">{log.entityId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Təsvir */}
        {log.description && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-600" />
              {t('description')}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-base text-gray-900 whitespace-pre-wrap">{log.description}</p>
            </div>
          </div>
        )}

        {/* Dəyişikliklər */}
        {log.changes && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              {t('changes')}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              {renderChanges(log.changes)}
            </div>
          </div>
        )}

        {/* Tarix */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            {t('date')}
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-base text-gray-900">{formatDate(log.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

