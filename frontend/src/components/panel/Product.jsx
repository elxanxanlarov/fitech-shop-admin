import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, FileSpreadsheet, Upload } from 'lucide-react';
import { getProductColumns } from '../../data/table-columns/ProductColumns';
import { productApi, categoryApi, subCategoryApi } from '../../api';
import ExcelImportModal from '../modals/ExcelImportModal';
import ExcelTableModal from '../modals/ExcelTableModal';
import BarcodeScannerModal from '../modals/BarcodeScannerModal';
import ProductStockHistoryModal from '../modals/ProductStockHistoryModal';
import { useBranch } from '../../hooks';
import { History, ShoppingCart } from 'lucide-react';

export default function Product() {
    const { t, i18n } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [productData, setProductData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [isExcelTableModalOpen, setIsExcelTableModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanningProduct, setScanningProduct] = useState(null);
    const [historyModal, setHistoryModal] = useState({ isOpen: false, productId: null, product: null, tab: 'details' });
    const [filters, setFilters] = useState({});
    const [searchQuery, setSearchQuery] = useState(''); // Actual search query used for API
    const [searchValue, setSearchValue] = useState(searchQuery || ''); // Input value - localStorage-dan ilk dəyər alır
    const [branchSettings, setBranchSettings] = useState({ showPurchasePrice: true });
    const { selectedBranchId, selectedBranchName } = useBranch();

    // Filial dəyişdikdə filterləri sıfırla
    const prevBranchRef = useState(selectedBranchId);
    useEffect(() => {
        if (prevBranchRef[0] !== selectedBranchId) {
            prevBranchRef[1](selectedBranchId);
            setFilters({});
            setSearchQuery('');
            setSearchValue('');
        }

        const fetchBranchSettings = async () => {
            if (selectedBranchId && selectedBranchId !== 'central') {
                try {
                    const response = await branchApi.getById(selectedBranchId);
                    if (response.success && response.data) {
                        setBranchSettings({
                            showPurchasePrice: response.data.showPurchasePrice !== false
                        });
                    }
                } catch (error) {
                    console.error('Error fetching branch settings:', error);
                }
            } else {
                setBranchSettings({ showPurchasePrice: true });
            }
        };
        fetchBranchSettings();
    }, [selectedBranchId]);

    const handleScanBarcode = (product) => {
        setScanningProduct(product);
        setIsScannerOpen(true);
    };

    const handleScanSuccess = async (barcode) => {
        if (!scanningProduct || !barcode) return;

        try {
            Alert.loading(t('loading'));
            const response = await productApi.update(scanningProduct.id, { barcode });
            
            if (response.success) {
                setProductData(prev => prev.map(p => 
                    p.id === scanningProduct.id ? { ...p, barcode } : p
                ));
                Alert.success(tAlert('success'), t('barcode_updated_success') || 'Barkod uğurla yeniləndi');
            } else {
                Alert.error(tAlert('error'), response.message || t('error_text'));
            }
        } catch (error) {
            console.error('Error updating barcode:', error);
            Alert.error(tAlert('error'), error.response?.data?.message || t('error_text'));
        } finally {
            setIsScannerOpen(false);
            setScanningProduct(null);
        }
    };

    const handleOpenHistory = (product, tab = 'details') => {
        setHistoryModal({
            isOpen: true,
            productId: product.id,
            product: product,
            tab: tab
        });
    };

    const columns = useMemo(() => getProductColumns(t, i18n.language, handleScanBarcode, handleOpenHistory, branchSettings.showPurchasePrice), [t, i18n.language, branchSettings.showPurchasePrice]);

    // Fetch categories for filter - filial seçiminə uyğun filter et
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const params = {};
                const response = await categoryApi.getAll(params);
                if (response.success && response.date) {
                    setCategories(response.date);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, [selectedBranchId, selectedBranchName]);

    const fetchSubCategories = useCallback(async (categoryName) => {
        if (!categoryName) {
            setSubCategories([]);
            return;
        }

        const selectedCategory = categories.find(cat => cat.name === categoryName);
        if (!selectedCategory) {
            setSubCategories([]);
            return;
        }

        try {
            const response = await subCategoryApi.getAll(selectedCategory.id);
            if (response.success && response.date) {
                setSubCategories(response.date);
            }
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            setSubCategories([]);
        }
    }, [categories]);

    // Fetch subcategories when applied category filter changes
    useEffect(() => {
        fetchSubCategories(filters.categoryName);
    }, [filters.categoryName, fetchSubCategories]);

    // Build query string from filters
    const buildQueryString = useCallback((filters, searchQuery) => {
        const params = new URLSearchParams();

        // Ensure searchQuery is a string before calling trim
        if (searchQuery !== null && searchQuery !== undefined) {
            const searchStr = typeof searchQuery === 'string' ? searchQuery : String(searchQuery || '');
            if (searchStr.trim()) {
                params.append('search', searchStr.trim());
            }
        }

        if (filters.categoryName) {
            params.append('categoryName', filters.categoryName);
        }

        if (filters.subCategoryName) {
            params.append('subCategoryName', filters.subCategoryName);
        }

        if (filters.stockStatus) {
            params.append('stockStatus', filters.stockStatus);
        }

        if (filters.isActive) {
            const isActiveValue = filters.isActive.toLowerCase().trim();
            if (isActiveValue === 'aktiv' || isActiveValue === 'active') {
                params.append('isActive', 'true');
            } else if (isActiveValue === 'qeyri-aktiv' || isActiveValue === 'inactive') {
                params.append('isActive', 'false');
            }
        }

        if (filters.isOfficial) {
            params.append('isOfficial', filters.isOfficial);
        }

        // Price range filters
        if (filters.minPurchasePrice) {
            params.append('minPurchasePrice', filters.minPurchasePrice);
        }
        if (filters.maxPurchasePrice) {
            params.append('maxPurchasePrice', filters.maxPurchasePrice);
        }
        if (filters.minSalePrice) {
            params.append('minSalePrice', filters.minSalePrice);
        }
        if (filters.maxSalePrice) {
            params.append('maxSalePrice', filters.maxSalePrice);
        }

        if (selectedBranchId && selectedBranchId !== 'central') {
            params.append('branchId', selectedBranchId);
            // Bütün filiallar üçün includeUnassigned=true göndər ki,
            // merkezdən köçürülmüş məhsullar filial görünüşündə görsənsın
            params.append('includeUnassigned', 'true');
        }

        const queryString = params.toString();
        return queryString ? `?${queryString}` : '';
    }, [selectedBranchId, selectedBranchName]);

    // Fetch product data
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const queryString = buildQueryString(filters, searchQuery);
            const response = await productApi.getAll(queryString);

            if (response.success && response.date) {
                setProductData(response.date);
            } else {
                // Əgər response.success false-dursa, backend-dən gələn mesajı göstər
                const errorMessage = response.message || t('error_fetching_text');
                if (response.success === false) {
                    Alert.error(t('error_fetching'), errorMessage);
                }
                setProductData([]);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            const errorMessage = error.response?.data?.message || error.message || t('error_fetching_text');
            Alert.error(t('error_fetching'), errorMessage);
            setProductData([]);
        } finally {
            setLoading(false);
        }
    }, [buildQueryString, filters, searchQuery, selectedBranchId, t]);

    useEffect(() => {
        fetchProducts();

        // Custom event dinlə - məhsul bərpa ediləndə yenilə
        const handleProductRestored = () => {
            fetchProducts();
        };

        window.addEventListener('productRestored', handleProductRestored);

        return () => {
            window.removeEventListener('productRestored', handleProductRestored);
        };
    }, [fetchProducts, i18n.language]);

    const handleEdit = async (product) => {
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/product-form?id=${product.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (product) => {
        const result = await Alert.confirm(
            tAlert('delete_confirm'),
            `${tAlert('delete_confirm_text')} ${product.name}?`,
            {
                confirmText: tAlert('yes'),
                cancelText: tAlert('no'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading'));

                // Default olaraq SOFT delete istifadə et - filial ID-sini də göndər
                await productApi.delete(product.id, 'SOFT', selectedBranchId);

                // Soft delete zamanı məhsul siyahıdan çıxır (çünki deleteType filter var)
                setProductData(prev => prev.filter(item => item.id !== product.id));

                // Custom event dispatch et - DeletedProductsBell yenilənsin
                window.dispatchEvent(new CustomEvent('productSoftDeleted', {
                    detail: { productId: product.id }
                }));

                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success'), tAlert('delete_success_text'));
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error'), error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleView = (product) => {
        handleOpenHistory(product, 'details');
    };

    const handleBulkDelete = async (selectedIds) => {
        const result = await Alert.confirm(
            tAlert('bulk_delete_confirm'),
            `${tAlert('bulk_delete_confirm_text')} ${selectedIds.length} ${t('items_selected')}?`,
            {
                confirmText: tAlert('yes'),
                cancelText: tAlert('no'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading'));

                await Promise.all(selectedIds.map(id => productApi.delete(id, 'SOFT', selectedBranchId)));

                setProductData(prev => prev.filter(item => !selectedIds.includes(item.id)));

                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('bulk_delete_success'), tAlert('bulk_delete_success_text'));
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error'), error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleAddProduct = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addProductPath = isAdmin ? '/admin/product-form' : '/reception/product-form';
        navigate(addProductPath);
    };

    const handleExcelImport = async (file, branchId = null) => {
        try {
            Alert.loading(t('uploading') || 'Yüklənir...');

            const result = await productApi.importFromExcel(file, branchId);

            Alert.close();

            if (result.success) {
                Alert.success(
                    t('import_success') || 'Uğurlu!',
                    result.message || `${result.data?.imported || 0} ${t('products_imported') || 'məhsul uğurla idxal edildi'}`
                );

                // Refresh product list with current filters
                await fetchProducts();

                setIsExcelModalOpen(false);
            } else {
                Alert.error(
                    tAlert('error') || 'Xəta!',
                    result.message || t('import_error') || 'Məhsullar idxal edilərkən xəta baş verdi'
                );
            }
        } catch (error) {
            Alert.close();
            console.error('Excel import error:', error);
            Alert.error(
                tAlert('error') || 'Xəta!',
                error.response?.data?.message || t('import_error') || 'Məhsullar idxal edilərkən xəta baş verdi'
            );
        }
    };

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, [setFilters]);

    const handleTempFilterChange = useCallback((tempFilters) => {
        // Fetch subcategories when category is selected in the filter dropdown (before Apply)
        if (tempFilters.categoryName) {
            fetchSubCategories(tempFilters.categoryName);
        } else {
            setSubCategories([]);
        }
    }, [fetchSubCategories]);

    const handleSearchChange = useCallback((search) => {
        // Only update input value, don't search yet
        setSearchValue(search);
    }, [setSearchValue]);

    const handleSearchSubmit = useCallback((value = null) => {
        // Set the actual search query which triggers the API call
        // If value is provided, use it; otherwise use current searchValue
        // If empty, set empty string to get all data
        const queryValue = value !== null ? value : searchValue;
        setSearchQuery(queryValue || '');
    }, [searchValue, setSearchQuery]);

    const handleClearFilters = useCallback(() => {
        setFilters({});
        setSearchValue('');
        setSearchQuery('');
    }, [setFilters, setSearchValue, setSearchQuery]);

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('product_management')}</h1>
                    <p className="text-gray-600">{t('manage_products')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsExcelTableModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel ilə Əlavə Et
                    </button>
                    <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                    >
                        <Upload className="w-4 h-4" />
                        Excel Faylı Yüklə
                    </button>
                    <button
                        onClick={handleAddProduct}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('add_product')}
                    </button>
                </div>
            </div>

            <TableTemplate
                data={productData}
                columns={columns}
                title={t('products')}
                searchFields={['name', 'barcode', 'description', 'invoiceName']}
                searchPlaceholder={t('search_by_name_barcode') || 'Ad, barkod və ya təsvirə görə axtar...'}
                filterOptions={useMemo(() => {
                    const categoryObjects = categories.map(cat => ({ id: cat.name, name: cat.name }));
                    const subCategoryObjects = subCategories.map(sub => ({ id: sub.name, name: sub.name }));
                    return {
                        categoryName: categoryObjects, // Object array
                        subCategoryName: subCategoryObjects, // Object array
                        stockStatus: [
                            t('in_stock') || 'Stokda var',
                            t('low_stock') || 'Az stok',
                            t('out_of_stock') || 'Stokda yoxdur'
                        ],
                        isActive: [
                            t('active') || 'Aktiv',
                            t('inactive') || 'Qeyri-aktiv'
                        ],
                        isOfficial: [
                            t('official') || 'Rəsmi',
                            t('unofficial') || 'Qeyri-rəsmi'
                        ],
                        // Price range filters
                        minPurchasePrice: 'number',
                        maxPurchasePrice: 'number',
                        minSalePrice: 'number',
                        maxSalePrice: 'number'
                    };
                }, [categories, subCategories, t])}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={handleBulkDelete}
                showBulkActions={true}
                showFilters={true}
                showSearch={true}
                showDateFilter={false}
                loading={loading}
                emptyState={{
                    icon: 'package',
                    title: t('no_products_found'),
                    description: t('no_products_description'),
                    actionText: t('add_first_product'),
                    onAction: handleAddProduct,
                    showAction: true
                }}
                // Server-side filtering props
                serverSidePagination={false}
                onSearchChange={handleSearchChange}
                onSearchSubmit={handleSearchSubmit}
                searchValue={searchValue}
                searchQuery={searchQuery}
                onFilterChange={handleFilterChange}
                onTempFilterChange={handleTempFilterChange}
                onClearFilters={handleClearFilters}
                activeFilters={filters}
            />

            {/* Excel Import Modal */}
            <ExcelImportModal
                isOpen={isExcelModalOpen}
                onClose={() => setIsExcelModalOpen(false)}
                onImport={handleExcelImport}
            />

            {/* Excel Table Bulk Add Modal */}
            <ExcelTableModal
                isOpen={isExcelTableModalOpen}
                onClose={() => setIsExcelTableModalOpen(false)}
                onRefresh={fetchProducts}
            />

            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => {
                    setIsScannerOpen(false);
                    setScanningProduct(null);
                }}
                onScanSuccess={handleScanSuccess}
            />

            {/* Product History & Details Modal */}
            <ProductStockHistoryModal
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
                productId={historyModal.productId}
                product={historyModal.product}
                initialTab={historyModal.tab}
            />
        </div>
    );
}

