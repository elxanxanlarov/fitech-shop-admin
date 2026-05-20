import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Package, Search, Send, Warehouse, Building2,
    X, Plus, ChevronDown, ChevronRight, Loader2, ArrowRight,
    AlertTriangle, CheckCircle
} from 'lucide-react';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import NumericInput from '../ui/NumericInput';
import { productApi, branchApi, stockTransferApi } from '../../api';
import { hasContainer, containerLabel, unitSingular, formatStockShort } from '../../utils/unitHelpers';
import { useBranch } from '../../context/BranchContext';

export default function CentralWarehouse() {
    const { t } = useTranslation('branch');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const { selectedStore } = useBranch();

    const [products, setProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [branchStocksMap, setBranchStocksMap] = useState({}); // productId -> [{branchId, branchName, stock, ...}]
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set()); // productIds that are expanded
    const [pendingMap, setPendingMap] = useState({}); // productId -> { branchId -> qty }

    // Transfer panel
    const [showTransferPanel, setShowTransferPanel] = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [transferItems, setTransferItems] = useState([]);
    const [transferNote, setTransferNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [productsRes, branchesRes, branchStocksRes, pendingRes] = await Promise.all([
                productApi.getAll({ deleteType: 'NONE' }),
                branchApi.getAll(),
                branchApi.getAllBranchStocks(),
                stockTransferApi.getAll({ status: 'PENDING' })
            ]);

            setProducts(productsRes.date || productsRes.data || []);
            setBranches((branchesRes.data || []).filter(b => b.isActive));
            setBranchStocksMap(branchStocksRes.data || {});

            // Build pendingMap: productId -> branchId -> qty
            const pm = {};
            (pendingRes.data || []).forEach(transfer => {
                const branchId = transfer.toBranchId;
                (transfer.items || []).forEach(ti => {
                    const pid = ti.productId;
                    if (!pm[pid]) pm[pid] = {};
                    pm[pid][branchId] = (pm[pid][branchId] || 0) + (ti.quantity || 0);
                });
            });
            setPendingMap(pm);
        } catch (err) {
            console.error(err);
            Alert.error(tAlert('error'), 'Məlumatlar alınarkən xəta baş verdi');
        } finally {
            setLoading(false);
        }
    }, [tAlert]);

    useEffect(() => { fetchData(); }, [fetchData, selectedStore]);

    // ── Filtered products ──────────────────────────────────────────
    const filteredProducts = products.filter(p => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
            p.name?.toLowerCase().includes(s) ||
            p.barcode?.toLowerCase().includes(s) ||
            p.invoiceName?.toLowerCase().includes(s)
        );
    });

    // ── Helpers ────────────────────────────────────────────────────
    const unitLabel = (product) => unitSingular(product?.unitType);

    const stockBadge = (stock) => {
        if (stock <= 0) return 'bg-red-100 text-red-700 border-red-200';
        if (stock <= 10) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    };

    const toggleRow = (productId) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    // ── Transfer helpers ───────────────────────────────────────────
    const addToTransfer = (product) => {
        if (product.stock <= 0) {
            Alert.warn(tAlert('warning') || 'Xəbərdarlıq', 'Bu məhsulun bazada stoku yoxdur');
            return;
        }
        if (transferItems.find(i => i.productId === product.id)) {
            setShowTransferPanel(true);
            return;
        }
        setTransferItems(prev => [
            ...prev,
            {
                productId: product.id,
                name: product.name,
                unitType: product.unitType,
                piecesPerBox: product.piecesPerBox || 1,
                maxStock: product.stock,
                quantity: 1,
                fullBoxes: product.piecesPerBox > 1 ? 0 : 0,
                openedBoxQuantity: product.piecesPerBox > 1 ? 1 : 0
            }
        ]);
        setShowTransferPanel(true);
    };

    const removeFromTransfer = (productId) => {
        setTransferItems(prev => prev.filter(i => i.productId !== productId));
    };

    const updateQty = (productId, field, value) => {
        setTransferItems(prev => prev.map(item => {
            if (item.productId !== productId) return item;
            const ppb = item.piecesPerBox || 1;
            let u = { ...item };

            if (field === 'quantity') {
                u.quantity = Math.max(0, Math.min(parseInt(value) || 0, item.maxStock));
                if (ppb > 1) {
                    u.fullBoxes = Math.floor(u.quantity / ppb);
                    u.openedBoxQuantity = u.quantity % ppb;
                }
            } else if (field === 'fullBoxes') {
                // Boxes change — keep current pieces, recalc total
                const boxes = Math.max(0, parseInt(value) || 0);
                const pieces = Math.max(0, item.openedBoxQuantity || 0);
                const newTotal = boxes * ppb + pieces;
                if (newTotal > item.maxStock) {
                    u.fullBoxes = Math.max(0, Math.floor((item.maxStock - pieces) / ppb));
                } else {
                    u.fullBoxes = boxes;
                }
                u.quantity = u.fullBoxes * ppb + (u.openedBoxQuantity || 0);
            } else if (field === 'openedBoxQuantity') {
                // Pieces change — capped at ppb-1, independent from boxes
                const maxPieces = ppb - 1;
                const pieces = Math.max(0, Math.min(parseInt(value) || 0, maxPieces));
                const newTotal = (item.fullBoxes || 0) * ppb + pieces;
                if (newTotal > item.maxStock) {
                    u.openedBoxQuantity = Math.max(0, item.maxStock - (item.fullBoxes || 0) * ppb);
                } else {
                    u.openedBoxQuantity = pieces;
                }
                u.quantity = (item.fullBoxes || 0) * ppb + u.openedBoxQuantity;
            }
            return u;
        }));
    };

    const handleSubmitTransfer = async () => {
        if (!selectedBranchId) { Alert.error(tAlert('error'), 'Hədəf filialı seçin'); return; }
        if (transferItems.length === 0) { Alert.error(tAlert('error'), 'Ən azı bir məhsul seçin'); return; }
        const bad = transferItems.find(i => i.quantity <= 0);
        if (bad) { Alert.error(tAlert('error'), `${bad.name}: miqdar 0-dan böyük olmalıdır`); return; }

        setSubmitting(true);
        try {
            const res = await stockTransferApi.create({
                toBranchId: selectedBranchId,
                note: transferNote,
                items: transferItems.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    fullBoxes: i.fullBoxes || 0,
                    openedBoxQuantity: i.openedBoxQuantity || 0
                }))
            });
            if (res.success) {
                Alert.success(tAlert('success'), 'Transfer uğurla yaradıldı');
                setTransferItems([]); setSelectedBranchId(''); setTransferNote(''); setShowTransferPanel(false);
                fetchData();
            }
        } catch (err) {
            Alert.error(tAlert('error'), err?.response?.data?.message || 'Transfer zamanı xəta baş verdi');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    const selectedBranch = branches.find(b => b.id === selectedBranchId);

    // Stats
    const totalProducts = products.length;
    const inStock = products.filter(p => p.stock > 10).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const noStock = products.filter(p => p.stock <= 0).length;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ── Header ── */}
            <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/admin/branch-management')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-2 text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Filial İdarəetməsinə qayıt
                    </button>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-md">
                            <Warehouse className="w-7 h-7 text-white" />
                        </div>
                        Mərkəz Baza
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Bazadakı stoklar + hər filialın sayı. Sətri genişlətmək üçün klikləyin.
                    </p>
                </div>

                {transferItems.length > 0 && (
                    <button
                        onClick={() => setShowTransferPanel(true)}
                        className="relative flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shrink-0"
                    >
                        <Send className="w-5 h-5" />
                        Göndəriş Paneli
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                            {transferItems.length}
                        </span>
                    </button>
                )}
            </div>

            <div className="flex gap-6 items-start">
                {/* ── Left: Product Table ── */}
                <div className="flex-1 min-w-0">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                            { label: 'Cəmi Məhsul', value: totalProducts, colour: 'blue' },
                            { label: 'Stokda Var', value: inStock, colour: 'emerald' },
                            { label: 'Az Stok', value: lowStock, colour: 'amber' },
                            { label: 'Stok Yoxdur', value: noStock, colour: 'red' },
                        ].map(s => (
                            <div key={s.label} className={`bg-white rounded-xl p-3 border border-gray-100 shadow-sm`}>
                                <div className={`text-2xl font-extrabold text-${s.colour}-600`}>{s.value}</div>
                                <div className={`text-xs font-medium text-gray-500`}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Məhsul adı, barkod ilə axtar..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-10 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-sm shadow-sm"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="w-8 px-3 py-3"></th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-xs tracking-wider">Məhsul</th>
                                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">
                                        Baza (Mərkəz)
                                    </th>
                                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase text-xs tracking-wider whitespace-nowrap">
                                        Cəmi Filial
                                    </th>
                                    <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase text-xs tracking-wider">Göndər</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-14 text-center text-gray-400">
                                            <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                            <p className="font-medium">Məhsul tapılmadı</p>
                                        </td>
                                    </tr>
                                ) : filteredProducts.map(product => {
                                    const isExpanded = expandedRows.has(product.id);
                                    const branchEntries = branchStocksMap[product.id] || [];
                                    const totalBranchStock = branchEntries.reduce((sum, e) => sum + (e.stock || 0), 0);
                                    const ppb = product.piecesPerBox;
                                    const alreadyAdded = transferItems.some(i => i.productId === product.id);

                                    return (
                                        <>
                                            {/* ── Main row ── */}
                                            <tr
                                                key={product.id}
                                                className={`border-b border-gray-50 transition-colors ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'} ${alreadyAdded ? 'bg-indigo-50/60' : ''}`}
                                            >
                                                {/* Expand toggle */}
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        onClick={() => toggleRow(product.id)}
                                                        className={`p-1 rounded-lg transition-colors ${branchEntries.length > 0 ? 'text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600' : 'text-gray-200 cursor-default'}`}
                                                        title={branchEntries.length > 0 ? 'Filial stokları göstər/gizlə' : 'Bu məhsul heç bir filialda yoxdur'}
                                                        disabled={branchEntries.length === 0}
                                                    >
                                                        {isExpanded
                                                            ? <ChevronDown className="w-4 h-4" />
                                                            : <ChevronRight className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </td>

                                                {/* Product name */}
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900 leading-tight">{product.name}</div>
                                                    {product.barcode && (
                                                        <div className="text-xs text-gray-400 font-mono">{product.barcode}</div>
                                                    )}
                                                    {hasContainer(product) && (
                                                        <div className="text-[10px] text-indigo-400 mt-0.5">
                                                            1 {containerLabel(product.unitType)} = {ppb} {unitSingular(product.unitType)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Central stock */}
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${stockBadge(product.stock)}`}>
                                                        {product.stock} {unitSingular(product.unitType)}
                                                    </span>
                                                    {hasContainer(product) && product.stock > 0 && (
                                                        <div className="text-gray-400 text-[10px] mt-1 font-medium text-right">
                                                            {formatStockShort(product.stock, product.unitType, product.piecesPerBox)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Total branch stock */}
                                                <td className="px-4 py-3 text-right">
                                                    {branchEntries.length > 0 ? (
                                                        <button
                                                            onClick={() => toggleRow(product.id)}
                                                            className="group/btn"
                                                        >
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">
                                                                <Building2 className="w-3 h-3" />
                                                                {totalBranchStock} {unitLabel(product)}
                                                            </span>
                                                            <div className="text-[10px] text-blue-400 mt-0.5 text-right">
                                                                {branchEntries.length} filialda
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-300 italic">Heç bir filialda yox</span>
                                                    )}
                                                </td>

                                                {/* Add to transfer */}
                                                <td className="px-4 py-3 text-center">
                                                    {alreadyAdded ? (
                                                        <button
                                                            onClick={() => removeFromTransfer(product.id)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" /> Sil
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => addToTransfer(product)}
                                                            disabled={product.stock <= 0}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Göndər
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* ── Expanded: Branch stock breakdown ── */}
                                            {isExpanded && (
                                                <tr key={`${product.id}-expanded`} className="bg-indigo-50/30">
                                                    <td colSpan={5} className="px-0 py-0">
                                                        <div className="border-t border-indigo-100 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-blue-50/30">
                                                            {/* Header row */}
                                                            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-12 py-2 text-[10px] font-bold uppercase text-indigo-400 tracking-wider border-b border-indigo-100/60">
                                                                <span>Filial</span>
                                                                <span className="text-right w-28">Stok</span>
                                                                <span className="text-right w-28">Qutu/Ədəd</span>
                                                            </div>

                                                            {/* Central (Baza) as first row */}
                                                            <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-12 py-2.5 border-b border-indigo-100/40 bg-indigo-100/30">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                                                                        <Warehouse className="w-3.5 h-3.5 text-white" />
                                                                    </div>
                                                                    <span className="font-bold text-indigo-800 text-sm">Baza (Mərkəz)</span>
                                                                </div>
                                                                <div className="w-28 text-right">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${stockBadge(product.stock)}`}>
                                                                        {product.stock} {unitLabel(product)}
                                                                    </span>
                                                                </div>
                                                                <div className="w-28 text-right text-xs text-gray-500">
                                                                    {ppb > 1
                                                                        ? `${Math.floor(product.stock / ppb)} qu. ${product.stock % ppb > 0 ? `${product.stock % ppb} əd.` : ''}`
                                                                        : '—'
                                                                    }
                                                                </div>
                                                            </div>

                                                            {/* Branch rows */}
                                                            {branchEntries.length === 0 ? (
                                                                <div className="px-12 py-3 text-sm text-gray-400 italic flex items-center gap-2">
                                                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                                    Bu məhsul hələ heç bir filiala göndərilməyib
                                                                </div>
                                                            ) : branchEntries.map(entry => {
                                                                const pendingQty = pendingMap[product.id]?.[entry.branchId] || 0;
                                                                return (
                                                                    <div
                                                                        key={entry.branchId}
                                                                        className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-12 py-2.5 border-b border-indigo-100/30 last:border-0 hover:bg-white/50 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${entry.branchActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                                <Building2 className={`w-3.5 h-3.5 ${entry.branchActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                            </div>
                                                                            <span className={`font-medium text-sm ${entry.branchActive ? 'text-gray-800' : 'text-gray-400'}`}>
                                                                                {entry.branchName}
                                                                                {!entry.branchActive && (
                                                                                    <span className="ml-1 text-[10px] text-gray-400">(passiv)</span>
                                                                                )}
                                                                            </span>
                                                                            {pendingQty > 0 && (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                                                                    ⏳ Göndərilib ({formatStockShort(pendingQty, product.unitType, product.piecesPerBox)}) — qəbul gözləyir
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="w-28 text-right">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${stockBadge(entry.stock)}`}>
                                                                                {entry.stock} {unitLabel(product)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-28 text-right text-xs text-gray-500">
                                                                            {ppb > 1
                                                                                ? `${entry.fullBoxes ?? Math.floor(entry.stock / ppb)} qu. ${(entry.openedBoxQuantity ?? entry.stock % ppb) > 0 ? `${entry.openedBoxQuantity ?? entry.stock % ppb} əd.` : ''}`
                                                                                : '—'
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Summary bar */}
                                                            {branchEntries.length > 0 && (
                                                                <div className="px-12 py-2 bg-indigo-100/40 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                                                                    <span className="flex items-center gap-1">
                                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                                        Ümumi yayılma
                                                                    </span>
                                                                    <span>
                                                                        Baza: {product.stock} + Filiallar: {totalBranchStock} = {product.stock + totalBranchStock} {unitLabel(product)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Right: Transfer Panel ── */}
                {showTransferPanel && (
                    <div className="w-[380px] shrink-0 bg-white rounded-2xl border border-indigo-100 shadow-xl flex flex-col sticky top-4 self-start max-h-[calc(100vh-120px)] overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 font-bold text-lg">
                                <Send className="w-5 h-5" />
                                Filiala Göndər
                            </div>
                            <button onClick={() => setShowTransferPanel(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Branch */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Hədəf Filial *</label>
                                <SearchDropdown
                                    options={branches}
                                    value={selectedBranchId}
                                    onChange={setSelectedBranchId}
                                    placeholder="Filial seçin..."
                                    getOptionLabel={o => o.name}
                                    getOptionValue={o => o.id}
                                    searchFields={['name']}
                                />
                                {selectedBranch && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg">
                                        <Building2 className="w-3.5 h-3.5" />
                                        {selectedBranch.name}
                                        {selectedBranch.address && ` • ${selectedBranch.address}`}
                                    </div>
                                )}
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Qeyd</label>
                                <input
                                    type="text"
                                    value={transferNote}
                                    onChange={e => setTransferNote(e.target.value)}
                                    placeholder="Transfer haqqında qeyd..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                />
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Məhsullar ({transferItems.length})
                                    </label>
                                    {transferItems.length > 0 && (
                                        <button onClick={() => setTransferItems([])} className="text-xs text-red-500 hover:text-red-700">
                                            Hamısını sil
                                        </button>
                                    )}
                                </div>

                                {transferItems.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                                        <p className="text-sm">Sol cədvəldən "Göndər" sütununa klikləyin</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {transferItems.map(item => {
                                            const ppb = item.piecesPerBox || 1;
                                            return (
                                                <div key={item.productId} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                                    Baza: {item.maxStock} {unitLabel(item)}
                                                                </span>
                                                                {ppb > 1 && (
                                                                    <span className="text-[10px] text-gray-400">1 qutu = {ppb} ədəd</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => removeFromTransfer(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors ml-2 mt-0.5 shrink-0">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Qutu + Ədəd independent inputs */}
                                                    {ppb > 1 ? (
                                                        <>
                                                            <div className="flex items-end gap-2 mt-1">
                                                                <NumericInput
                                                                    value={item.fullBoxes}
                                                                    onChange={val => updateQty(item.productId, 'fullBoxes', val)}
                                                                    min={0}
                                                                    max={Math.floor(item.maxStock / ppb)}
                                                                    size="sm"
                                                                    label={containerLabel(item.unitType)}
                                                                    className="flex-1"
                                                                />
                                                                <span className="text-gray-300 font-bold text-base pb-1">+</span>
                                                                <NumericInput
                                                                    value={item.openedBoxQuantity}
                                                                    onChange={val => updateQty(item.productId, 'openedBoxQuantity', val)}
                                                                    min={0}
                                                                    max={ppb - 1}
                                                                    size="sm"
                                                                    label={unitSingular(item.unitType)}
                                                                    className="flex-1"
                                                                />
                                                                <div className="pb-0.5 text-center text-[10px] text-gray-400 leading-tight">
                                                                    <div>= <b className="text-gray-700">{item.quantity}</b></div>
                                                                    <div>{unitLabel(item)}</div>
                                                                </div>
                                                            </div>

                                                            {/* Remaining breakdown */}
                                                            {(() => {
                                                                const rem = item.maxStock - item.quantity;
                                                                const remB = Math.floor(rem / ppb);
                                                                const remP = rem % ppb;
                                                                const pct = item.maxStock > 0 ? Math.min(100, (item.quantity / item.maxStock) * 100) : 0;
                                                                const isOver = rem < 0;
                                                                return (
                                                                    <div className={`mt-2 rounded-lg px-2.5 py-2 text-[11px] border ${isOver ? 'bg-red-50 border-red-200' : rem === 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                                                                            <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-400' : pct >= 90 ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Göndərilir:</span>
                                                                            <span className="font-bold text-indigo-700">
                                                                                {item.fullBoxes > 0 ? `${item.fullBoxes} qu.` : ''}
                                                                                {item.fullBoxes > 0 && item.openedBoxQuantity > 0 ? ' + ' : ''}
                                                                                {item.openedBoxQuantity > 0 ? `${item.openedBoxQuantity} əd.` : ''}
                                                                                {item.fullBoxes === 0 && item.openedBoxQuantity === 0 ? '0' : ''}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between mt-0.5">
                                                                            <span className="text-gray-400">Qalacaq:</span>
                                                                            <span className={`font-bold ${isOver ? 'text-red-600' : rem === 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                                                {isOver ? 'Stok çatmaz!' : rem === 0 ? '— hamısı göndərildi' : (
                                                                                    <>
                                                                                        {remB > 0 ? `${remB} qu.` : ''}
                                                                                        {remB > 0 && remP > 0 ? ' + ' : ''}
                                                                                        {remP > 0 ? `${remP} əd.` : ''}
                                                                                        {remB === 0 && remP === 0 ? '0' : ''}
                                                                                    </>
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <NumericInput
                                                                value={item.quantity}
                                                                onChange={val => updateQty(item.productId, 'quantity', val)}
                                                                min={0}
                                                                max={item.maxStock}
                                                                suffix={unitLabel(item)}
                                                                size="sm"
                                                                label="Göndəriləcək miqdar"
                                                            />
                                                            {item.maxStock > 0 && (
                                                                <div className="mt-1.5">
                                                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                                                                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, (item.quantity / item.maxStock) * 100)}%` }} />
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-gray-400">
                                                                        <span>Göndərilər: <b className="text-indigo-600">{item.quantity}</b></span>
                                                                        <span>Qalacaq: <b className={item.maxStock - item.quantity < 0 ? 'text-red-500' : 'text-emerald-600'}>{item.maxStock - item.quantity} {unitLabel(item)}</b></span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2 shrink-0">
                            {transferItems.length > 0 && selectedBranch && (
                                <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span>
                                        <b>{transferItems.length}</b> növ məhsul → <b>{selectedBranch.name}</b>
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleSubmitTransfer}
                                disabled={submitting || transferItems.length === 0 || !selectedBranchId}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Transferi Göndər</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
