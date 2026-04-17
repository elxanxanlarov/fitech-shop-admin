import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { activityLogApi, staffApi } from '../../api';
import TableTemplate from '../ui/TableTamplate';
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
import { useLocalStorage, useBranch } from '../../hooks';

export default function ActivityLog() {
  const { t } = useTranslation('activityLog');
  const { t: tAlert } = useTranslation('alert');
  const navigate = useNavigate();
  const { selectedBranchId, selectedBranchName } = useBranch();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);

  // Filters
  const [filters, setFilters] = useLocalStorage('activityLog_filters', {
    staffId: '',
    entityType: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  /** Əməliyyat filialı: kontekst qeydi → işçinin öz filialı → filialsız */
  const formatLogBranchLabel = (log) => {
    if (log.branch?.name) return log.branch.name;
    if (log.staff?.branch?.name) return log.staff.branch.name;
    if (log.staff) {
      return t('branch_not_assigned') || 'Filial təyin edilməyib';
    }
    return '—';
  };

  // Cədvəl sütunları
  const columns = [
    {
      key: 'createdAt',
      label: t('date'),
      render: (value) => formatDate(value)
    },
    {
      key: 'action',
      label: t('action') || 'Əməliyyat',
      render: (_value, log) => {
        const actionText = t(`actions.${log.action}`) || log.action || '-';
        const entityText = t(`entity_types.${log.entityType}`) || log.entityType || '';
        return entityText ? `${actionText} (${entityText})` : actionText;
      }
    },
    {
      key: 'entityName',
      label: t('entity') || 'Məhsulun adı',
      render: (_value, log) => {
        // Məhsul üçün description-dan adı çıxarmağa cəhd et
        if (log.entityType === 'Product' && log.description) {
          const match = log.description.match(/Məhsulun adı:\s*([^-.]+)/);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
        // İşçi: "Yeni işçi yaradıldı: Ad Soyad" / yeniləndi / silindi
        if (log.entityType === 'Staff' && log.description) {
          const m = log.description.match(/:\s*(.+)$/);
          if (m && m[1]) return m[1].trim();
        }
        // Əgər məhsul deyilsə və ya tapılmadısa, entity type göstər
        return t(`entity_types.${log.entityType}`) || log.entityType || '-';
      }
    },
    {
      key: 'contextBranch',
      label: t('context_branch') || 'Əməliyyat filialı',
      render: (_value, log) => formatLogBranchLabel(log)
    },
    {
      key: 'changeSummary',
      label: t('changes') || 'Dəyişikliklər',
      render: (_value, log) => {
        const { changes } = log;
        if (!changes) return '-';

        // Sahə adları üçün Azərbaycan dilində label-lar
        const fieldLabels = {
          name: 'Ad',
          surName: 'Soyad',
          phone: 'Telefon',
          email: 'E-poçt',
          roleId: 'Rol',
          branchId: 'Filial',
          isBoss: 'Baş admin',
          password: 'Şifrə',
          description: 'Təsvir',
          purchasePrice: 'Alış qiyməti',
          salePrice: 'Satış qiyməti',
          stock: 'Stok',
          isActive: 'Aktivlik',
          hasDiscount: 'Endirim',
          deleteType: 'Silinmə tipi',
          categoryId: 'Kateqoriya',
          subCategoryId: 'Alt kateqoriya',
          customerName: 'Müştəri adı',
          customerSurname: 'Müştəri soyadı',
          customerPhone: 'Telefon',
          paymentType: 'Ödəniş növü',
          // Satış (Sale)
          totalAmount: 'Ümumi məbləğ (AZN)',
          profitAmount: 'Mənfəət (AZN)',
          itemsCount: 'Məhsul sayı',
          // Günlük yekun (DailySummary)
          date: 'Tarix',
          totalSalesCount: 'Satış sayı',
          totalProducts: 'Məhsul sayı',
          totalQuantity: 'Ümumi miqdar',
          totalRevenue: 'Ümumi gəlir (AZN)',
          totalPurchase: 'Ümumi alış (AZN)',
          totalProfit: 'Ümumi mənfəət (AZN)',
          // Yekun təslimat (FinalDelivery)
          title: 'Başlıq',
          startDate: 'Başlanğıc tarixi',
          endDate: 'Son tarix'
        };

        const formatValue = (key, val) => {
          if (val === null || val === undefined) return 'boş';
          if (typeof val === 'boolean') return val ? 'bəli' : 'xeyr';
          if (
            ['totalSalesCount', 'totalProducts', 'totalQuantity'].includes(key) &&
            typeof val === 'number'
          ) {
            return val.toString();
          }
          if (
            ['totalRevenue', 'totalPurchase', 'totalProfit', 'totalAmount', 'profitAmount'].includes(key) &&
            (typeof val === 'number' || typeof val === 'string')
          ) {
            const num = Number(val);
            if (Number.isNaN(num)) return String(val);
            return num.toFixed(2);
          }
          if (['date', 'startDate', 'endDate'].includes(key)) {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('az-AZ', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                });
              }
            } catch {
              // ignore
            }
            return String(val);
          }
          return String(val);
        };

        // Əgər changes sadə obyekt kimidirsə: { field: { old, new }, ... }
        if (typeof changes === 'object' && !Array.isArray(changes)) {
          // Texniki field-ləri göstərmə (id, saleId və s.)
          const technicalKeys = ['id', 'saleId', 'entityId', 'productId', 'staffId'];
          const entries = Object.entries(changes).filter(
            ([key]) => !technicalKeys.includes(key)
          );
          if (entries.length === 0) return '-';

          const parts = entries.map(([key, value]) => {
            const label = fieldLabels[key] || key;

            // { old, new } forması
            if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
              return `${label}: ${formatValue(key, value.old)} => ${formatValue(
                key,
                value.new
              )}`;
            }

            // Yalnız yeni dəyər
            return `${label}: ${formatValue(key, value)}`;
          });

          return parts.join(' | ');
        }

        // Başqa formatlarda sadəcə string-ə çevir
        return typeof changes === 'string' ? changes : JSON.stringify(changes);
      }
    }
  ];

  useEffect(() => {
    fetchStaffList();
  }, [selectedBranchId]);

  useEffect(() => {
    fetchActivityLogs();
  }, [filters.staffId, filters.entityType, filters.action, filters.startDate, filters.endDate, selectedBranchId]);

  const fetchStaffList = async () => {
    try {
      // Filiala uyğun işçiləri gətir (Center üçün 'null' göndər)
      const branchQuery = selectedBranchId === 'central' ? 'null' : (selectedBranchId || null);
      const response = await staffApi.getAll({ branchId: branchQuery });

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
        // Lokal pagination istifadə edirik deyə sadəcə kifayət qədər böyük limit verək
        page: 1,
        limit: 500
      };

      if (filters.staffId) params.staffId = filters.staffId;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      // Filial filtri: seçilmiş filial varsa, o filialın işçilərinin əməliyyatlarını göstər
      if (selectedBranchId && selectedBranchId !== 'central') {
        params.branchId = selectedBranchId;
        // Kürdəxanı seçiləndə köhnə (filialsız) qeydlər də göstərilsin
        if (selectedBranchName === 'Kürdəxanı') {
          params.includeUnassigned = 'true';
        }
      }

      const response = await activityLogApi.getAll(params);

      if (response.success) {
        setLogs(response.data || []);
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
      case 'SOFT_DELETE':
        return 'bg-orange-100 text-orange-800';
      case 'HARD_DELETE':
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
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${showFilters
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
                <option value="Category">{t('entity_types.Category')}</option>
                <option value="SubCategory">{t('entity_types.SubCategory')}</option>
                <option value="Expense">{t('entity_types.Expense')}</option>
                <option value="CashHandover">{t('entity_types.CashHandover')}</option>
                <option value="Role">{t('entity_types.Role')}</option>
                <option value="Auth">{t('entity_types.Auth')}</option>
                <option value="StockMovement">{t('entity_types.StockMovement')}</option>
                <option value="CreditPayment">{t('entity_types.CreditPayment')}</option>
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
                <option value="SOFT_DELETE">{t('actions.SOFT_DELETE')}</option>
                <option value="HARD_DELETE">{t('actions.HARD_DELETE')}</option>
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

      <TableTemplate
        data={logs}
        columns={columns}
        title={t('title') || 'Son Əməliyyatlar'}
        onView={handleViewDetails}
        showBulkActions={false}
        showFilters={false}
        showSearch={false}
        showDateFilter={false}
        loading={loading}
        emptyState={{
          icon: 'activity',
          title: t('no_data') || 'Məlumat yoxdur',
          description: t('error_fetching') || 'Activity log tapılmadı',
          showAction: false
        }}
      />
    </div>
  );
}

