import { useState, useEffect, useRef } from 'react';
import { Trash2, X, RotateCcw, Package, DollarSign, ShoppingCart, Folder, Shield } from 'lucide-react';
import { productApi, expenseApi, saleApi, categoryApi, subCategoryApi, roleApi } from '../../api';
import { useClickOutside } from '../../hooks';
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
    const [deletedItems, setDeletedItems] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useClickOutside(showDropdown, () => setShowDropdown(false));

    useEffect(() => {
        fetchAllDeletedItems();
        // Hər 30 saniyədə bir yenilə
        const interval = setInterval(fetchAllDeletedItems, 30000);
        
        // Custom event dinlə - element silinəndə və ya bərpa ediləndə yenilə
        const handleItemDeleted = () => {
            fetchAllDeletedItems();
        };
        
        const handleItemRestored = () => {
            fetchAllDeletedItems();
        };
        
        window.addEventListener('productDeleted', handleItemDeleted);
        window.addEventListener('productSoftDeleted', handleItemDeleted);
        window.addEventListener('productRestored', handleItemRestored);
        window.addEventListener('expenseDeleted', handleItemDeleted);
        window.addEventListener('expenseRestored', handleItemRestored);
        window.addEventListener('saleDeleted', handleItemDeleted);
        window.addEventListener('saleRestored', handleItemRestored);
        window.addEventListener('categoryDeleted', handleItemDeleted);
        window.addEventListener('categoryRestored', handleItemRestored);
        window.addEventListener('subCategoryDeleted', handleItemDeleted);
        window.addEventListener('subCategoryRestored', handleItemRestored);
        window.addEventListener('roleDeleted', handleItemDeleted);
        window.addEventListener('roleRestored', handleItemRestored);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('productDeleted', handleItemDeleted);
            window.removeEventListener('productSoftDeleted', handleItemDeleted);
            window.removeEventListener('productRestored', handleItemRestored);
            window.removeEventListener('expenseDeleted', handleItemDeleted);
            window.removeEventListener('expenseRestored', handleItemRestored);
            window.removeEventListener('saleDeleted', handleItemDeleted);
            window.removeEventListener('saleRestored', handleItemRestored);
            window.removeEventListener('categoryDeleted', handleItemDeleted);
            window.removeEventListener('categoryRestored', handleItemRestored);
            window.removeEventListener('subCategoryDeleted', handleItemDeleted);
            window.removeEventListener('subCategoryRestored', handleItemRestored);
            window.removeEventListener('roleDeleted', handleItemDeleted);
            window.removeEventListener('roleRestored', handleItemRestored);
        };
    }, []);

    const fetchAllDeletedItems = async () => {
        try {
            setLoading(true);
            const [productsRes, expensesRes, salesRes, categoriesRes, subCategoriesRes, rolesRes] = await Promise.all([
                productApi.getAll('?deleteType=SOFT').catch(() => ({ success: false, data: [] })),
                expenseApi.getAll({ deleteType: 'SOFT' }).catch(() => ({ success: false, data: [] })),
                saleApi.getAll({ deleteType: 'SOFT' }).catch(() => ({ success: false, data: [] })),
                categoryApi.getAll().then(res => {
                    const list = res.data || res.date || [];
                    if (res.success && list) {
                        return { success: true, data: list.filter(item => item.deleteType === 'SOFT') };
                    }
                    return { success: false, data: [] };
                }).catch(() => ({ success: false, data: [] })),
                subCategoryApi.getAll().then(res => {
                    const list = res.data || res.date || [];
                    if (res.success && list) {
                        return { success: true, data: list.filter(item => item.deleteType === 'SOFT') };
                    }
                    return { success: false, data: [] };
                }).catch(() => ({ success: false, data: [] })),
                roleApi.getAll().then(res => {
                    const list = res.data || res.date || [];
                    if (res.success && list) {
                        return { success: true, data: list.filter(item => item.deleteType === 'SOFT') };
                    }
                    return { success: false, data: [] };
                }).catch(() => ({ success: false, data: [] }))
            ]);

            const allItems = [
                ...(productsRes.success && (productsRes.data || productsRes.date) ? (productsRes.data || productsRes.date).map(item => ({ ...item, type: 'Product' })) : []),
                ...(expensesRes.success && (expensesRes.data || expensesRes.date) ? (expensesRes.data || expensesRes.date).map(item => ({ ...item, type: 'Expense' })) : []),
                ...(salesRes.success && (salesRes.data || salesRes.date) ? (salesRes.data || salesRes.date).map(item => ({ ...item, type: 'Sale' })) : []),
                ...(categoriesRes.success && (categoriesRes.data || categoriesRes.date) ? (categoriesRes.data || categoriesRes.date).map(item => ({ ...item, type: 'Category' })) : []),
                ...(subCategoriesRes.success && (subCategoriesRes.data || subCategoriesRes.date) ? (subCategoriesRes.data || subCategoriesRes.date).map(item => ({ ...item, type: 'SubCategory' })) : []),
                ...(rolesRes.success && (rolesRes.data || rolesRes.date) ? (rolesRes.data || rolesRes.date).map(item => ({ ...item, type: 'Role' })) : [])
            ];

            setDeletedItems(allItems);
        } catch (error) {
            console.error('Error fetching deleted items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (item) => {
        const itemName = item.name || item.title || `${item.customerName || ''} ${item.customerSurname || ''}`.trim() || item.id.substring(0, 8);
        const result = await Alert.confirm(
            tAlert('restore_confirm') || 'Bərpa edilsin?',
            `${t('restore_confirm_text') || 'Bu elementi bərpa etmək istəyirsiniz?'} ${itemName}?`,
            {
                confirmText: tAlert('yes') || 'Bəli',
                cancelText: tAlert('no') || 'Xeyr',
                confirmColor: '#10B981',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');
                
                let restorePromise;
                switch (item.type) {
                    case 'Product':
                        // Product üçün restore: deleteType-u NONE və isActive-i true et
                        restorePromise = productApi.update(item.id, {
                            deleteType: 'NONE',
                            isActive: true
                        });
                        break;
                    case 'Expense':
                        // Expense üçün restore: deleteType-u NONE et
                        restorePromise = expenseApi.update(item.id, {
                            deleteType: 'NONE'
                        });
                        break;
                    case 'Sale':
                        // Sale üçün restore: deleteType-u NONE et
                        restorePromise = saleApi.update(item.id, {
                            deleteType: 'NONE'
                        });
                        break;
                    case 'Category':
                        // Category üçün restore: deleteType-u NONE və isActive-i true et
                        restorePromise = categoryApi.update(item.id, {
                            deleteType: 'NONE',
                            isActive: true
                        });
                        break;
                    case 'SubCategory':
                        // SubCategory üçün restore: deleteType-u NONE və isActive-i true et
                        restorePromise = subCategoryApi.update(item.id, {
                            deleteType: 'NONE',
                            isActive: true
                        });
                        break;
                    case 'Role':
                        // Role üçün restore: deleteType-u NONE et
                        restorePromise = roleApi.update(item.id, {
                            deleteType: 'NONE'
                        });
                        break;
                    default:
                        throw new Error('Unknown item type');
                }

                await restorePromise;
                setDeletedItems(prev => prev.filter(i => i.id !== item.id || i.type !== item.type));
                
                // Custom event dispatch et - event adını düzgün formatla
                const eventName = item.type === 'SubCategory' ? 'subCategoryRestored' : `${item.type.toLowerCase()}Restored`;
                window.dispatchEvent(new CustomEvent(eventName, { 
                    detail: { id: item.id } 
                }));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('success') || 'Uğurlu!', t('restore_success') || 'Element bərpa edildi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Element bərpa edilərkən xəta baş verdi');
                }, 100);
            }
        }
    };

    const handleRestoreAll = async () => {
        if (deletedItems.length === 0) return;
        
        const result = await Alert.confirm(
            tAlert('restore_confirm') || 'Bərpa edilsin?',
            `${t('restore_all_confirm') || 'Bütün silinmiş elementləri bərpa etmək istəyirsiniz?'} (${deletedItems.length} ${t('items') || 'element'})?`,
            {
                confirmText: tAlert('yes') || 'Bəli',
                cancelText: tAlert('no') || 'Xeyr',
                confirmColor: '#10B981',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');
                
                const restorePromises = deletedItems.map(item => {
                    try {
                        switch (item.type) {
                            case 'Product':
                                // Product üçün restore: deleteType-u NONE və isActive-i true et
                                return productApi.update(item.id, {
                                    deleteType: 'NONE',
                                    isActive: true
                                });
                            case 'Expense':
                                // Expense üçün restore: deleteType-u NONE et
                                return expenseApi.update(item.id, {
                                    deleteType: 'NONE'
                                });
                            case 'Sale':
                                // Sale üçün restore: deleteType-u NONE et
                                return saleApi.update(item.id, {
                                    deleteType: 'NONE'
                                });
                            case 'Category':
                                // Category üçün restore: deleteType-u NONE və isActive-i true et
                                return categoryApi.update(item.id, {
                                    deleteType: 'NONE',
                                    isActive: true
                                });
                            case 'SubCategory':
                                // SubCategory üçün restore: deleteType-u NONE və isActive-i true et
                                return subCategoryApi.update(item.id, {
                                    deleteType: 'NONE',
                                    isActive: true
                                });
                            case 'Role':
                                // Role üçün restore: deleteType-u NONE et
                                return roleApi.update(item.id, {
                                    deleteType: 'NONE'
                                });
                            default:
                                return Promise.resolve();
                        }
                    } catch (error) {
                        console.error(`Error restoring ${item.type} ${item.id}:`, error);
                        return Promise.resolve(); // Continue with other items even if one fails
                    }
                });

                await Promise.all(restorePromises);
                setDeletedItems([]);
                
                // Custom events dispatch et - event adlarını düzgün formatla
                deletedItems.forEach(item => {
                    const eventName = item.type === 'SubCategory' ? 'subCategoryRestored' : `${item.type.toLowerCase()}Restored`;
                    window.dispatchEvent(new CustomEvent(eventName, { 
                        detail: { id: item.id } 
                    }));
                });
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('success') || 'Uğurlu!', t('restore_all_success') || 'Bütün elementlər bərpa edildi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Elementlər bərpa edilərkən xəta baş verdi');
                }, 100);
            }
        }
    };

    const handleHardDelete = async (item) => {
        const itemName = item.name || item.title || `${item.customerName || ''} ${item.customerSurname || ''}`.trim() || item.id.substring(0, 8);
        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Bu elementi tamamilə silmək istəyirsiniz?'} ${itemName}?`,
            {
                confirmText: tAlert('yes') || 'Bəli',
                cancelText: tAlert('no') || 'Xeyr',
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');
                
                let deletePromise;
                switch (item.type) {
                    case 'Product':
                        deletePromise = productApi.delete(item.id, 'HARD');
                        break;
                    case 'Expense':
                        deletePromise = expenseApi.delete(item.id, 'HARD');
                        break;
                    case 'Sale':
                        deletePromise = saleApi.delete(item.id, 'HARD');
                        break;
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

                await deletePromise;
                setDeletedItems(prev => prev.filter(i => i.id !== item.id || i.type !== item.type));
                
                // Custom event dispatch et
                window.dispatchEvent(new CustomEvent(`${item.type.toLowerCase()}Deleted`, { 
                    detail: { id: item.id } 
                }));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu!', tAlert('delete_success_text') || 'Element tamamilə silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Element silinərkən xəta baş verdi');
                }, 100);
            }
        }
    };

    const handleDeleteAll = async () => {
        if (deletedItems.length === 0) return;
        
        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Bütün silinmiş elementləri tamamilə silmək istəyirsiniz?'} (${deletedItems.length} ${t('items') || 'element'})?`,
            {
                confirmText: tAlert('yes') || 'Bəli',
                cancelText: tAlert('no') || 'Xeyr',
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');
                
                const deletePromises = deletedItems.map(item => {
                    switch (item.type) {
                        case 'Product':
                            return productApi.delete(item.id, 'HARD');
                        case 'Expense':
                            return expenseApi.delete(item.id, 'HARD');
                        case 'Sale':
                            return saleApi.delete(item.id, 'HARD');
                        case 'Category':
                            return categoryApi.delete(item.id, 'HARD');
                        case 'SubCategory':
                            return subCategoryApi.delete(item.id, 'HARD');
                        case 'Role':
                            return roleApi.delete(item.id, 'HARD');
                        default:
                            return Promise.resolve();
                    }
                });

                await Promise.all(deletePromises);
                setDeletedItems([]);
                
                // Custom events dispatch et
                deletedItems.forEach(item => {
                    window.dispatchEvent(new CustomEvent(`${item.type.toLowerCase()}Deleted`, { 
                        detail: { id: item.id } 
                    }));
                });
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu!', tAlert('delete_success_text') || 'Bütün elementlər tamamilə silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Elementlər silinərkən xəta baş verdi');
                }, 100);
            }
        }
    };

    const deletedCount = deletedItems.length;

    const getItemDisplayName = (item) => {
        switch (item.type) {
            case 'Product':
                return item.name;
            case 'Expense':
                return item.title;
            case 'Sale':
                return `${item.customerName || ''} ${item.customerSurname || ''}`.trim() || `Satış #${item.id.substring(0, 8)}`;
            case 'Category':
                return item.name;
            case 'SubCategory':
                return item.name;
            case 'Role':
                return item.name;
            default:
                return item.id.substring(0, 8);
        }
    };

    const getItemDisplayInfo = (item) => {
        switch (item.type) {
            case 'Product':
                return `Stok: ${item.stock || 0}`;
            case 'Expense':
                return `Məbləğ: ${parseFloat(item.amount || 0).toFixed(2)} AZN`;
            case 'Sale':
                return `Məbləğ: ${parseFloat(item.totalAmount || 0).toFixed(2)} AZN`;
            case 'Category':
                return item.description || '';
            case 'SubCategory':
                return item.description || '';
            case 'Role':
                return item.isCore ? 'Əsas Rol' : '';
            default:
                return '';
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
                aria-label="Deleted Items"
            >
                <Trash2 className="w-5 h-5" />
                {deletedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {deletedCount > 9 ? '9+' : deletedCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-600" />
                            {t('deleted_items') || 'Silinmiş Elementlər'}
                        </h3>
                        <button
                            onClick={() => setShowDropdown(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            {t('loading') || 'Yüklənir...'}
                        </div>
                    ) : deletedCount === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {t('no_deleted_items') || 'Silinmiş element yoxdur'}
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-gray-200 bg-red-50">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-sm text-gray-700">
                                        {t('total_deleted') || 'Ümumi'}: <span className="font-semibold text-red-600">{deletedCount}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRestoreAll}
                                        className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        {t('restore_all') || 'Hamısını Bərpa Et'}
                                    </button>
                                    <button
                                        onClick={handleDeleteAll}
                                        className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {t('delete_all') || 'Hamısını Sil'}
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {deletedItems.map((item) => {
                                    const Icon = TYPE_ICONS[item.type] || Package;
                                    const typeLabel = TYPE_LABELS[item.type] || item.type;
                                    return (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                        <span className="text-xs text-gray-500">{typeLabel}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {getItemDisplayName(item)}
                                                    </p>
                                                    {getItemDisplayInfo(item) && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {getItemDisplayInfo(item)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleRestore(item)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title={t('restore') || 'Bərpa et'}
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleHardDelete(item)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('hard_delete') || 'Tamamilə sil'}
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
