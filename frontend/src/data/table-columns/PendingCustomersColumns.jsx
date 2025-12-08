import { UserPlus, Phone, Clock, CheckCircle, XCircle } from 'lucide-react';

export const getPendingCustomersColumns = (t) => [
    {
        key: 'name',
        label: t('customer_name', 'Müştəri adı'),
        render: (value, row) => (
            <div className="flex items-center space-x-3">
                <div className="shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                    </div>
                </div>
                <div>
                    <div className="text-sm font-medium text-gray-900">{value}</div>
                    <div className="text-sm text-gray-500">{row.email}</div>
                </div>
            </div>
        )
    },
    {
        key: 'phone',
        label: t('phone', 'Telefon'),
        render: (value) => (
            <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{value}</span>
            </div>
        )
    },
    {
        key: 'status',
        label: t('status', 'Status'),
        render: (value) => {
            const statusConfig = {
                pending: { 
                    color: 'bg-yellow-100 text-yellow-800', 
                    icon: Clock, 
                    label: 'Gözləyir' 
                },
                approved: { 
                    color: 'bg-green-100 text-green-800', 
                    icon: CheckCircle, 
                    label: 'Təsdiqlənib' 
                },
                rejected: { 
                    color: 'bg-red-100 text-red-800', 
                    icon: XCircle, 
                    label: 'Rədd edilib' 
                }
            };
            const config = statusConfig[value] || statusConfig.pending;
            const Icon = config.icon;
            return (
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                </span>
            );
        }
    },
    {
        key: 'requestDate',
        label: t('request_date', 'Tələb tarixi'),
        render: (value) => (
            <span className="text-sm text-gray-900">
                {new Date(value).toLocaleDateString('az-AZ')}
            </span>
        )
    },
    {
        key: 'actions',
        label: t('actions', 'Əməliyyatlar'),
        render: (_, row) => (
            <div className="flex items-center justify-center">
                <button
                    onClick={() => {}}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    title={t('approve', 'Təsdiq et')}
                >
                    {t('approve', 'Təsdiq et')}
                </button>
            </div>
        )
    }
];

