import { Phone } from 'lucide-react';

export const getStaffColumns = (t, language = 'az') => [
    {
        key: 'name',
        label: t('name'),
        render: (value, item) => (
            <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    {(value || `${item.firstName || ''} ${item.lastName || ''}` || '-')
                        .trim()
                        .split(' ')
                        .filter(Boolean)
                        .map(n => n[0])
                        .join('') || '-'}
                </div>
                <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{value || `${item.firstName || ''} ${item.lastName || ''}`}</div>
                    <div className="text-sm text-gray-500">{item.email}</div>
                </div>
            </div>
        )
    },
    {
        key: 'phone',
        label: t('phone'),
        render: (value) => (
            <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{value}</span>
            </div>
        )
    },
    {
        key: 'role',
        label: t('role'),
        render: (value, item) => {
            let roleName = item.role?.name || value || 'Staff';
            const isBoss = item.isBoss === true;

            const rname = roleName.toLowerCase();
            if (rname === 'ismayilliadmin') {
                roleName = 'Admin (İsmayıllı)';
            } else if (rname === 'ismayilliseller') {
                roleName = 'Satışçı (İsmayıllı)';
            } else if (rname === 'seller') {
                roleName = 'Satıcı';
            } else if (rname === 'admin' && isBoss) {
                roleName = t('head_admin_short') || 'Baş Admin';
            }

            let badgeClass = 'bg-green-100 text-green-800';
            const rl = roleName.toLowerCase();
            if (rl.includes('ismayıllı')) {
                badgeClass = rl.includes('admin') ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800';
            } else if (rl === 'admin' || rl === 'baş admin' || roleName === (t('head_admin_short') || 'Baş Admin')) {
                badgeClass = 'bg-red-100 text-red-800';
            } else if (rl === 'reception') {
                badgeClass = 'bg-blue-100 text-blue-800';
            } else if (rl === 'satıcı' || rl === 'seller') {
                badgeClass = 'bg-teal-100 text-teal-800';
            }

            return (
                <div className="flex flex-col gap-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
                        {roleName}
                    </span>
                </div>
            );
        }
    },
    {
        key: 'branch',
        label: t('branch') || 'Filial',
        render: (value, item) => (
            <span className="text-sm font-medium text-blue-600">
                {item.branch?.name || '-'}
            </span>
        )
    },
    {
        key: 'store',
        label: t('store') || 'Mağaza',
        render: (value, item) => {
            const storeName = item.store === 'ISMAYILLI' ? 'İsmayıllı' : 'Fitech';
            return (
                <span className="text-sm font-medium text-purple-600">
                    {storeName}
                </span>
            );
        }
    },
    {
        key: 'status',
        label: t('status'),
        render: (value, item) => {
            const isActive = item.isActive !== undefined ? item.isActive : (value === 'Active' || value === t('active'));
            return (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {isActive ? t('active') : t('inactive')}
                </span>
            );
        }
    },
    {
        key: 'createdAt',
        label: t('created'),
        render: (value) => {
            if (!value) return '-';
            return new Date(value).toLocaleDateString(language === 'az' ? 'az-AZ' : 'en-US');
        }
    },
    {
        key: 'lastLogin',
        label: t('last_login'),
        render: (value, item) => {
            // Backend-də lastLogin field-i yoxdur, createdAt istifadə edək
            const loginDate = value || item.createdAt;
            if (!loginDate) return '-';
            return new Date(loginDate).toLocaleDateString(language === 'az' ? 'az-AZ' : 'en-US');
        }
    }
];

