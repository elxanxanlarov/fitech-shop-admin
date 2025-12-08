import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Plus, Edit, Trash2, Eye, ChevronDown, ChevronRight, Package } from 'lucide-react';
import React from 'react';
import { categoryApi, subCategoryApi, productApi } from '../../api';

export default function CategoryManagement() {
    const { t } = useTranslation('category');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const [categoryData, setCategoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [addingSubCategory, setAddingSubCategory] = useState(null);
    const [subCategoryFormData, setSubCategoryFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });
    const [subCategoryErrors, setSubCategoryErrors] = useState({});
    const [savingSubCategory, setSavingSubCategory] = useState(false);
    const [addingProduct, setAddingProduct] = useState(null);
    const [productFormData, setProductFormData] = useState({
        name: '',
        categoryId: '',
        subCategoryId: ''
    });
    const [productErrors, setProductErrors] = useState({});
    const [savingProduct, setSavingProduct] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [selectingProducts, setSelectingProducts] = useState(null);
    const [productSearchTerm, setProductSearchTerm] = useState('');

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
            key: 'subCategories',
            label: t('subcategories_count') || 'Alt kateqoriyalar',
            render: (value, item) => {
                const count = item.subCategories?.length || 0;
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

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const response = await categoryApi.getAll();
                if (response.success && response.date) {
                    setCategoryData(response.date);
                } else {
                    setCategoryData([]);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                Alert.error(tAlert('error') || 'Xəta', tAlert('error_text') || 'Məlumat alınarkən xəta baş verdi');
                setCategoryData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [tAlert, t]);

    // Fetch all products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productApi.getAll();
                if (response.success && response.date) {
                    setAllProducts(response.date);
                } else {
                    setAllProducts([]);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
                setAllProducts([]);
            }
        };

        fetchProducts();
    }, []);

    const handleEdit = async (category) => {
        navigate(`/admin/category-form?id=${category.id.toString()}`);
    };

    const handleDelete = async (category) => {
        // Əgər kateqoriyaya aid məhsullar və ya alt kateqoriyalar varsa, silməyə icazə vermə
        if (category.subCategories && category.subCategories.length > 0) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_category_with_subcategories') || 'Bu kateqoriyaya aid alt kateqoriyalar var. Əvvəlcə alt kateqoriyaları silin'
            );
            return;
        }

        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Bu kateqoriyanı silmək istədiyinizə əminsiniz?'} ${category.name}?`,
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
                
                await categoryApi.delete(category.id);
                
                setCategoryData(prev => prev.filter(item => item.id !== category.id));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu', tAlert('delete_success_text') || 'Kateqoriya uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleView = (category) => {
        const subCategoriesInfo = category.subCategories && category.subCategories.length > 0
            ? `\n${t('subcategories') || 'Alt kateqoriyalar'}:\n${category.subCategories.map(sc => `- ${sc.name}`).join('\n')}`
            : `\n${t('no_subcategories') || 'Alt kateqoriya yoxdur'}`;
        
        Alert.info(
            `${t('category')}: ${category.name}`,
            `${t('description')}: ${category.description || '-'}\n${t('status')}: ${category.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}${subCategoriesInfo}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
        const selectedCategories = categoryData.filter(cat => selectedIds.includes(cat.id));
        
        // Əgər seçilmiş kateqoriyalardan hər hansı birinə aid alt kateqoriyalar varsa, silməyə icazə vermə
        const categoriesWithSubcategories = selectedCategories.filter(cat => cat.subCategories && cat.subCategories.length > 0);
        if (categoriesWithSubcategories.length > 0) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_categories_with_subcategories') || 'Bəzi kateqoriyalara aid alt kateqoriyalar var. Əvvəlcə alt kateqoriyaları silin'
            );
            return;
        }

        const result = await Alert.confirm(
            tAlert('bulk_delete_confirm') || 'Silinsin?',
            `${tAlert('bulk_delete_confirm_text') || 'Seçilmiş kateqoriyaları silmək istədiyinizə əminsiniz?'} (${selectedIds.length})`,
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
                
                // Alt kateqoriyaları olmayan kateqoriyaları filter et
                const idsToDelete = selectedIds.filter(id => {
                    const category = categoryData.find(c => c.id === id);
                    return !category?.subCategories || category.subCategories.length === 0;
                });
                
                await Promise.all(idsToDelete.map(id => categoryApi.delete(id)));
                
                setCategoryData(prev => prev.filter(item => !idsToDelete.includes(item.id)));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('bulk_delete_success') || 'Uğurlu', tAlert('bulk_delete_success_text') || 'Kateqoriyalar uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleAddCategory = () => {
        navigate('/admin/category-form');
    };

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
        // Close add form when collapsing
        if (expandedCategories[categoryId] && addingSubCategory === categoryId) {
            setAddingSubCategory(null);
            setSubCategoryFormData({ name: '', description: '', isActive: true });
            setSubCategoryErrors({});
        }
    };

    const handleAddSubCategory = (categoryId) => {
        setAddingSubCategory(categoryId);
        setSubCategoryFormData({ name: '', description: '', isActive: true });
        setSubCategoryErrors({});
        // Expand category if not expanded
        if (!expandedCategories[categoryId]) {
            setExpandedCategories(prev => ({ ...prev, [categoryId]: true }));
        }
    };

    const handleCancelAddSubCategory = () => {
        setAddingSubCategory(null);
        setSubCategoryFormData({ name: '', description: '', isActive: true });
        setSubCategoryErrors({});
    };

    const handleSubCategoryInputChange = (field, value) => {
        setSubCategoryFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (subCategoryErrors[field]) {
            setSubCategoryErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleSaveSubCategory = async (categoryId) => {
        // Validate
        const newErrors = {};
        if (!subCategoryFormData.name.trim()) {
            newErrors.name = t('name_required') || 'Ad tələb olunur';
        }
        setSubCategoryErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            return;
        }

        setSavingSubCategory(true);
        try {
            const payload = {
                name: subCategoryFormData.name.trim(),
                description: subCategoryFormData.description?.trim() || null,
                categoryId: categoryId,
                isActive: subCategoryFormData.isActive
            };

            await subCategoryApi.create(payload);
            
            // Refresh categories
            const response = await categoryApi.getAll();
            if (response.success && response.date) {
                setCategoryData(response.date);
            }
            
            // Close form
            setAddingSubCategory(null);
            setSubCategoryFormData({ name: '', description: '', isActive: true });
            setSubCategoryErrors({});
            
            Alert.success(t('add_success') || 'Uğurlu!', t('add_subcategory_success_text') || 'Alt kateqoriya uğurla əlavə edildi');
        } catch (error) {
            console.error('Error creating subcategory:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Əməliyyat zamanı xəta baş verdi');
        } finally {
            setSavingSubCategory(false);
        }
    };

    const handleEditSubCategory = (subCategory) => {
        navigate(`/admin/subcategory-form?id=${subCategory.id}&categoryId=${subCategory.categoryId}`);
    };

    const handleDeleteSubCategory = async (subCategory) => {
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
                
                // Refresh categories
                const response = await categoryApi.getAll();
                if (response.success && response.date) {
                    setCategoryData(response.date);
                }
                
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

    const handleAddProduct = (categoryId) => {
        setAddingProduct(categoryId);
        setProductFormData({ 
            name: '', 
            categoryId: categoryId,
            subCategoryId: ''
        });
        setProductErrors({});
        // Expand category if not expanded
        if (!expandedCategories[categoryId]) {
            setExpandedCategories(prev => ({ ...prev, [categoryId]: true }));
        }
    };

    const handleSelectProducts = (categoryId) => {
        setSelectingProducts(categoryId);
        setSelectedProductIds([]);
        setProductSearchTerm('');
        // Expand category if not expanded
        if (!expandedCategories[categoryId]) {
            setExpandedCategories(prev => ({ ...prev, [categoryId]: true }));
        }
    };

    const handleCancelSelectProducts = () => {
        setSelectingProducts(null);
        setSelectedProductIds([]);
        setProductSearchTerm('');
    };

    const handleProductSelectionChange = (productId) => {
        setSelectedProductIds(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            } else {
                return [...prev, productId];
            }
        });
    };

    const handleAddSelectedProducts = async (categoryId) => {
        if (selectedProductIds.length === 0) {
            Alert.error(tAlert('error') || 'Xəta', t('no_products_selected') || 'Heç bir məhsul seçilməyib');
            return;
        }

        setSavingProduct(true);
        try {
            // Get subcategory if selected
            const subCategoryId = productFormData.subCategoryId || null;

            // Update each selected product
            await Promise.all(selectedProductIds.map(productId => 
                productApi.update(productId, {
                    categoryId: categoryId,
                    subCategoryId: subCategoryId
                })
            ));

            // Refresh categories
            const response = await categoryApi.getAll();
            if (response.success && response.date) {
                setCategoryData(response.date);
            }

            // Close form
            setSelectingProducts(null);
            setSelectedProductIds([]);
            setProductFormData({ name: '', categoryId: '', subCategoryId: '' });

            Alert.success(t('add_success') || 'Uğurlu!', t('add_products_success_text') || `${selectedProductIds.length} məhsul uğurla əlavə edildi`);
        } catch (error) {
            console.error('Error adding products:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Əməliyyat zamanı xəta baş verdi');
        } finally {
            setSavingProduct(false);
        }
    };

    const handleCancelAddProduct = () => {
        setAddingProduct(null);
        setProductFormData({ name: '', categoryId: '', subCategoryId: '' });
        setProductErrors({});
    };

    const handleProductInputChange = (field, value) => {
        setProductFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (productErrors[field]) {
            setProductErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleSaveProduct = async (categoryId) => {
        // Navigate to product form with category pre-selected
        navigate(`/admin/product-form?categoryId=${categoryId}${productFormData.subCategoryId ? `&subCategoryId=${productFormData.subCategoryId}` : ''}`);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('category_management') || 'Kateqoriya İdarəetməsi'}</h1>
                    <p className="text-gray-600">{t('manage_categories') || 'Kateqoriyaları idarə edin'}</p>
                </div>
                <button
                    onClick={handleAddCategory}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_category') || 'Kateqoriya Əlavə Et'}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : categoryData.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('no_categories_found') || 'Kateqoriya tapılmadı'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {t('no_categories_description') || 'Hal-hazırda heç bir kateqoriya yoxdur'}
                    </p>
                    <button
                        onClick={handleAddCategory}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('add_first_category') || 'İlk kateqoriyanı əlavə et'}
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('name') || 'Ad'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('description') || 'Təsvir'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('status') || 'Status'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('subcategories_count') || 'Alt kateqoriyalar'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('created_at') || 'Yaradılıb'}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('actions') || 'Əməliyyatlar'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {categoryData.map((category) => (
                                    <React.Fragment key={category.id}>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {category.subCategories && category.subCategories.length > 0 && (
                                                        <button
                                                            onClick={() => toggleCategory(category.id)}
                                                            className="p-1 hover:bg-gray-200 rounded"
                                                        >
                                                            {expandedCategories[category.id] ? (
                                                                <ChevronDown className="w-4 h-4 text-gray-600" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4 text-gray-600" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <span className="font-medium text-gray-900">{category.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {category.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {category.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {category.subCategories?.length || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {category.createdAt ? new Date(category.createdAt).toLocaleDateString('az-AZ') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleView(category)}
                                                        className="text-blue-600 hover:text-blue-900 p-1"
                                                        title={t('view') || 'Görüntülə'}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(category)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1"
                                                        title={t('edit') || 'Redaktə et'}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category)}
                                                        className="text-red-600 hover:text-red-900 p-1"
                                                        title={t('delete') || 'Sil'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCategories[category.id] && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                                    <div className="ml-8 space-y-6">
                                                        {/* Products Section */}
                                                        <div>
                                                                <div className="flex items-center justify-between mb-3">
                                                                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                                    <Package className="w-4 h-4" />
                                                                    {t('products') || 'Məhsullar'}
                                                                    {category.products && category.products.length > 0 && (
                                                                        <span className="text-xs text-gray-500">({category.products.length})</span>
                                                                    )}
                                                                </h4>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleSelectProducts(category.id)}
                                                                        className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                                    >
                                                                        <Package className="w-3 h-3" />
                                                                        {t('select_products') || 'Məhsul Seç'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAddProduct(category.id)}
                                                                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        {t('add_product') || 'Yeni Məhsul'}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Add Product Form */}
                                                            {addingProduct === category.id && (
                                                                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                                                    <h5 className="text-sm font-semibold text-gray-900 mb-3">
                                                                        {t('add_product') || 'Yeni Məhsul'}
                                                                    </h5>
                                                                    <div className="flex items-end gap-2">
                                                                        <div className="flex-1">
                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                {t('subcategory') || 'Alt Kateqoriya'} ({t('optional') || 'İstəyə bağlı'})
                                                                            </label>
                                                                            <select
                                                                                value={productFormData.subCategoryId}
                                                                                onChange={(e) => handleProductInputChange('subCategoryId', e.target.value)}
                                                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                            >
                                                                                <option value="">{t('no_subcategory') || 'Alt kateqoriya seçilmədi'}</option>
                                                                                {category.subCategories && category.subCategories.map(subCat => (
                                                                                    <option key={subCat.id} value={subCat.id}>
                                                                                        {subCat.name}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleSaveProduct(category.id)}
                                                                            disabled={savingProduct}
                                                                            className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                                        >
                                                                            {t('continue_to_product_form') || 'Məhsul Formuna Keç'}
                                                                        </button>
                                                                        <button
                                                                            onClick={handleCancelAddProduct}
                                                                            disabled={savingProduct}
                                                                            className="px-3 py-2 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                                        >
                                                                            {t('cancel') || 'Ləğv et'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Select Products Form */}
                                                            {selectingProducts === category.id && (
                                                                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                                                    <h5 className="text-sm font-semibold text-gray-900 mb-3">
                                                                        {t('select_products') || 'Məhsul Seç'}
                                                                    </h5>
                                                                    <div className="space-y-3">
                                                                        <div className="flex-1">
                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                {t('subcategory') || 'Alt Kateqoriya'} ({t('optional') || 'İstəyə bağlı'})
                                                                            </label>
                                                                            <select
                                                                                value={productFormData.subCategoryId}
                                                                                onChange={(e) => handleProductInputChange('subCategoryId', e.target.value)}
                                                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                                            >
                                                                                <option value="">{t('no_subcategory') || 'Alt kateqoriya seçilmədi'}</option>
                                                                                {category.subCategories && category.subCategories.map(subCat => (
                                                                                    <option key={subCat.id} value={subCat.id}>
                                                                                        {subCat.name}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                {t('search_products') || 'Məhsul Axtar'}
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={productSearchTerm}
                                                                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                                                                placeholder={t('search_products_placeholder') || 'Məhsul adı və ya barcode ilə axtar...'}
                                                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                                            />
                                                                        </div>
                                                                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                                                                            {(() => {
                                                                                // Filter products: exclude those already in this category and filter by search term
                                                                                const filteredProducts = allProducts.filter(product => {
                                                                                    const isInThisCategory = product.categoryId === category.id;
                                                                                    if (isInThisCategory) return false;
                                                                                    
                                                                                    if (productSearchTerm.trim()) {
                                                                                        const searchLower = productSearchTerm.toLowerCase();
                                                                                        return product.name?.toLowerCase().includes(searchLower) ||
                                                                                               product.barcode?.toLowerCase().includes(searchLower);
                                                                                    }
                                                                                    return true;
                                                                                });

                                                                                return filteredProducts.length > 0 ? (
                                                                                    filteredProducts.map((product) => {
                                                                                        const isSelected = selectedProductIds.includes(product.id);
                                                                                        return (
                                                                                            <label
                                                                                                key={product.id}
                                                                                                className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50"
                                                                                            >
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isSelected}
                                                                                                    onChange={() => handleProductSelectionChange(product.id)}
                                                                                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                                                                />
                                                                                                <span className="text-sm text-gray-900 flex-1">
                                                                                                    {product.name}
                                                                                                    {product.barcode && (
                                                                                                        <span className="ml-2 text-xs text-gray-500">({product.barcode})</span>
                                                                                                    )}
                                                                                                </span>
                                                                                            </label>
                                                                                        );
                                                                                    })
                                                                                ) : (
                                                                                    <div className="text-sm text-gray-500 text-center py-4">
                                                                                        {productSearchTerm.trim() 
                                                                                            ? (t('no_products_found') || 'Məhsul tapılmadı')
                                                                                            : (t('no_products_available') || 'Məhsul yoxdur')
                                                                                        }
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <button
                                                                                onClick={handleCancelSelectProducts}
                                                                                disabled={savingProduct}
                                                                                className="px-3 py-2 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                                            >
                                                                                {t('cancel') || 'Ləğv et'}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleAddSelectedProducts(category.id)}
                                                                                disabled={savingProduct || selectedProductIds.length === 0}
                                                                                className="px-4 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                                            >
                                                                                {savingProduct ? (t('saving') || 'Saxlanılır...') : `${t('add_selected') || 'Seçilmişləri Əlavə Et'} (${selectedProductIds.length})`}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Products List */}
                                                            <div className="space-y-2">
                                                                {category.products && category.products.length > 0 ? (
                                                                    category.products.map((product) => (
                                                                        <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                                                                            <div className="flex-1">
                                                                                <div className="font-medium text-gray-900">{product.name}</div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                                                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                                                }`}>
                                                                                    {product.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => navigate(`/admin/product-form?id=${product.id}`)}
                                                                                    className="text-indigo-600 hover:text-indigo-900 p-1"
                                                                                    title={t('edit') || 'Redaktə et'}
                                                                                >
                                                                                    <Edit className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-sm text-gray-500 text-center py-4">
                                                                        {t('no_products') || 'Məhsul yoxdur'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* SubCategories Section */}
                                                        <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-sm font-semibold text-gray-700">
                                                                {t('subcategories') || 'Alt Kateqoriyalar'}
                                                            </h4>
                                                            <button
                                                                onClick={() => handleAddSubCategory(category.id)}
                                                                className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                {t('add_subcategory') || 'Alt Kateqoriya Əlavə Et'}
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Add SubCategory Form */}
                                                        {addingSubCategory === category.id && (
                                                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                                <h5 className="text-sm font-semibold text-gray-900 mb-3">
                                                                    {t('add_subcategory') || 'Yeni Alt Kateqoriya'}
                                                                </h5>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                            {t('name') || 'Ad'} <span className="text-red-500">*</span>
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={subCategoryFormData.name}
                                                                            onChange={(e) => handleSubCategoryInputChange('name', e.target.value)}
                                                                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                                                subCategoryErrors.name ? 'border-red-500' : 'border-gray-300'
                                                                            }`}
                                                                            placeholder={t('name_placeholder') || 'Alt kateqoriya adı'}
                                                                        />
                                                                        {subCategoryErrors.name && (
                                                                            <p className="mt-1 text-xs text-red-600">{subCategoryErrors.name}</p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                            {t('description') || 'Təsvir'}
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={subCategoryFormData.description}
                                                                            onChange={(e) => handleSubCategoryInputChange('description', e.target.value)}
                                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                            placeholder={t('description_placeholder') || 'Təsvir (istəyə bağlı)'}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-end gap-2">
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={subCategoryFormData.isActive}
                                                                                onChange={(e) => handleSubCategoryInputChange('isActive', e.target.checked)}
                                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                            />
                                                                            <span className="text-xs text-gray-700">
                                                                                {t('active') || 'Aktiv'}
                                                                            </span>
                                                                        </label>
                                                                        <button
                                                                            onClick={() => handleSaveSubCategory(category.id)}
                                                                            disabled={savingSubCategory}
                                                                            className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                                        >
                                                                            {savingSubCategory ? t('saving') || 'Saxlanılır...' : t('save') || 'Saxla'}
                                                                        </button>
                                                                        <button
                                                                            onClick={handleCancelAddSubCategory}
                                                                            disabled={savingSubCategory}
                                                                            className="px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                                        >
                                                                            {t('cancel') || 'Ləğv et'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* SubCategories List */}
                                                        <div className="space-y-2">
                                                            {category.subCategories && category.subCategories.length > 0 ? (
                                                                category.subCategories.map((subCategory) => (
                                                                    <div key={subCategory.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-gray-900">{subCategory.name}</div>
                                                                            {subCategory.description && (
                                                                                <div className="text-sm text-gray-500">{subCategory.description}</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                                                subCategory.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                                            }`}>
                                                                                {subCategory.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => handleEditSubCategory(subCategory)}
                                                                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                                                                title={t('edit') || 'Redaktə et'}
                                                                            >
                                                                                <Edit className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteSubCategory(subCategory)}
                                                                                className="text-red-600 hover:text-red-900 p-1"
                                                                                title={t('delete') || 'Sil'}
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-sm text-gray-500 text-center py-4">
                                                                    {t('no_subcategories') || 'Alt kateqoriya yoxdur'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

