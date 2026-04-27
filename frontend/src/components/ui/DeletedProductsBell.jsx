import { useState, useEffect, useCallback } from 'react';
import { Trash2, X, RotateCcw, Package, DollarSign, ShoppingCart, Folder, Shield, Loader2 } from 'lucide-react';
import { productApi, expenseApi, saleApi, categoryApi, subCategoryApi, roleApi, convertApi } from '../../api';
import { useClickOutside, useBranch } from '../../hooks';
import { useTranslation } from 'react-i18next';
import Alert from './Alert';

const TYPE_ICONS = {
    Product: Package,
    Expense: DollarSign,
    Sale: ShoppingCart,
    Category: Folder,
    SubCategory: Folder,
    Role: Shield
};

const TYPE_LABELS = {
    Product: 'Məhsul',
    Expense: 'Xərc',
    Sale: 'Satış',
    Category: 'Kateqoriya',
    SubCategory: 'Alt Kateqoriya',
    Role: 'Rol'
};

export default function DeletedProductsBell() {
    const { t } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const { selectedBranchId } = useBranch();
    const [deletedItems, setDeletedItems] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    
    const dropdownRef = useClickOutside(showDropdown, () => setShowDropdown(false));

    const fetchAllDeletedItems = useCallback(async () => {
        try {
            setLoading(true);
            const params = { deleteType: 'SOFT' };
            if (selectedBranchId && selectedBranchId !== 'central') {
                params.branchId = selectedBranchId;
            }

            const [productsRes, expensesRes, salesRes, categoriesRes, subCategoriesRes, rolesRes] = await Promise.all([
                productApi.getAll(params).catch(() => ({ success: false, data: [] })),
                expenseApi.getAll(params).catch(() => ({ success: false, data: [] })),
                saleApi.getAll(params).catch(() => ({ success: false, data: [] })),
                categoryApi.getAll().then(res => {
                    const list = res.data || res.date || [];
                    return { success: res.success, data: list.filter(item => item.deleteType === 'SOFT') };
                }).catch(() => ({ success: false, data: [] })),
                subCategoryApi.getAll().then(res => {
                    const list = res.data || res.date || [];
                    return { success: res.success, data: list.filter(item => item.deleteType === 'SOFT') };
                }).catch(() => ({ success: false, data: [] })),
                roleApi.getAll().then(res => {
                    const list = res.data || res.date || [];
                    return { success: res.success, data: list.filter(item => item.deleteType === 'SOFT') };
                }).catch(() => ({ success: false, data: [] }))
            ]);

            const allItems = [
                ...(productsRes.success ? (productsRes.data || productsRes.date || []).map(item => ({ ...item, type: 'Product' })) : []),
                ...(expensesRes.success ? (expensesRes.data || expensesRes.date || []).map(item => ({ ...item, type: 'Expense' })) : []),
                ...(salesRes.success ? (salesRes.data || salesRes.date || []).map(item => ({ ...item, type: 'Sale' })) : []),
                ...(categoriesRes.success ? (categoriesRes.data || categoriesRes.date || []).map(item => ({ ...item, type: 'Category' })) : []),
                ...(subCategoriesRes.success ? (subCategoriesRes.data || subCategoriesRes.date || []).map(item => ({ ...item, type: 'SubCategory' })) : []),
                ...(rolesRes.success ? (rolesRes.data || rolesRes.date || []).map(item => ({ ...item, type: 'Role' })) : [])
            ];

            // Duplikatları sil (eyni ID və eyni Tip)
            const uniqueItems = allItems.filter((item, index, self) =>
                index === self.findIndex((t) => (t.id === item.id && t.type === item.type))
            );

            setDeletedItems(uniqueItems);
        } catch (error) {
            console.error('Error fetching deleted items:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        fetchAllDeletedItems();
        const interval = setInterval(fetchAllDeletedItems, 45000); // Biraz uzatdıq
        
        const handleRefresh = () => fetchAllDeletedItems();
        
        window.addEventListener('productDeleted', handleRefresh);
        window.addEventListener('productSoftDeleted', handleRefresh);
        window.addEventListener('productRestored', handleRefresh);
        window.addEventListener('expenseDeleted', handleRefresh);
        window.addEventListener('expenseRestored', handleRefresh);
        window.addEventListener('saleDeleted', handleRefresh);
        window.addEventListener('saleRestored', handleRefresh);
        window.addEventListener('categoryDeleted', handleRefresh);
        window.addEventListener('categoryRestored', handleRefresh);
        window.addEventListener('subCategoryDeleted', handleRefresh);
        window.addEventListener('subCategoryRestored', handleRefresh);
        window.addEventListener('roleDeleted', handleRefresh);
        window.addEventListener('roleRestored', handleRefresh);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('productDeleted', handleRefresh);
            window.removeEventListener('productSoftDeleted', handleRefresh);
            window.removeEventListener('productRestored', handleRefresh);
            window.removeEventListener('expenseDeleted', handleRefresh);
            window.removeEventListener('expenseRestored', handleRefresh);
            window.removeEventListener('saleDeleted', handleRefresh);
            window.removeEventListener('saleRestored', handleRefresh);
            window.removeEventListener('categoryDeleted', handleRefresh);
            window.removeEventListener('categoryRestored', handleRefresh);
            window.removeEventListener('subCategoryDeleted', handleRefresh);
            window.removeEventListener('subCategoryRestored', handleRefresh);
            window.removeEventListener('roleDeleted', handleRefresh);
            window.removeEventListener('roleRestored', handleRefresh);
        };
    }, [fetchAllDeletedItems]);

    const handleRestore = async (item) => {
        if (actionId) return;
        const itemName = item.name || item.title || `${item.customerName || ''} ${item.customerSurname || ''}`.trim() || item.id.substring(0, 8);
        const result = await Alert.confirm(
            tAlert('restore_confirm') || 'Bərpa edilsin?',
            `${t('restore_confirm_text') || 'Bu elementi bərpa etmək istəyirsiniz?'} ${itemName}?`,
            { confirmText: tAlert('yes'), cancelText: tAlert('no'), confirmColor: '#10B981' }
        );

        if (!result.isConfirmed) return;

        setActionId(item.id);
        try {
            let restorePromise;
            const params = selectedBranchId && selectedBranchId !== 'central' ? { branchId: selectedBranchId } : {};
            
            // ConvertApi tərəfindən dəstəklənən tiplər
            const convertTypes = ['Product', 'Sale', 'Expense'];
            
            if (convertTypes.includes(item.type)) {
                // convertApi.restoreDeleted(entities, params, itemIds)
                const entityKey = item.type.toLowerCase();
                restorePromise = convertApi.restoreDeleted([entityKey], params, [item.id]);
            } else {
                // Digər tiplər üçün köhnə qayda (Category, SubCategory, Role)
                switch (item.type) {
                    case 'Category':
                        restorePromise = categoryApi.update(item.id, { deleteType: 'NONE', isActive: true });
                        break;
                    case 'SubCategory':
                        restorePromise = subCategoryApi.update(item.id, { deleteType: 'NONE', isActive: true });
                        break;
                    case 'Role':
                        restorePromise = roleApi.update(item.id, { deleteType: 'NONE' });
                        break;
                    default:
                        throw new Error('Unknown item type');
                }
            }

            await restorePromise;
            setDeletedItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)));
            
            const eventName = item.type === 'SubCategory' ? 'subCategoryRestored' : `${item.type.toLowerCase()}Restored`;
            window.dispatchEvent(new CustomEvent(eventName, { detail: { id: item.id } }));
            
            Alert.success(tAlert('success'), t('restore_success'));
        } catch (error) {
            Alert.error(tAlert('error'), error.response?.data?.message || tAlert('error_text'));
        } finally {
            setActionId(null);
        }
    };

    const handleHardDelete = async (item) => {
        if (actionId) return;
        const itemName = item.name || item.title || `${item.customerName || ''} ${item.customerSurname || ''}`.trim() || item.id.substring(0, 8);
        const result = await Alert.confirm(
            tAlert('delete_confirm'),
            `${tAlert('delete_confirm_text')} ${itemName}?`,
            { confirmText: tAlert('yes'), cancelText: tAlert('no'), confirmColor: '#EF4444' }
        );

        if (!result.isConfirmed) return;

        setActionId(item.id);
        try {
            let deletePromise;
            const params = selectedBranchId && selectedBranchId !== 'central' ? { branchId: selectedBranchId } : {};
            
            // ConvertApi tərəfindən dəstəklənən tiplər
            const convertTypes = ['Product', 'Sale', 'Expense'];
            
            if (convertTypes.includes(item.type)) {
                // convertApi.hardDeleteAll(entities, params, itemIds)
                const entityKey = item.type.toLowerCase();
                deletePromise = convertApi.hardDeleteAll([entityKey], params, [item.id]);
            } else {
                // Digər tiplər üçün köhnə qayda
                switch (item.type) {
                    case 'Category':
                        deletePromise = categoryApi.delete(item.id, 'HARD');
                        break;
                    case 'SubCategory':
                        deletePromise = subCategoryApi.delete(item.id, 'HARD');
                        break;
                    case 'Role':
                        deletePromise = roleApi.delete(item.id, 'HARD');
                        break;
                    default:
                        throw new Error('Unknown item type');
                }
            }

            await deletePromise;
            setDeletedItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)));
            
            window.dispatchEvent(new CustomEvent(`${item.type.toLowerCase()}Deleted`, { detail: { id: item.id } }));
            Alert.success(tAlert('delete_success'), tAlert('delete_success_text'));
        } catch (error) {
            if (error.response?.status === 404) {
               // Artıq silinib, sadəcə state-dən çıxart
               setDeletedItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)));
            } else {
               Alert.error(tAlert('error'), error.response?.data?.message || tAlert('error_text'));
            }
        } finally {
            setActionId(null);
        }
    };

    const handleRestoreAll = async () => {
        if (deletedItems.length === 0 || isBulkProcessing) return;
        
        const result = await Alert.confirm(
            tAlert('restore_confirm'),
            `${t('restore_all_confirm')} (${deletedItems.length} ${t('items')})?`,
            { confirmText: tAlert('yes'), cancelText: tAlert('no'), confirmColor: '#10B981' }
        );

        if (!result.isConfirmed) return;

        setIsBulkProcessing(true);
        try {
            const params = selectedBranchId && selectedBranchId !== 'central' ? { branchId: selectedBranchId } : {};
            const response = await convertApi.restoreDeleted([], params);
            if (response.success) {
                setDeletedItems([]);
                fetchAllDeletedItems();
                Alert.success(tAlert('success'), t('restore_all_success'));
            }
        } catch (error) {
            Alert.error(tAlert('error'), 'Xəta baş verdi');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleDeleteAll = async () => {
        if (deletedItems.length === 0 || isBulkProcessing) return;
        
        const result = await Alert.confirm(
            tAlert('delete_confirm'),
            `${tAlert('delete_confirm_text_all')} (${deletedItems.length} ${t('items')})?`,
            { confirmText: tAlert('yes'), cancelText: tAlert('no'), confirmColor: '#EF4444' }
        );

        if (!result.isConfirmed) return;

        setIsBulkProcessing(true);
        try {
            const params = selectedBranchId && selectedBranchId !== 'central' ? { branchId: selectedBranchId } : {};
            const response = await convertApi.hardDeleteAll([], params);
            if (response.success) {
                setDeletedItems([]);
                fetchAllDeletedItems();
                Alert.success(tAlert('delete_success'), tAlert('delete_success_text'));
            }
        } catch (error) {
            Alert.error(tAlert('error'), 'Xəta baş verdi');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const deletedCount = deletedItems.length;

    const getItemDisplayName = (item) => {
        switch (item.type) {
            case 'Product': return item.name;
            case 'Expense': return item.title;
            case 'Sale': return `${item.customerName || ''} ${item.customerSurname || ''}`.trim() || `Satış #${item.id.substring(0, 8)}`;
            case 'Category': return item.name;
            case 'SubCategory': return item.name;
            case 'Role': return item.name;
            default: return item.id.substring(0, 8);
        }
    };

    const getItemDisplayInfo = (item) => {
        switch (item.type) {
            case 'Product': return `Stok: ${item.stock || 0}`;
            case 'Expense': return `Məbləğ: ${parseFloat(item.amount || 0).toFixed(2)} AZN`;
            case 'Sale': return `Məbləğ: ${parseFloat(item.totalAmount || 0).toFixed(2)} AZN`;
            case 'Category': return item.description || '';
            case 'SubCategory': return item.description || '';
            case 'Role': return item.isCore ? 'Əsas Rol' : '';
            default: return '';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`relative p-2 rounded-lg transition-colors ${
                    deletedCount > 0 
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
                <Trash2 className="w-5 h-5" />
                {deletedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {deletedCount > 9 ? '9+' : deletedCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-600" />
                            {t('deleted_items') || 'Silinmiş Elementlər'}
                        </h3>
                        <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {loading && deletedCount === 0 ? (
                        <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm font-medium">{t('loading') || 'Yüklənir...'}</p>
                        </div>
                    ) : deletedCount === 0 ? (
                        <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-4">
                            <div className="p-4 bg-gray-50 rounded-full">
                                <Trash2 className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">{t('no_deleted_items') || 'Silinmiş element yoxdur'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-gray-200 bg-red-50/50">
                                <div className="flex items-center justify-between mb-3 text-sm">
                                    <span className="text-gray-600 font-medium">{t('total_deleted') || 'Ümumi'}:</span>
                                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">{deletedCount}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRestoreAll}
                                        disabled={isBulkProcessing}
                                        className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                        {t('restore_all') || 'Bərpa et'}
                                    </button>
                                    <button
                                        onClick={handleDeleteAll}
                                        disabled={isBulkProcessing}
                                        className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        {t('delete_all') || 'Hamısını sil'}
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                                {deletedItems.map((item) => {
                                    const Icon = TYPE_ICONS[item.type] || Package;
                                    const isProcessing = actionId === item.id;
                                    return (
                                        <div key={`${item.type}-${item.id}`} className={`p-4 hover:bg-gray-50/80 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                        <Icon className="w-3 h-3" />
                                                        {TYPE_LABELS[item.type] || item.type}
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900 truncate">{getItemDisplayName(item)}</p>
                                                    {getItemDisplayInfo(item) && <p className="text-xs text-gray-500 mt-0.5 font-medium">{getItemDisplayInfo(item)}</p>}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleRestore(item)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                                                        title={t('restore')}
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleHardDelete(item)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                        title={t('hard_delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
