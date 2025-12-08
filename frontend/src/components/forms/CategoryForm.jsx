import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdFolder, MdDescription, MdArrowBack } from 'react-icons/md';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { categoryApi, subCategoryApi } from '../../api';

export default function CategoryForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation('category');
    const { t: tAlert } = useTranslation('alert');

    const isAdmin = location.pathname.includes('/admin');
    const categoryPagePath = isAdmin ? '/admin/category-management' : '/reception/category-management';
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);
    const [subCategories, setSubCategories] = useState([]);
    const [loadingSubCategories, setLoadingSubCategories] = useState(false);

    // Fetch category data (if edit mode)
    useEffect(() => {
        const fetchCategory = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await categoryApi.getById(id);
                    if (response.success && response.date) {
                        const category = response.date;
                        const initialData = {
                            name: category.name || '',
                            description: category.description || '',
                            isActive: category.isActive !== undefined ? category.isActive : true
                        };
                        setFormData(initialData);
                        setInitialFormData(initialData);
                        
                        // Set subcategories if they exist
                        if (category.subCategories && category.subCategories.length > 0) {
                            setSubCategories(category.subCategories);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching category:', error);
                    Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Kateqoriya məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchCategory();
    }, [id, isEditMode, t]);

    // Fetch subcategories when category ID changes or when returning to this page
    useEffect(() => {
        const fetchSubCategories = async () => {
            if (isEditMode && id) {
                try {
                    setLoadingSubCategories(true);
                    const response = await subCategoryApi.getAll(id);
                    if (response.success && response.date) {
                        setSubCategories(response.date);
                    } else {
                        setSubCategories([]);
                    }
                } catch (error) {
                    console.error('Error fetching subcategories:', error);
                    setSubCategories([]);
                } finally {
                    setLoadingSubCategories(false);
                }
            }
        };

        fetchSubCategories();
    }, [id, isEditMode, location.pathname]);

    const validateForm = () => {
        const newErrors = {};
    
        // Ad
        if (!formData.name.trim()) {
            newErrors.name = t('name_required') || 'Ad tələb olunur';
        }
    
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Check if form has changed (only in edit mode)
    const hasFormChanged = () => {
        if (!isEditMode || !initialFormData) return true; // Always allow submit in create mode
        
        // Compare form data with initial data
        const currentData = {
            name: formData.name.trim(),
            description: formData.description?.trim() || '',
            isActive: formData.isActive !== undefined ? formData.isActive : true
        };
        
        const initial = {
            name: initialFormData.name.trim(),
            description: initialFormData.description?.trim() || '',
            isActive: initialFormData.isActive !== undefined ? initialFormData.isActive : true
        };
        
        // Check if any field has changed
        const hasChanged = JSON.stringify(currentData) !== JSON.stringify(initial);
        return hasChanged;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        // In edit mode, check if form has changed
        if (isEditMode && !hasFormChanged()) {
            Alert.info(t('no_changes') || 'Xəbərdarlıq', t('no_changes_text') || 'Formda heç bir dəyişiklik edilməyib');
            return;
        }
        
        setIsLoading(true);
        
        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                isActive: formData.isActive
            };

            if (isEditMode) {
                await categoryApi.update(id.toString(), payload);
                Alert.success(t('update_success') || 'Uğurlu!', t('update_success_text') || 'Kateqoriya məlumatları uğurla yeniləndi');
            } else {
                await categoryApi.create(payload);
                Alert.success(t('add_success') || 'Uğurlu!', t('add_success_text') || 'Kateqoriya uğurla əlavə edildi');
            }
            
            setTimeout(() => {
                navigate(categoryPagePath);
            }, 1500);
            
        } catch (error) {
            console.error('Category operation error:', error);
            Alert.error(
                tAlert('error') || 'Xəta!',
                error.response?.data?.message || tAlert('error_text') || 'Əməliyyat zamanı xəta baş verdi'
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && isEditMode) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('loading') || 'Yüklənir...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(categoryPagePath)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('back') || 'Geri'}
                >
                    <MdArrowBack className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? (t('edit_category') || 'Kateqoriya Redaktə Et') : (t('add_category') || 'Yeni Kateqoriya')}
                    </h1>
                    <p className="text-gray-600">
                        {isEditMode ? (t('edit_category_description') || 'Kateqoriya məlumatlarını yeniləyin') : (t('add_category_description') || 'Yeni kateqoriya əlavə edin')}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdFolder className="inline w-5 h-5 mr-2" />
                        {t('basic_info') || 'Əsas Məlumatlar'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <Input
                                label={t('name') || 'Ad'}
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                error={errors.name}
                                placeholder={t('name_placeholder') || 'Kateqoriya adını daxil edin'}
                                icon={<MdFolder />}
                                required
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <Input
                                label={t('description') || 'Təsvir'}
                                type="text"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                error={errors.description}
                                placeholder={t('description_placeholder') || 'Kateqoriya təsvirini daxil edin (istəyə bağlı)'}
                                icon={<MdDescription />}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    {t('category_active') || 'Kateqoriya aktivdir'}
                                </span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('category_active_description') || 'Deaktiv kateqoriyalar məhsullarda görünməz'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* SubCategories Section - Only in edit mode */}
                {isEditMode && id && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    <MdFolder className="inline w-5 h-5 mr-2" />
                                    {t('subcategories') || 'Alt Kateqoriyalar'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {t('manage_subcategories_description') || 'Bu kateqoriyaya alt kateqoriyalar əlavə edin'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigate(`/admin/subcategory-form?categoryId=${id}`);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {t('add_subcategory') || 'Alt Kateqoriya Əlavə Et'}
                            </button>
                        </div>

                        {/* SubCategories List */}
                        {loadingSubCategories ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-sm text-gray-600">{t('loading') || 'Yüklənir...'}</p>
                            </div>
                        ) : subCategories.length > 0 ? (
                            <div className="space-y-2">
                                {subCategories.map((subCategory) => (
                                    <div key={subCategory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{subCategory.name}</div>
                                            {subCategory.description && (
                                                <div className="text-sm text-gray-500 mt-1">{subCategory.description}</div>
                                            )}
                                            <div className="mt-2">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    subCategory.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {subCategory.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/admin/subcategory-form?id=${subCategory.id}&categoryId=${id}`)}
                                                className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title={t('edit') || 'Redaktə et'}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
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
                                                            
                                                            // Refresh subcategories
                                                            const response = await subCategoryApi.getAll(id);
                                                            if (response.success && response.date) {
                                                                setSubCategories(response.date);
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
                                                }}
                                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title={t('delete') || 'Sil'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">{t('no_subcategories') || 'Alt kateqoriya yoxdur'}</p>
                                <p className="text-xs mt-1">{t('add_first_subcategory') || 'İlk alt kateqoriyanı əlavə edin'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(categoryPagePath)}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || (isEditMode && !hasFormChanged())}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditMode ? (t('updating') || 'Yenilənir...') : (t('adding') || 'Əlavə edilir...')}
                            </>
                        ) : (
                            isEditMode ? (t('update') || 'Yenilə') : (t('create') || 'Yarat')
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

