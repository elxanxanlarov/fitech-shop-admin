import { Package, DollarSign, Tag, Hash } from 'lucide-react';

export const getProductColumns = (t, language = 'az') => [
    {
        key: 'name',
        label: t('name'),
        render: (value, item) => {
            // Image URL-i düzgün format et
            let imageSrc = null;
            if (item.imageUrl) {
                const imageUrl = String(item.imageUrl).trim();
                if (imageUrl && imageUrl.length > 0) {
                    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                        imageSrc = imageUrl;
                    } else {
                        // VITE_API_URL-dən /api hissəsini çıxar və /uploads əlavə et
                        const apiUrl = import.meta.env.VITE_API_URL || '';
                        const baseUrl = apiUrl.replace('/api', ''); // http://localhost:5000
                        imageSrc = `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
                    }
                }
            }
            
            return (
                <div className="flex items-center">
                    {imageSrc ? (
                        <img 
                            src={imageSrc} 
                            alt={value || item.name || 'Product'} 
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.nextElementSibling;
                                if (fallback) {
                                    fallback.style.display = 'flex';
                                }
                            }}
                        />
                    ) : null}
                    <div 
                        className={`h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-medium mr-3 ${imageSrc ? 'hidden' : ''}`}
                    >
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900">{value || '-'}</div>
                        {item.description && (
                            <div className="text-xs text-gray-500 line-clamp-1">{item.description}</div>
                        )}
                    </div>
                </div>
            );
        }
    },
    {
        key: 'barcode',
        label: t('barcode'),
        render: (value) => (
            <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900 font-mono">{value || '-'}</span>
            </div>
        )
    },
    {
        key: 'purchasePrice',
        label: t('purchase_price'),
        render: (value) => {
            const price = typeof value === 'string' || typeof value === 'number' ? parseFloat(value || 0) : parseFloat(value?.toString() || 0);
            return (
                <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{price.toFixed(2)} ₼</span>
                </div>
            );
        }
    },
    {
        key: 'salePrice',
        label: t('sale_price'),
        render: (value, item) => {
            const hasDiscount = item.hasDiscount;
            const discountPrice = item.discountPrice;
            const salePrice = typeof value === 'string' || typeof value === 'number' ? parseFloat(value || 0) : parseFloat(value?.toString() || 0);
            
            return (
                <div className="flex flex-col">
                    {hasDiscount && discountPrice ? (
                        <>
                            <span className="text-sm text-gray-400 line-through">{salePrice.toFixed(2)} ₼</span>
                            <span className="text-sm font-semibold text-red-600">
                                {(typeof discountPrice === 'string' || typeof discountPrice === 'number' 
                                    ? parseFloat(discountPrice) 
                                    : parseFloat(discountPrice?.toString() || 0)).toFixed(2)} ₼
                            </span>
                        </>
                    ) : (
                        <span className="text-sm font-semibold text-gray-900">{salePrice.toFixed(2)} ₼</span>
                    )}
                </div>
            );
        }
    },
    {
        key: 'stock',
        label: t('stock'),
        render: (value) => {
            const stock = parseInt(value || 0);
            return (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    stock > 10 ? 'bg-green-100 text-green-800' :
                    stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                    {stock}
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
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                    {isActive ? t('active') : t('inactive')}
                </span>
            );
        }
    },
    {
        key: 'isOfficial',
        label: t('official_status'),
        render: (value, item) => {
            const isOfficial = item.isOfficial !== undefined ? item.isOfficial : false;
            return (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    isOfficial ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                    {isOfficial ? (t('official') || 'Rəsmi') : (t('unofficial') || 'Qeyri-rəsmi')}
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
    }
];

