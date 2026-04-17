import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, UserPlus } from 'lucide-react';
import { getStaffColumns } from '../../data/table-columns/StaffColumns';
import { staffApi, authApi } from '../../api';
import { useBranch } from '../../context/BranchContext';

export default function Staff({ isReception = false }) {
    const { t, i18n } = useTranslation('staff');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedBranchId } = useBranch();
    const [currentUser, setCurrentUser] = useState(null);
    const [staffData, setStaffData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch current user and staff context
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const response = await staffApi.me?.() || await authApi.me();
                if (response.success) {
                    setCurrentUser(response.data);
                }
            } catch (error) {
                console.error('Error fetching context:', error);
            }
        };
        fetchContext();
    }, []);

    const columns = useMemo(() => getStaffColumns(t, i18n.language), [t, i18n.language]);

    const isPrivilegedTarget = (staff) => {
        const rn = (staff.role?.name || staff.role || '').toLowerCase();
        return rn === 'superadmin' || (rn === 'admin' && staff.isBoss === true);
    };

    /** Cədvəldə admin/reception üçün düymələr görünsün; yalnız superadmin/baş admin sətirləri bloklansın (mətn yox) */
    const rowActionsAllowed = useCallback(
        (item) => {
            if (!currentUser) return true;
            const cr = currentUser.role?.name?.toLowerCase();
            const rn = (item.role?.name || item.role || '').toLowerCase();
            if (rn === 'superadmin' && cr !== 'superadmin') return false;
            if (rn === 'admin' && item.isBoss === true && cr !== 'superadmin') return false;
            return true;
        },
        [currentUser]
    );

    // Fetch staff data
    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            try {
                // Mərkəzi anbar seçiləndə bütün işçiləri gətir, əks halda filiala görə fitlerlə
                const params = {};
                if (selectedBranchId && selectedBranchId !== 'central') {
                    params.branchId = selectedBranchId;
                }
                const response = await staffApi.getAll(params);

                if (response.success && response.date) {
                    // Transform data for table
                    const transformedData = response.date.map(staff => ({
                        id: staff.id,
                        name: `${staff.name} ${staff.surName || ''}`.trim(),
                        firstName: staff.name,
                        lastName: staff.surName,
                        email: staff.email,
                        phone: staff.phone || '-',
                        role: staff.role,
                        status: staff.isActive ? t('active') : t('inactive'),
                        createdAt: staff.createdAt,
                        isActive: staff.isActive,
                        ...staff
                    }));

                    setStaffData(transformedData);
                } else {
                    setStaffData([]);
                }
            } catch (error) {
                console.error('Error fetching staff:', error);
                Alert.error(t('error_fetching'), t('error_fetching_text'));
                setStaffData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStaff();
    }, [t, i18n.language, selectedBranchId]);

    const handleEdit = async (staff) => {
        const currentUserRole = currentUser?.role?.name?.toLowerCase();

        if (isPrivilegedTarget(staff) && currentUserRole !== 'superadmin') {
            Alert.error(
                t('error_edit_core_role') || 'Xəta',
                t('error_edit_privileged_text') || 'Superadmin və Baş Admin yalnız Superadmin tərəfindən redaktə oluna bilər'
            );
            return;
        }

        // Navigate to edit page (only for admin)
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return; // Reception can't edit staff
        const editPath = `/admin/staff-form?id=${staff.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (staff) => {
        const currentUserRole = currentUser?.role?.name?.toLowerCase();

        if (isPrivilegedTarget(staff) && currentUserRole !== 'superadmin') {
            Alert.error(
                t('error_delete_core_role') || 'Xəta',
                t('error_delete_privileged_text') || 'Superadmin və Baş Admin yalnız Superadmin tərəfindən silinə bilər'
            );
            return;
        }

        const result = await Alert.confirm(
            tAlert('delete_confirm'),
            `${tAlert('delete_confirm_text')} ${staff.name || `${staff.firstName} ${staff.lastName}`}?`,
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

                await staffApi.delete(staff.id);

                setStaffData(prev => prev.filter(item => item.id !== staff.id));

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

    const handleView = (staff) => {
        const roleName = staff.role?.name || staff.role || 'Staff';

        const statusName = staff.isActive !== undefined
            ? (staff.isActive ? t('active') : t('inactive'))
            : (staff.status || t('active'));

        Alert.info(
            `${t('name')}: ${staff.name || `${staff.firstName} ${staff.lastName}`}`,
            `${t('email')}: ${staff.email}\n${t('phone')}: ${staff.phone || '-'}\n${t('role')}: ${roleName}\n${t('status')}: ${statusName}\n${staff.position ? `${t('position')}: ${staff.position}\n` : ''}${staff.department ? `${t('department')}: ${staff.department}` : ''}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
        const currentUserRole = currentUser?.role?.name?.toLowerCase();

        if (currentUserRole !== 'superadmin') {
            const selectedStaff = staffData.filter(item => selectedIds.includes(item.id));
            const hasPrivileged = selectedStaff.some(isPrivilegedTarget);

            if (hasPrivileged) {
                Alert.error(
                    t('error_bulk_delete_core_role') || 'Xəta',
                    t('error_bulk_delete_privileged_text') || 'Seçilmişlər arasında Superadmin və ya Baş Admin var; onları yalnız Superadmin silə bilər.'
                );
                return;
            }
        }

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

                const isSuperAdmin = currentUserRole === 'superadmin';
                const idsToDelete = selectedIds.filter(id => {
                    const staff = staffData.find(s => s.id === id);
                    const roleName = (staff?.role?.name || staff?.role || '').toLowerCase();
                    const isCoreRole = staff?.role?.isCore === true;

                    if (isSuperAdmin) {
                        return true;
                    }

                    return !isPrivilegedTarget(staff) && roleName !== 'superadmin' && !isCoreRole;
                });

                await Promise.all(idsToDelete.map(id => staffApi.delete(id)));

                setStaffData(prev => prev.filter(item => !selectedIds.includes(item.id)));

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

    const handleAddStaff = () => {
        // Determine the correct path
        const isAdmin = location.pathname.includes('/admin');
        const addStaffPath = isAdmin ? '/admin/staff-form' : '/reception/staff-form';
        navigate(addStaffPath);
    };


    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('staff_management')}</h1>
                    <p className="text-gray-600">{t('manage_team')}</p>
                </div>
                {!isReception && (
                    <button
                        onClick={handleAddStaff}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        {t('add_staff')}
                    </button>
                )}
            </div>

            <TableTemplate
                data={staffData}
                columns={columns}
                title={t('staff_members')}
                searchFields={['name', 'email', 'phone', 'firstName', 'lastName']}
                rowActionsAllowed={isReception ? undefined : rowActionsAllowed}
                onEdit={isReception ? undefined : handleEdit}
                onDelete={isReception ? undefined : handleDelete}
                onView={isReception ? undefined : handleView}
                onBulkDelete={isReception ? undefined : handleBulkDelete}
                showBulkActions={!isReception}
                showFilters={false}
                showSearch={true}
                showDateFilter={false}
                loading={loading}
                emptyState={{
                    icon: 'users',
                    title: t('no_staff_found'),
                    description: t('no_staff_description'),
                    actionText: t('add_first_staff'),
                    onAction: handleAddStaff,
                    showAction: !isReception
                }}
            />
        </div>
    );
}