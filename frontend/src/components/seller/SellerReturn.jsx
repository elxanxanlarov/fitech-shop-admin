import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    MdSearch,
    MdArrowBack,
    MdReplay,
    MdInfoOutline,
    MdStorefront,
    MdRefresh,
    MdSwapHoriz,
} from 'react-icons/md';
import { saleApi, returnApi, ismayilliApi } from '../../api';
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

export default function SellerReturn() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedStore } = useBranch();
    const initialSaleId = searchParams.get('saleId') || '';
    const urlStore = (searchParams.get('store') || '').toUpperCase();
    // URL-də store verilibsə onu götür, əks halda Context-dəkini.
    const activeStore = urlStore === 'ISMAYILLI' || urlStore === 'FITECH' ? urlStore : selectedStore;
    const isIsmayilli = activeStore === 'ISMAYILLI';
    const branchId = user?.branchId || null;

    const [saleIdInput, setSaleIdInput] = useState(initialSaleId);
    const [sale, setSale] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState({}); // saleItemId -> quantity
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Date filter + sales list
    const [startDate, setStartDate] = useState(todayStr());
    const [endDate, setEndDate] = useState(todayStr());
    const [listSearch, setListSearch] = useState('');
    const [salesList, setSalesList] = useState([]);
    const [listLoading, setListLoading] = useState(false);

    const fetchSale = useCallback(
        async (id) => {
            const trimmed = (id || '').trim();
            if (!trimmed) return;
            setLoading(true);
            setSale(null);
            setSelectedItems({});
            try {
                const res = isIsmayilli
                    ? await ismayilliApi.getSaleById(trimmed)
                    : await saleApi.getById(trimmed);
                if (res?.success && res?.data) {
                    setSale(res.data);
                } else {
                    Alert.error('Tapılmadı', 'Satış tapılmadı. ID-ni yoxlayın.');
                }
            } catch (e) {
                console.error('fetchSale error', e);
                Alert.error('Xəta', e?.response?.data?.message || 'Satış tapılarkən xəta baş verdi');
            } finally {
                setLoading(false);
            }
        },
        [isIsmayilli]
    );

    useEffect(() => {
        if (initialSaleId) fetchSale(initialSaleId);
    }, [initialSaleId, fetchSale]);

    // Sales by date range — yalnız sale seçilməyibsə yüklə.
    const fetchSalesByDate = useCallback(async () => {
        setListLoading(true);
        try {
            if (isIsmayilli) {
                const res = await ismayilliApi.getAllSales();
                const all = res?.data || [];
                const filtered = all.filter((s) =>
                    inDateRange(s.createdAt, startDate, endDate)
                );
                setSalesList(filtered);
            } else {
                const params = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                if (branchId) params.branchId = branchId;
                const res = await saleApi.getAll(params);
                const list = res?.data || res?.date || [];
                setSalesList(list);
            }
        } catch (e) {
            console.error('list error', e);
            setSalesList([]);
        } finally {
            setListLoading(false);
        }
    }, [isIsmayilli, startDate, endDate, branchId]);

    useEffect(() => {
        // Sale seçilməyibsə siyahını yenilə.
        if (!sale) fetchSalesByDate();
    }, [fetchSalesByDate, sale]);

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

    const filteredList = useMemo(() => {
        let arr = salesList.filter((s) => !s.isRefunded);
        const q = listSearch.trim().toLowerCase();
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
    }, [salesList, listSearch]);

    const getAvailableToReturn = (item) => {
        const alreadyReturned = (item.returnItems || []).reduce(
            (sum, ri) => sum + parseFloat(ri.quantity || 0),
            0
        );
        return Math.max(0, parseFloat(item.quantity || 0) - alreadyReturned);
    };

    const toggleItem = (item) => {
        const available = getAvailableToReturn(item);
        if (available <= 0) return;
        setSelectedItems((prev) => {
            const next = { ...prev };
            if (next[item.id] !== undefined) {
                delete next[item.id];
            } else {
                next[item.id] = available;
            }
            return next;
        });
    };

    const setItemQty = (item, value) => {
        const available = getAvailableToReturn(item);
        // İsmayıllı float (kg, kqr-lik məhsullar) olduğundan parseFloat istifadə edirik.
        let n = isIsmayilli ? parseFloat(value) : parseInt(value, 10);
        if (Number.isNaN(n) || n <= 0) n = isIsmayilli ? 0.1 : 1;
        if (n > available) n = available;
        setSelectedItems((prev) => ({ ...prev, [item.id]: n }));
    };

    const totalReturnAmount = (() => {
        if (!sale) return 0;
        return (sale.items || []).reduce((sum, item) => {
            const qty = selectedItems[item.id];
            if (!qty) return sum;
            return sum + parseFloat(item.pricePerItem || 0) * qty;
        }, 0);
    })();

    const submitReturn = async () => {
        if (!sale) return;
        const items = Object.entries(selectedItems)
            .filter(([, qty]) => qty > 0)
            .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
        if (items.length === 0) {
            Alert.warning('Boş seçim', 'Ən azı bir məhsul seçin');
            return;
        }

        const confirm = await Alert.confirm(
            'Qaytarmanı təsdiqlə',
            `Cəmi ${formatPrice(totalReturnAmount)} qaytarılacaq. Davam edirsiniz?`,
            { confirmText: 'Bəli, qaytar', cancelText: 'Xeyr', confirmColor: '#EA580C' }
        );
        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        try {
            const payload = {
                saleId: sale.id,
                items,
                reason: reason.trim() || null,
            };
            const res = isIsmayilli
                ? await ismayilliApi.createReturn(payload)
                : await returnApi.create(payload);
            if (res?.success) {
                Alert.success('Uğurlu', 'Qaytarma yaradıldı');
                // FITECH `date`, İsmayıllı `data` adı ilə qaytarır.
                const returnRecord = res.data || res.date || null;
                const storeQp = isIsmayilli ? 'ISMAYILLI' : 'FITECH';
                const retIdQp = returnRecord?.id ? `&returnId=${returnRecord.id}` : '';
                navigate(
                    `/seller/check?id=${sale.id}&store=${storeQp}&type=return${retIdQp}`
                );
            } else {
                Alert.error('Xəta', res?.message || 'Qaytarma yaradıla bilmədi');
            }
        } catch (e) {
            console.error('return error', e);
            Alert.error('Xəta', e?.response?.data?.message || 'Qaytarma yaradılarkən xəta baş verdi');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 p-3 sm:p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/seller/history')}
                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                            title="Geri"
                        >
                            <MdArrowBack className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
                                <MdReplay className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-extrabold text-slate-800">Məhsul qaytarması</h2>
                                <p className="text-[11px] text-slate-500">
                                    {isIsmayilli ? 'Çek nömrəsi və ya' : ''} Satış ID daxil edin və qaytarılacaq məhsulları seçin
                                </p>
                            </div>
                        </div>
                        <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border shrink-0 ${
                                isIsmayilli
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                        >
                            <MdStorefront className="w-3.5 h-3.5" />
                            <span className="uppercase">{isIsmayilli ? 'İsmayıllı' : 'Fitech'}</span>
                        </div>
                    </div>

                    {/* Filter row (date + search + ID) */}
                    <div className="p-4 border-b border-slate-200 space-y-3">
                        {/* Sale ID input (birbaşa axtarış) */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={saleIdInput}
                                    onChange={(e) => setSaleIdInput(e.target.value)}
                                    placeholder="Satış ID-ni birbaşa daxil edin..."
                                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') fetchSale(saleIdInput);
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => fetchSale(saleIdInput)}
                                disabled={loading || !saleIdInput.trim()}
                                className="h-11 px-5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50"
                            >
                                {loading ? 'Yüklənir...' : 'Tap'}
                            </button>
                        </div>

                        {/* Date filter — yalnız sale seçilməyibsə göstər */}
                        {!sale && (
                            <>
                                <div className="flex flex-wrap items-end gap-2">
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 block mb-1 uppercase tracking-wider">
                                            Başlanğıc
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 block mb-1 uppercase tracking-wider">
                                            Son
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleSetPreset('today')}
                                            className="h-10 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
                                        >
                                            Bu gün
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetPreset('week')}
                                            className="h-10 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
                                        >
                                            Bu həftə
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetPreset('month')}
                                            className="h-10 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
                                        >
                                            Bu ay
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchSalesByDate}
                                        className="h-10 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold inline-flex items-center gap-1.5"
                                        title="Yenilə"
                                    >
                                        <MdRefresh className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="relative">
                                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={listSearch}
                                        onChange={(e) => setListSearch(e.target.value)}
                                        placeholder={
                                            isIsmayilli
                                                ? 'Çek nömrəsi, qeyd...'
                                                : 'ID, müştəri adı, telefon...'
                                        }
                                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sale items */}
                    {sale ? (
                        <div className="p-4 space-y-4">
                            {/* Başqasını seç düyməsi */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSale(null);
                                    setSelectedItems({});
                                    setReason('');
                                    setSaleIdInput('');
                                }}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                            >
                                <MdSwapHoriz className="w-4 h-4" />
                                Başqa satış seç
                            </button>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-slate-800">
                                                {isIsmayilli
                                                    ? `Çek #${String(sale.checkNumber || '').padStart(4, '0')}`
                                                    : `Satış #${sale.id.substring(0, 8).toUpperCase()}`}
                                            </p>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isIsmayilli
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                {isIsmayilli ? 'İSMAYILLI' : 'FITECH'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {formatDateTime(sale.createdAt)}
                                            {!isIsmayilli && (
                                                <>
                                                    {' '}·{' '}
                                                    {sale.customerName || sale.customerSurname
                                                        ? `${sale.customerName || ''} ${sale.customerSurname || ''}`.trim()
                                                        : 'Müştəri qeyd edilməyib'}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-base font-extrabold text-indigo-600">
                                        {formatPrice(sale.totalAmount)}
                                    </p>
                                </div>
                                {sale.isRefunded && (
                                    <div className="mt-2 text-xs text-orange-700 bg-orange-100 border border-orange-200 rounded-lg p-2 flex items-center gap-2">
                                        <MdInfoOutline className="w-4 h-4" />
                                        Bu satış üzrə artıq qaytarma edilib. Yenidən qaytarma yalnız qalan miqdar üzrə mümkündür.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                {(sale.items || []).map((item) => {
                                    const available = getAvailableToReturn(item);
                                    const checked = selectedItems[item.id] !== undefined;
                                    const disabled = available <= 0;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-3 rounded-xl border transition-colors ${
                                                disabled
                                                    ? 'bg-slate-50 border-slate-200 opacity-60'
                                                    : checked
                                                    ? 'bg-orange-50 border-orange-300'
                                                    : 'bg-white border-slate-200 hover:border-orange-300'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <label className="flex items-center pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => toggleItem(item)}
                                                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                                    />
                                                </label>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">
                                                        {item.product?.name || '-'}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        Satılan: {item.quantity} · Qaytarıla bilən:{' '}
                                                        <span className={available <= 0 ? 'text-red-600 font-bold' : 'font-bold text-emerald-700'}>
                                                            {available}
                                                        </span>{' '}
                                                        · Qiymət: {formatPrice(item.pricePerItem)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {checked && (
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={available}
                                                            value={selectedItems[item.id] || 1}
                                                            onChange={(e) => setItemQty(item, e.target.value)}
                                                            className="w-16 h-9 px-2 rounded-lg border border-orange-300 bg-white text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                        />
                                                    )}
                                                    <span className="text-sm font-extrabold text-orange-700">
                                                        {checked
                                                            ? formatPrice(parseFloat(item.pricePerItem) * (selectedItems[item.id] || 0))
                                                            : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reason + submit */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">
                                    Qaytarma səbəbi (istəyə bağlı)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={2}
                                    placeholder="Məsələn: müştəri tərəfindən geri qaytarıldı"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                <span className="text-sm font-bold text-slate-700">QAYTARILACAQ MƏBLƏĞ</span>
                                <span className="text-2xl font-extrabold text-orange-700 tabular-nums">
                                    {formatPrice(totalReturnAmount)}
                                </span>
                            </div>

                            <button
                                type="button"
                                disabled={submitting || Object.keys(selectedItems).length === 0}
                                onClick={submitReturn}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-extrabold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Göndərilir...' : 'QAYTARMANI TƏSDİQLƏ'}
                            </button>
                        </div>
                    ) : (
                        <div className="p-4">
                            {listLoading ? (
                                <div className="text-center py-10 text-sm text-slate-400">
                                    Satışlar yüklənir...
                                </div>
                            ) : filteredList.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    <MdSearch className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>Seçilən tarix aralığında qaytarıla bilən satış tapılmadı</p>
                                    <p className="text-xs mt-1">Tarix filtrini dəyişin və ya yuxarıdakı sahəyə satış ID-ni birbaşa daxil edin</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                                    <p className="text-[11px] text-slate-500 px-1 mb-1">
                                        {filteredList.length} satış tapıldı — qaytarmaq üçün üzərinə klikləyin
                                    </p>
                                    {filteredList.map((s) => {
                                        const items = s.items || [];
                                        const itemsCount = items.reduce(
                                            (sum, i) => sum + Number(i.quantity || 0),
                                            0
                                        );
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => fetchSale(s.id)}
                                                className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm transition-all"
                                            >
                                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                            <span className="text-xs font-mono font-bold text-slate-500">
                                                                {isIsmayilli
                                                                    ? `Çek #${s.checkNumber}`
                                                                    : `#${s.id.substring(0, 8).toUpperCase()}`}
                                                            </span>
                                                            {!isIsmayilli && (
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                        s.paymentType === 'cash'
                                                                            ? 'bg-emerald-100 text-emerald-700'
                                                                            : 'bg-sky-100 text-sky-700'
                                                                    }`}
                                                                >
                                                                    {s.paymentType === 'cash' ? 'NAĞD' : 'KART'}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-slate-400">
                                                                {formatDateTime(s.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            {isIsmayilli
                                                                ? s.note || 'Qeyd yoxdur'
                                                                : s.customerName || s.customerSurname
                                                                ? `${s.customerName || ''} ${s.customerSurname || ''}`.trim()
                                                                : 'Müştəri qeyd edilməyib'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {itemsCount} ədəd məhsul
                                                            {items.length > 0 && (
                                                                <>
                                                                    {' '}—{' '}
                                                                    {items
                                                                        .slice(0, 2)
                                                                        .map((i) => i.product?.name)
                                                                        .filter(Boolean)
                                                                        .join(', ')}
                                                                    {items.length > 2 && `, +${items.length - 2}`}
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-base font-extrabold text-orange-700">
                                                            {formatPrice(s.totalAmount)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            Qaytarmaq üçün seçin
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
