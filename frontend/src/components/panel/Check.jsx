import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { saleApi, receiptApi } from '../../api';
import Alert from '../ui/Alert';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Check() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const saleId = searchParams.get('id');
    const { t } = useTranslation('sale');
    const { t: tAlert } = useTranslation('alert');

    const [sale, setSale] = useState(null);
    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!saleId) {
                Alert.error(t('error') || 'Xəta!', t('sale_id_required') || 'Satış ID tələb olunur');
                navigate('/admin/sales');
                return;
            }

            try {
                setLoading(true);
                
                // Əvvəlcə qəbz məlumatlarını gətir
                try {
                    const receiptResponse = await receiptApi.getBySaleId(saleId);
                    if (receiptResponse.success && receiptResponse.data) {
                        setReceipt(receiptResponse.data);
                        // Qəbz varsa, satış məlumatlarını da qəbz-dən götür
                        if (receiptResponse.data.sale) {
                            setSale(receiptResponse.data.sale);
                        } else {
                            // Qəbz varsa amma sale include olmayıbsa, sale-i ayrıca gətir
                            const saleResponse = await saleApi.getById(saleId);
                            if (saleResponse.success && saleResponse.date) {
                                setSale(saleResponse.date);
                            }
                        }
                    } else {
                        // Qəbz yoxdursa, satış məlumatlarını gətir
                        const saleResponse = await saleApi.getById(saleId);
                        if (saleResponse.success && saleResponse.date) {
                            setSale(saleResponse.date);
                        } else {
                            Alert.error(t('error') || 'Xəta!', t('sale_not_found') || 'Satış tapılmadı');
                            navigate('/admin/sales');
                        }
                    }
                } catch (receiptError) {
                    // Qəbz xətası halında, satış məlumatlarını gətir
                    const saleResponse = await saleApi.getById(saleId);
                    if (saleResponse.success && saleResponse.date) {
                        setSale(saleResponse.date);
                    } else {
                        Alert.error(t('error') || 'Xəta!', t('sale_not_found') || 'Satış tapılmadı');
                        navigate('/admin/sales');
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                Alert.error(t('error') || 'Xəta!', error.response?.data?.message || t('error_fetching_text') || 'Məlumatlar alınarkən xəta baş verdi');
                navigate('/admin/sales');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [saleId, navigate, t]);

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        navigate('/admin/sales');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('loading') || 'Yüklənir...'}</p>
                </div>
            </div>
        );
    }

    if (!sale) {
        return null;
    }

    // Qəbz məlumatları varsa, onları istifadə et
    const displaySale = receipt?.sale || sale;
    const customerName = `${displaySale.customerName || ''} ${displaySale.customerSurname || ''}`.trim() || t('walk_in_customer') || 'Gəzinti müştərisi';
    const receiptNumber = receipt?.receiptNumber || `#${sale.id.substring(0, 8).toUpperCase()}`;

    return (
        <div className="p-6">
            {/* Print Actions - Hidden when printing */}
            <div className="mb-6 flex justify-between items-center no-print">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('back') || 'Geri'}
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    {t('print') || 'Çap Et'}
                </button>
            </div>

            {/* Check Content */}
            <div className="max-w-2xl mx-auto bg-white border-2 border-gray-300 rounded-lg p-8 shadow-lg print:shadow-none print:border-0">
                {/* Header */}
                <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
                    <div className="flex items-center justify-center mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('receipt') || 'Qəbz'}</h1>
                    <p className="text-gray-600">{t('sale_receipt') || 'Satış Qəbzi'}</p>
                </div>

                {/* Sale Info */}
                <div className="mb-6 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">{t('receipt_number') || 'Qəbz №'}:</span>
                        <span className="text-gray-900 font-semibold">{receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">{t('date') || 'Tarix'}:</span>
                        <span className="text-gray-900">
                            {new Date(displaySale.createdAt).toLocaleString('az-AZ', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">{t('customer') || 'Müştəri'}:</span>
                        <span className="text-gray-900 font-semibold">{customerName}</span>
                    </div>
                    {displaySale.customerPhone && (
                        <div className="flex justify-between">
                            <span className="text-gray-600 font-medium">{t('phone') || 'Telefon'}:</span>
                            <span className="text-gray-900">{displaySale.customerPhone}</span>
                        </div>
                    )}
                </div>

                {/* Items Table */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('items') || 'Məhsullar'}</h2>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('product') || 'Məhsul'}</th>
                                <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">{t('quantity') || 'Miqdar'}</th>
                                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">{t('price') || 'Qiymət'}</th>
                                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">{t('total') || 'Cəmi'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displaySale.items?.map((item, index) => (
                                <tr key={item.id || index} className="border-b border-gray-200">
                                    <td className="py-3 px-2 text-sm text-gray-900">
                                        {item.product?.name || '-'}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-center text-gray-900">
                                        {item.quantity || 0}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-right text-gray-900">
                                        {parseFloat(item.pricePerItem || 0).toFixed(2)} ₼
                                    </td>
                                    <td className="py-3 px-2 text-sm text-right font-semibold text-gray-900">
                                        {parseFloat(item.totalPrice || 0).toFixed(2)} ₼
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="mb-6 space-y-2 border-t-2 border-gray-300 pt-4">
                    <div className="flex justify-between text-lg">
                        <span className="font-semibold text-gray-700">{t('subtotal') || 'Alt Cəmi'}:</span>
                        <span className="font-semibold text-gray-900">
                            {parseFloat(displaySale.totalAmount || 0).toFixed(2)} ₼
                        </span>
                    </div>
                    <div className="flex justify-between text-lg">
                        <span className="font-semibold text-gray-700">{t('paid_amount') || 'Ödənilən'}:</span>
                        <span className="font-semibold text-green-600">
                            {parseFloat(displaySale.paidAmount || 0).toFixed(2)} ₼
                        </span>
                    </div>
                    {parseFloat(displaySale.paidAmount || 0) < parseFloat(displaySale.totalAmount || 0) && (
                        <div className="flex justify-between text-lg">
                            <span className="font-semibold text-gray-700">{t('remaining') || 'Qalan'}:</span>
                            <span className="font-semibold text-red-600">
                                {(parseFloat(displaySale.totalAmount || 0) - parseFloat(displaySale.paidAmount || 0)).toFixed(2)} ₼
                            </span>
                        </div>
                    )}
                    {displaySale.profitAmount && (
                        <div className="flex justify-between text-lg border-t border-gray-300 pt-2 mt-2">
                            <span className="font-semibold text-gray-700">{t('profit') || 'Qazanc'}:</span>
                            <span className="font-semibold text-blue-600">
                                {parseFloat(displaySale.profitAmount || 0).toFixed(2)} ₼
                            </span>
                        </div>
                    )}
                </div>

                {/* Note */}
                {(displaySale.note || receipt?.note) && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('note') || 'Qeyd'}:</p>
                        <p className="text-sm text-gray-600">{displaySale.note || receipt?.note}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pt-6 border-t-2 border-gray-300">
                    <p className="text-sm text-gray-500">{t('thank_you') || 'Təşəkkür edirik!'}</p>
                    <p className="text-xs text-gray-400 mt-2">{t('come_again') || 'Yenidən gözləyirik'}</p>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print\\:shadow-none,
                    .print\\:border-0 {
                        visibility: visible;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:shadow-none {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        page-break-after: avoid;
                    }
                    @page {
                        margin: 15mm;
                        size: A4;
                    }
                    @media print {
                        .no-print {
                            display: none !important;
                        }
                    }
                }
            `}</style>
        </div>
    );
}

