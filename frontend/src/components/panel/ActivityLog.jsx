import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { activityLogApi, staffApi } from '../../api';
import Alert from '../ui/Alert';
import { 
  Filter, 
  X, 
  Trash2, 
  Eye, 
  Calendar,
  Activity,
  RefreshCw,
  User,
  FileText
} from 'lucide-react';

export default function ActivityLog() {
  const { t } = useTranslation('activityLog');
  const { t: tAlert } = useTranslation('alert');
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    staffId: '',
    entityType: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    // Filter dəyişdikdə səhifəni 1-ə reset et
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters.staffId, filters.entityType, filters.action, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchActivityLogs();
  }, [pagination.page, pagination.limit, filters.staffId, filters.entityType, filters.action, filters.startDate, filters.endDate]);

  const fetchStaffList = async () => {
    try {
      const response = await staffApi.getAll();
      if (response.success && response.date) {
        setStaffList(response.date);
      }
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  };

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (filters.staffId) params.staffId = filters.staffId;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await activityLogApi.getAll(params);
      
      if (response.success) {
        setLogs(response.data || []);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages
          }));
        }
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      Alert.error(t('error'), t('error_fetching'));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      staffId: '',
      entityType: '',
      action: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleDelete = async (log) => {
    const result = await Alert.confirm(
      tAlert('delete_confirm') || 'Silinsin?',
      t('confirm_delete'),
      { 
        confirmText: tAlert('yes') || 'Bəli', 
        cancelText: tAlert('no') || 'Xeyr', 
        confirmColor: '#EF4444', 
        cancelColor: '#6B7280' 
      }
    );

    if (result.isConfirmed) {
      try {
        Alert.loading(t('loading') || 'Yüklənir...');
        await activityLogApi.delete(log.id);
        setLogs(prev => prev.filter(item => item.id !== log.id));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        Alert.close();
        setTimeout(() => {
          Alert.success(tAlert('delete_success') || 'Uğurlu', t('deleted_success'));
        }, 100);
      } catch (error) {
        Alert.close();
        setTimeout(() => {
          Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
        }, 100);
      }
    }
  };

  const handleViewDetails = (log) => {
    navigate(`/admin/activity-log-detail?id=${log.id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Activity className="w-8 h-8" />
          {t('title')}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            {t('filter')}
          </button>
          <button
            onClick={fetchActivityLogs}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">{t('filter')}</h2>
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              {t('clear_filter')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Staff Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('staff')}
              </label>
              <select
                value={filters.staffId}
                onChange={(e) => handleFilterChange('staffId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('select_staff')}</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} {staff.surName || ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('entity_type')}
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('select_entity_type')}</option>
                <option value="Staff">{t('entity_types.Staff')}</option>
                <option value="Product">{t('entity_types.Product')}</option>
                <option value="Sale">{t('entity_types.Sale')}</option>
                <option value="SaleReturn">{t('entity_types.SaleReturn')}</option>
                <option value="Auth">{t('entity_types.Auth')}</option>
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('action')}
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('select_action')}</option>
                <option value="CREATE">{t('actions.CREATE')}</option>
                <option value="UPDATE">{t('actions.UPDATE')}</option>
                <option value="DELETE">{t('actions.DELETE')}</option>
                <option value="LOGIN">{t('actions.LOGIN')}</option>
                <option value="LOGOUT">{t('actions.LOGOUT')}</option>
                <option value="SALE">{t('actions.SALE')}</option>
                <option value="RETURN">{t('actions.RETURN')}</option>
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('start_date')}
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('end_date')}
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t('loading')}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">{t('no_data')}</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('staff')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('entity_type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('action')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('description')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {log.staff ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{log.staff.name} {log.staff.surName || ''}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{t(`entity_types.${log.entityType}`) || log.entityType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                          {t(`actions.${log.action}`) || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="max-w-md truncate" title={log.description || ''}>
                          {log.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(log)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('view_details')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(log)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {t('page')} {pagination.page} {t('of')} {pagination.totalPages} ({pagination.total} {t('items_per_page')})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

