import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

export default function FinalDeliveryDetailForm({ delivery, onClose }) {
    const { t, i18n } = useTranslation('finalDelivery');

    if (!delivery) return null;

    const items = delivery.items || [];
    const totalProducts = items.length;
    const totalStock = items.reduce(
        (sum, item) => sum + (item.remainingStock || item.stock || 0),
        0
    );

    const formatDateTime = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleString(i18n.language === 'az' ? 'az-AZ' : 'en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {t('delivery_details') || 'Yekun Təslimat Detalları'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {delivery.title}
                        </p>
                         <p className="text-xs text-gray-500 mt-1">
                            {t('created_at') || 'Yaradılıb'}: {formatDateTime(delivery.createdAt)}{' '}
                            {delivery.staff && (
                                <>
                                    • {t('created_by') || 'Yaradan'}:{' '}
                                    {`${delivery.staff.name} ${delivery.staff.surName || ''}`.trim()}
                                </>
                            )}
                            {' • '}
                            {t('branch') || 'Filial'}:{' '}
                            {delivery.branch?.name || t('central_warehouse') || 'Mərkəzi Anbar'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {t('total_products') || 'Ümumi Məhsul Sayı'}: {totalProducts} •{' '}
                            {t('total_stock') || 'Ümumi Stok'}: {totalStock}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6">
                    {items.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            {t('no_data') || 'Məlumat yoxdur'}
                        </p>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                            {t('product_name') || 'Məhsul'}
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                            {t('category') || 'Kateqoriya'}
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                            {t('subcategory') || 'Alt kateqoriya'}
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                            {t('unit_type') || 'Ölçü vahidi'}
                                        </th>
                                        <th className="px-4 py-2 text-right font-semibold text-gray-700">
                                            {t('full_boxes') || 'Tam qutular'}
                                        </th>
                                        <th className="px-4 py-2 text-right font-semibold text-gray-700">
                                            {t('opened_box_quantity') || 'Açıq qutu miqdarı'}
                                        </th>
                                        <th className="px-4 py-2 text-right font-semibold text-gray-700">
                                            {t('remaining_stock') || 'Qalan stok'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item) => {
                                        const product = item.product || {};
                                        const unitType = product.unitType || '-';
                                        const remaining = item.remainingStock ?? item.stock ?? 0;
                                        return (
                                            <tr key={item.id}>
                                                <td className="px-4 py-2 text-gray-900">
                                                    {product.name || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                    {product.category?.name || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                    {product.subCategory?.name || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                    {unitType}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-900">
                                                    {item.fullBoxes ?? 0}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-900">
                                                    {item.openedBoxQuantity ?? 0}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-900">
                                                    {remaining}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


