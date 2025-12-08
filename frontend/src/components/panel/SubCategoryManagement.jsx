import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Plus, Edit, Trash2, Eye, ArrowLeft } from 'lucide-react';
import { subCategoryApi, categoryApi } from '../../api';

export default function SubCategoryManagement() {
    const { t } = useTranslation('subcategory');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('categoryId');
    const [subCategoryData, setSubCategoryData] = useState([]);
    const [categoryData, setCategoryData] = useState(null);
    const [loading, setLoading] = useState(true);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: t('name') || 'Ad',
        },
        {
            key: 'description',
            label: t('description') || 'Təsvir',
            render: (value) => value || '-',
        },
        {
            key: 'category',
            label: t('category') || 'Kateqoriya',
            render: (value, item) => item.category?.name || '-',
        },
        {
            key: 'isActive',
            label: t('status') || 'Status',
            render: (value) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                    {value ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}
                </span>
            ),
        },
        {
            key: 'products',
            label: t('products_count') || 'Məhsul sayı',
            render: (value, item) => {
                const count = item.products?.length || 0;
                return <span>{count}</span>;
            },
        },
        {
            key: 'createdAt',
            label: t('created_at') || 'Yaradılıb',
            render: (value) => {
                if (!value) return '-';
                return new Date(value).toLocaleDateString('az-AZ');
            },
        },
    ], [t]);

    // Fetch category data (if categoryId provided)
    useEffect(() => {
        const fetchCategory = async () => {
            if (categoryId) {
                try {
                    const response = await categoryApi.getById(categoryId);
                    if (response.success && response.date) {
                        setCategoryData(response.date);
                    }
                } catch (error) {
                    console.error('Error fetching category:', error);
                }
            }
        };
        fetchCategory();
    }, [categoryId]);

    // Fetch subcategories
    useEffect(() => {
        const fetchSubCategories = async () => {
            setLoading(true);
            try {
                const response = await subCategoryApi.getAll(categoryId || null);
                if (response.success && response.date) {
                    setSubCategoryData(response.date);
                } else {
                    setSubCategoryData([]);
                }
            } catch (error) {
                console.error('Error fetching subcategories:', error);
                Alert.error(tAlert('error') || 'Xəta', tAlert('error_text') || 'Məlumat alınarkən xəta baş verdi');
                setSubCategoryData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSubCategories();
    }, [categoryId, tAlert, t]);

    const handleEdit = async (subCategory) => {
        const params = categoryId ? `?categoryId=${categoryId}` : '';
        navigate(`/admin/subcategory-form?id=${subCategory.id.toString()}${params}`);
    };

    const handleDelete = async (subCategory) => {
        // Əgər alt kateqoriyaya aid məhsullar varsa, silməyə icazə vermə
        if (subCategory.products && subCategory.products.length > 0) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_subcategory_with_products') || 'Bu alt kateqoriyaya aid məhsullar var. Əvvəlcə məhsulları silin və ya başqa alt kateqoriyaya köçürün'
            );
            return;
        }

        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Bu alt kateqoriyanı silmək istədiyinizə əminsiniz?'} ${subCategory.name}?`,
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
                
                await subCategoryApi.delete(subCategory.id);
                
                setSubCategoryData(prev => prev.filter(item => item.id !== subCategory.id));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu', tAlert('delete_success_text') || 'Alt kateqoriya uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleView = (subCategory) => {
        const productsInfo = subCategory.products && subCategory.products.length > 0
            ? `\n${t('products') || 'Məhsullar'}:\n${subCategory.products.map(p => `- ${p.name}`).join('\n')}`
            : `\n${t('no_products') || 'Məhsul yoxdur'}`;
        
        Alert.info(
            `${t('subcategory')}: ${subCategory.name}`,
            `${t('category')}: ${subCategory.category?.name || '-'}\n${t('description')}: ${subCategory.description || '-'}\n${t('status')}: ${subCategory.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}${productsInfo}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
        const selectedSubCategories = subCategoryData.filter(sc => selectedIds.includes(sc.id));
        
        // Əgər seçilmiş alt kateqoriyalardan hər hansı birinə aid məhsullar varsa, silməyə icazə vermə
        const subCategoriesWithProducts = selectedSubCategories.filter(sc => sc.products && sc.products.length > 0);
        if (subCategoriesWithProducts.length > 0) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_subcategories_with_products') || 'Bəzi alt kateqoriyalara aid məhsullar var. Əvvəlcə məhsulları silin və ya başqa alt kateqoriyaya köçürün'
            );
            return;
        }

        const result = await Alert.confirm(
            tAlert('bulk_delete_confirm') || 'Silinsin?',
            `${tAlert('bulk_delete_confirm_text') || 'Seçilmiş alt kateqoriyaları silmək istədiyinizə əminsiniz?'} (${selectedIds.length})`,
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
                
                // Məhsulları olmayan alt kateqoriyaları filter et
                const idsToDelete = selectedIds.filter(id => {
                    const subCategory = subCategoryData.find(sc => sc.id === id);
                    return !subCategory?.products || subCategory.products.length === 0;
                });
                
                await Promise.all(idsToDelete.map(id => subCategoryApi.delete(id)));
                
                setSubCategoryData(prev => prev.filter(item => !idsToDelete.includes(item.id)));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('bulk_delete_success') || 'Uğurlu', tAlert('bulk_delete_success_text') || 'Alt kateqoriyalar uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleAddSubCategory = () => {
        const params = categoryId ? `?categoryId=${categoryId}` : '';
        navigate(`/admin/subcategory-form${params}`);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {categoryId && (
                        <button
                            onClick={() => navigate('/admin/category-management')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title={t('back_to_categories') || 'Kateqoriyalara qayıt'}
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {categoryId && categoryData 
                                ? `${t('subcategory_management') || 'Alt Kateqoriya İdarəetməsi'} - ${categoryData.name}`
                                : (t('subcategory_management') || 'Alt Kateqoriya İdarəetməsi')
                            }
                        </h1>
                        <p className="text-gray-600">
                            {categoryId && categoryData
                                ? `${t('manage_subcategories_for') || 'Alt kateqoriyaları idarə edin'}: ${categoryData.name}`
                                : (t('manage_subcategories') || 'Alt kateqoriyaları idarə edin')
                            }
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleAddSubCategory}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_subcategory') || 'Alt Kateqoriya Əlavə Et'}
                </button>
            </div>

            <TableTemplate
                data={subCategoryData}
                columns={columns}
                title={t('subcategories') || 'Alt Kateqoriyalar'}
                searchFields={['name', 'description']}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={handleBulkDelete}
                showBulkActions={true}
                showFilters={false}
                showSearch={true}
                showDateFilter={false}
                loading={loading}
                emptyState={{
                    icon: 'folder',
                    title: t('no_subcategories_found') || 'Alt kateqoriya tapılmadı',
                    description: t('no_subcategories_description') || 'Hal-hazırda heç bir alt kateqoriya yoxdur',
                    actionText: t('add_first_subcategory') || 'İlk alt kateqoriyanı əlavə et',
                    onAction: handleAddSubCategory,
                    showAction: true
                }}
            />
        </div>
    );
}

