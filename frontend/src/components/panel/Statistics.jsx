import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { statisticsApi } from '../../api';
import DailySummaryForm from '../forms/DailySummaryForm.jsx';
import DailySummaryHistory from './DailySummaryHistory.jsx';
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
  CreditCard
} from 'lucide-react';

export default function Statistics() {
  const { t } = useTranslation('statistics');
  const [overallData, setOverallData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentTypeData, setPaymentTypeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(false);

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
  }, []);

  useEffect(() => {
    fetchOverallStatistics();
    fetchTopProducts();
    fetchPaymentTypeStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchOverallStatistics = async () => {
    try {
      const response = await statisticsApi.getOverall(startDate || null, endDate || null);
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
      const response = await statisticsApi.getTopProducts(10, startDate || null, endDate || null);
      if (response.success) {
        setTopProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  const fetchPaymentTypeStatistics = async () => {
    try {
      const response = await statisticsApi.getByPaymentType(startDate || null, endDate || null);
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
        <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
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
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('dailySummaryId', row.id);
            window.history.replaceState({}, '', currentUrl.toString());
            setShowDailyHistory(false);
            setShowDailyForm(true);
          }}
        />
      )}

      {/* Date Range Filter - Page başında */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t('select_date_range')}
        </h2>
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
              {t('reset_to_today') || 'Bu günə qayıt'}
            </button>
          </div>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      {overallData && (
        <div className="space-y-6">
          {/* Total Revenue & Profit Summary */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sol tərəf - Gəlir hesablaması */}
              <div className="space-y-3">
                <p className="text-blue-100 text-sm font-medium mb-3">{t('revenue_calculation') || 'Gəlir Hesablaması'}</p>

                {/* Satışlar */}
                <div className="flex justify-between items-center">
                  <span className="text-blue-100 text-sm">{t('sales') || 'Satışlar'}:</span>
                  <span className="text-xl font-semibold">+{formatCurrency(overallData.sales.totalAmount)} AZN</span>
                </div>

                {/* Qaytarmalar */}
                {overallData.returns && overallData.returns.returnedAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100 text-sm">{t('returns') || 'Qaytarmalar'}:</span>
                    <span className="text-xl font-semibold text-red-200">-{formatCurrency(overallData.returns.returnedAmount)} AZN</span>
                  </div>
                )}

                {/* Təslim edilmiş məbləğ */}
                {overallData.cashHandover && overallData.cashHandover.totalAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100 text-sm">{t('cash_handover') || 'Məbləğ Təslimi'}:</span>
                    <span className="text-xl font-semibold text-orange-200">-{formatCurrency(overallData.cashHandover.totalAmount)} AZN</span>
                  </div>
                )}

                {/* Ümumi Gəlir */}
                <div className="flex justify-between items-center pt-3 border-t border-blue-400">
                  <span className="text-yellow-100 font-semibold">{t('total_revenue') || 'Ümumi Gəlir'}:</span>
                  <span className="text-2xl font-bold text-yellow-200">
                    {formatCurrency(overallData.sales.netRevenueAfterHandover || overallData.sales.totalAmount)} AZN
                  </span>
                </div>

                {(!startDate || !endDate) && overallData.sales.today && (
                  <p className="text-xs text-blue-100 mt-2">
                    {t('today')}: {formatCurrency(overallData.sales.today.netRevenueAfterHandover || overallData.sales.today.amount)} AZN
                  </p>
                )}
              </div>

              {/* Sağ tərəf - Qazanc və Xərclər */}
              <div className="space-y-3">
                {/* Xalis Qazanc */}
                <div>
                  <p className="text-green-100 text-sm font-medium mb-2">{t('net_profit') || 'Xalis Qazanc'}</p>
                  <p className="text-3xl font-bold text-green-200">{formatCurrency(
                    parseFloat(overallData.sales.totalProfit || 0) - parseFloat(overallData.expenses?.totalAmount || 0)
                  )} AZN</p>
                  {(!startDate || !endDate) && overallData.sales.today && (
                    <p className="text-xs text-blue-100 mt-1">
                      {t('today')}: {formatCurrency(
                        parseFloat(overallData.sales.today.profit || 0) - parseFloat(overallData.expenses?.today?.amount || 0)
                      )} AZN
                    </p>
                  )}
                </div>

                {/* Xərclər */}
                <div className="pt-3 border-t border-blue-400">
                  <p className="text-red-100 text-sm font-medium mb-2">{t('total_expenses') || 'Ümumi Xərclər'}</p>
                  <p className="text-3xl font-bold text-red-200">
                    {formatCurrency(overallData.expenses?.totalAmount || 0)} AZN
                  </p>
                  {(!startDate || !endDate) && overallData.expenses?.today && (
                    <p className="text-xs text-blue-100 mt-1">
                      {t('today')}: {formatCurrency(overallData.expenses.today.amount || 0)} AZN
                    </p>
                  )}
                </div>


              </div>
            </div>


          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Sales Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{t('sales')}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">
                    {overallData.sales.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('amount')}: {formatCurrency(overallData.sales.totalAmount)} AZN
                  </p>
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {t('profit')}: {formatCurrency(overallData.sales.totalProfit)} AZN
                  </p>
                  {(!startDate || !endDate) && overallData.sales.today && (
                    <p className="text-xs text-gray-400 mt-2">
                      {t('today')}: {overallData.sales.today.count} ({formatCurrency(overallData.sales.today.amount)} AZN)
                    </p>
                  )}
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Returns Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{t('returns')}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">
                    {overallData.returns.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('amount')}: {formatCurrency(overallData.returns.totalAmount)} AZN
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    {t('returned_amount')}: {formatCurrency(overallData.returns.returnedAmount)} AZN
                  </p>
                  {(!startDate || !endDate) && overallData.returns.today && (
                    <p className="text-xs text-gray-400 mt-2">
                      {t('today')}: {overallData.returns.today.count} ({formatCurrency(overallData.returns.today.amount)} AZN)
                    </p>
                  )}
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Products Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{t('products')}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">
                    {overallData.products.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {t('active')}: {overallData.products.active}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('stock')}: {overallData.products.totalStock.toLocaleString()}
                  </p>
                  {overallData.products.deleted && overallData.products.deleted.total > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-red-600 font-medium">
                        {t('deleted')}: {overallData.products.deleted.total}
                      </p>
                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        {overallData.products.deleted.soft > 0 && (
                          <p>• {t('soft_deleted')}: {overallData.products.deleted.soft}</p>
                        )}
                        {overallData.products.deleted.archived > 0 && (
                          <p>• {t('archived')}: {overallData.products.deleted.archived}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <Package className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Staff Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{t('staff')}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">
                    {overallData.staff.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    {t('active')}: {overallData.staff.active}
                  </p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Cash Handover Card */}
            {overallData.cashHandover && (
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{t('cash_handover') || 'Məbləğ Təslimi'}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">
                      {overallData.cashHandover.total.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('amount')}: {formatCurrency(overallData.cashHandover.totalAmount)} AZN
                    </p>
                    {(!startDate || !endDate) && overallData.cashHandover.today && (
                      <p className="text-xs text-gray-400 mt-2">
                        {t('today')}: {overallData.cashHandover.today.count} ({formatCurrency(overallData.cashHandover.today.amount)} AZN)
                      </p>
                    )}
                  </div>
                  <div className="bg-orange-100 rounded-full p-3">
                    <HandCoins className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Credits Card */}
            {overallData.credits && (
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{t('credits') || 'Kreditlər'}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">
                      {overallData.credits.total.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('total_amount')}: {formatCurrency(overallData.credits.totalAmount)} AZN
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {t('paid_amount')}: {formatCurrency(overallData.credits.paidAmount)} AZN
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      {t('remaining_amount')}: {formatCurrency(overallData.credits.remainingAmount)} AZN
                    </p>
                    <p className="text-sm text-purple-600 mt-1">
                      {t('active')}: {overallData.credits.active}
                    </p>
                    {(!startDate || !endDate) && overallData.credits.today && (
                      <p className="text-xs text-gray-400 mt-2">
                        {t('today')}: {overallData.credits.today.count} ({formatCurrency(overallData.credits.today.amount)} AZN)
                      </p>
                    )}
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <CreditCard className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>
            )}
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

