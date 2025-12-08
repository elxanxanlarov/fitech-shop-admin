import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { statisticsApi } from '../../api';
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
  HandCoins
} from 'lucide-react';

export default function Statistics() {
  const { t } = useTranslation('statistics');
  const [overallData, setOverallData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentTypeData, setPaymentTypeData] = useState(null);
  const [loading, setLoading] = useState(true);
  
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('az-AZ', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
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
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-2">{t('total_revenue') || 'Ümumi Gəlir'}</p>
                <p className="text-3xl font-bold">{formatCurrency(overallData.sales.totalAmount)} AZN</p>
                {(!startDate || !endDate) && overallData.sales.today && (
                  <p className="text-xs text-blue-100 mt-1">
                    {t('today')}: {formatCurrency(overallData.sales.today.amount)} AZN
                  </p>
                )}
              </div>
              <div>
                <p className="text-green-200 text-sm font-medium mb-2">{t('total_profit') || 'Ümumi Qazanc'}</p>
                <p className="text-3xl font-bold text-green-200">{formatCurrency(overallData.sales.totalProfit)} AZN</p>
                {(!startDate || !endDate) && overallData.sales.today && (
                  <p className="text-xs text-blue-100 mt-1">
                    {t('today')}: {formatCurrency(overallData.sales.today.profit)} AZN
                  </p>
                )}
              </div>
              <div>
                <p className="text-red-200 text-sm font-medium mb-2">{t('total_expenses') || 'Ümumi Xərclər'}</p>
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
            {overallData.expenses && (
              <div className="mt-4 pt-4 border-t border-blue-400">
                <div className="flex items-center justify-between">
                  <p className="text-blue-100 text-sm font-medium">{t('net_profit') || 'Xalis Qazanc'}</p>
                  <p className="text-2xl font-bold text-green-200">
                    {formatCurrency(
                      parseFloat(overallData.sales.totalProfit || 0) - parseFloat(overallData.expenses.totalAmount || 0)
                    )} AZN
                  </p>
                </div>
              </div>
            )}
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
                  topProducts.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-800">
                        {item.product ? item.product.name : t('no_data')}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">{item.totalQuantity}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(item.totalRevenue)}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(item.totalProfit)}</td>
                    </tr>
                  ))
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

