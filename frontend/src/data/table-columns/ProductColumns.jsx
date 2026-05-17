import { Package, DollarSign, Tag, Hash, Maximize } from 'lucide-react';

export const getProductColumns = (t, language = 'az', onScanBarcode, onOpenHistory, showPurchasePrice = true) => [
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
                        {(item.categoryName || item.category?.name) && (
                            <div className="text-xs text-gray-500">{item.categoryName || item.category?.name}</div>
                        )}
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
        render: (value, item) => (
            <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-gray-400" />
                {value ? (
                    <span className="text-sm text-gray-900 font-mono">{value}</span>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onScanBarcode) onScanBarcode(item);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all shadow-sm active:scale-95 touch-manipulation min-h-[36px] min-w-[100px]"
                    >
                        <Maximize className="w-4 h-4" />
                        {t('scan') || 'Skan et'}
                    </button>
                )}
            </div>
        )
    },
    {
        key: 'invoiceName',
        label: t('invoice_name'),
        render: (value) => (
            <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 italic line-clamp-1">{value || '-'}</span>
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
        key: 'unitType',
        label: t('unit_type') || 'Ölçü Vahidi',
        render: (value, item) => {
            const unitType = value || item.unitType || 'PIECE';
            const unitTypeLabels = {
                'PIECE': t('unit_type_piece') || 'Ədəd',
                'BOX': t('unit_type_box') || 'Qutu',
                'LITER': t('unit_type_liter') || 'Litr',
                'METER': t('unit_type_meter') || 'Metr',
                'KILOGRAM': t('unit_type_kilogram') || 'Kiloqram'
            };
            return (
                <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                    {unitTypeLabels[unitType] || unitType}
                </span>
            );
        }
    },
    {
        key: 'stock',
        label: t('stock'),
        render: (value, item) => {
            const stock = parseInt(value || 0);
            const unitType = item.unitType || 'PIECE';
            const fullBoxes = item.fullBoxes || 0;
            const openedBoxQuantity = item.openedBoxQuantity || 0;
            const piecesPerBox = item.piecesPerBox;
 
            // Əgər qutu tipindədirsə, detallı məlumat göstər
            if (unitType !== 'PIECE' && piecesPerBox && piecesPerBox > 0) {
                const unitTypeLabels = {
                    'BOX': t('unit_type_piece') || 'ədəd',
                    'LITER': t('unit_type_liter') || 'litr',
                    'METER': t('unit_type_meter') || 'metr',
                    'KILOGRAM': t('unit_type_kilogram') || 'kq'
                };
                return (
                    <div className="flex flex-col">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            stock > 10 ? 'bg-green-100 text-green-800' :
                            stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {stock} {unitTypeLabels[unitType] || unitType}
                        </span>
                        {fullBoxes > 0 || openedBoxQuantity > 0 ? (
                            <span className="text-xs text-gray-500 mt-1">
                                {fullBoxes > 0 && `${fullBoxes} ${t('unit_type_box') || 'qutu'}`}
                                {fullBoxes > 0 && openedBoxQuantity > 0 && ' + '}
                                {openedBoxQuantity > 0 && `${openedBoxQuantity} açıq`}
                            </span>
                        ) : null}
                    </div>
                );
            }
 
            // Ədəd üçün sadə göstərici
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
].filter(col => {
    if (col.key === 'purchasePrice' && !showPurchasePrice) return false;
    return true;
});

