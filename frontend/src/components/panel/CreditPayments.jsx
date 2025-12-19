import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Alert from '../ui/Alert';
import Input from '../ui/Input';
import { creditPaymentApi } from '../../api';
import { MdAttachMoney, MdCheckCircle, MdCancel } from 'react-icons/md';
import { getFullMonthYear, getMonthNameFromDate } from '../../data/months';

export default function CreditPayments() {
    const { t } = useTranslation('sale');
    const { t: tAlert } = useTranslation('alert');
    const [searchParams] = useSearchParams();
    const saleId = searchParams.get('saleId');

    const [sale, setSale] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentData, setPaymentData] = useState({
        amount: '',
        paymentType: 'cash',
        note: ''
    });

    useEffect(() => {
        if (saleId) {
            fetchSaleData();
            fetchPayments();
        }
    }, [saleId]);

    const fetchSaleData = async () => {
        try {
            const response = await creditPaymentApi.getActiveCredits();
            if (response.success && response.date) {
                const foundSale = response.date.find(s => s.id === saleId);
                if (foundSale) {
                    setSale(foundSale);
                }
            }
        } catch (error) {
            console.error('Error fetching sale:', error);
            Alert.error(tAlert('error') || 'Xəta!', tAlert('error_text') || 'Məlumat alınarkən xəta baş verdi');
        }
    };

    const fetchPayments = async () => {
        if (!saleId) return;
        try {
            setLoading(true);
            const response = await creditPaymentApi.getBySaleId(saleId);
            if (response.success && response.date) {
                setPayments(response.date);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            Alert.error(tAlert('error') || 'Xəta!', tAlert('error_text') || 'Ödənişlər alınarkən xəta baş verdi');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        
        if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
            Alert.error(tAlert('error') || 'Xəta!', t('invalid_amount') || 'Düzgün məbləğ daxil edin');
            return;
        }

        if (!sale) return;

        const creditTotal = parseFloat(sale.creditTotalAmount || sale.totalAmount || 0);
        const totalPaidSoFar = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const remainingAmount = Math.max(0, creditTotal - totalPaidSoFar);
        const paymentAmount = parseFloat(paymentData.amount);

        if (paymentAmount > remainingAmount) {
            Alert.error(tAlert('error') || 'Xəta!', t('payment_exceeds_remaining') || `Ödəniş məbləği qalan məbləğdən çox ola bilməz. Qalan: ${remainingAmount.toFixed(2)} ₼`);
            return;
        }

        setPaymentLoading(true);
        try {
            const response = await creditPaymentApi.makePayment({
                saleId: saleId,
                amount: paymentAmount,
                paymentType: paymentData.paymentType,
                note: paymentData.note
            });

            if (response.success) {
                Alert.success(t('payment_success') || 'Uğurlu!', t('payment_success_text') || 'Ödəniş uğurla edildi');
                setPaymentData({ amount: '', paymentType: 'cash', note: '' });
                fetchSaleData();
                fetchPayments();
            }
        } catch (error) {
            console.error('Error making payment:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Ödəniş edilərkən xəta baş verdi');
        } finally {
            setPaymentLoading(false);
        }
    };

    if (!saleId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">{t('no_sale_selected') || 'Satış seçilməyib'}</p>
                </div>
            </div>
        );
    }

    if (loading && !sale) {
        return (
            <div className="p-6">
                <div className="text-center">Yüklənir...</div>
            </div>
        );
    }

    if (!sale) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{t('sale_not_found') || 'Satış tapılmadı'}</p>
                </div>
            </div>
        );
    }

    const creditTotalAmount = parseFloat(sale.creditTotalAmount || sale.totalAmount || 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const remainingAmount = Math.max(0, creditTotalAmount - totalPaid);
    const isFullyPaid = sale.isCreditPaid || remainingAmount <= 0.01; // 0.01-dən kiçik olsa tam ödənilib sayılır

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('credit_payments') || 'Kredit Ödənişləri'}</h1>
                <p className="text-gray-600 mt-1">
                    {sale.customerName || ''} {sale.customerSurname || ''} - {sale.customerPhone || '-'}
                </p>
            </div>

            {/* Kredit məlumatları */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('credit_info') || 'Kredit Məlumatları'}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">{t('total_amount') || 'Ümumi məbləğ'}</p>
                        <p className="text-lg font-semibold">{creditTotalAmount.toFixed(2)} ₼</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">{t('paid_amount') || 'Ödənilən'}</p>
                        <p className="text-lg font-semibold text-green-600">{totalPaid.toFixed(2)} ₼</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">{t('remaining_amount') || 'Qalan'}</p>
                        <p className="text-lg font-semibold text-red-600">{remainingAmount.toFixed(2)} ₼</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">{t('monthly_payment') || 'Aylıq ödəniş'}</p>
                        <p className="text-lg font-semibold">{parseFloat(sale.creditMonthlyPayment || 0).toFixed(2)} ₼</p>
                    </div>
                </div>
                {sale.creditTerm && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                        <p className="text-sm text-gray-600">
                            {t('credit_term') || 'Kredit müddəti'}: <span className="font-semibold">{sale.creditTerm.months} {t('months') || 'ay'}</span> - {parseFloat(sale.creditTerm.interestRate).toFixed(1)}%
                        </p>
                        {sale.creditStartDate && (
                            <p className="text-sm text-gray-600">
                                {t('credit_divided_into') || 'Kredit bölünüb'}: {sale.creditTerm.months} {t('monthly_parts') || 'aylıq hissələrə'} ({parseFloat(sale.creditMonthlyPayment || 0).toFixed(2)} ₼ {t('per_month') || 'hər ay'})
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Ödəniş formu */}
            {!isFullyPaid && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('make_payment') || 'Ödəniş Et'}</h3>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        <Input
                            label={t('amount') || 'Məbləğ'}
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remainingAmount}
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder={t('enter_amount') || 'Məbləğ daxil edin'}
                            icon={<MdAttachMoney />}
                            required
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('payment_type') || 'Ödəniş növü'}
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="cash"
                                        checked={paymentData.paymentType === 'cash'}
                                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentType: e.target.value }))}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm">{t('cash') || 'Nağd'}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="card"
                                        checked={paymentData.paymentType === 'card'}
                                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentType: e.target.value }))}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm">{t('card') || 'Kart'}</span>
                                </label>
                            </div>
                        </div>
                        <Input
                            label={t('note') || 'Qeyd'}
                            type="text"
                            value={paymentData.note}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, note: e.target.value }))}
                            placeholder={t('note_placeholder') || 'Qeyd (istəyə bağlı)'}
                        />
                        <button
                            type="submit"
                            disabled={paymentLoading || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {paymentLoading ? (t('processing') || 'İşlənir...') : (t('make_payment') || 'Ödəniş Et')}
                        </button>
                    </form>
                </div>
            )}

            {isFullyPaid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-green-800">
                        <MdCheckCircle className="w-5 h-5" />
                        <p className="font-medium">{t('credit_fully_paid') || 'Kredit tam ödənilib'}</p>
                    </div>
                </div>
            )}

            {/* Ödəniş tarixçəsi */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('payment_history') || 'Ödəniş Tarixçəsi'}</h3>
                {payments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('no_payments') || 'Hələ ödəniş edilməyib'}</p>
                ) : (
                    <div className="space-y-3">
                        {payments.map((payment, index) => {
                            const paymentDate = new Date(payment.paymentDate);
                            const paymentMonth = getFullMonthYear(paymentDate, 'az');
                            
                            // Növbəti ay hesabla
                            const nextMonth = new Date(paymentDate);
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            const nextMonthStr = getFullMonthYear(nextMonth, 'az');
                            
                            // Qalan məbləği hesabla (bu ödənişdən sonra)
                            const paidAfterThis = payments
                                .slice(index + 1)
                                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                            const paymentRemainingAmount = Math.max(0, creditTotalAmount - totalPaid + paidAfterThis);
                            
                            return (
                                <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-semibold text-lg">{parseFloat(payment.amount).toFixed(2)} ₼</p>
                                            <p className="text-sm font-medium text-purple-600 mt-1">
                                                {paymentMonth} {t('month_paid') || 'ayı ödənildi'}
                                            </p>
                                            {paymentRemainingAmount > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {t('remaining_month') || 'Qalan ay'}: {nextMonthStr} ({paymentRemainingAmount.toFixed(2)} ₼)
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">
                                                {paymentDate.toLocaleString('az-AZ', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {payment.paymentType && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {payment.paymentType === 'cash' ? (t('cash') || 'Nağd') : (t('card') || 'Kart')}
                                                </p>
                                            )}
                                            {payment.note && (
                                                <p className="text-sm text-gray-500 mt-1">{payment.note}</p>
                                            )}
                                            {payment.staff && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {t('received_by') || 'Qəbul edən'}: {payment.staff.name} {payment.staff.surName}
                                                </p>
                                            )}
                                        </div>
                                        <MdCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 ml-2" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

