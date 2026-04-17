import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { dailySummaryApi } from '../../api';
import Alert from '../ui/Alert';
import { useBranch } from '../../hooks';

export default function DailySummaryForm({ onClose, onCreated }) {
  const { t } = useTranslation('statistics');
  const [searchParams] = useSearchParams();
  const id = searchParams.get('dailySummaryId');
  const isDetail = !!id;
  const { selectedBranchId } = useBranch();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: todayStr,
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [productDetails, setProductDetails] = useState([]);
  const [printMode, setPrintMode] = useState('full'); // 'summary' | 'full'

  useEffect(() => {
    if (!isDetail) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await dailySummaryApi.getById(id);
        if (res.success && res.data) {
          setDetail(res.data);
          if (res.productDetails) {
            setProductDetails(res.productDetails);
          } else {
            setProductDetails([]);
          }
          const d = new Date(res.data.date);
          setFormData({
            date: d.toISOString().split('T')[0],
            note: res.data.note || '',
          });
        }
      } catch (e) {
        console.error('DailySummary detail error', e);
        Alert.error(t('error') || 'Xəta', t('error_fetching') || 'Məlumat alınarkən xəta baş verdi');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isDetail, id, t]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isDetail) return;

    setLoading(true);
    try {
      const res = await dailySummaryApi.create({
        date: formData.date,
        note: formData.note?.trim() || null,
        branchId: selectedBranchId,
      });
      if (res.success) {
        Alert.success(
          t('daily_summary_created') || 'Günlük yekun yaradıldı',
          res.message || ''
        );
        if (onCreated) onCreated(res.data);
        if (onClose) onClose();
      } else {
        Alert.error(t('error') || 'Xəta', res.message || t('error_fetching'));
      }
    } catch (e) {
      console.error('DailySummary create error', e);
      Alert.error(t('error') || 'Xəta', e.response?.data?.message || t('error_fetching'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    val != null ? Number(val).toFixed(2) : '0.00';

  const handlePrint = () => {
    if (!detail) return;
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isDetail
              ? (t('daily_summary_detail') || 'Günlük Yekun Detalları')
              : (t('create_daily_summary') || 'Günlük Yekun Yarat')}
          </h2>
          <div className="flex items-center gap-2">
            {isDetail && (
              <>
                <select
                  value={printMode}
                  onChange={(e) => setPrintMode(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-800"
                >
                  <option value="summary">
                    {t('print_summary') || 'Yalnız ümumi məlumat'}
                  </option>
                  <option value="full">
                    {t('print_full') || 'Ümumi + məhsullar ilə'}
                  </option>
                </select>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  {t('print') || 'Çap et'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {!isDetail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('date') || 'Tarix'}
              </label>
              <input
                type="date"
                value={formData.date}
                max={todayStr}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}

          {isDetail && detail && (
            <div
              className={`daily-summary-print ${printMode === 'summary' ? 'summary-only' : 'full'
                }`}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div>
                  <p className="text-gray-500">{t('total_sales_count') || 'Satış sayı'}</p>
                  <p className="font-semibold text-gray-900">{detail.totalSalesCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('total_products') || 'Məhsul sayı'}</p>
                  <p className="font-semibold text-gray-900">{detail.totalProducts}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('total_quantity') || 'Ümumi miqdar'}</p>
                  <p className="font-semibold text-gray-900">{detail.totalQuantity}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('total_revenue') || 'Ümumi gəlir'}</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(detail.totalRevenue)} AZN
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('total_purchase') || 'Ümumi alış'}</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(detail.totalPurchase)} AZN
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('total_profit') || 'Ümumi mənfəət'}</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(detail.totalProfit)} AZN
                  </p>
                </div>
              </div>

              {/* Məhsul detallar cədvəli - yalnız detail rejimində */}
              {productDetails.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    {t('products') || 'Məhsullar'}
                  </h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm daily-summary-product-table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            {t('product_name') || 'Məhsul adı'}
                          </th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">
                            {t('quantity') || 'Miqdar'}
                          </th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">
                            {t('revenue') || 'Gəlir'} (AZN)
                          </th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">
                            {t('profit') || 'Qazanc'} (AZN)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {productDetails.map((p) => (
                          <tr key={p.productId}>
                            <td className="px-4 py-2 text-gray-900">
                              {p.product?.name || '-'}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900">
                              {p.quantity}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900">
                              {formatCurrency(p.revenue)} AZN
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900">
                              {formatCurrency(p.profit)} AZN
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('note') || 'Qeyd'}
            </label>
            {isDetail ? (
              <p className="text-sm text-gray-800 whitespace-pre-line border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                {detail?.note || '-'}
              </p>
            ) : (
              <textarea
                rows={3}
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('note_placeholder') || 'Qeyd əlavə edin...'}
              />
            )}
          </div>

          {!isDetail && (
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
              >
                {t('cancel') || 'Ləğv et'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {loading
                  ? (t('saving') || 'Yadda saxlanılır...')
                  : (t('create_daily_summary') || 'Günlük yekun yarat')}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}


