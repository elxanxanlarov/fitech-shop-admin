import { Phone } from 'lucide-react';

export const getCustomersColumns = (t) => [
    {
        key: 'name',
        label: t('name'),
        render: (value, item) => (
            <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                    {item.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{value}</div>
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
        key: 'cardId',
        label: t('card_id', 'Card ID'),
        render: (value) => (
            <span className="text-sm text-gray-900 font-medium">
                {value}
            </span>
        )
    },
    {
        key: 'status',
        label: t('status'),
        render: (value) => (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                {t(value.toLowerCase())}
            </span>
        )
    },
    {
        key: 'createdAt',
        label: t('created'),
        render: (value) => new Date(value).toLocaleDateString()
    },
    {
        key: 'lastActivity',
        label: t('last_activity', 'Son Aktivlik'),
        render: (value) => new Date(value).toLocaleDateString()
    }
];

