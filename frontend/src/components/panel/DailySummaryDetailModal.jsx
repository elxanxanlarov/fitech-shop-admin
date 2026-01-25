import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dailySummaryApi } from '../../api';
import Alert from '../ui/Alert';
import {
    MdClose,
    MdPrint,
    MdDescription,
    MdShoppingCart,
    MdInventory,
    MdTrendingUp
} from 'react-icons/md';

export default function DailySummaryDetailModal({ id, onClose }) {
    const { t } = useTranslation('statistics');
    const [detail, setDetail] = useState(null);
    const [productDetails, setProductDetails] = useState([]);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [totalCashHandover, setTotalCashHandover] = useState(0);
    const [loading, setLoading] = useState(true);
    const [printMode, setPrintMode] = useState('full'); // 'summary' | 'full'

    useEffect(() => {
        if (!id) return;

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await dailySummaryApi.getById(id);
                if (res.success && res.data) {
                    setDetail(res.data);
                    setProductDetails(res.productDetails || []);
                    setTotalExpenses(res.totalExpenses || 0);
                    setTotalCashHandover(res.totalCashHandover || 0);
                }
            } catch (e) {
                console.error('DailySummary detail error', e);
                Alert.error(t('error') || 'Xəta', t('error_fetching') || 'Məlumat alınarkən xəta baş verdi');
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id, t]);

    const formatCurrency = (val) =>
        val != null ? Number(val).toFixed(2) : '0.00';

    const handlePrint = () => {
        window.print();
    };

    if (!id) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 5mm; size: A4; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .daily-summary-print { margin: 0 !important; width: 100% !important; font-size: 10pt !important; }
                    .print-compact-card { 
                        background: #f9fafb !important; 
                        color: black !important; 
                        border: 1px solid #e5e7eb !important; 
                        box-shadow: none !important;
                        padding: 10pt !important;
                        margin-bottom: 10pt !important;
                    }
                    .print-compact-card * { color: black !important; }
                    .print-compact-card .text-3xl { font-size: 14pt !important; }
                    .print-compact-card .text-5xl { font-size: 18pt !important; }
                    .print-compact-card .text-xl { font-size: 12pt !important; }
                    .print-compact-card .text-sm { font-size: 9pt !important; }
                    .print-badge { 
                        border: 1px solid #e5e7eb !important; 
                        background: white !important; 
                        padding: 6pt !important;
                        margin-bottom: 5pt !important;
                    }
                    .print-badge .text-3xl { font-size: 11pt !important; }
                    .print-badge .mb-4 { margin-bottom: 2pt !important; }
                    .daily-summary-product-table { margin-top: 10pt !important; }
                    .daily-summary-product-table table th, 
                    .daily-summary-product-table table td { padding: 4pt 6pt !important; font-size: 8pt !important; }
                    .bg-gray-50 { background-color: #f9fafb !important; }
                    .print-hidden { display: none !important; }
                    h1, h2, h3 { margin-bottom: 5pt !important; }
                    .mt-12, .mt-8, .mt-6 { margin-top: 8pt !important; }
                    .p-8, .p-6 { padding: 8pt !important; }
                    .space-y-8 > * + * { margin-top: 8pt !important; }
                    .grid { gap: 8pt !important; }
                    
                    /* Force one page */
                    html, body { height: 99%; overflow: hidden; }
                    .daily-summary-print { height: auto !important; overflow: visible !important; }
                }
            `}} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 print:shadow-none print:max-h-none print:overflow-visible">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <MdDescription className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {t('daily_summary_detail') || 'Günlük Yekun Detalları'}
                            </h2>
                            {detail && (
                                <p className="text-sm text-gray-500 font-medium">
                                    {new Date(detail.date).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {detail && (
                            <div className="flex items-center gap-2 mr-4 border-r pr-4 border-gray-100 hidden md:flex">
                                <select
                                    value={printMode}
                                    onChange={(e) => setPrintMode(e.target.value)}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="summary">{t('print_summary') || 'Yalnız ümumi'}</option>
                                    <option value="full">{t('print_full') || 'Tam hesabat'}</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
                                >
                                    <MdPrint className="w-4 h-4" />
                                    {t('print') || 'Çap et'}
                                </button>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <MdClose className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin print:p-0 print:overflow-visible">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-sm text-gray-500 animate-pulse">{t('loading') || 'Yüklənir...'}</p>
                        </div>
                    ) : detail ? (
                        <div className={`daily-summary-print space-y-8 ${printMode === 'summary' ? 'summary-only' : 'full'}`}>

                            {/* Hidden Print Header */}
                            <div className="hidden print:block border-b-2 border-gray-900 pb-2 mb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h1 className="text-xl font-black text-gray-900 uppercase">Günlük Yekun Hesabatı</h1>
                                        <p className="text-[8pt] text-gray-500 font-bold uppercase tracking-widest">Fitech Shop Dashboard</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-md font-black text-gray-900">
                                            {new Date(detail.date).toLocaleDateString('az-AZ')}
                                        </p>
                                        <p className="text-[7pt] text-gray-400 uppercase font-bold">
                                            Çap: {new Date().toLocaleString('az-AZ')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Dashboard Style Summary Card */}
                            <div className="print-compact-card bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl shadow-xl p-8 text-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 print:gap-x-12 print:gap-y-4 print:grid-cols-2">
                                    {/* Left Side - Revenue Calculation */}
                                    <div className="space-y-4 print:space-y-2">
                                        <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4 print:mb-1 print:text-gray-400">
                                            {t('revenue_calculation') || 'Gəlir Hesablaması'}
                                        </p>

                                        {/* Sales */}
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-blue-100 text-sm font-medium print:text-gray-600">{t('sales') || 'Satışlar'}:</span>
                                            <span className="text-xl font-black print:text-base">+{formatCurrency(detail.totalRevenue)} AZN</span>
                                        </div>

                                        {/* Cash Handover */}
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-blue-100 text-sm font-medium print:text-gray-600">{t('cash_handover') || 'Məbləğ Təslimi'}:</span>
                                            <span className="text-xl font-black text-orange-200 print:text-base print:text-gray-900">{formatCurrency(totalCashHandover)} AZN</span>
                                        </div>

                                        {/* Net Revenue */}
                                        <div className="flex justify-between items-center pt-5 border-t border-blue-500/50 print:pt-1 print:mt-1">
                                            <span className="text-yellow-100 font-black uppercase text-[10px] tracking-widest print:text-gray-900">{t('total_revenue') || 'Ümumi Gəlir'}:</span>
                                            <span className="text-3xl font-black text-yellow-300 print:text-xl">
                                                {formatCurrency(Number(detail.totalRevenue) - totalCashHandover)} AZN
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Side - Profit & Expenses */}
                                    <div className="space-y-4 print:space-y-2">
                                        {/* Net Profit */}
                                        <div className="mb-8 print:mb-2">
                                            <p className="text-green-100 text-[10px] font-black uppercase tracking-[0.2em] mb-3 print:mb-0 print:text-gray-400">{t('net_profit') || 'Xalis Qazanc'}</p>
                                            <p className="text-5xl font-black text-green-300 print:text-2xl">
                                                {formatCurrency(Number(detail.totalProfit) - totalExpenses)} AZN
                                            </p>
                                        </div>

                                        {/* Expenses */}
                                        <div className="pt-6 border-t border-blue-500/50 print:pt-1 print:mt-1">
                                            <p className="text-red-100 text-[10px] font-black uppercase tracking-[0.2em] mb-3 print:mb-0 print:text-gray-400">{t('total_expenses') || 'Ümumi Xərclər'}</p>
                                            <p className="text-3xl font-black text-red-300 print:text-xl">
                                                {formatCurrency(totalExpenses)} AZN
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Stat Badges */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-2 print:mt-2">
                                <SummaryBadge
                                    label={t('total_sales_count') || 'Satış sayı'}
                                    value={detail.totalSalesCount}
                                    icon={<MdShoppingCart className="w-5 h-5" />}
                                    color="blue"
                                />
                                <SummaryBadge
                                    label={t('total_products') || 'Məhsul sayı'}
                                    value={detail.totalProducts}
                                    icon={<MdInventory className="w-5 h-5" />}
                                    color="purple"
                                />
                                <SummaryBadge
                                    label={t('total_quantity') || 'Ümumi miqdar'}
                                    value={detail.totalQuantity}
                                    icon={<MdTrendingUp className="w-5 h-5" />}
                                    color="slate"
                                />
                            </div>

                            {/* Product List */}
                            {productDetails.length > 0 && (
                                <div className="mt-8 daily-summary-product-table print:mt-4">
                                    <div className="flex items-center gap-3 mb-6 print:mb-1">
                                        <div className="h-6 w-1.5 bg-blue-600 rounded-full print:h-4 print:w-1 print:bg-gray-800"></div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight print:text-sm">
                                            {t('products') || 'Məhsul Detalları'}
                                        </h3>
                                    </div>
                                    <div className="overflow-hidden border border-gray-100 rounded-3xl shadow-sm print:rounded-none print:border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-100 print:divide-gray-300">
                                            <thead className="bg-gray-50/50 print:bg-gray-100">
                                                <tr>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-2 print:py-1">Məhsul</th>
                                                    <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-2 print:py-1">Miqdar</th>
                                                    <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-2 print:py-1">Gəlir</th>
                                                    <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest print:px-2 print:py-1">Qazanc</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-50 print:divide-gray-200">
                                                {productDetails.slice(0, 15).map((p) => ( // Limiting products in print to ensure one page if list is long
                                                    <tr key={p.productId}>
                                                        <td className="px-6 py-5 text-sm font-bold text-gray-900 capitalize print:px-2 print:py-1 print:text-[8pt]">
                                                            {p.product?.name || '-'}
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-right font-medium text-gray-500 print:px-2 print:py-1 print:text-[8pt]">
                                                            {p.quantity}
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-right font-bold text-gray-900 print:px-2 print:py-1 print:text-[8pt]">
                                                            {formatCurrency(p.revenue)}
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-right font-black text-emerald-600 print:px-2 print:py-1 print:text-[8pt] print:text-gray-900">
                                                            {formatCurrency(p.profit)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {productDetails.length > 15 && (
                                                    <tr className="hidden print:table-row">
                                                        <td colSpan="4" className="px-2 py-1 text-[7pt] text-gray-400 text-center italic">
                                                            ...və digər {productDetails.length - 15} məhsul (tam siyahı üçün "Tam hesabat" seçin)
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Staff & Note */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 print:mt-4 print:p-2 print:rounded-none print:bg-white print:border-gray-200 print:grid-cols-2">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 print:mb-0 print:text-[7pt]">Hesabatı tərtib etdi:</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs uppercase print:hidden">
                                            {detail.staff ? detail.staff.name[0] : '?'}
                                        </div>
                                        <p className="text-lg font-black text-gray-900 print:text-[9pt]">
                                            {detail.staff ? `${detail.staff.name} ${detail.staff.surName || ''}` : '-'}
                                        </p>
                                    </div>
                                </div>
                                {detail.note && (
                                    <div className="border-l border-gray-200 pl-8 md:block print:block print:pl-4 print:border-gray-200">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 print:mb-0 print:text-[7pt]">Əlavə qeydlər:</p>
                                        <p className="text-sm text-gray-700 italic font-medium print:text-[8pt] print:leading-tight">
                                            "{detail.note}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Print Footer */}
                            <div className="hidden print:block mt-4 pt-2 border-t border-gray-200 text-center">
                                <p className="text-[7pt] text-gray-400 font-bold uppercase tracking-[0.2em]">Bu sənəd sistem tərəfindən avtomatik generasiya olunmuşdur</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500 font-medium">{t('no_data')}</div>
                    )}
                </div>

                {/* Footer on screen */}
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 print:hidden">
                    <button
                        onClick={onClose}
                        className="px-10 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-black text-sm hover:bg-gray-100 transition-all shadow-sm active:scale-95"
                    >
                        Bağla
                    </button>
                    <button
                        onClick={handlePrint}
                        className="md:hidden px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                    >
                        {t('print') || 'Çap et'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryBadge({ label, value, icon, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        slate: "bg-slate-50 text-slate-600 border-slate-100"
    };

    const valColors = {
        blue: "text-blue-900",
        purple: "text-purple-900",
        slate: "text-slate-900"
    };

    return (
        <div className={`print-badge p-6 rounded-[2rem] border ${colors[color]} shadow-sm transition-all hover:bg-white cursor-default group`}>
            <div className="flex items-center gap-4 mb-4 print:mb-1 print:gap-1">
                <div className={`p-3 rounded-2xl bg-white shadow-sm group-hover:scale-110 transition-transform print:hidden`}>
                    {icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 print:opacity-100 print:text-[7pt] print:text-gray-400">
                    {label}
                </p>
            </div>
            <p className={`text-3xl font-black ${valColors[color]} print:text-[11pt]`}>
                {value}
            </p>
        </div>
    );
}
