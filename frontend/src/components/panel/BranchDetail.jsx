import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    ArrowLeft,
    Building2, Loader2,
    History,
    Send,
    Package,
    MapPin,
    Phone,
    Calendar,
    User,
    CheckCircle2,
    Clock,
    AlertCircle,
    Plus,
    Trash2,
    X, ChevronDown,
    ArrowRight,
    Search as SearchIcon
} from 'lucide-react';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import NumericInput from '../ui/NumericInput';
import { branchApi, productApi, stockTransferApi } from '../../api';
import { transferStatusInfo } from '../../utils/transferHelpers';
import { hasContainer, containerLabel, unitSingular, formatStockShort } from '../../utils/unitHelpers';

export default function BranchDetail() {
    const { t } = useTranslation('branch');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('id');

    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'history' or 'transfer'
    const [branch, setBranch] = useState(null);
    const [history, setHistory] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState([]); // all OTHER active branches

    // Branch-to-branch transfer
    const [selectedToBranchId, setSelectedToBranchId] = useState('');
    const [showTransferPanel, setShowTransferPanel] = useState(false);
    const [lastAdded, setLastAdded] = useState(null); // productId of just-added item (for flash animation)

    // Transfer form state
    const [transferData, setTransferData] = useState({
        note: '',
        items: []
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const [branchRes, historyRes, inventoryRes, productsRes, branchesRes] = await Promise.all([
                branchApi.getById(branchId),
                stockTransferApi.getAll({ branchId: branchId }),
                branchApi.getStocks(branchId),
                productApi.getAll({ isActive: true }),
                branchApi.getAll()
            ]);

            if (branchRes.success) setBranch(branchRes.data);
            if (historyRes.success) setHistory(historyRes.data || []);
            if (inventoryRes.success) setInventory(inventoryRes.data || []);
            if (productsRes.success) setProducts(productsRes.date || productsRes.data || []);
            if (branchesRes.success) setBranches((branchesRes.data || []).filter(b => b.isActive && b.id !== branchId));
        } catch (error) {
            console.error('Error fetching branch detail:', error);
            Alert.error(tAlert('error'), t('error_fetching_data'));
        } finally {
            setLoading(false);
        }
    }, [branchId, t, tAlert]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateStatus = async (transferId, status) => {
        try {
            const response = await stockTransferApi.updateStatus(transferId, status);
            if (response.success) {
                Alert.success(tAlert('success'), t('status_updated_success') || 'Status günclləndi');
                fetchData();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.error(tAlert('error'), error.response?.data?.message || t('error_updating_status'));
        }
    };

    const handleAddItem = (productId) => {
        if (!productId) return;

        // Use BRANCH inventory stock as source
        const invItem = inventory.find(i => (i.productId || i.product?.id) === productId);
        const product = invItem?.product || products.find(p => p.id === productId);
        if (!product) return;

        const branchStock = invItem?.stock ?? 0;
        if (branchStock <= 0) {
            Alert.warn(tAlert('warning') || 'Xəbərdarlıq', 'Bu məhsulun filialda stoku yoxdur');
            return;
        }

        const existingItemIndex = transferData.items.findIndex(item => item.productId === (product.id || productId));
        if (existingItemIndex !== -1) {
            handleRemoveItem(existingItemIndex);
            return;
        }

        setTransferData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    productId: product.id || productId,
                    name: product.name,
                    unitType: product.unitType,
                    maxStock: branchStock,
                    quantity: 1,
                    piecesPerBox: product.piecesPerBox || 1,
                    fullBoxes: 0,
                    openedBoxQuantity: 0
                }
            ]
        }));

        // Flash animation: highlight the newly added row for 1.5s
        setLastAdded(product.id || productId);
        setTimeout(() => setLastAdded(null), 1500);
        setShowTransferPanel(true);
    };

    const handleRemoveItem = (index) => {
        setTransferData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItemQuantity = (index, field, value) => {
        const newItems = [...transferData.items];
        const item = newItems[index];
        const piecesPerBox = item.piecesPerBox || 1;

        if (field === 'quantity') {
            let val = parseInt(value) || 0;
            val = Math.max(0, Math.min(val, item.maxStock));
            item.quantity = val;
            if (piecesPerBox > 1) {
                item.fullBoxes = Math.floor(val / piecesPerBox);
                item.openedBoxQuantity = val % piecesPerBox;
            }
        } else if (field === 'fullBoxes') {
            const boxes = parseInt(value) || 0;
            const newTotal = (boxes * piecesPerBox) + (item.openedBoxQuantity || 0);
            item.quantity = Math.max(0, Math.min(newTotal, item.maxStock));
            if (piecesPerBox > 1) {
                item.fullBoxes = Math.floor(item.quantity / piecesPerBox);
                item.openedBoxQuantity = item.quantity % piecesPerBox;
            }
        } else if (field === 'openedBoxQuantity') {
            const pieces = parseInt(value) || 0;
            const newTotal = (item.fullBoxes * piecesPerBox) + pieces;
            item.quantity = Math.max(0, Math.min(newTotal, item.maxStock));
            if (piecesPerBox > 1) {
                item.fullBoxes = Math.floor(item.quantity / piecesPerBox);
                item.openedBoxQuantity = item.quantity % piecesPerBox;
            }
        }

        setTransferData({ ...transferData, items: newItems });
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();

        if (!selectedToBranchId) {
            Alert.error(tAlert('error'), 'Hədəf filialı seçin');
            return;
        }
        if (transferData.items.length === 0) {
            Alert.error(tAlert('error'), t('please_add_products'));
            return;
        }
        const badItem = transferData.items.find(i => i.quantity <= 0);
        if (badItem) {
            Alert.error(tAlert('error'), `${badItem.name} üçün miqdar 0-dan çox olmalıdır`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                fromBranchId: branchId,          // bu filial göndərən
                toBranchId: selectedToBranchId,
                note: transferData.note,
                items: transferData.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    fullBoxes: item.fullBoxes || 0,
                    openedBoxQuantity: item.openedBoxQuantity || 0,
                    piecesPerBox: item.piecesPerBox || 1
                }))
            };

            const response = await stockTransferApi.create(payload);
            if (response.success) {
                Alert.success(tAlert('success'), t('transfer_created_success') || 'Transfer uğurla göndərildi');
                setTransferData({ note: '', items: [] });
                setSelectedToBranchId('');
                setActiveTab('history');
                fetchData();
            }
        } catch (error) {
            console.error('Error creating transfer:', error);
            Alert.error(tAlert('error'), error.response?.data?.message || t('error_creating_transfer'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBranch = async () => {
        if (!window.confirm(t('confirm_delete_branch') || 'Bu filialı silmək istədiyinizə əminsiniz?')) return;

        try {
            const response = await branchApi.delete(branchId);
            if (response.success) {
                Alert.success(tAlert('success'), t('branch_deleted_success') || 'Filial uğurla silindi');
                navigate('/admin/branch-management');
            }
        } catch (error) {
            console.error('Error deleting branch:', error);
            Alert.error(tAlert('error'), error.response?.data?.message || t('error_deleting_branch'));
        }
    };

    if (loading) return <div className="p-12 text-center animate-pulse">{t('loading')}...</div>;
    if (!branch) return <div className="p-12 text-center">{t('branch_not_found')}</div>;


    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header / Breadcrumb */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/admin/branch-management')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4 group font-medium"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('back_to_branches') || 'Filiallara qayıt'}
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Building2 className="w-32 h-32" />
                    </div>

                    <div className="flex items-center gap-6 relative">
                        <div className="p-5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                            <Building2 className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900">{branch.name}</h1>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    {branch.address || '-'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {branch.phone || '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                        <div className="flex items-center gap-3 relative">
                            {/* Kürdəxanı filialı üçün silmək düyməsi yalnız Superadmin-ə görünür */}
                            {user?.role?.name?.toUpperCase() === 'SUPERADMIN' && (
                                <button
                                    onClick={handleDeleteBranch}
                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100"
                                    title={t('delete') || 'Sil'}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => navigate(`/admin/branch-form?id=${branchId}`)}
                                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                            >
                                {t('edit') || 'Redaktə Et'}
                            </button>
                            <div className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider ${branch.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {branch.isActive ? t('active') : t('inactive')}
                            </div>
                        </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8 overflow-hidden rounded-t-xl bg-white shadow-sm border-x border-t">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <Package className="w-5 h-5" />
                    {t('current_inventory') || 'Cari Stok'}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <History className="w-5 h-5" />
                    {t('transfer_history') || 'Göndərmə Tarixçəsi'}
                </button>
            </div>

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'inventory' ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{t('product') || 'Məhsul'}</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{t('category') || 'Kateqoriya'}</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{t('current_stock') || 'Stok'}</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest w-20">Göndər</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {inventory.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400">{t('no_inventory') || 'Stokda məhsul yoxdur'}</td>
                                        </tr>
                                    ) : (
                                        inventory.map((item) => (
                                            <tr key={item.id} className={`transition-all duration-500 ${lastAdded === (item.productId || item.product?.id) ? 'bg-emerald-50 ring-2 ring-emerald-300 ring-inset scale-[1.01]' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{item.product?.name || 'Məhsul'}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">{item.product?.barcode || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-lg italic">
                                                        {item.product?.category?.name || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-block w-fit ${item.stock <= 10 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                            {item.stock} {unitSingular(item.product?.unitType)}
                                                        </span>
                                                        {hasContainer(item.product?.unitType) && (item.product?.piecesPerBox || 1) > 1 && (
                                                            <div className="text-[10px] text-gray-400 font-medium">
                                                                {Math.floor(item.stock / item.product.piecesPerBox)} {containerLabel(item.product.unitType)} {item.stock % item.product.piecesPerBox > 0 && `+ ${item.stock % item.product.piecesPerBox} əd.`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => handleAddItem(item.productId || item.product?.id)}
                                                            disabled={item.stock <= 0}
                                                            className={`p-2.5 rounded-xl transition-all ${item.stock <= 0 ? 'opacity-20 cursor-not-allowed bg-gray-100 text-gray-400' : transferData.items.find(ti => ti.productId === (item.productId || item.product?.id)) ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                            title={item.stock <= 0 ? "Stok yoxdur" : "Transferə əlavə et"}
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm">{t('no_history')}</div>
                            ) : (
                                history.map((transfer) => (
                                    <div key={transfer.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className={`p-3 rounded-2xl text-white ${transferStatusInfo(transfer.status).badgeCls.split(' ')[0].replace('100', '600')}`}>
                                                        <Package className="w-6 h-6" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full">
                                                        <div className={`w-3 h-3 rounded-full animate-pulse ${transferStatusInfo(transfer.status).badgeCls.split(' ')[0].replace('100', '600')}`} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${transfer.fromBranchId === branchId ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {transfer.fromBranchId === branchId ? 'Gedən' : 'Gələn'}
                                                                </span>
                                                                <div className="font-extrabold text-gray-900 tracking-tight text-lg">
                                                                    {transfer.note || `#${transfer.id.slice(-6)}`}
                                                                </div>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                                                <Building2 className="w-3 h-3" />
                                                                {transfer.fromBranchId === branchId 
                                                                    ? `Hədəf: ${transfer.toBranch?.name}` 
                                                                    : `Mənbə: ${transfer.fromBranch ? transfer.fromBranch.name : 'Mərkəzi Anbar'}`}
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${transferStatusInfo(transfer.status).textCls} bg-white ml-auto`}>
                                                            {transferStatusInfo(transfer.status).label}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-4 text-xs font-bold text-gray-400">
                                                        <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(transfer.createdAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                                        <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{transfer.staff?.firstName} {transfer.staff?.lastName}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Məhsul sayı</div>
                                                    <div className="text-lg font-black text-gray-900">{transfer.items?.length || 0} növ</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                            <div className="text-[10px] text-gray-300 italic">Transfer ID: #{transfer.id.slice(-6)}</div>
                                            <div className="flex items-center gap-2">
                                                {(transfer.status === 'SHIPPED' || transfer.status === 'PENDING') ? (
                                                    <div className="flex gap-2">
                                                        {transfer.toBranchId === branchId && (
                                                            <button 
                                                                onClick={() => handleUpdateStatus(transfer.id, 'COMPLETED')} 
                                                                className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-lg shadow-green-100"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" /> Qəbul Et
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleUpdateStatus(transfer.id, 'CANCELLED')} 
                                                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-lg shadow-red-100"
                                                        >
                                                            <AlertCircle className="w-4 h-4" /> {transfer.fromBranchId === branchId ? 'Ləğv Et' : 'İmtina'}
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right Panel ── */}
                {showTransferPanel && (
                    <div className="w-[380px] shrink-0 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col sticky top-4 self-start max-h-[calc(100vh-120px)] overflow-hidden animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 font-bold text-lg"><Send className="w-5 h-5 text-blue-400" />Filiala Göndər</div>
                            <button onClick={() => setShowTransferPanel(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Hədəf Filial</label>
                                <select value={selectedToBranchId} onChange={e => setSelectedToBranchId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-800 outline-none">
                                    <option value="">— Seçin —</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Transfer Adı / Qeyd</label>
                                <input type="text" value={transferData.note} onChange={e => setTransferData({ ...transferData, note: e.target.value })} placeholder="Əlavə qeyd..." className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Məhsullar ({transferData.items.length})</label>
                                    {transferData.items.length > 0 && <button onClick={() => setTransferData({ ...transferData, items: [] })} className="text-[10px] text-red-500 hover:underline">Vazkeç</button>}
                                </div>
                                {transferData.items.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-xs italic">Cədvəldən "Göndər" klikləyin</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {transferData.items.map((item, index) => {
                                            const ppb = item.piecesPerBox || 1;
                                            return (
                                                <div key={item.productId} className="bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="font-bold text-gray-900 text-sm truncate">{item.name}</div>
                                                            <div className="text-[10px] text-gray-400">Var: {item.maxStock} əd.</div>
                                                        </div>
                                                        <button onClick={() => handleRemoveItem(index)} className="text-gray-300 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                                                    </div>
                                                    {ppb > 1 ? (
                                                        <div className="flex items-end gap-2">
                                                            <NumericInput value={item.fullBoxes} onChange={val => updateItemQuantity(index, 'fullBoxes', val)} size="sm" label="Qutu" className="flex-1" max={Math.floor(item.maxStock / ppb)} />
                                                            <NumericInput value={item.openedBoxQuantity} onChange={val => updateItemQuantity(index, 'openedBoxQuantity', val)} size="sm" label="Ədəd" className="flex-1" max={ppb - 1} />
                                                        </div>
                                                    ) : (
                                                        <NumericInput value={item.quantity} onChange={val => updateItemQuantity(index, 'quantity', val)} size="sm" suffix="əd." max={item.maxStock} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                            <button onClick={handleTransferSubmit} disabled={submitting || transferData.items.length === 0 || !selectedToBranchId} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Göndərişi Tamamla
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
