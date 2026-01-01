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
            const totalItems = items.reduce((sum, saleItem) => sum + (saleItem.quantity || 0), 0);
            
            // Qutu/ədəd məlumatlarını formatla
            const formatQuantity = (saleItem) => {
                const product = saleItem.product || {};
                const quantity = saleItem.quantity || 0;
                const unitType = product.unitType || 'PIECE';
                const piecesPerBox = product.piecesPerBox;
                
                // Əgər PIECE tipindədirsə, sadəcə ədəd göstər
                if (unitType === 'PIECE') {
                    return `${quantity} ədəd`;
                }
                
                // Qutu/paket tipindədirsə
                if (piecesPerBox && piecesPerBox > 0) {
                    const boxes = Math.floor(quantity / piecesPerBox);
                    const pieces = quantity % piecesPerBox;
                    const unitLabel = unitType === 'BOX' ? 'ədəd' : 
                                     unitType === 'METER' ? 'metr' : 
                                     unitType === 'LITER' ? 'litr' : 
                                     unitType === 'KILOGRAM' ? 'kq' : 'ədəd';
                    
                    if (boxes > 0 && pieces > 0) {
                        return `${boxes} ${unitType === 'BOX' ? 'qutu' : 'paket'} + ${pieces} açıq (${quantity} ${unitLabel})`;
                    } else if (boxes > 0) {
                        return `${boxes} ${unitType === 'BOX' ? 'qutu' : 'paket'} (${quantity} ${unitLabel})`;
                    } else if (pieces > 0) {
                        return `${pieces} açıq (${quantity} ${unitLabel})`;
                    }
                    return `${quantity} ${unitLabel}`;
                }
                
                return `${quantity} ədəd`;
            };
            
            return (
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                            {items.length} {t('product') || 'məhsul'}
                        </span>
                    </div>
                    {items.length > 0 && (
                        <div className="text-xs text-gray-600 pl-6 space-y-0.5">
                            {items.slice(0, 3).map((saleItem, idx) => (
                                <div key={idx}>
                                    {saleItem.product?.name || 'Məhsul'}: {formatQuantity(saleItem)}
                                </div>
                            ))}
                            {items.length > 3 && (
                                <div className="text-gray-500">+ {items.length - 3} digər...</div>
                            )}
                        </div>
                    )}
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
            const isCredit = item.isCredit || false;
            return (
                <div className="flex items-center space-x-2">
                    {isCredit ? (
                        <>
                            <CreditCard className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-semibold text-purple-600">
                                {t('credit') || 'Kredit'}
                            </span>
                            {!item.isCreditPaid && (
                                <span className="text-xs text-red-600 ml-1">
                                    ({parseFloat(item.creditRemainingAmount || 0).toFixed(2)} ₼ {t('remaining') || 'qalan'})
                                </span>
                            )}
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
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

