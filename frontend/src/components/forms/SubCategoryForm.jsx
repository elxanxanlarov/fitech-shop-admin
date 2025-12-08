import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdFolder, MdDescription, MdArrowBack } from 'react-icons/md';
import { subCategoryApi, categoryApi } from '../../api';

export default function SubCategoryForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const categoryIdParam = searchParams.get('categoryId');
    const { t } = useTranslation('subcategory');
    const { t: tAlert } = useTranslation('alert');

    const isAdmin = location.pathname.includes('/admin');
    // If categoryId is provided and not in edit mode, go back to category form
    const subCategoryPagePath = categoryIdParam && !id
        ? `/admin/category-form?id=${categoryIdParam}`
        : categoryIdParam 
            ? `/admin/subcategory-management?categoryId=${categoryIdParam}`
            : '/admin/subcategory-management';
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        categoryId: categoryIdParam || '',
        isActive: true
    });
    
    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await categoryApi.getAll();
                if (response.success && response.date) {
                    setCategories(response.date);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    // Fetch subcategory data (if edit mode)
    useEffect(() => {
        const fetchSubCategory = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await subCategoryApi.getById(id);
                    if (response.success && response.date) {
                        const subCategory = response.date;
                        const initialData = {
                            name: subCategory.name || '',
                            description: subCategory.description || '',
                            categoryId: subCategory.categoryId || categoryIdParam || '',
                            isActive: subCategory.isActive !== undefined ? subCategory.isActive : true
                        };
                        setFormData(initialData);
                        setInitialFormData(initialData);
                    }
                } catch (error) {
                    console.error('Error fetching subcategory:', error);
                    Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Alt kateqoriya məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            } else if (categoryIdParam) {
                // Create mode with categoryId
                setFormData(prev => ({
                    ...prev,
                    categoryId: categoryIdParam
                }));
            }
        };

        fetchSubCategory();
    }, [id, isEditMode, categoryIdParam, t]);

    const validateForm = () => {
        const newErrors = {};
    
        // Ad
        if (!formData.name.trim()) {
            newErrors.name = t('name_required') || 'Ad tələb olunur';
        }
    
        // Kateqoriya
        if (!formData.categoryId) {
            newErrors.categoryId = t('category_required') || 'Kateqoriya tələb olunur';
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
            categoryId: formData.categoryId,
            isActive: formData.isActive !== undefined ? formData.isActive : true
        };
        
        const initial = {
            name: initialFormData.name.trim(),
            description: initialFormData.description?.trim() || '',
            categoryId: initialFormData.categoryId,
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
                categoryId: formData.categoryId,
                isActive: formData.isActive
            };

            if (isEditMode) {
                await subCategoryApi.update(id.toString(), payload);
                Alert.success(t('update_success') || 'Uğurlu!', t('update_success_text') || 'Alt kateqoriya məlumatları uğurla yeniləndi');
            } else {
                await subCategoryApi.create(payload);
                Alert.success(t('add_success') || 'Uğurlu!', t('add_success_text') || 'Alt kateqoriya uğurla əlavə edildi');
            }
            
            setTimeout(() => {
                navigate(subCategoryPagePath);
            }, 1500);
            
        } catch (error) {
            console.error('SubCategory operation error:', error);
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
                    onClick={() => navigate(subCategoryPagePath)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('back') || 'Geri'}
                >
                    <MdArrowBack className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? (t('edit_subcategory') || 'Alt Kateqoriya Redaktə Et') : (t('add_subcategory') || 'Yeni Alt Kateqoriya')}
                    </h1>
                    <p className="text-gray-600">
                        {isEditMode ? (t('edit_subcategory_description') || 'Alt kateqoriya məlumatlarını yeniləyin') : (t('add_subcategory_description') || 'Yeni alt kateqoriya əlavə edin')}
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('category') || 'Kateqoriya'} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                                disabled={isLoading || loadingCategories || (isEditMode && categoryIdParam)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.categoryId ? 'border-red-500' : 'border-gray-300'
                                } ${(isEditMode && categoryIdParam) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            >
                                <option value="">{t('select_category') || 'Kateqoriya seçin'}</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId && (
                                <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <Input
                                label={t('name') || 'Ad'}
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                error={errors.name}
                                placeholder={t('name_placeholder') || 'Alt kateqoriya adını daxil edin'}
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
                                placeholder={t('description_placeholder') || 'Alt kateqoriya təsvirini daxil edin (istəyə bağlı)'}
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
                                    {t('subcategory_active') || 'Alt kateqoriya aktivdir'}
                                </span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('subcategory_active_description') || 'Deaktiv alt kateqoriyalar məhsullarda görünməz'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(subCategoryPagePath)}
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

