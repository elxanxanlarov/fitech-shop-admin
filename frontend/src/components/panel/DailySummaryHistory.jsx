import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dailySummaryApi } from '../../api';
import Alert from '../ui/Alert';
import { MdClose, MdRefresh, MdSearch, MdChevronRight, MdHistory } from 'react-icons/md';
import { useBranch } from '../../hooks';

export default function DailySummaryHistory({ onSelect, onClose }) {
  const { t, i18n } = useTranslation('statistics');
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const { selectedBranchId } = useBranch();
  const [branchSettings, setBranchSettings] = useState({ showPurchasePrice: true });

  // Fetch branch settings
  useEffect(() => {
    const fetchBranchSettings = async () => {
      if (selectedBranchId && selectedBranchId !== 'central') {
        try {
          const { branchApi } = await import('../../api');
          const response = await branchApi.getById(selectedBranchId);
          if (response.success && response.data) {
            setBranchSettings({
              showPurchasePrice: response.data.showPurchasePrice !== false
            });
          }
        } catch (error) {
          console.error('Error fetching branch settings:', error);
        }
      } else {
        setBranchSettings({ showPurchasePrice: true });
      }
    };
    fetchBranchSettings();
  }, [selectedBranchId]);

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
        branchId: selectedBranchId || undefined,
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
  }, [selectedBranchId]);

  const formatDate = (d) => {
    if (!d) return '-';
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString(i18n.language === 'az' ? 'az-AZ' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (v) =>
    v != null ? Number(v).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <MdHistory className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {t('daily_summary_history') || 'Günlük Yekun Tarixçəsi'}
              </h2>
              <p className="text-sm text-gray-500 font-medium">Arxivləşmiş gündəlik hesabatların siyahısı</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all"
          >
            <MdClose className="w-8 h-8" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto space-y-6 scrollbar-thin">
          {/* Filter Section */}
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                {t('start_date')}
              </label>
              <input
                type="date"
                value={filters.startDate}
                max={todayStr}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                {t('end_date')}
              </label>
              <input
                type="date"
                value={filters.endDate}
                max={todayStr}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchData}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                <MdSearch className="w-5 h-5" />
                {t('apply') || 'Axtar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ startDate: todayStr, endDate: todayStr });
                  fetchData();
                }}
                className="p-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all"
                title={t('reset')}
              >
                <MdRefresh className="w-6 h-6" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{t('loading') || 'Yüklənir...'}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
              <p className="text-gray-400 font-medium">{t('no_data') || 'Bu tarixlərdə hesabat tapılmadı'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-hidden border border-gray-100 rounded-[2rem] shadow-sm">
                <table className="min-w-full divide-y divide-gray-50">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('date') || 'Tarix'}</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Satış</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Gəlir</th>
                      {branchSettings.showPurchasePrice && (
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Mənfəət</th>
                      )}
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tərtib edən</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {data.map((row) => (
                      <tr key={row.id} className="group hover:bg-indigo-50/30 transition-all duration-200">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-gray-700">{row.totalSalesCount}</span>
                          <span className="text-[10px] text-gray-400 ml-1 font-bold">ədəd</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {formatCurrency(row.totalRevenue)} <span className="text-[10px] text-gray-400">AZN</span>
                        </td>
                        {branchSettings.showPurchasePrice && (
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-emerald-600">{formatCurrency(row.totalProfit)}</span>
                            <span className="text-[10px] text-emerald-400 ml-1 font-bold">AZN</span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {row.staff ? `${row.staff.name} ${row.staff.surName || ''}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => onSelect && onSelect(row)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                          >
                            {t('view_detail') || 'Detallı bax'}
                            <MdChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totals && (
                <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-100">
                  <div className="flex flex-wrap items-center justify-between gap-6 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <MdHistory className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-widest opacity-80">Seçilmiş dövrün cəmi:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-8">
                      <div className="text-center">
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Satış</p>
                        <p className="text-lg font-black">{totals.totalSalesCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Gəlir</p>
                        <p className="text-lg font-black">{formatCurrency(totals.totalRevenue)} <span className="text-xs font-normal opacity-60">AZN</span></p>
                      </div>
                      {branchSettings.showPurchasePrice && (
                        <div className="text-center">
                          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Mənfəət</p>
                          <p className="text-lg font-black">{formatCurrency(totals.totalProfit)} <span className="text-xs font-normal opacity-60">AZN</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-white border border-gray-200 text-gray-700 font-black text-sm rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
          >
            Bağla
          </button>
        </div>
      </div>
    </div>
  );
}
