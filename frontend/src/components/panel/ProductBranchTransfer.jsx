import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Send, Trash2, ArrowLeft, Package, Info, Inbox, Check, X, Edit2, Printer, RotateCw } from 'lucide-react';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import NumericInput from '../ui/NumericInput';
import { branchApi, productApi, stockTransferApi } from '../../api';
import { hasContainer, containerLabel, unitSingular, formatStockShort } from '../../utils/unitHelpers';
import { useAuth } from '../../context/AuthContext';
import { isFilialAdmin } from '../../utils/accessHelpers';
import TransferPrintModal from '../modals/TransferPrintModal';

export default function ProductBranchTransfer() {
    const { t } = useTranslation('branch');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const { user } = useAuth();

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedTransferToPrint, setSelectedTransferToPrint] = useState(null);

    const filialLocked = isFilialAdmin(user);
    const canPickSource = !filialLocked;

    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [fromBranchId, setFromBranchId] = useState(() => (filialLocked ? user?.branchId || '' : ''));
    const [formData, setFormData] = useState({
        toBranchId: '',
        note: '',
        items: []
    });
    const [listSearch, setListSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('send'); // 'send', 'inbox', 'history'
    const [incomingTransfers, setIncomingTransfers] = useState([]);
    const [historyTransfers, setHistoryTransfers] = useState([]);
    const [loadingInbox, setLoadingInbox] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (filialLocked && user?.branchId) {
            setFromBranchId(user.branchId);
        }
    }, [filialLocked, user?.branchId]);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const res = await branchApi.getAll();
                if (res.success) setBranches(res.data || []);
            } catch (e) {
                console.error(e);
            }
        };
        loadBranches();
    }, []);

    const loadProducts = useCallback(async () => {
        if (!fromBranchId) {
            setProducts([]);
            return;
        }
        setLoading(true);
        try {
            const productsRes = await productApi.getAll({ isActive: true, branchId: fromBranchId });
            const list = productsRes.date || productsRes.data || [];
            setProducts(list);
        } catch (error) {
            console.error('Error fetching products:', error);
            Alert.error(tAlert('error'), t('error_fetching_data'));
        } finally {
            setLoading(false);
        }
    }, [fromBranchId, t, tAlert]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const loadInbox = async () => {
        const targetBranchId = user?.branchId || fromBranchId;
        if (!targetBranchId) return;

        setLoadingInbox(true);
        try {
            const res = await stockTransferApi.getAll({ 
                toBranchId: targetBranchId, 
                status: 'PENDING' 
            });
            if (res.success) {
                setIncomingTransfers(res.data || []);
            }
        } catch (error) {
            console.error('Error loading inbox:', error);
        } finally {
            setLoadingInbox(false);
        }
    };

    const loadHistory = async () => {
        const targetBranchId = user?.branchId || fromBranchId;
        
        setLoadingHistory(true);
        try {
            const params = {};
            if (targetBranchId) {
                params.branchId = targetBranchId;
            }
            
            const res = await stockTransferApi.getAll(params);
            if (res.success) {
                setHistoryTransfers(res.data || []);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'inbox') {
            loadInbox();
        } else if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, user?.branchId, fromBranchId]);

    const destinationBranches = useMemo(
        () => branches.filter((b) => b.id !== fromBranchId),
        [branches, fromBranchId]
    );

    const handleAddItem = (productId) => {
        if (!productId) return;
        const product = products.find((p) => p.id === productId);
        if (!product) return;

        const existingItemIndex = formData.items.findIndex((item) => item.productId === productId);
        if (existingItemIndex !== -1) {
            // Check if we can add more
            const currentItem = formData.items[existingItemIndex];
            if (currentItem.quantity >= currentItem.maxStock) {
                Alert.warning(tAlert('warning'), t('max_stock_reached') || 'Maksimum stok həddinə çatılıb');
                return;
            }
            updateItemQuantity(existingItemIndex, 'quantity', currentItem.quantity + 1);
            return;
        }

        // Prevent adding products with 0 stock
        if (product.stock <= 0) {
            Alert.warning(tAlert('warning'), t('max_stock_reached') || 'Maksimum stok həddinə çatılıb');
            return;
        }

        setFormData((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    rowId: crypto.randomUUID(),
                    productId: product.id,
                    name: product.name,
                    unitType: product.unitType,
                    maxStock: product.stock,
                    quantity: 1,
                    piecesPerBox: product.piecesPerBox || 1,
                    fullBoxes: product.piecesPerBox > 1 ? 0 : 0,
                    openedBoxQuantity: product.piecesPerBox > 1 ? 1 : 0
                }
            ]
        }));
    };

    const handleRemoveItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItemQuantity = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index] };
        const ppb = item.piecesPerBox || 1;

        if (field === 'quantity') {
            const val = Math.max(0, Math.min(parseInt(value, 10) || 0, item.maxStock));
            item.quantity = val;
            if (ppb > 1) {
                item.fullBoxes = Math.floor(val / ppb);
                item.openedBoxQuantity = val % ppb;
            }
        } else if (field === 'fullBoxes') {
            const boxes = Math.max(0, parseInt(value, 10) || 0);
            const pieces = Math.max(0, item.openedBoxQuantity || 0);
            const newTotal = boxes * ppb + pieces;
            if (newTotal > item.maxStock) {
                const maxBoxes = Math.floor((item.maxStock - pieces) / ppb);
                item.fullBoxes = Math.max(0, maxBoxes);
            } else {
                item.fullBoxes = boxes;
            }
            item.quantity = item.fullBoxes * ppb + (item.openedBoxQuantity || 0);
        } else if (field === 'openedBoxQuantity') {
            const maxPieces = ppb - 1;
            const pieces = Math.max(0, Math.min(parseInt(value, 10) || 0, maxPieces));
            const newTotal = (item.fullBoxes || 0) * ppb + pieces;
            if (newTotal > item.maxStock) {
                item.openedBoxQuantity = Math.max(0, item.maxStock - (item.fullBoxes || 0) * ppb);
            } else {
                item.openedBoxQuantity = pieces;
            }
            item.quantity = (item.fullBoxes || 0) * ppb + item.openedBoxQuantity;
        }

        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!fromBranchId) {
            Alert.error(tAlert('error'), t('please_select_source_branch'));
            return;
        }
        if (!formData.toBranchId) {
            Alert.error(tAlert('error'), t('please_select_branch'));
            return;
        }
        if (formData.items.length === 0) {
            Alert.error(tAlert('error'), t('please_add_products'));
            return;
        }

        const invalidItem = formData.items.find((item) => item.quantity <= 0);
        if (invalidItem) {
            Alert.error(tAlert('error'), `${invalidItem.name}: ${t('invalid_quantity')}`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                fromBranchId,
                toBranchId: formData.toBranchId,
                note: formData.note,
                items: formData.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    fullBoxes: item.fullBoxes || 0,
                    openedBoxQuantity: item.openedBoxQuantity || 0
                }))
            };

            const response = editingId 
                ? await stockTransferApi.update(editingId, payload)
                : await stockTransferApi.create(payload);

            if (response.success) {
                Alert.success(tAlert('success'), editingId ? t('transfer_updated_success') : t('transfer_created_success'));
                setFormData({ toBranchId: '', note: '', items: [] });
                setEditingId(null);
                if (editingId) {
                    setActiveTab('history');
                    loadHistory();
                }
            }
        } catch (error) {
            console.error('Filial transfer error:', error);
            Alert.error(tAlert('error'), error.response?.data?.message || t('error_creating_transfer'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditTransfer = (transfer) => {
        if (transfer.status !== 'PENDING') return;

        setEditingId(transfer.id);
        setFromBranchId(transfer.fromBranchId || '');
        setFormData({
            toBranchId: transfer.toBranchId,
            note: transfer.note || '',
            items: transfer.items.map(item => ({
                productId: item.productId,
                name: item.product?.name,
                unitType: item.product?.unitType,
                maxStock: (item.product?.stock || 0) + item.quantity, // Restore for editing
                quantity: item.quantity,
                piecesPerBox: item.product?.piecesPerBox || 1,
                fullBoxes: item.fullBoxes || 0,
                openedBoxQuantity: item.openedBoxQuantity || 0
            }))
        });
        setActiveTab('send');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ toBranchId: '', note: '', items: [] });
        if (filialLocked) setFromBranchId(user?.branchId || '');
        else setFromBranchId('');
    };

    if (filialLocked && !user?.branchId) {
        return (
            <div className="p-6 max-w-5xl mx-auto text-center text-red-600">
                {t('filial_admin_no_branch')}
            </div>
        );
    }

    if (loading && !fromBranchId) {
        return <div className="p-6 text-center">{t('loading')}</div>;
    }

    const handleAcceptTransfer = async (transferId) => {
        const result = await Alert.confirm(
            t('accept'),
            t('confirm_accept_transfer')
        );

        if (result.isConfirmed) {
            try {
                const res = await stockTransferApi.updateStatus(transferId, 'COMPLETED');
                if (res.success) {
                    Alert.success(tAlert('success'), t('status_updated_success'));
                    loadInbox();
                    if (activeTab === 'history') loadHistory();
                }
            } catch (error) {
                console.error('Error accepting transfer:', error);
                Alert.error(tAlert('error'), error.response?.data?.message || t('error_updating_status'));
            }
        }
    };

    const handleRejectTransfer = async (transferId) => {
        const result = await Alert.confirm(
            t('reject'),
            t('confirm_reject_transfer'),
            { confirmColor: '#EF4444' }
        );

        if (result.isConfirmed) {
            try {
                const res = await stockTransferApi.updateStatus(transferId, 'CANCELLED');
                if (res.success) {
                    Alert.success(tAlert('success'), t('status_updated_success'));
                    loadInbox();
                    if (activeTab === 'history') loadHistory();
                }
            } catch (error) {
                console.error('Error rejecting transfer:', error);
                Alert.error(tAlert('error'), error.response?.data?.message || t('error_updating_status'));
            }
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            case 'SHIPPED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'COMPLETED': return t('completed') || 'Qəbul edildi';
            case 'CANCELLED': return t('cancelled') || 'Ləğv edildi';
            case 'SHIPPED': return t('shipped') || 'Yoldadır';
            case 'PENDING': return t('pending') || 'Gözləyir';
            default: return status;
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('back_to_products')}
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 pt-8 pb-0 text-white rounded-t-xl overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Send className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {editingId ? t('edit_transfer') || 'Transferi Redaktə Et' : t('product_branch_transfer')}
                                </h1>
                                <p className="text-teal-100 opacity-90">
                                    {editingId ? t('edit_transfer_desc') || 'Gözləyən transferi yeniləyin' : t('product_branch_transfer_desc')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('send')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold transition-all ${
                                activeTab === 'send'
                                    ? 'bg-white text-teal-700 shadow-lg'
                                    : 'bg-teal-700/50 text-white hover:bg-teal-500/50 hover:translate-y-[-2px]'
                            }`}
                        >
                            <Send className="w-4 h-4" />
                            {t('to_send')}
                        </button>
                        <button
                            onClick={() => setActiveTab('inbox')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold transition-all relative ${
                                activeTab === 'inbox'
                                    ? 'bg-white text-teal-700 shadow-lg'
                                    : 'bg-teal-700/50 text-white hover:bg-teal-500/50 hover:translate-y-[-2px]'
                            }`}
                        >
                            <Inbox className="w-4 h-4" />
                            {t('received')}
                            {incomingTransfers.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-teal-600 animate-pulse">
                                    {incomingTransfers.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold transition-all ${
                                activeTab === 'history'
                                    ? 'bg-white text-teal-700 shadow-lg'
                                    : 'bg-teal-700/50 text-white hover:bg-teal-500/50 hover:translate-y-[-2px]'
                            }`}
                        >
                            <Info className="w-4 h-4" />
                            {t('history')}
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'send' ? (
                        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('source_branch')} *
                            </label>
                            {canPickSource ? (
                                <select
                                    required
                                    value={fromBranchId}
                                    onChange={(e) => {
                                        setFromBranchId(e.target.value);
                                        setFormData((p) => ({ ...p, items: [] }));
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                    disabled={!!editingId}
                                >
                                    <option value="">{t('select_branch')}</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800">
                                    {branches.find((b) => b.id === fromBranchId)?.name || fromBranchId}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('target_branch')} *
                            </label>
                            <select
                                required
                                value={formData.toBranchId}
                                onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                            >
                                <option value="">{t('select_branch')}</option>
                                {destinationBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('note')}
                            </label>
                            <input
                                type="text"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder={t('transfer_note_placeholder')}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-4 bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    {t('add_products') || 'Məhsul Əlavə Et'}
                                </h3>
                                <p className="text-xs text-teal-600 font-medium">Anbardakı məhsulları transfer siyahısına əlavə edin</p>
                            </div>
                            <div className="w-full max-w-md flex items-center gap-2">
                                <div className="flex-1">
                                    <SearchDropdown
                                        placeholder={t('search_product_to_add')}
                                        options={products}
                                        value={[]} // Keep empty to allow multi-clicks
                                        onChange={handleAddItem}
                                        searchFields={['name', 'barcode']}
                                        disabled={!fromBranchId || loading}
                                        renderOption={(option) => {
                                            const boxes =
                                                option.piecesPerBox > 1 ? Math.floor(option.stock / option.piecesPerBox) : 0;
                                            const pieces =
                                                option.piecesPerBox > 1 ? option.stock % option.piecesPerBox : 0;
                                            const hasNoStock = option.stock <= 0;

                                            return (
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex flex-col">
                                                        <span
                                                            className={`font-medium ${hasNoStock ? 'text-red-700' : 'text-gray-900'}`}
                                                        >
                                                            {option.name}
                                                        </span>
                                                        {option.piecesPerBox > 1 && (
                                                            <span className="text-[10px] text-gray-400">
                                                                1 {t('BOX') || 'Qutu'} = {option.piecesPerBox}{' '}
                                                                {option.unitType === 'BOX'
                                                                    ? t('PIECE') || 'Ədəd'
                                                                    : t(option.unitType) || option.unitType}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span
                                                            className={`text-xs font-bold px-2 py-1 rounded-md border ${
                                                                hasNoStock
                                                                    ? 'bg-red-50 text-red-700 border-red-100'
                                                                    : 'bg-teal-50 text-teal-700 border-teal-100'
                                                            }`}
                                                        >
                                                            {option.stock}{' '}
                                                            {option.unitType === 'BOX'
                                                                ? t('PIECE') || 'Ədəd'
                                                                : t(option.unitType) || option.unitType}
                                                        </span>
                                                        {option.piecesPerBox > 1 && (
                                                            <span
                                                                className={`text-[10px] font-bold uppercase ${
                                                                    hasNoStock ? 'text-red-400' : 'text-gray-400'
                                                                }`}
                                                            >
                                                                {boxes} {t('BOX') || 'Qutu'}{' '}
                                                                {pieces > 0 && `${pieces} ${t('PIECE') || 'Ədəd'}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={loadProducts}
                                    disabled={loading || !fromBranchId}
                                    className="p-3 bg-white border border-teal-100 text-teal-600 rounded-xl hover:bg-teal-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                    title={t('refresh') || 'Yenilə'}
                                >
                                    <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-gray-700">
                                    {t('transfer_list') || 'Transfer Siyahısı'} 
                                    <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-md text-xs text-gray-500">{formData.items.length}</span>
                                </h3>
                            </div>
                            <div className="relative w-64">
                                <input
                                    type="text"
                                    placeholder={t('search_in_list') || 'Siyahıda axtar...'}
                                    value={listSearch}
                                    onChange={(e) => setListSearch(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm"
                                />
                                <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                                            {t('product_name')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                                            {t('current_stock')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-72">
                                            {t('quantity')}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                                            {t('actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.items.filter(item => 
                                        item.name.toLowerCase().includes(listSearch.toLowerCase())
                                    ).length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Info className="w-8 h-8 text-gray-300" />
                                                    <p>{formData.items.length === 0 ? t('no_products_added') : t('no_results_found')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        formData.items
                                            .filter(item => item.name.toLowerCase().includes(listSearch.toLowerCase()))
                                            .map((item, index) => {
                                                // Find real index in original array for updateItemQuantity
                                                const realIndex = formData.items.findIndex(i => i === item);
                                                return (
                                                    <tr key={item.rowId || item.productId} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900">{item.name}</div>
                                                            {hasContainer(item) && (
                                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                                    1 {containerLabel(item.unitType)} = {item.piecesPerBox}{' '}
                                                                    {unitSingular(item.unitType)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1">
                                                                <span
                                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                                                                        item.maxStock <= 0
                                                                            ? 'bg-red-100 text-red-800'
                                                                            : 'bg-teal-100 text-teal-800'
                                                                    }`}
                                                                >
                                                                    {item.maxStock}
                                                                </span>
                                                                {hasContainer(item) && (
                                                                    <div
                                                                        className={`text-[10px] font-bold uppercase px-1 ${
                                                                            item.maxStock <= 0 ? 'text-red-400' : 'text-gray-500'
                                                                        }`}
                                                                    >
                                                                        {formatStockShort(
                                                                            item.maxStock,
                                                                            item.unitType,
                                                                            item.piecesPerBox
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-2">
                                                                {hasContainer(item) ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="space-y-1">
                                                                            <NumericInput
                                                                                value={item.fullBoxes}
                                                                                onChange={(val) =>
                                                                                    updateItemQuantity(realIndex, 'fullBoxes', val)
                                                                                }
                                                                                min={0}
                                                                                max={Math.floor(item.maxStock / item.piecesPerBox)}
                                                                                size="sm"
                                                                                className="w-24 text-center"
                                                                            />
                                                                        </div>
                                                                        <div className="text-gray-300 font-bold text-sm mt-4">+</div>
                                                                        <div className="space-y-1">
                                                                            <NumericInput
                                                                                value={item.openedBoxQuantity}
                                                                                onChange={(val) =>
                                                                                    updateItemQuantity(realIndex, 'openedBoxQuantity', val)
                                                                                }
                                                                                min={0}
                                                                                max={item.piecesPerBox - 1}
                                                                                size="sm"
                                                                                className="w-24 text-center"
                                                                            />
                                                                        </div>
                                                                        <div className="mt-4 text-[10px] text-teal-600 font-black whitespace-nowrap bg-teal-50 px-2 py-1 rounded">
                                                                            {item.quantity}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <NumericInput
                                                                            value={item.quantity}
                                                                            onChange={(val) =>
                                                                                updateItemQuantity(realIndex, 'quantity', val)
                                                                            }
                                                                            min={0}
                                                                            max={item.maxStock}
                                                                            className="w-32 font-bold"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(realIndex)}
                                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={editingId ? handleCancelEdit : () => navigate('/admin/products')}
                            className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={
                                submitting ||
                                formData.items.length === 0 ||
                                (!fromBranchId && !editingId) ||
                                !formData.toBranchId
                            }
                            className="flex-[2] flex items-center justify-center gap-3 px-12 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold transition-all disabled:opacity-50 shadow-lg"
                        >
                            {submitting ? (
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    {editingId ? (t('save_changes') || 'Yadda Saxla') : t('submit_filial_transfer')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            ) : activeTab === 'inbox' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Inbox className="w-5 h-5 text-teal-500" />
                                    {t('incoming_transfers')}
                                </h3>
                                <button 
                                    onClick={loadInbox}
                                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                    title="Yenilə"
                                >
                                    <svg className={`w-5 h-5 ${loadingInbox ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>

                            {loadingInbox ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-500">{t('loading')}...</p>
                                </div>
                            ) : incomingTransfers.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">{t('no_incoming_transfers')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {incomingTransfers.map((transfer, i) => (
                                        <div key={transfer.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-900">{transfer.fromBranch?.name || 'Mərkəz Anbar'}</span>
                                                        <span className="text-[10px] text-gray-500 ml-2">ID: {transfer.id.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold">{t('date') || 'Tarix'}</div>
                                                        <div className="text-xs font-medium text-gray-700">
                                                            {new Date(transfer.createdAt).toLocaleString('az-AZ')}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const actNo = 1001 + (historyTransfers.length + incomingTransfers.length - 1 - i);
                                                                setSelectedTransferToPrint({ ...transfer, actNumber: actNo });
                                                                setIsPrintModalOpen(true);
                                                            }}
                                                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-teal-100"
                                                            title={t('print') || 'Çap Et'}
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptTransfer(transfer.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            {t('accept') || 'Qəbul Et'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectTransfer(transfer.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            {t('reject') || 'Ləğv Et'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                {transfer.note && (
                                                    <div className="mb-3 text-xs text-gray-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                                                        <span className="font-bold mr-1">{t('note')}:</span> {transfer.note}
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {transfer.items?.map((item) => (
                                                        <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                            <div className="w-8 h-8 bg-white rounded border border-gray-200 flex items-center justify-center text-gray-400">
                                                                <Package className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-gray-900 truncate">{item.product?.name}</div>
                                                                <div className="text-[10px] text-teal-600 font-bold">
                                                                    {item.quantity} {item.product?.unitType === 'BOX' ? t('PIECE') : t(item.product?.unitType || 'PIECE')}
                                                                    {item.fullBoxes > 0 && ` (${item.fullBoxes} ${t('BOX')})`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-teal-500" />
                                    {t('transfer_history')}
                                </h3>
                                <button 
                                    onClick={loadHistory}
                                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                >
                                    <svg className={`w-5 h-5 ${loadingHistory ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>

                            {loadingHistory ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-500">{t('loading')}...</p>
                                </div>
                            ) : historyTransfers.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">{t('no_history_yet')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                     {historyTransfers.map((transfer, i) => {
                                        const isOutgoing = transfer.fromBranchId === (user?.branchId || fromBranchId);
                                        return (
                                            <div key={transfer.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                <div className="px-4 py-3 bg-gray-50/50 flex flex-wrap justify-between items-center gap-4 border-b border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isOutgoing ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {isOutgoing ? <Send className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase text-gray-400">
                                                                    {isOutgoing ? 'Çıxan' : 'Gələn'}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(transfer.status)}`}>
                                                                    {getStatusText(transfer.status)}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {isOutgoing 
                                                                    ? `${t('to')} ${transfer.toBranch?.name}` 
                                                                    : `${t('from')} ${transfer.fromBranch?.name || 'Mərkəzi Anbar'}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {transfer.status === 'PENDING' && (isOutgoing || !user?.branchId) && (
                                                            <button
                                                                onClick={() => handleEditTransfer(transfer)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title={t('edit') || 'Redaktə et'}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const count = historyTransfers.length;
                                                                const actNo = 1001 + (count - 1 - i);
                                                                const data = { ...transfer, actNumber: actNo };
                                                                setSelectedTransferToPrint(data);
                                                                setIsPrintModalOpen(true);
                                                            }}
                                                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title={t('print') || 'Çap Et'}
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <div className="text-right">
                                                            <div className="text-[10px] text-gray-400 uppercase font-black">{new Date(transfer.createdAt).toLocaleDateString('az-AZ')}</div>
                                                            <div className="text-xs text-gray-500">{new Date(transfer.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        {transfer.items?.map((item) => (
                                                            <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                                                                <span className="font-medium text-gray-700 truncate mr-2">{item.product?.name}</span>
                                                                <span className="font-bold text-teal-600 whitespace-nowrap">
                                                                    {item.quantity} {unitSingular(item.product?.unitType)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-col justify-end text-right">
                                                        {transfer.staff && (
                                                            <div className="text-[10px] text-gray-400">
                                                                {t('created_by') || 'Yaradan'}: <span className="text-gray-600 font-bold">{transfer.staff.name} {transfer.staff.surName}</span>
                                                            </div>
                                                        )}
                                                        {transfer.note && (
                                                            <div className="mt-1 text-[10px] text-gray-500 italic">
                                                                "{transfer.note}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                     })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <TransferPrintModal
                isOpen={isPrintModalOpen}
                onClose={() => {
                    setIsPrintModalOpen(false);
                    setSelectedTransferToPrint(null);
                }}
                transfer={selectedTransferToPrint}
            />
        </div>
    );
}
