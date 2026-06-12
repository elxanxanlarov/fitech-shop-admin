import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    MdAdd,
    MdBusiness,
    MdSearch,
    MdRefresh,
    MdDelete,
    MdEdit,
    MdReceiptLong,
    MdTrendingUp,
    MdTrendingDown,
    MdAttachMoney,
    MdClose,
    MdPhone,
    MdNotes,
    MdUpload,
    MdInventory2,
} from 'react-icons/md';
import { ismayilliApi } from '../../api';
import Alert from '../ui/Alert';
import FirmaProductsImportModal from '../modals/FirmaProductsImportModal';

const fmt = (n) => `${parseFloat(n || 0).toFixed(2)} ₼`;
const fmtDateTime = (d) =>
    new Date(d).toLocaleString('az-AZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function IsmayilliFirmas() {
    const [firmas, setFirmas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Modallar
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingFirma, setEditingFirma] = useState(null);
    const [detailFirma, setDetailFirma] = useState(null);

    const fetchFirmas = useCallback(async () => {
        setLoading(true);
        try {
            const res = await ismayilliApi.getAllFirmas();
            if (res.success) setFirmas(res.data || []);
        } catch (e) {
            console.error('firmas error', e);
            Alert.error('Xəta!', 'Firmalar yüklənərkən xəta baş verdi');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFirmas();
    }, [fetchFirmas]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return firmas;
        return firmas.filter(
            (f) =>
                (f.name || '').toLowerCase().includes(q) ||
                (f.phone || '').toLowerCase().includes(q) ||
                (f.note || '').toLowerCase().includes(q)
        );
    }, [firmas, search]);

    const totals = useMemo(() => {
        let totalDebt = 0;
        let paidDebt = 0;
        let withDebt = 0; // qalıq borcu olan firmalar
        let cleared = 0; // tam ödənilmiş (paid > 0 və qalıq 0)
        let zero = 0; // heç bir hərəkəti olmayan
        let totalTransactions = 0;
        let totalProducts = 0;
        for (const f of firmas) {
            const td = parseFloat(f.totalDebt || 0);
            const pd = parseFloat(f.paidDebt || 0);
            totalDebt += td;
            paidDebt += pd;
            const rem = Math.max(0, td - pd);
            if (rem > 0) withDebt += 1;
            else if (pd > 0) cleared += 1;
            else zero += 1;
            totalTransactions += f._count?.transactions || 0;
            totalProducts += f._count?.products || 0;
        }
        return {
            totalDebt,
            paidDebt,
            remaining: Math.max(0, totalDebt - paidDebt),
            firmaCount: firmas.length,
            withDebt,
            cleared,
            zero,
            totalTransactions,
            totalProducts,
        };
    }, [firmas]);

    const handleDelete = async (firma) => {
        const result = await Alert.confirm(
            'Firmanı silmək istəyirsiniz?',
            `${firma.name} silinəcək. Bütün əməliyyat tarixçəsi qalır amma firma görünməz olacaq.`,
            { confirmText: 'Bəli, sil', cancelText: 'Ləğv et', icon: 'warning' }
        );
        if (!result.isConfirmed) return;
        try {
            await ismayilliApi.deleteFirma(firma.id);
            Alert.success('Silindi!', 'Firma uğurla silindi');
            fetchFirmas();
            if (detailFirma?.id === firma.id) setDetailFirma(null);
        } catch (e) {
            Alert.error('Xəta!', e.response?.data?.message || 'Silinmə zamanı xəta baş verdi');
        }
    };

    return (
        <div className="flex-1 p-3 sm:p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                            <MdBusiness className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                Firmalar (İsmayıllı)
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">
                                    <MdBusiness className="w-3 h-3" />
                                    {totals.firmaCount}
                                </span>
                            </h1>
                            <p className="text-xs text-slate-500">B2B borc və ödəniş idarəetməsi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={fetchFirmas}
                            className="h-10 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-50"
                        >
                            <MdRefresh className="w-4 h-4" />
                            Yenilə
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsImportOpen(true)}
                            className="h-10 px-3 rounded-lg bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-indigo-700 shadow-sm"
                            title="Excel-dən firma → məhsul bağlantısı"
                        >
                            <MdUpload className="w-4 h-4" />
                            Excel ilə Məhsul Bağla
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                        >
                            <MdAdd className="w-4 h-4" />
                            Yeni Firma
                        </button>
                    </div>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <StatCard
                        icon={<MdBusiness className="w-5 h-5" />}
                        label="Firma sayı"
                        value={totals.firmaCount}
                        color="blue"
                        sub={
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-amber-700 font-bold">{totals.withDebt} borclu</span>
                                <span className="text-emerald-700 font-bold">{totals.cleared} ödənmiş</span>
                                {totals.zero > 0 && (
                                    <span className="text-slate-500 font-bold">{totals.zero} boş</span>
                                )}
                            </span>
                        }
                    />
                    <StatCard
                        icon={<MdTrendingUp className="w-5 h-5" />}
                        label="Ümumi borc"
                        value={fmt(totals.totalDebt)}
                        color="rose"
                        sub={
                            <span className="inline-flex items-center gap-1 text-slate-500">
                                <MdReceiptLong className="w-3 h-3" />
                                {totals.totalTransactions} əməliyyat
                            </span>
                        }
                    />
                    <StatCard
                        icon={<MdTrendingDown className="w-5 h-5" />}
                        label="Ödənilib"
                        value={fmt(totals.paidDebt)}
                        color="emerald"
                        sub={
                            totals.totalDebt > 0 && (
                                <span className="text-emerald-700 font-bold">
                                    {((totals.paidDebt / totals.totalDebt) * 100).toFixed(1)}% ödənib
                                </span>
                            )
                        }
                    />
                    <StatCard
                        icon={<MdAttachMoney className="w-5 h-5" />}
                        label="Qalıq borc"
                        value={fmt(totals.remaining)}
                        color="amber"
                        sub={
                            <span className="inline-flex items-center gap-1 text-slate-500">
                                <MdInventory2 className="w-3 h-3" />
                                {totals.totalProducts} bağlı məhsul
                            </span>
                        }
                    />
                </div>

                {/* Search */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative flex-1">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Firma adı, telefon və ya qeyd..."
                            className="w-full h-10 pl-10 pr-9 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                            >
                                <MdClose className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 font-bold whitespace-nowrap px-1">
                        {search ? (
                            <>
                                <span className="text-blue-700">{filtered.length}</span>
                                <span className="text-slate-400"> / {totals.firmaCount}</span> firma göstərilir
                            </>
                        ) : (
                            <>
                                Cəmi <span className="text-blue-700">{totals.firmaCount}</span> firma
                            </>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="text-center py-20 text-slate-400 text-sm">Yüklənir...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 text-sm">
                            {search ? 'Axtarışa uyğun firma tapılmadı' : 'Hələ heç bir firma əlavə edilməyib'}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((f) => {
                                const total = parseFloat(f.totalDebt || 0);
                                const paid = parseFloat(f.paidDebt || 0);
                                const remaining = Math.max(0, total - paid);
                                const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                                return (
                                    <div key={f.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-wrap items-start gap-3">
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setDetailFirma(f)}
                                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDetailFirma(f)}
                                                className="min-w-0 flex-1 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-base font-extrabold text-slate-900">{f.name}</span>
                                                    {f.phone && (
                                                        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                                                            <MdPhone className="w-3.5 h-3.5" />
                                                            {f.phone}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400">
                                                        {f._count?.transactions || 0} əməliyyat
                                                    </span>
                                                </div>
                                                {f.note && (
                                                    <p className="text-xs text-slate-500 mb-1.5 line-clamp-1">
                                                        <MdNotes className="inline w-3 h-3 mr-1" />
                                                        {f.note}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                                    <span className="font-bold text-rose-700">
                                                        Borc: {fmt(total)}
                                                    </span>
                                                    <span className="font-bold text-emerald-700">
                                                        Ödənib: {fmt(paid)}
                                                    </span>
                                                    <span className={`font-extrabold ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                        Qalıq: {fmt(remaining)}
                                                    </span>
                                                </div>
                                                {total > 0 && (
                                                    <div className="mt-2 h-1.5 w-full max-w-md rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${
                                                                progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                                            }`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailFirma(f)}
                                                    title="Detallar / əməliyyatlar"
                                                    className="h-8 px-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold inline-flex items-center gap-1"
                                                >
                                                    <MdReceiptLong className="w-3.5 h-3.5" />
                                                    Aç
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditingFirma(f); setIsEditOpen(true); }}
                                                    title="Düzəliş"
                                                    className="h-8 w-8 grid place-items-center rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                >
                                                    <MdEdit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(f)}
                                                    title="Sil"
                                                    className="h-8 w-8 grid place-items-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                                                >
                                                    <MdDelete className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!loading && filtered.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-600 font-bold flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="inline-flex items-center gap-1">
                                <MdBusiness className="w-3.5 h-3.5 text-blue-600" />
                                {filtered.length}{search ? ` / ${totals.firmaCount}` : ''} firma
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <MdReceiptLong className="w-3.5 h-3.5 text-indigo-600" />
                                {totals.totalTransactions} əməliyyat
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <MdInventory2 className="w-3.5 h-3.5 text-violet-600" />
                                {totals.totalProducts} bağlı məhsul
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                {totals.withDebt} borclu
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {totals.cleared} ödənilmiş
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Create modal */}
            <FirmaFormModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    fetchFirmas();
                }}
            />

            {/* Edit modal */}
            <FirmaFormModal
                isOpen={isEditOpen}
                editing={editingFirma}
                onClose={() => { setIsEditOpen(false); setEditingFirma(null); }}
                onSuccess={() => {
                    setIsEditOpen(false);
                    setEditingFirma(null);
                    fetchFirmas();
                }}
            />

            {/* Excel ilə firma → məhsul bağla */}
            <FirmaProductsImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={() => fetchFirmas()}
            />

            {/* Detail modal */}
            {detailFirma && (
                <FirmaDetailModal
                    firma={detailFirma}
                    onClose={() => setDetailFirma(null)}
                    onChange={() => {
                        fetchFirmas();
                        // Detail-i təzələ
                        ismayilliApi.getFirmaById(detailFirma.id)
                            .then((r) => r.success && setDetailFirma(r.data))
                            .catch(() => {});
                    }}
                    onDelete={() => {
                        handleDelete(detailFirma);
                    }}
                />
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color, sub }) {
    const palettes = {
        rose: 'bg-rose-100 text-rose-700',
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        blue: 'bg-blue-100 text-blue-700',
    };
    return (
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${palettes[color]} flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{label}</p>
                <p className="text-lg font-extrabold text-slate-800 truncate">{value}</p>
                {sub && <div className="text-[10px] mt-0.5 leading-tight">{sub}</div>}
            </div>
        </div>
    );
}

// ===================== Create / Edit Modal =====================
function FirmaFormModal({ isOpen, onClose, onSuccess, editing }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [note, setNote] = useState('');
    const [initialDebt, setInitialDebt] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (editing) {
            setName(editing.name || '');
            setPhone(editing.phone || '');
            setNote(editing.note || '');
            setInitialDebt('');
        } else {
            setName('');
            setPhone('');
            setNote('');
            setInitialDebt('');
        }
    }, [isOpen, editing]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            Alert.error('Xəta!', 'Firma adı tələb olunur');
            return;
        }
        setSubmitting(true);
        try {
            if (editing) {
                const res = await ismayilliApi.updateFirma(editing.id, {
                    name: name.trim(),
                    phone: phone.trim() || null,
                    note: note.trim() || null,
                });
                if (res.success) {
                    Alert.success('Yeniləndi!', 'Firma yeniləndi');
                    onSuccess?.();
                }
            } else {
                const res = await ismayilliApi.createFirma({
                    name: name.trim(),
                    phone: phone.trim() || null,
                    note: note.trim() || null,
                    initialDebt: initialDebt.trim() || null,
                });
                if (res.success) {
                    Alert.success('Yaradıldı!', 'Yeni firma əlavə edildi');
                    onSuccess?.();
                }
            }
        } catch (err) {
            Alert.error('Xəta!', err.response?.data?.message || 'Əməliyyat uğursuz oldu');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <MdBusiness className="text-blue-600" />
                        {editing ? 'Firmanı redaktə et' : 'Yeni firma əlavə et'}
                    </h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-white hover:text-red-500">
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Firma adı <span className="text-rose-600">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Məs: Bakı Mağazası MMC"
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Telefon</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="050 123 45 67"
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Qeyd</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            placeholder="Əlavə qeydlər..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>
                    {!editing && (
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">İlkin borc (opsional)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={initialDebt}
                                onChange={(e) => setInitialDebt(e.target.value)}
                                placeholder="0"
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Verilərsə avtomatik bir "borc" əməliyyatı yaradılır.</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} disabled={submitting} className="h-10 px-4 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200">
                            Ləğv et
                        </button>
                        <button type="submit" disabled={submitting || !name.trim()} className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-extrabold hover:bg-blue-700 disabled:opacity-50">
                            {submitting ? '...' : editing ? 'Yenilə' : 'Yarat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===================== Detail Modal =====================
function FirmaDetailModal({ firma, onClose, onChange, onDelete }) {
    const [type, setType] = useState('PAYMENT');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const total = parseFloat(firma.totalDebt || 0);
    const paid = parseFloat(firma.paidDebt || 0);
    const remaining = Math.max(0, total - paid);
    const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

    const handleAdd = async (e) => {
        e.preventDefault();
        const amt = parseFloat(String(amount).replace(',', '.'));
        if (!Number.isFinite(amt) || amt <= 0) {
            Alert.error('Xəta!', 'Müsbət məbləğ daxil edin');
            return;
        }
        setSubmitting(true);
        try {
            const res = await ismayilliApi.addFirmaTransaction(firma.id, { type, amount: amt, note: note.trim() || null });
            if (res.success) {
                setAmount('');
                setNote('');
                Alert.success('Yaradıldı!', type === 'PAYMENT' ? 'Ödəniş əlavə edildi' : 'Borc əlavə edildi');
                onChange?.();
            }
        } catch (err) {
            Alert.error('Xəta!', err.response?.data?.message || 'Əməliyyat uğursuz oldu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTransaction = async (t) => {
        const ok = await Alert.confirm(
            'Əməliyyatı silmək?',
            `${t.type === 'PAYMENT' ? 'Ödəniş' : 'Borc'} ${fmt(t.amount)} silinəcək, balans yenidən hesablanacaq.`,
            { confirmText: 'Bəli, sil', cancelText: 'Ləğv et', icon: 'warning' }
        );
        if (!ok.isConfirmed) return;
        try {
            await ismayilliApi.deleteFirmaTransaction(firma.id, t.id);
            Alert.success('Silindi!', 'Əməliyyat silindi və balans yeniləndi');
            onChange?.();
        } catch (err) {
            Alert.error('Xəta!', err.response?.data?.message || 'Silinmə uğursuz oldu');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-blue-50 flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-600 text-white">
                            <MdBusiness className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-extrabold text-slate-900 truncate">{firma.name}</h3>
                            {firma.phone && (
                                <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                                    <MdPhone className="w-3 h-3" /> {firma.phone}
                                </p>
                            )}
                            {firma.note && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{firma.note}</p>}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-white hover:text-red-500 shrink-0">
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-4 flex-1">
                    {/* Balance summary */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                            <p className="text-[10px] font-bold text-rose-700 uppercase">Ümumi borc</p>
                            <p className="text-base font-extrabold text-rose-800 mt-0.5">{fmt(total)}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase">Ödənilib</p>
                            <p className="text-base font-extrabold text-emerald-800 mt-0.5">{fmt(paid)}</p>
                        </div>
                        <div className={`rounded-xl border p-3 ${remaining > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                            <p className={`text-[10px] font-bold uppercase ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Qalıq</p>
                            <p className={`text-base font-extrabold mt-0.5 ${remaining > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>{fmt(remaining)}</p>
                        </div>
                    </div>
                    {total > 0 && (
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    {/* Add transaction form */}
                    <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="text-xs font-extrabold text-slate-700 uppercase mb-1">Yeni əməliyyat</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setType('PAYMENT')}
                                className={`p-2 rounded-lg border-2 text-xs font-extrabold transition-all ${
                                    type === 'PAYMENT'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <MdTrendingDown className="inline w-4 h-4 mr-1" />
                                Ödəniş
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('DEBT')}
                                className={`p-2 rounded-lg border-2 text-xs font-extrabold transition-all ${
                                    type === 'DEBT'
                                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <MdTrendingUp className="inline w-4 h-4 mr-1" />
                                Yeni borc
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Məbləğ"
                                required
                                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Qeyd (opsional)"
                                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={submitting || !amount}
                                className={`h-10 px-4 rounded-lg text-white text-xs font-extrabold ${
                                    type === 'PAYMENT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                } disabled:opacity-50`}
                            >
                                <MdAdd className="inline w-4 h-4 mr-1" />
                                Əlavə et
                            </button>
                        </div>
                    </form>

                    {/* Bağlı məhsullar */}
                    <div>
                        <div className="text-xs font-extrabold text-slate-700 uppercase mb-2 flex items-center gap-1">
                            <MdInventory2 className="w-4 h-4" />
                            Bağlı məhsullar ({firma.products?.length || 0})
                        </div>
                        {!firma.products || firma.products.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs">
                                Bu firmaya hələ heç bir məhsul bağlanmayıb. "Excel ilə Məhsul Bağla" düyməsindən istifadə edin.
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                                {firma.products.map((p) => (
                                    <div key={p.id} className="px-3 py-2 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                                                {p.category?.name && (
                                                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">
                                                        {p.category.name}
                                                    </span>
                                                )}
                                            </div>
                                            {p.barcode && (
                                                <span className="text-[10px] font-mono text-slate-400">{p.barcode}</span>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[11px] text-slate-500">Stok</p>
                                            <p className="text-sm font-extrabold text-slate-800">{Number(p.quantity || 0)}</p>
                                        </div>
                                        <div className="text-right shrink-0 w-24">
                                            <p className="text-[11px] text-slate-500">Satış</p>
                                            <p className="text-sm font-extrabold text-indigo-700">{fmt(p.unitPriceSale)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transactions */}
                    <div>
                        <div className="text-xs font-extrabold text-slate-700 uppercase mb-2 flex items-center gap-1">
                            <MdReceiptLong className="w-4 h-4" />
                            Əməliyyat tarixçəsi ({firma.transactions?.length || 0})
                        </div>
                        {!firma.transactions || firma.transactions.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs">Hələ heç bir əməliyyat yoxdur</div>
                        ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                {firma.transactions.map((t) => (
                                    <div
                                        key={t.id}
                                        className={`flex items-center gap-3 px-3 py-2.5 ${
                                            t.type === 'PAYMENT' ? 'bg-emerald-50/30' : 'bg-rose-50/30'
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                                            t.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {t.type === 'PAYMENT' ? <MdTrendingDown className="w-4 h-4" /> : <MdTrendingUp className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-extrabold text-slate-800">
                                                    {t.type === 'PAYMENT' ? 'Ödəniş' : 'Borc'}
                                                </span>
                                                <span className={`text-sm font-extrabold ${t.type === 'PAYMENT' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                    {t.type === 'PAYMENT' ? '+' : '−'}{fmt(t.amount)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-400">{fmtDateTime(t.createdAt)}</span>
                                                {t.note && <span className="text-[10px] text-slate-500 truncate">— {t.note}</span>}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTransaction(t)}
                                            className="h-7 w-7 grid place-items-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 shrink-0"
                                            title="Əməliyyatı sil"
                                        >
                                            <MdDelete className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between gap-2">
                    <button
                        type="button"
                        onClick={onDelete}
                        className="h-10 px-3 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                        <MdDelete className="w-4 h-4" />
                        Firmanı sil
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold"
                    >
                        Bağla
                    </button>
                </div>
            </div>
        </div>
    );
}
