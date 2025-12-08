import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, FileSpreadsheet } from 'lucide-react';
import { getProductColumns } from '../../data/table-columns/ProductColumns';
import { productApi, categoryApi } from '../../api';
import ExcelImportModal from '../modals/ExcelImportModal';

export default function Product() {
    const { t, i18n } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [productData, setProductData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

    const columns = useMemo(() => getProductColumns(t, i18n.language), [t, i18n.language]);

    // Fetch categories for filter
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await categoryApi.getAll();
                if (response.success && response.date) {
                    setCategories(response.date);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch product data
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const response = await productApi.getAll();
                
                if (response.success && response.date) {
                    setProductData(response.date);
                } else {
                    setProductData([]);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
                Alert.error(t('error_fetching'), t('error_fetching_text'));
                setProductData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [t, i18n.language]);

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
                
                await productApi.delete(product.id);
                
                setProductData(prev => prev.filter(item => item.id !== product.id));
                
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
        const discountInfo = product.hasDiscount 
            ? `\n${t('discount_price')}: ${parseFloat(product.discountPrice || 0).toFixed(2)} ₼\n${t('discount_percent')}: ${product.discountPercent || 0}%`
            : '';
        
        Alert.info(
            `${t('name')}: ${product.name}`,
            `${t('description')}: ${product.description || '-'}\n${t('barcode')}: ${product.barcode || '-'}\n${t('purchase_price')}: ${parseFloat(product.purchasePrice || 0).toFixed(2)} ₼\n${t('sale_price')}: ${parseFloat(product.salePrice || 0).toFixed(2)} ₼${discountInfo}\n${t('stock')}: ${product.stock || 0}\n${t('status')}: ${product.isActive ? t('active') : t('inactive')}`
        );
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
                
                await Promise.all(selectedIds.map(id => productApi.delete(id)));
                
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

    const handleExcelImport = async (file) => {
        try {
            Alert.loading(t('uploading') || 'Yüklənir...');
            
            const result = await productApi.importFromExcel(file);

            Alert.close();

            if (result.success) {
                Alert.success(
                    t('import_success') || 'Uğurlu!',
                    result.message || `${result.data?.imported || 0} ${t('products_imported') || 'məhsul uğurla idxal edildi'}`
                );
                
                // Refresh product list
                const productsResponse = await productApi.getAll();
                if (productsResponse.success && productsResponse.date) {
                    setProductData(productsResponse.date);
                }
                
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

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('product_management')}</h1>
                    <p className="text-gray-600">{t('manage_products')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        {t('excel_import') || 'Excel ilə Əlavə Et'}
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
                searchFields={['name', 'barcode', 'description']}
                searchPlaceholder={t('search_by_name_barcode') || 'Ad, barkod və ya təsvirə görə axtar...'}
                filterOptions={useMemo(() => {
                    const categoryNames = categories.map(cat => cat.name);
                    return {
                        categoryName: categoryNames,
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
                        ]
                    };
                }, [categories, t])}
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
            />

            {/* Excel Import Modal */}
            <ExcelImportModal
                isOpen={isExcelModalOpen}
                onClose={() => setIsExcelModalOpen(false)}
                onImport={handleExcelImport}
            />
        </div>
    );
}

