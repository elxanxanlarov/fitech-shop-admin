import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdSecurity, MdArrowBack } from 'react-icons/md';
import { roleApi } from '../../api';

export default function RoleForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation('role');
    const { t: tAlert } = useTranslation('alert');
    
    const isAdmin = location.pathname.includes('/admin');
    const rolePagePath = isAdmin ? '/admin/roles-management' : '/reception/roles-management';
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        name: '',
        isCore: false
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Fetch role data (if edit mode)
    useEffect(() => {
        const fetchRole = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await roleApi.getById(id);
                    if (response.success && response.date) {
                        const role = response.date;
                        
                        // Əgər əsas rol (isCore) isə, redaktə etməyə icazə vermə
                        if (role.isCore) {
                            Alert.error(
                                tAlert('error') || 'Xəta',
                                t('cannot_edit_core_role') || 'Əsas rollar redaktə edilə bilməz'
                            );
                            navigate(rolePagePath);
                            return;
                        }
                        
                        setFormData({
                            name: role.name || '',
                            isCore: role.isCore || false
                        });
                    }
                } catch (error) {
                    console.error('Error fetching role:', error);
                    Alert.error(tAlert('error') || 'Xəta', tAlert('error_text') || 'Rol məlumatlarını əldə etmək mümkün olmadı');
                    navigate(rolePagePath);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchRole();
    }, [id, isEditMode, navigate, rolePagePath, t, tAlert]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = t('name_required') || 'Rol adı tələb olunur';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = t('name_min_length') || 'Rol adı ən azı 2 simvol olmalıdır';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);
        
        try {
            const payload = {
                name: formData.name.trim(),
                isCore: formData.isCore
            };

            if (isEditMode) {
                await roleApi.update(id.toString(), payload);
                Alert.success(tAlert('update_success') || 'Uğurlu!', tAlert('update_success_text') || 'Rol uğurla yeniləndi');
            } else {
                await roleApi.create(payload);
                Alert.success(tAlert('add_success') || 'Uğurlu!', tAlert('add_success_text') || 'Rol uğurla əlavə edildi');
            }
            
            setTimeout(() => {
                navigate(rolePagePath);
            }, 1500);
            
        } catch (error) {
            console.error('Role operation error:', error);
            const errorMessage = error.response?.data?.message || (tAlert('error_text') || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
            Alert.error(tAlert('error') || 'Xəta!', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(rolePagePath)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('back') || 'Geri'}
                >
                    <MdArrowBack className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? (t('edit_role') || 'Rolu Redaktə Et') : (t('add_role') || 'Yeni Rol Əlavə Et')}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode ? (t('edit_role_desc') || 'Rol məlumatlarını redaktə edin') : (t('add_role_desc') || 'Yeni rol yaradın')}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Role Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MdSecurity className="inline w-4 h-4 mr-1" />
                        {t('name') || 'Rol Adı'} <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder={t('name_placeholder') || 'Məsələn: admin, reception, manager'}
                        className={errors.name ? 'border-red-500' : ''}
                        disabled={isLoading}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                </div>

                {/* Is Core Role */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isCore}
                            onChange={(e) => handleInputChange('isCore', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            disabled={isLoading || isEditMode}
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-700">
                                {t('is_core') || 'Əsas Rol'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('is_core_desc') || 'Əsas rollar silinə və redaktə edilə bilməz. Yalnız sistem rolları üçün işarələyin.'}
                            </p>
                        </div>
                    </label>
                    {isEditMode && (
                        <p className="mt-2 text-xs text-gray-500">
                            {t('is_core_edit_note') || 'Əsas rol statusu redaktə edilə bilməz'}
                        </p>
                    )}
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => navigate(rolePagePath)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={isLoading}
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                {t('saving') || 'Saxlanılır...'}
                            </>
                        ) : (
                            <>
                                {isEditMode ? (t('update') || 'Yenilə') : (t('create') || 'Yarat')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

