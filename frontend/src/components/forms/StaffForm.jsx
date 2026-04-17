import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import SearchDropdown from '../ui/SearchDropdown';
import Alert from '../ui/Alert';
import { MdPerson, MdEmail, MdPhone, MdSecurity } from 'react-icons/md';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { staffApi, roleApi, authApi, branchApi } from '../../api';
import { useBranch } from '../../context/BranchContext';

export default function StaffForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation('staff');
    const { t: tAlert } = useTranslation('alert');
    const { selectedBranchId } = useBranch();

    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const staffPagePath = isAdmin ? '/admin/staff' : '/reception/staff';
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        surName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        roleId: '',
        branchId: '',
        isActive: true,
        isBoss: false
    });

    const [roles, setRoles] = useState([]);
    const [branches, setBranches] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Fetch current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await authApi.me();
                if (response.success && response.data) {
                    setCurrentUser(response.data);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    const canPickAnyBranch = useMemo(() => {
        const r = currentUser?.role?.name?.toLowerCase() || '';
        const boss = currentUser?.isBoss === true;
        return r === 'superadmin' || (r === 'admin' && boss);
    }, [currentUser]);

    const branchChoices = useMemo(() => {
        if (!branches.length) return [];
        if (canPickAnyBranch) return branches;
        const onlyId =
            currentUser?.branchId ||
            (selectedBranchId && selectedBranchId !== 'central' ? selectedBranchId : null);
        if (!onlyId) return branches;
        const filtered = branches.filter((b) => b.id === onlyId);
        return filtered.length ? filtered : branches;
    }, [branches, currentUser, selectedBranchId, canPickAnyBranch]);

    // Filial admin / reception: yalnız öz filialı; rol filial tələb edəndə branchId həmişə həmin filial
    useEffect(() => {
        if (canPickAnyBranch || !currentUser) return;
        const pin =
            currentUser.branchId ||
            (selectedBranchId && selectedBranchId !== 'central' ? selectedBranchId : null);
        if (!pin || !formData.roleId || !roles.length) return;
        const selectedRole = roles.find((x) => x.id?.toString() === formData.roleId?.toString());
        const rn = selectedRole?.name?.toLowerCase() || '';
        const needsBranch =
            rn !== 'superadmin' && !(rn === 'admin' && formData.isBoss === true);
        if (!needsBranch) return;
        setFormData((p) => (p.branchId === pin ? p : { ...p, branchId: pin }));
    }, [
        canPickAnyBranch,
        currentUser,
        selectedBranchId,
        roles,
        formData.roleId,
        formData.isBoss,
    ]);

    // Fetch roles and staff data (if edit mode)
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await roleApi.getAll();
                if (response.success && response.date) {
                    // Filter out Superadmin role if current user is not Superadmin
                    let filteredRoles = response.date;
                    if (currentUser && currentUser.role?.name?.toLowerCase() !== 'superadmin') {
                        filteredRoles = response.date.filter(role =>
                            role.name.toLowerCase() !== 'superadmin'
                        );
                    }
                    setRoles(filteredRoles);
                }
            } catch (error) {
                console.error('Error fetching roles:', error);
            }
        };

        const fetchStaff = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await staffApi.getById(id.toString());
                    if (response.success && response.date) {
                        const staff = response.date;

                        // Superadmin-i edit etməyə icazə vermə (yalnız superadmin üçün)
                        const roleName = staff.role?.name || '';
                        if (roleName.toLowerCase() === 'superadmin') {
                            if (!currentUser || currentUser.role?.name?.toLowerCase() !== 'superadmin') {
                                Alert.error(t('error_edit_superadmin'), t('error_edit_superadmin_text'));
                                navigate(staffPagePath);
                                return;
                            }
                        }

                        setFormData({
                            name: staff.name || '',
                            surName: staff.surName || '',
                            email: staff.email || '',
                            phone: staff.phone || '',
                            password: '',
                            confirmPassword: '',
                            roleId: staff.roleId || '',
                            branchId: staff.branchId || '',
                            isActive: staff.isActive !== undefined ? staff.isActive : true,
                            isBoss: staff.isBoss || false
                        });
                    }
                } catch (error) {
                    console.error('Error fetching staff:', error);
                    Alert.error(t('error_fetching'), t('error_fetching_text'));
                } finally {
                    setIsLoading(false);
                }
            }
        };

        const fetchBranches = async () => {
            try {
                const response = await branchApi.getAll();
                if (response.success && response.data) {
                    setBranches(response.data);
                }
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };

        if (currentUser) {
            fetchRoles();
            fetchBranches();
            fetchStaff();
        }
    }, [id, isEditMode, currentUser, navigate, staffPagePath, t]);

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

        // Password validation (only for create mode or if password is provided)
        if (!isEditMode) {
            if (!formData.password.trim()) {
                newErrors.password = t('password_required') || 'Parol tələb olunur';
            } else if (formData.password.length < 6) {
                newErrors.password = t('password_min_length') || 'Parol ən azı 6 simvol olmalıdır';
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = t('password_mismatch') || 'Parollar uyğun gəlmir';
            }
        } else if (formData.password.trim() && formData.password.length < 6) {
            newErrors.password = t('password_min_length') || 'Parol ən azı 6 simvol olmalıdır';
        } else if (formData.password && formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = t('password_mismatch') || 'Parollar uyğun gəlmir';
        }

        // Branch validation
        const selectedRole = roles.find(r => r.id.toString() === formData.roleId.toString());
        const roleName = selectedRole?.name?.toLowerCase() || '';
        const isSuperAdminRole = roleName === 'superadmin';
        const isAdminRole = roleName === 'admin';
        const isBoss = formData.isBoss;

        const branchRequired = formData.roleId && !isSuperAdminRole && (!isAdminRole || (isAdminRole && !isBoss));

        if (branchRequired && !formData.branchId) {
            newErrors.branchId = t('branch_required') || 'Filial seçilməlidir';
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

        const selectedRole = roles.find(role => role.id.toString() === formData.roleId.toString());
        const isSuperAdminRolePick = selectedRole?.name?.toLowerCase() === 'superadmin';
        const isHeadAdminPick =
            selectedRole?.name?.toLowerCase() === 'admin' && formData.isBoss === true;
        if (
            (isSuperAdminRolePick || isHeadAdminPick) &&
            currentUser?.role?.name?.toLowerCase() !== 'superadmin'
        ) {
            Alert.error(t('error_edit_superadmin'), t('error_edit_privileged_text'));
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                name: formData.name.trim(),
                surName: formData.surName.trim(),
                email: formData.email.trim(),
                phone: formData.phone?.trim() || null,
                roleId: formData.roleId || null,
                branchId: (formData.isBoss || selectedRole?.name?.toLowerCase() === 'superadmin') ? null : (formData.branchId || null),
                isActive: formData.isActive,
                isBoss: formData.isBoss
            };

            // Add password only if provided (create mode or update with password change)
            if (!isEditMode || formData.password.trim()) {
                payload.password = formData.password.trim();
            }

            if (isEditMode) {
                await staffApi.update(id.toString(), payload);
                Alert.success(tAlert('update_success') || 'Uğurlu!', tAlert('update_success_text') || 'İşçi məlumatları uğurla yeniləndi');
            } else {
                await staffApi.create(payload);
                Alert.success(tAlert('add_success') || 'Uğurlu!', tAlert('add_success_text') || 'İşçi uğurla əlavə edildi');
            }

            // Navigate back after success
            setTimeout(() => {
                navigate(staffPagePath);
            }, 1500);

        } catch (error) {
            console.error('Staff operation error:', error);
            const errorMessage = error.response?.data?.message || (tAlert('error_text') || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
            Alert.error(tAlert('error') || 'Xəta!', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? (t('edit_staff') || 'İşçi Məlumatlarını Redaktə Et') : (t('new_staff') || 'Yeni İşçi')}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEditMode ? (t('edit_staff_description') || 'İşçi məlumatlarını yeniləyin') : (t('new_staff_description') || 'İşçi məlumatlarını daxil edin')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('phone')} <span className="text-red-500">*</span>
                            </label>
                            <PhoneInput
                                country={'az'}
                                value={formData.phone}
                                onChange={(phone) => handleInputChange('phone', phone)}
                                inputStyle={{
                                    width: '100%',
                                    height: '42px',
                                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    paddingLeft: '48px'
                                }}
                                buttonStyle={{
                                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                                    borderRadius: '6px 0 0 6px'
                                }}
                                containerStyle={{
                                    width: '100%'
                                }}
                                placeholder="+994XXXXXXXXX"
                            />
                            {errors.phone && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <span className="text-red-500">⚠</span>
                                    {errors.phone}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Role Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdSecurity className="inline w-5 h-5 mr-2" />
                        {t('role_info') || 'İcazə Məlumatları'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('role')} <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={(() => {
                                    const selectedRole = roles.find(r => r.id.toString() === formData.roleId.toString());
                                    if (selectedRole?.name?.toLowerCase() === 'admin') {
                                        return formData.isBoss ? 'admin_boss' : 'admin_normal';
                                    }
                                    return formData.roleId;
                                })()}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'admin_boss') {
                                        const adminRole = roles.find(r => r.name.toLowerCase() === 'admin');
                                        handleInputChange('roleId', adminRole.id);
                                        handleInputChange('isBoss', true);
                                        handleInputChange('branchId', '');
                                    } else if (val === 'admin_normal') {
                                        const adminRole = roles.find(r => r.name.toLowerCase() === 'admin');
                                        handleInputChange('roleId', adminRole.id);
                                        handleInputChange('isBoss', false);
                                    } else {
                                        handleInputChange('roleId', val);
                                        handleInputChange('isBoss', false);
                                        const picked = roles.find(r => r.id.toString() === val.toString());
                                        if (picked?.name?.toLowerCase() === 'superadmin') {
                                            handleInputChange('branchId', '');
                                        }
                                    }
                                }}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.roleId ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            >
                                <option value="">{t('select_role') || 'Rol seçin'}</option>
                                {roles.map(role => {
                                    if (role.name.toLowerCase() === 'admin') {
                                        const isSuperAdminUser = currentUser?.role?.name?.toLowerCase() === 'superadmin';
                                        return (
                                            <React.Fragment key={role.id}>
                                                {isSuperAdminUser && (
                                                    <option value="admin_boss">
                                                        {t('head_admin') || 'Baş Admin (Superadmin-dən aşağı, Admin-dən yuxarı)'}
                                                    </option>
                                                )}
                                                <option value="admin_normal">
                                                    {t('admin_role') || 'Admin (Filial üzrə)'}
                                                </option>
                                            </React.Fragment>
                                        );
                                    }
                                    return (
                                        <option key={role.id} value={role.id.toString()}>
                                            {role.name}
                                        </option>
                                    );
                                })}
                            </select>
                            {errors.roleId && (
                                <p className="mt-1 text-sm text-red-600">{errors.roleId}</p>
                            )}
                        </div>



                        {/* Active Status - Only in edit mode */}
                        {isEditMode && (
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {t('staff_active') || 'İşçi aktivdir'}
                                    </span>
                                </label>
                                <p className="mt-1 text-xs text-gray-500">
                                    {t('staff_active_description') || 'Deaktiv işçilər sistemə giriş edə bilməzlər'}
                                </p>
                            </div>
                        )}

                        {/* Branch Selection - Only for non-boss/non-superadmin roles */}
                        {(() => {
                            const selectedRole = roles.find(r => r.id.toString() === formData.roleId.toString());
                            const roleName = selectedRole?.name?.toLowerCase() || '';
                            const isSuperAdminRole = roleName === 'superadmin';
                            const isAdminRole = roleName === 'admin';
                            const isBoss = formData.isBoss;

                            // Branch selection should show if:
                            // 1. role is NOT superadmin AND (role is NOT admin OR (role is admin AND isBoss is FALSE))
                            const shouldShowBranch = !isSuperAdminRole && (!isAdminRole || (isAdminRole && !isBoss));

                            if (shouldShowBranch && formData.roleId) {
                                return (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('branch') || 'Filial'}
                                        </label>
                                        <SearchDropdown
                                            options={branchChoices}
                                            value={formData.branchId ? formData.branchId.toString() : ''}
                                            onChange={(val) => handleInputChange('branchId', val)}
                                            placeholder={t('select_branch') || 'Filial seçin...'}
                                            getOptionLabel={(option) => option.name || ''}
                                            getOptionValue={(option) => option.id?.toString() || ''}
                                            searchFields={['name']}
                                            disabled={!canPickAnyBranch}
                                        />
                                        {!canPickAnyBranch && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                {t('branch_locked_own') || 'Yalnız öz filialınız üçün təyin olunur'}
                                            </p>
                                        )}
                                        {errors.branchId && (
                                            <p className="mt-1 text-sm text-red-600 font-medium">
                                                {errors.branchId}
                                            </p>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>

                {/* Password Information - Only for create, if password is being changed, or for superadmin in edit mode */}
                {(!isEditMode || formData.password || (currentUser && currentUser.role?.name?.toLowerCase() === 'superadmin')) && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                            <MdSecurity className="inline w-5 h-5 mr-2" />
                            {t('password_info') || 'Parol Məlumatları'}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label={t('password') || 'Parol'}
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                error={errors.password}
                                placeholder={t('password_placeholder') || 'Parol daxil edin'}
                                icon={<MdSecurity />}
                                required={!isEditMode}
                            />

                            <Input
                                label={t('confirm_password') || 'Parolu Təsdiqlə'}
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                error={errors.confirmPassword}
                                placeholder={t('confirm_password_placeholder') || 'Parolu yenidən daxil edin'}
                                icon={<MdSecurity />}
                                required={!isEditMode}
                            />
                        </div>
                        {isEditMode && (
                            <p className="mt-2 text-xs text-gray-500">
                                {currentUser && currentUser.role?.name?.toLowerCase() === 'superadmin'
                                    ? (t('password_change_superadmin') || 'Superadmin olaraq bu işçinin parolunu dəyişdirə bilərsiniz')
                                    : (t('password_optional') || 'Parol dəyişdirmək istəmirsinizsə, bu sahələri boş buraxın')}
                            </p>
                        )}
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(staffPagePath)}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
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
                            isEditMode ? (t('update') || 'Yenilə') : (t('add_staff') || 'İşçi Əlavə Et')
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
