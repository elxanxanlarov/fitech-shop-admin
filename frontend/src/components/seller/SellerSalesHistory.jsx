import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MdSearch,
    MdReceipt,
    MdReplay,
    MdRefresh,
    MdShoppingBag,
    MdAttachMoney,
    MdCreditCard,
    MdStorefront,
} from 'react-icons/md';
import { saleApi, ismayilliApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import Alert from '../ui/Alert';

const formatPrice = (n) => `${parseFloat(n || 0).toFixed(2)} ₼`;
const formatDateTime = (d) =>
    new Date(d).toLocaleString('az-AZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

// Satış üçün ümumi qaytarılmış məbləği hesablayır.
// FITECH: sale.returns array, hər biri returnedAmount/totalAmount field-i ilə.
// İsmayıllı: sale.items[].returnItems hər biri totalPrice ilə.
const getTotalReturnedForSale = (sale) => {
    if (!sale) return 0;
    if (Array.isArray(sale.returns) && sale.returns.length > 0) {
        return sale.returns.reduce(
            (s, r) => s + parseFloat(r.returnedAmount ?? r.totalAmount ?? 0),
            0
        );
    }
    return (sale.items || []).reduce((s, it) => {
        const ris = it.returnItems || [];
        return (
            s +
            ris.reduce((rs, ri) => rs + parseFloat(ri.totalPrice ?? 0), 0)
        );
    }, 0);
};

const todayStr = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const inDateRange = (createdAt, startStr, endStr) => {
    if (!startStr && !endStr) return true;
    const d = new Date(createdAt);
    if (startStr) {
        const s = new Date(startStr);
        s.setHours(0, 0, 0, 0);
        if (d < s) return false;
    }
    if (endStr) {
        const e = new Date(endStr);
        e.setHours(23, 59, 59, 999);
        if (d > e) return false;
    }
    return true;
};

export default function SellerSalesHistory() {
    const { user } = useAuth();
    const { selectedStore, branches } = useBranch();
    const navigate = useNavigate();
    const branchId = user?.branchId || null;
    const isIsmayilli = selectedStore === 'ISMAYILLI';
    const myBranch = branches.find((b) => b.id === branchId);
    const showStoreToggle = !!myBranch?.isShowIsmayilli;

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(todayStr());
    const [endDate, setEndDate] = useState(todayStr());
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            if (isIsmayilli) {
                const res = await ismayilliApi.getAllSales();
                const all = res?.data || [];
                const filtered = all.filter((s) => inDateRange(s.createdAt, startDate, endDate));
                setSales(filtered);
            } else {
                const params = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                if (branchId) params.branchId = branchId;
                const res = await saleApi.getAll(params);
                const list = res?.data || res?.date || [];
                setSales(list);
            }
        } catch (e) {
            console.error('history error', e);
            Alert.error('Xəta', 'Satışlar yüklənərkən xəta baş verdi');
            setSales([]);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, branchId, isIsmayilli]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const filtered = useMemo(() => {
        let arr = sales;
        if (!isIsmayilli && paymentFilter !== 'all') {
            arr = arr.filter((s) => s.paymentType === paymentFilter && !s.isCredit);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            arr = arr.filter((s) => {
                const id = (s.id || '').toLowerCase();
                const name = `${s.customerName || ''} ${s.customerSurname || ''}`.toLowerCase();
                const phone = (s.customerPhone || '').toLowerCase();
                const note = (s.note || '').toLowerCase();
                const checkNum = String(s.checkNumber || '').toLowerCase();
                return (
                    id.includes(q) ||
                    name.includes(q) ||
                    phone.includes(q) ||
                    note.includes(q) ||
                    checkNum.includes(q)
                );
            });
        }
        return arr;
    }, [sales, paymentFilter, search, isIsmayilli]);

    const stats = useMemo(() => {
        // Bütün satışlar üzrə qaytarılmış məbləğ (tam + qismən).
        const refundedAmount = filtered.reduce(
            (sum, s) => sum + getTotalReturnedForSale(s),
            0
        );
        // Hər hansı bir qaytarması olan satışların sayı.
        const refundedCount = filtered.filter(
            (s) => getTotalReturnedForSale(s) > 0
        ).length;
        // Brut məbləğ (qaytarmadan əvvəl).
        const grossTotal = filtered.reduce(
            (sum, s) => sum + parseFloat(s.totalAmount || 0),
            0
        );
        // Net məbləğ = brut - qaytarılmış.
        const netTotal = Math.max(0, grossTotal - refundedAmount);

        return {
            count: filtered.length,
            refundedCount,
            refundedAmount,
            grossTotal,
            total: netTotal,
        };
    }, [filtered]);

    const handleSetPreset = (preset) => {
        const today = new Date();
        const fmt = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (preset === 'today') {
            const s = fmt(today);
            setStartDate(s);
            setEndDate(s);
        } else if (preset === 'week') {
            const ws = new Date(today);
            const day = today.getDay();
            const diff = (day === 0 ? -6 : 1) - day;
            ws.setDate(today.getDate() + diff);
            setStartDate(fmt(ws));
            setEndDate(fmt(today));
        } else if (preset === 'month') {
            const ms = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(fmt(ms));
            setEndDate(fmt(today));
        }
    };

    return (
        <div className="flex-1 p-3 sm:p-4">
            <div className="max-w-6xl mx-auto">
                {/* Active store chip */}
                {showStoreToggle && (
                    <div className="mb-3 flex items-center justify-between">
                        <div
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                                isIsmayilli
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                        >
                            <MdStorefront className="w-4 h-4" />
                            Aktiv mağaza:{' '}
                            <span className="uppercase">{isIsmayilli ? 'İsmayıllı' : 'Fitech'}</span>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Başlanğıc</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Son</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-1">
                            <button type="button" onClick={() => handleSetPreset('today')} className="h-10 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">Bu gün</button>
                            <button type="button" onClick={() => handleSetPreset('week')} className="h-10 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">Bu həftə</button>
                            <button type="button" onClick={() => handleSetPreset('month')} className="h-10 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">Bu ay</button>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Axtar</label>
                            <div className="relative">
                                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={isIsmayilli ? 'Çek nömrəsi, qeyd...' : 'ID, müştəri, telefon...'}
                                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={fetchSales}
                            className="h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-indigo-700"
                        >
                            <MdRefresh className="w-4 h-4" />
                            Yenilə
                        </button>
                    </div>

                    {/* Payment filter (Fitech only) */}
                    {!isIsmayilli && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {[
                                { id: 'all', label: 'Hamısı' },
                                { id: 'cash', label: 'Nağd', icon: <MdAttachMoney className="w-4 h-4" /> },
                                { id: 'card', label: 'Kart', icon: <MdCreditCard className="w-4 h-4" /> },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setPaymentFilter(opt.id)}
                                    className={`h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                                        paymentFilter === opt.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <MdShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-500">Satış sayı</p>
                            <p className="text-base font-extrabold text-slate-800">{stats.count}</p>
                            {stats.grossTotal > 0 && (
                                <p className="text-[10px] text-slate-400 truncate">
                                    Brut: {formatPrice(stats.grossTotal)}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <MdAttachMoney className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-500">Net məbləğ</p>
                            <p className="text-base font-extrabold text-emerald-700 truncate">
                                {formatPrice(stats.total)}
                            </p>
                            <p className="text-[10px] text-slate-400">Qaytarılmadan sonra</p>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <MdReplay className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-500">Qaytarılan</p>
                            <p className="text-base font-extrabold text-orange-700 truncate">
                                {formatPrice(stats.refundedAmount)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                {stats.refundedCount > 0
                                    ? `${stats.refundedCount} satış`
                                    : 'Qaytarma yoxdur'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sales list */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="text-center py-20 text-slate-400 text-sm">Yüklənir...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 text-sm">Satış tapılmadı</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((sale) => {
                                const items = sale.items || [];
                                const itemsCount = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
                                const returnedOnSale = getTotalReturnedForSale(sale);
                                const saleTotal = parseFloat(sale.totalAmount || 0);
                                const remaining = Math.max(0, saleTotal - returnedOnSale);
                                const hasReturns = returnedOnSale > 0;

                                if (isIsmayilli) {
                                    return (
                                        <div key={sale.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-xs font-mono font-bold text-slate-500">
                                                            Çek #{sale.checkNumber}
                                                        </span>
                                                        {sale.isRefunded && (
                                                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">
                                                                QAYTARILDI
                                                            </span>
                                                        )}
                                                        {hasReturns && !sale.isRefunded && (
                                                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">
                                                                QİSMƏN QAYTARILDI
                                                            </span>
                                                        )}
                                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                                            İSMAYILLI
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {formatDateTime(sale.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600">
                                                        {itemsCount} ədəd məhsul
                                                        {items.length > 0 && (
                                                            <> — {items.slice(0, 2).map((i) => i.product?.name).filter(Boolean).join(', ')}
                                                                {items.length > 2 && `, +${items.length - 2}`}</>
                                                        )}
                                                    </p>
                                                    {sale.note && (
                                                        <p className="text-xs text-slate-500 mt-0.5">Qeyd: {sale.note}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-extrabold text-indigo-600">
                                                        {formatPrice(saleTotal)}
                                                    </p>
                                                    {hasReturns && (
                                                        <p className="text-xs font-bold text-orange-600 mt-0.5">
                                                            Qaytarılıb: -{formatPrice(returnedOnSale)}
                                                        </p>
                                                    )}
                                                    {hasReturns && remaining > 0 && (
                                                        <p className="text-xs font-bold text-emerald-700">
                                                            Qalıq: {formatPrice(remaining)}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-1 mt-1 justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/seller/check?id=${sale.id}&store=ISMAYILLI`)}
                                                            className="px-2.5 h-8 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold inline-flex items-center gap-1"
                                                        >
                                                            <MdReceipt className="w-3.5 h-3.5" />
                                                            Çek
                                                        </button>
                                                        {!sale.isRefunded && remaining > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/seller/return?saleId=${sale.id}&store=ISMAYILLI`)}
                                                                className="px-2.5 h-8 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-semibold inline-flex items-center gap-1"
                                                            >
                                                                <MdReplay className="w-3.5 h-3.5" />
                                                                Qaytar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={sale.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-xs font-mono font-bold text-slate-500">
                                                        #{sale.id.substring(0, 8).toUpperCase()}
                                                    </span>
                                                    {sale.isRefunded && (
                                                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">
                                                            QAYTARILDI
                                                        </span>
                                                    )}
                                                    {hasReturns && !sale.isRefunded && (
                                                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">
                                                            QİSMƏN QAYTARILDI
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        sale.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                                                    }`}>
                                                        {sale.paymentType === 'cash' ? 'NAĞD' : 'KART'}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {formatDateTime(sale.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {sale.customerName || sale.customerSurname
                                                        ? `${sale.customerName || ''} ${sale.customerSurname || ''}`.trim()
                                                        : 'Müştəri qeyd edilməyib'}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {itemsCount} ədəd məhsul
                                                    {items.length > 0 && (
                                                        <> — {items.slice(0, 2).map((i) => i.product?.name).filter(Boolean).join(', ')}
                                                            {items.length > 2 && `, +${items.length - 2}`}</>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-extrabold text-indigo-600">
                                                    {formatPrice(saleTotal)}
                                                </p>
                                                {hasReturns && (
                                                    <p className="text-xs font-bold text-orange-600 mt-0.5">
                                                        Qaytarılıb: -{formatPrice(returnedOnSale)}
                                                    </p>
                                                )}
                                                {hasReturns && remaining > 0 && (
                                                    <p className="text-xs font-bold text-emerald-700">
                                                        Qalıq: {formatPrice(remaining)}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 mt-1 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/seller/check?id=${sale.id}&store=FITECH`)}
                                                        className="px-2.5 h-8 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold inline-flex items-center gap-1"
                                                    >
                                                        <MdReceipt className="w-3.5 h-3.5" />
                                                        Çek
                                                    </button>
                                                    {!sale.isRefunded && remaining > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/seller/return?saleId=${sale.id}`)}
                                                            className="px-2.5 h-8 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-semibold inline-flex items-center gap-1"
                                                        >
                                                            <MdReplay className="w-3.5 h-3.5" />
                                                            Qaytar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
