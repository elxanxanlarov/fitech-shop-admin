import { User, Phone, ShoppingCart, DollarSign, Calendar, CreditCard, Wallet } from 'lucide-react';

export const getSaleColumns = (t, language = 'az') => [
    {
        key: 'customer',
        label: t('customer') || 'Müştəri',
        render: (value, item) => {
            const name = item.customerName || '';
            const surname = item.customerSurname || '';
            const fullName = `${name} ${surname}`.trim() || '-';
            return (
                <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{fullName}</span>
                </div>
            );
        }
    },
    {
        key: 'customerPhone',
        label: t('phone') || 'Telefon',
        render: (value) => (
            <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{value || '-'}</span>
            </div>
        )
    },
    {
        key: 'items',
        label: t('items') || 'Məhsullar',
        render: (value, item) => {
            const items = item.items || [];
            const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            return (
                <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                        {items.length} {t('product') || 'məhsul'} ({totalItems} {t('quantity') || 'ədəd'})
                    </span>
                </div>
            );
        }
    },
    {
        key: 'totalAmount',
        label: t('total_amount') || 'Ümumi Məbləğ',
        render: (value) => {
            const amount = typeof value === 'string' || typeof value === 'number' 
                ? parseFloat(value || 0) 
                : parseFloat(value?.toString() || 0);
            return (
                <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{amount.toFixed(2)} ₼</span>
                </div>
            );
        }
    },
    {
        key: 'paidAmount',
        label: t('paid_amount') || 'Ödənilən Məbləğ',
        render: (value) => {
            const amount = typeof value === 'string' || typeof value === 'number' 
                ? parseFloat(value || 0) 
                : parseFloat(value?.toString() || 0);
            return (
                <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-semibold text-green-600">{amount.toFixed(2)} ₼</span>
                </div>
            );
        }
    },
    {
        key: 'profitAmount',
        label: t('profit') || 'Qazanc',
        render: (value) => {
            const profit = typeof value === 'string' || typeof value === 'number' 
                ? parseFloat(value || 0) 
                : parseFloat(value?.toString() || 0);
            return (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profit > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                    {profit.toFixed(2)} ₼
                </span>
            );
        }
    },
    {
        key: 'paymentType',
        label: t('payment_type') || 'Ödəniş Növü',
        render: (value, item) => {
            const paymentType = value || item.paymentType || 'cash';
            const isCash = paymentType === 'cash';
            return (
                <div className="flex items-center space-x-2">
                    {isCash ? (
                        <Wallet className="w-4 h-4 text-green-600" />
                    ) : (
                        <CreditCard className="w-4 h-4 text-blue-600" />
                    )}
                    <span className={`text-sm font-semibold ${
                        isCash ? 'text-green-600' : 'text-blue-600'
                    }`}>
                        {isCash ? (t('cash') || 'Nağd') : (t('card') || 'Kart')}
                    </span>
                </div>
            );
        }
    },
    {
        key: 'isRefunded',
        label: t('status') || 'Status',
        render: (value, item) => {
            const isRefunded = item.isRefunded || false;
            return (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    isRefunded ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                    {isRefunded ? (t('refunded') || 'Qaytarılıb') : (t('active') || 'Aktiv')}
                </span>
            );
        }
    },
    {
        key: 'createdAt',
        label: t('date') || 'Tarix',
        render: (value) => {
            if (!value) return '-';
            return (
                <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                        {new Date(value).toLocaleDateString(language === 'az' ? 'az-AZ' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
            );
        }
    }
];

