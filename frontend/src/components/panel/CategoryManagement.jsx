import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Plus, Edit, Trash2, Eye, ChevronDown, ChevronRight, Search } from 'lucide-react';
import React from 'react';
import { categoryApi, subCategoryApi, productApi } from '../../api';
import { useBranch } from '../../hooks';

export default function CategoryManagement() {
    const { t } = useTranslation('category');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const { selectedBranchId, selectedBranchName } = useBranch();
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
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) return categoryData;
        const lowerSearch = searchTerm.toLowerCase();
        return categoryData.filter(cat => 
            cat.name?.toLowerCase().includes(lowerSearch) || 
            cat.description?.toLowerCase().includes(lowerSearch)
        );
    }, [categoryData, searchTerm]);

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
                const params = {};
                const response = await categoryApi.getAll(params);
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
        
        // Custom event dinlə - kateqoriya bərpa ediləndə yenilə
        const handleCategoryRestored = () => {
            fetchCategories();
        };
        
        window.addEventListener('categoryRestored', handleCategoryRestored);
        
        return () => {
            window.removeEventListener('categoryRestored', handleCategoryRestored);
        };
    }, [tAlert, t, selectedBranchId, selectedBranchName]);

    // Məhsullar artıq bu səhifədə göstərilmir

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

    // Məhsul funksiyaları ləğv edildi

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('category_management') || 'Kateqoriya İdarəetməsi'}</h1>
                    <p className="text-gray-600">{t('manage_categories') || 'Kateqoriyaları idarə edin'}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('search_placeholder') || 'Kateqoriya axtar...'}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    <button
                        onClick={handleAddCategory}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('add_category') || 'Kateqoriya Əlavə Et'}
                    </button>
                </div>
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
                                {filteredCategories.map((category) => (
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
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedCategories[category.id] && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                                    <div className="ml-8 space-y-6">
                                                        {/* Məhsullar bölməsi silindi */}

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

