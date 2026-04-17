import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { statisticsApi } from '../../api';
import DailySummaryForm from '../forms/DailySummaryForm.jsx';
import DailySummaryHistory from './DailySummaryHistory.jsx';
import DailySummaryDetailModal from './DailySummaryDetailModal.jsx';
import Alert from '../ui/Alert';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Calendar,
  PieChart,
  HandCoins,
  CreditCard,
  Banknote,
  Wallet,
  PiggyBank,
  ReceiptText,
  AlertCircle,
  CheckCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Hash,
  BarChart3
} from 'lucide-react';
import { useBranch } from '../../hooks';

export default function Statistics() {
  const { t } = useTranslation('statistics');
  const [overallData, setOverallData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentTypeData, setPaymentTypeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(false);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const { selectedBranchId, selectedBranchName } = useBranch();

  // Default tarixləri bu günə təyin et
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  useEffect(() => {
    fetchOverallStatistics();
    fetchTopProducts();
    fetchPaymentTypeStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  useEffect(() => {
    fetchOverallStatistics();
    fetchTopProducts();
    fetchPaymentTypeStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedBranchId]);

  const fetchOverallStatistics = async () => {
    try {
      const response = await statisticsApi.getOverall(startDate || null, endDate || null, selectedBranchId);
      if (response.success) {
        setOverallData(response.data);
      }
    } catch (error) {
      console.error('Error fetching overall statistics:', error);
      Alert.error(t('error'), t('error_fetching'));
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const params = { limit: 10 };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const response = await statisticsApi.getTopProducts(10, startDate || null, endDate || null, selectedBranchId);
      if (response.success) {
        setTopProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  const fetchPaymentTypeStatistics = async () => {
    try {
      const response = await statisticsApi.getByPaymentType(startDate || null, endDate || null, selectedBranchId);
      if (response.success) {
        setPaymentTypeData(response.data);
      }
    } catch (error) {
      console.error('Error fetching payment type statistics:', error);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
          {selectedBranchName && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {selectedBranchName}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowDailyForm(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            {t('create_daily_summary') || 'Günlük yekun yarat'}
          </button>
          <button
            type="button"
            onClick={() => setShowDailyHistory(prev => !prev)}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200"
          >
            {t('daily_summary_history') || 'Tarixçə'}
          </button>
        </div>
      </div>

      {showDailyForm && (
        <DailySummaryForm
          onClose={() => setShowDailyForm(false)}
          onCreated={() => {
            // yaradıldıqdan sonra tarixçə açıqdırsa, komponent mount qalıb və özü yenidən fetch edəcək
          }}
        />
      )}

      {showDailyHistory && (
        <DailySummaryHistory
          onClose={() => setShowDailyHistory(false)}
          onSelect={(row) => {
            setSelectedSummaryId(row.id);
            // URL-i yeniləmək isteğe bağlıdır, amma detail üçün id-ni saxlayırıq
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('dailySummaryId', row.id);
            window.history.replaceState({}, '', currentUrl.toString());
            // Tarixçəni bağlamırıq ki, geri dönmək rahat olsun, 
            // modal z-index ilə üstə çıxacaq.
          }}
        />
      )}

      {selectedSummaryId && (
        <DailySummaryDetailModal
          id={selectedSummaryId}
          onClose={() => {
            setSelectedSummaryId(null);
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('dailySummaryId');
            window.history.replaceState({}, '', currentUrl.toString());
          }}
        />
      )}

      {/* Date Range Filter - Page başında */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('select_date_range')}
          </h2>
          {(!startDate || !endDate) && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full animate-pulse uppercase tracking-wider">
              {t('all_time') || 'Bütün zamanlar'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('start_date')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('end_date')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const today = getTodayDate();
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {t('reset_to_today') || 'Bu gün'}
            </button>
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <PieChart className="w-4 h-4" />
              {t('overall_stats') || 'Ümumi Statistika'}
            </button>
          </div>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      {overallData && (
        <div className="space-y-4">

          {/* ── TOP BANNER: key financial figures ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ümumi Satış Məbləği */}
            <div className="flex items-center gap-4 p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Ümumi Satış</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(overallData.sales.totalAmount)}<span className="text-sm font-semibold ml-1">AZN</span></p>
                <p className="text-xs text-blue-400">{overallData.sales.total} satış</p>
                {(!startDate || !endDate) && overallData.sales.today && (
                  <p className="text-xs text-blue-400">Bu gün: {formatCurrency(overallData.sales.today.amount)} AZN</p>
                )}
              </div>
            </div>

            {/* Xalis Qazanc */}
            <div className="flex items-center gap-4 p-5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Xalis Qazanc</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(parseFloat(overallData.sales.totalProfit || 0) - parseFloat(overallData.expenses?.totalAmount || 0))}
                  <span className="text-sm font-semibold ml-1">AZN</span>
                </p>
                <p className="text-xs text-emerald-400">Qazanc - Xərclər</p>
                {(!startDate || !endDate) && overallData.sales.today && (
                  <p className="text-xs text-emerald-400">Bu gün: {formatCurrency(parseFloat(overallData.sales.today.profit || 0) - parseFloat(overallData.expenses?.today?.amount || 0))} AZN</p>
                )}
              </div>
            </div>

            {/* Ümumi Xərclər */}
            <div className="flex items-center gap-4 p-5 bg-red-50 border-2 border-red-200 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <ReceiptText className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Ümumi Xərclər</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(overallData.expenses?.totalAmount || 0)}<span className="text-sm font-semibold ml-1">AZN</span></p>
                {(!startDate || !endDate) && overallData.expenses?.today && (
                  <p className="text-xs text-red-400">Bu gün: {formatCurrency(overallData.expenses.today.amount)} AZN</p>
                )}
              </div>
            </div>

            {/* Kassada Qalan */}
            {overallData.cashbox && (
              <div className={`flex items-center gap-4 p-5 border-2 rounded-2xl ${
                parseFloat(overallData.cashbox.balance) > 0
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  parseFloat(overallData.cashbox.balance) > 0 ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  <PiggyBank className={`w-6 h-6 ${parseFloat(overallData.cashbox.balance) > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${parseFloat(overallData.cashbox.balance) > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                    Kassada Qalan
                  </p>
                  <p className={`text-2xl font-bold ${parseFloat(overallData.cashbox.balance) > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {formatCurrency(overallData.cashbox.balance)}<span className="text-sm font-semibold ml-1">AZN</span>
                  </p>
                  <p className={`text-xs ${parseFloat(overallData.cashbox.balance) > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                    {parseFloat(overallData.cashbox.balance) > 0 ? 'Hələ təslim edilməyib' : 'Hamısı təslim edilib'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── REVENUE BREAKDOWN BANNER ── */}
          <div className="p-5 bg-gray-800 rounded-2xl text-white">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gəlir Hesablaması</p>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Satışlar:</span>
                <span className="font-bold text-green-300">+{formatCurrency(overallData.sales.totalAmount)} AZN</span>
              </div>
              {overallData.returns?.returnedAmount > 0 && (
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-gray-300">Qaytarmalar:</span>
                  <span className="font-bold text-red-300">−{formatCurrency(overallData.returns.returnedAmount)} AZN</span>
                </div>
              )}
              {overallData.cashHandover?.totalAmount > 0 && (
                <div className="flex items-center gap-2">
                  <HandCoins className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-300">Məbləğ Təslimi:</span>
                  <span className="font-bold text-orange-300">{formatCurrency(overallData.cashHandover.totalAmount)} AZN</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2 pl-4 border-l border-gray-600">
                <span className="text-sm text-gray-300">Net Gəlir:</span>
                <span className="text-xl font-bold text-yellow-300">
                  {formatCurrency(overallData.sales.netRevenueAfterHandover || overallData.sales.totalAmount)} AZN
                </span>
              </div>
            </div>
          </div>

          {/* ── DETAIL CARDS GRID ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Satışlar */}
            <div className="p-5 bg-white border-2 border-blue-100 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-bold text-gray-800">Satışlar</span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{overallData.sales.total} ədəd</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ümumi məbləğ</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(overallData.sales.totalAmount)} AZN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Qazanc</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(overallData.sales.totalProfit)} AZN</span>
                </div>
                {(!startDate || !endDate) && overallData.sales.today && (
                  <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                    <span>Bu gün ({overallData.sales.today.count} satış)</span>
                    <span>{formatCurrency(overallData.sales.today.amount)} AZN</span>
                  </div>
                )}
              </div>
            </div>

            {/* Qaytarmalar */}
            <div className="p-5 bg-white border-2 border-red-100 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-bold text-gray-800">Qaytarmalar</span>
                </div>
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">{overallData.returns.total} ədəd</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Satış məbləği</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(overallData.returns.totalAmount)} AZN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Qaytarılan məbləğ</span>
                  <span className="font-semibold text-red-600">{formatCurrency(overallData.returns.returnedAmount)} AZN</span>
                </div>
                {(!startDate || !endDate) && overallData.returns.today && (
                  <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                    <span>Bu gün ({overallData.returns.today.count} qaytarma)</span>
                    <span>{formatCurrency(overallData.returns.today.amount)} AZN</span>
                  </div>
                )}
              </div>
            </div>

            {/* Məbləğ Təslimi */}
            {overallData.cashHandover && (
              <div className="p-5 bg-white border-2 border-orange-100 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <HandCoins className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-bold text-gray-800">Məbləğ Təslimi</span>
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">{overallData.cashHandover.total} ədəd</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cəmi təslim</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(overallData.cashHandover.totalAmount)} AZN</span>
                  </div>
                  {(!startDate || !endDate) && overallData.cashHandover.today && (
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                      <span>Bu gün ({overallData.cashHandover.today.count} təslim)</span>
                      <span>{formatCurrency(overallData.cashHandover.today.amount)} AZN</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kreditlər */}
            {overallData.credits && (
              <div className="p-5 bg-white border-2 border-violet-100 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-violet-600" />
                    </div>
                    <span className="font-bold text-gray-800">Kreditlər</span>
                  </div>
                  <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{overallData.credits.total} ədəd</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ümumi məbləğ</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(overallData.credits.totalAmount)} AZN</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ödənilib</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(overallData.credits.paidAmount)} AZN</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Qalıq</span>
                    <span className="font-semibold text-red-600">{formatCurrency(overallData.credits.remainingAmount)} AZN</span>
                  </div>
                  {overallData.credits.remainingAmount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-red-500 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {overallData.credits.active} aktiv kredit
                    </div>
                  )}
                  {(!startDate || !endDate) && overallData.credits.today && (
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                      <span>Bu gün ({overallData.credits.today.count} kredit)</span>
                      <span>{formatCurrency(overallData.credits.today.amount)} AZN</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Məhsullar */}
            <div className="p-5 bg-white border-2 border-green-100 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-bold text-gray-800">Məhsullar</span>
                </div>
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">{overallData.products.total} ədəd</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Aktiv</span>
                  <span className="font-semibold text-emerald-600">{overallData.products.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ümumi stok</span>
                  <span className="font-semibold text-gray-800">{overallData.products.totalStock.toLocaleString()} ədəd</span>
                </div>
                {overallData.products.deleted?.total > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-100 space-y-1">
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Silinmiş</span>
                      <span>{overallData.products.deleted.total}</span>
                    </div>
                    {overallData.products.deleted.archived > 0 && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Arxivlənmiş</span>
                        <span>{overallData.products.deleted.archived}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* İşçilər */}
            <div className="p-5 bg-white border-2 border-purple-100 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-bold text-gray-800">İşçilər</span>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">{overallData.staff.total} nəfər</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Aktiv</span>
                  <span className="font-semibold text-emerald-600">{overallData.staff.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Deaktiv</span>
                  <span className="font-semibold text-gray-400">{overallData.staff.total - overallData.staff.active}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* Top Products and Payment Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('top_products')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('product_name')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('quantity')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('revenue')} (AZN)</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('profit')} (AZN)</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length > 0 ? (
                  topProducts.map((item, index) => {
                    // Qutu/ədəd məlumatlarını formatla
                    const formatQuantity = () => {
                      const product = item.product || {};
                      const quantity = item.totalQuantity || 0;
                      const unitType = product.unitType || 'PIECE';
                      const piecesPerBox = product.piecesPerBox;

                      // Əgər PIECE tipindədirsə, sadəcə ədəd göstər
                      if (unitType === 'PIECE') {
                        return `${quantity} ədəd`;
                      }

                      // Qutu/paket tipindədirsə
                      if (piecesPerBox && piecesPerBox > 0) {
                        const boxes = Math.floor(quantity / piecesPerBox);
                        const pieces = quantity % piecesPerBox;
                        const unitLabel = unitType === 'BOX' ? 'ədəd' :
                          unitType === 'METER' ? 'metr' :
                            unitType === 'LITER' ? 'litr' :
                              unitType === 'KILOGRAM' ? 'kq' : 'ədəd';

                        if (boxes > 0 && pieces > 0) {
                          return `${boxes} ${unitType === 'BOX' ? 'qutu' : 'paket'} + ${pieces} açıq (${quantity} ${unitLabel})`;
                        } else if (boxes > 0) {
                          return `${boxes} ${unitType === 'BOX' ? 'qutu' : 'paket'} (${quantity} ${unitLabel})`;
                        } else if (pieces > 0) {
                          return `${pieces} açıq (${quantity} ${unitLabel})`;
                        }
                        return `${quantity} ${unitLabel}`;
                      }

                      return `${quantity} ədəd`;
                    };

                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800">
                          {item.product ? item.product.name : t('no_data')}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          <div className="flex flex-col items-end">
                            <span>{formatQuantity()}</span>
                            {item.product?.unitType && item.product.unitType !== 'PIECE' && (
                              <span className="text-xs text-gray-500">
                                {item.product.unitType === 'BOX' ? 'Qutu' :
                                  item.product.unitType === 'METER' ? 'Metr' :
                                    item.product.unitType === 'LITER' ? 'Litr' :
                                      item.product.unitType === 'KILOGRAM' ? 'Kiloqram' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(item.totalRevenue)}</td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(item.totalProfit)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">{t('no_data')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Type */}
        {paymentTypeData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {t('payment_type')}
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('cash')}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(paymentTypeData.cash.amount)} AZN</p>
                    <p className="text-xs text-gray-500 mt-1">{paymentTypeData.cash.count} {t('count')}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('card')}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(paymentTypeData.card.amount)} AZN</p>
                    <p className="text-xs text-gray-500 mt-1">{paymentTypeData.card.count} {t('count')}</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('other')}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(paymentTypeData.other.amount)} AZN</p>
                    <p className="text-xs text-gray-500 mt-1">{paymentTypeData.other.count} {t('count')}</p>
                  </div>
                  <Package className="w-8 h-8 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

