import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dailySummaryApi } from '../../api';
import Alert from '../ui/Alert';

export default function DailySummaryHistory({ onSelect, onClose }) {
  const { t, i18n } = useTranslation('statistics');
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    startDate: todayStr,
    endDate: todayStr,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dailySummaryApi.getAll({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      if (res.success) {
        setData(res.data || []);
        setTotals(res.totals || null);
      } else {
        setData([]);
        setTotals(null);
      }
    } catch (e) {
      console.error('DailySummary list error', e);
      Alert.error(t('error') || 'Xəta', t('error_fetching') || 'Məlumat alınarkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (d) => {
    if (!d) return '-';
    const dateObj = new Date(d);
    return dateObj.toLocaleString(i18n.language === 'az' ? 'az-AZ' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (v) =>
    v != null ? Number(v).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {t('daily_summary_history') || 'Günlük Yekun Tarixçəsi'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
        {/* Filterlər */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('start_date')}
          </label>
          <input
            type="date"
            value={filters.startDate}
            max={todayStr}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, startDate: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('end_date')}
          </label>
          <input
            type="date"
            value={filters.endDate}
            max={todayStr}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, endDate: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {t('apply') || 'Tətbiq et'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ startDate: '', endDate: '' });
              fetchData();
            }}
            className="px-5 py-2.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            {t('reset') || 'Sıfırla'}
          </button>
        </div>
      </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500">
            {t('loading') || 'Yüklənir...'}
          </div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {t('no_data') || 'Məlumat yoxdur'}
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    {t('date') || 'Tarix'}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    {t('total_sales_count') || 'Satış sayı'}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    {t('total_products') || 'Məhsul sayı'}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    {t('total_quantity') || 'Ümumi miqdar'}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    {t('total_revenue') || 'Gəlir'} (AZN)
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    {t('total_profit') || 'Mənfəət'} (AZN)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    {t('staff') || 'İşçi'}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    {t('actions') || 'Əməliyyatlar'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {row.totalSalesCount}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {row.totalProducts}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {row.totalQuantity}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {formatCurrency(row.totalProfit)}
                    </td>
                    <td className="px-4 py-2 text-gray-900">
                      {row.staff
                        ? `${row.staff.name} ${row.staff.surName || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onSelect && onSelect(row)}
                        className="px-3 py-1 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        {t('view_detail') || 'Detallı bax'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totals && (
            <div className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold">{t('totals') || 'Cəmi'}:</span>{' '}
                {t('total_sales_count') || 'Satış'}: {totals.totalSalesCount} •{' '}
                {t('total_products') || 'Məhsul'}: {totals.totalProducts} •{' '}
                {t('total_quantity') || 'Miqdar'}: {totals.totalQuantity} •{' '}
                {t('total_revenue') || 'Gəlir'}: {formatCurrency(totals.totalRevenue)} AZN •{' '}
                {t('total_profit') || 'Mənfəət'}: {formatCurrency(totals.totalProfit)} AZN
              </p>
            </div>
          )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}


