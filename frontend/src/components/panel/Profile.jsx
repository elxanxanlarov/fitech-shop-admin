import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdPerson, MdEmail, MdPhone, MdSecurity, MdEdit, MdSave, MdCancel } from 'react-icons/md';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { authApi, staffApi } from '../../api';

export default function Profile() {
    const { t } = useTranslation('staff');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = location.pathname.includes('/admin');
    const profilePath = isAdmin ? '/admin/profile' : '/reception/profile';
    
    const [user, setUser] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [formData, setFormData] = useState({
        name: '',
        surName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    // Fetch current user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                setIsLoading(true);
                const response = await authApi.me();
                if (response.success && response.data) {
                    const userData = response.data;
                    setUser(userData);
                    setFormData({
                        name: userData.name || '',
                        surName: userData.surName || '',
                        email: userData.email || '',
                        phone: userData.phone || '',
                        password: '',
                        confirmPassword: ''
                    });
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                Alert.error(tAlert('error') || 'Xəta!', tAlert('error_text') || 'Məlumatlar yüklənərkən xəta baş verdi');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [tAlert]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = t('name_required') || 'Ad tələb olunur';
        }
        
        if (!formData.surName?.trim()) {
            newErrors.surName = t('surname_required') || 'Soyad tələb olunur';
        }
        
        if (!formData.email.trim()) {
            newErrors.email = t('email_required') || 'Email tələb olunur';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t('email_invalid') || 'Düzgün email formatı daxil edin';
        }

        // Password validation (only if password is provided)
        if (formData.password.trim()) {
            if (formData.password.length < 6) {
                newErrors.password = t('password_min_length') || 'Parol ən azı 6 simvol olmalıdır';
            }
            
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = t('password_mismatch') || 'Parollar uyğun gəlmir';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSaving(true);

        try {
            const payload = {
                name: formData.name.trim(),
                surName: formData.surName.trim(),
                email: formData.email.trim(),
                phone: formData.phone?.trim() || null,
            };

            // Add password only if provided
            if (formData.password.trim()) {
                payload.password = formData.password.trim();
            }

            await staffApi.update(user.id, payload);
            
            // Refresh user data
            const response = await authApi.me();
            if (response.success && response.data) {
                setUser(response.data);
            }
            
            setIsEditMode(false);
            Alert.success(tAlert('update_success') || 'Uğurlu!', tAlert('update_success_text') || 'Profil məlumatları uğurla yeniləndi');
            
            // Clear password fields
            setFormData(prev => ({
                ...prev,
                password: '',
                confirmPassword: ''
            }));
            
        } catch (error) {
            console.error('Profile update error:', error);
            const errorMessage = error.response?.data?.message || (tAlert('error_text') || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
            Alert.error(tAlert('error') || 'Xəta!', errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (user) {
            setFormData({
                name: user.name || '',
                surName: user.surName || '',
                email: user.email || '',
                phone: user.phone || '',
                password: '',
                confirmPassword: ''
            });
        }
        setIsEditMode(false);
        setErrors({});
    };

    if (isLoading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{tAlert('error_text') || 'İstifadəçi məlumatları tapılmadı'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('profile') || 'Profil'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {t('profile_description') || 'Profil məlumatlarınızı idarə edin'}
                    </p>
                </div>
                {!isEditMode && (
                    <button
                        onClick={() => setIsEditMode(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <MdEdit className="w-5 h-5" />
                        {t('edit') || 'Redaktə Et'}
                    </button>
                )}
            </div>

            {/* Profile Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Personal Information */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdPerson className="inline w-5 h-5 mr-2" />
                        {t('personal_info') || 'Şəxsi Məlumatlar'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label={t('name')}
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            error={errors.name}
                            placeholder={t('name_placeholder') || 'Adınızı daxil edin'}
                            icon={<MdPerson />}
                            required
                            disabled={!isEditMode}
                        />
                        
                        <Input
                            label={t('surname') || 'Soyad'}
                            type="text"
                            value={formData.surName}
                            onChange={(e) => handleInputChange('surName', e.target.value)}
                            error={errors.surName}
                            placeholder={t('surname_placeholder') || 'Soyadınızı daxil edin'}
                            icon={<MdPerson />}
                            required
                            disabled={!isEditMode}
                        />
                        
                        <Input
                            label={t('email')}
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            error={errors.email}
                            placeholder="email@example.com"
                            icon={<MdEmail />}
                            required
                            disabled={!isEditMode}
                        />
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('phone')} {isEditMode && <span className="text-red-500">*</span>}
                            </label>
                            <PhoneInput
                                country={'az'}
                                value={formData.phone}
                                onChange={(phone) => handleInputChange('phone', phone)}
                                disabled={!isEditMode}
                                inputStyle={{
                                    width: '100%',
                                    height: '42px',
                                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    paddingLeft: '48px',
                                    backgroundColor: !isEditMode ? '#f3f4f6' : 'white',
                                    cursor: !isEditMode ? 'not-allowed' : 'text'
                                }}
                                buttonStyle={{
                                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                                    borderRadius: '6px 0 0 6px',
                                    backgroundColor: !isEditMode ? '#f3f4f6' : 'white',
                                    cursor: !isEditMode ? 'not-allowed' : 'pointer'
                                }}
                                containerStyle={{
                                    width: '100%'
                                }}
                                placeholder="+994XXXXXXXXX"
                            />
                            {errors.phone && (
                                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Role Information (Read-only) */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdSecurity className="inline w-5 h-5 mr-2" />
                        {t('role_info') || 'İcazə Məlumatları'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('role') || 'Rol'}
                            </label>
                            <input
                                type="text"
                                value={user.role?.name || '-'}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('status') || 'Status'}
                            </label>
                            <input
                                type="text"
                                value={user.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Deaktiv')}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Password Information */}
                {isEditMode && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                            <MdSecurity className="inline w-5 h-5 mr-2" />
                            {t('password_info') || 'Parol Məlumatları'}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label={t('password') || 'Yeni Parol'}
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                error={errors.password}
                                placeholder={t('password_placeholder') || 'Parol daxil edin (istəyə bağlı)'}
                                icon={<MdSecurity />}
                            />
                            
                            <Input
                                label={t('confirm_password') || 'Parolu Təsdiqlə'}
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                error={errors.confirmPassword}
                                placeholder={t('confirm_password_placeholder') || 'Parolu yenidən daxil edin'}
                                icon={<MdSecurity />}
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            {t('password_optional') || 'Parol dəyişdirmək istəmirsinizsə, bu sahələri boş buraxın'}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                {isEditMode && (
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <MdCancel className="w-5 h-5" />
                            {t('cancel') || 'Ləğv et'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {tAlert('updating') || 'Yenilənir...'}
                                </>
                            ) : (
                                <>
                                    <MdSave className="w-5 h-5" />
                                    {t('save') || 'Saxla'}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

