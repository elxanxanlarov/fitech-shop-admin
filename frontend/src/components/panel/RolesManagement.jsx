import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, Shield } from 'lucide-react';
import { roleApi } from '../../api';

export default function RolesManagement() {
    const { t } = useTranslation('role');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const [roleData, setRoleData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: t('name') || 'Ad',
            render: (value) => (
                <span className="font-medium text-gray-900">{value || '-'}</span>
            )
        },
        {
            key: 'isCore',
            label: t('is_core') || 'Əsas Rol',
            render: (value) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    value 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                }`}>
                    {value ? (t('yes') || 'Bəli') : (t('no') || 'Xeyr')}
                </span>
            )
        },
        {
            key: 'staff',
            label: t('staff_count') || 'İşçi Sayı',
            render: (value, item) => (
                <span className="text-gray-700">{item.staff?.length || 0}</span>
            )
        },
        {
            key: 'createdAt',
            label: t('created_at') || 'Yaradılma Tarixi',
            render: (value) => {
                if (!value) return '-';
                const date = new Date(value);
                return date.toLocaleDateString('az-AZ', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
        }
    ], [t]);

    // Fetch roles data
    useEffect(() => {
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const response = await roleApi.getAll();
                
                if (response.success && response.date && Array.isArray(response.date)) {
                    // Ensure staff array exists for each role
                    const rolesWithStaff = response.date.map(role => ({
                        ...role,
                        staff: role.staff || []
                    }));
                    setRoleData(rolesWithStaff);
                } else {
                    setRoleData([]);
                }
            } catch (error) {
                console.error('Error fetching roles:', error);
                Alert.error(tAlert('error') || 'Xəta', tAlert('error_text') || 'Məlumat alınarkən xəta baş verdi');
                setRoleData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, [tAlert, t]);

    const handleEdit = async (role) => {
        // Əgər əsas rol (isCore) isə, redaktə etməyə icazə vermə
        if (role.isCore) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_edit_core_role') || 'Əsas rollar redaktə edilə bilməz'
            );
            return;
        }
        
        navigate(`/admin/role-form?id=${role.id.toString()}`);
    };

    const handleDelete = async (role) => {
        // Əgər əsas rol (isCore) isə, silməyə icazə vermə
        if (role.isCore) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_core_role') || 'Əsas rollar silinə bilməz'
            );
            return;
        }

        // Əgər bu rola aid işçilər varsa, silməyə icazə vermə
        if (role.staff && role.staff.length > 0) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_role_with_staff') || 'Bu rola aid işçilər var. Əvvəlcə işçiləri silin və ya başqa rol verin'
            );
            return;
        }

        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Bu rolu silmək istədiyinizə əminsiniz?'} ${role.name}?`,
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
                
                await roleApi.delete(role.id);
                
                setRoleData(prev => prev.filter(item => item.id !== role.id));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu', tAlert('delete_success_text') || 'Rol uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleView = (role) => {
        const staffInfo = role.staff && role.staff.length > 0
            ? `\n${t('staff_list') || 'İşçilər'}:\n${role.staff.map(s => `- ${s.name} ${s.surName || ''} (${s.email})`).join('\n')}`
            : `\n${t('no_staff') || 'İşçi yoxdur'}`;
        
        Alert.info(
            `${t('role')}: ${role.name}`,
            `${t('is_core')}: ${role.isCore ? (t('yes') || 'Bəli') : (t('no') || 'Xeyr')}\n${t('staff_count')}: ${role.staff?.length || 0}${staffInfo}`
        );
    };

    const handleAddRole = () => {
        navigate('/admin/role-form');
    };

    const handleBulkDelete = async (selectedIds) => {
        const selectedRoles = roleData.filter(role => selectedIds.includes(role.id));
        
        // Əgər seçilmiş rollardan hər hansı biri əsas rol (isCore) isə, silməyə icazə vermə
        const coreRoles = selectedRoles.filter(role => role.isCore);
        if (coreRoles.length > 0) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_core_roles') || 'Əsas rollar silinə bilməz'
            );
            return;
        }

        // Əgər seçilmiş rollardan hər hansı birinə aid işçilər varsa, silməyə icazə vermə
        const rolesWithStaff = selectedRoles.filter(role => role.staff && role.staff.length > 0);
        if (rolesWithStaff.length > 0) {
            Alert.error(
                tAlert('error') || 'Xəta',
                t('cannot_delete_roles_with_staff') || 'Bəzi rollara aid işçilər var. Əvvəlcə işçiləri silin və ya başqa rol verin'
            );
            return;
        }

        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Seçilmiş rolları silmək istədiyinizə əminsiniz?'} (${selectedIds.length})`,
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
                
                // Əsas rolları filter et
                const idsToDelete = selectedIds.filter(id => {
                    const role = roleData.find(r => r.id === id);
                    return !role?.isCore;
                });
                
                await Promise.all(idsToDelete.map(id => roleApi.delete(id)));
                
                setRoleData(prev => prev.filter(item => !idsToDelete.includes(item.id)));
                
                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu', tAlert('delete_success_text') || 'Rollar uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6" />
                        {t('role_management') || 'Rollar İdarəetməsi'}
                    </h1>
                    <p className="text-gray-600">{t('manage_roles') || 'İstifadəçi rollarını və icazələrini idarə edin'}</p>
                </div>
                <button
                    onClick={handleAddRole}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_role') || 'Yeni Rol Əlavə Et'}
                </button>
            </div>

            <TableTemplate
                data={roleData}
                columns={columns}
                title={t('roles') || 'Rollar'}
                searchFields={['name']}
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
                    icon: 'shield',
                    title: t('no_roles_found') || 'Rol tapılmadı',
                    description: t('no_roles_description') || 'Hal-hazırda heç bir rol yoxdur',
                    actionText: t('add_first_role') || 'İlk rolu əlavə et',
                    onAction: handleAddRole,
                    showAction: true
                }}
            />
        </div>
    );
}

