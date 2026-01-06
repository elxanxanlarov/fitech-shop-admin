import React from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../ui/Input';
import { MdAttachMoney, MdLocalOffer } from 'react-icons/md';

export default function ProductPricing({
    formData,
    errors,
    onInputChange
}) {
    const { t } = useTranslation('product');

    return (
        <>
            {/* Price Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                    <MdAttachMoney className="inline w-5 h-5 mr-2" />
                    {t('price_info') || 'Qiymət Məlumatları'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label={t('purchase_price')}
                        type="text"
                        value={formData.purchasePrice}
                        onChange={(e) => onInputChange('purchasePrice', e.target.value)}
                        error={errors.purchasePrice}
                        placeholder="0.00"
                        icon={<MdAttachMoney />}
                        required
                    />

                    <Input
                        label={t('sale_price')}
                        type="text"
                        value={formData.salePrice}
                        onChange={(e) => onInputChange('salePrice', e.target.value)}
                        error={errors.salePrice}
                        placeholder="0.00"
                        icon={<MdAttachMoney />}
                        required
                    />
                </div>
            </div>

            {/* Discount Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                    <MdLocalOffer className="inline w-5 h-5 mr-2" />
                    {t('discount_info') || 'Endirim Məlumatları'}
                </h3>

                <div className="mb-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.hasDiscount}
                            onChange={(e) => onInputChange('hasDiscount', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            {t('has_discount') || 'Endirim var'}
                        </span>
                    </label>
                </div>

                {formData.hasDiscount && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label={t('discount_price')}
                            type="text"
                            value={formData.discountPrice}
                            onChange={(e) => onInputChange('discountPrice', e.target.value)}
                            error={errors.discountPrice || errors.discount}
                            placeholder="0.00"
                            icon={<MdAttachMoney />}
                        />

                        <Input
                            label={t('discount_percent')}
                            type="text"
                            value={formData.discountPercent}
                            onChange={(e) => onInputChange('discountPercent', e.target.value)}
                            error={errors.discountPercent || errors.discount}
                            placeholder="0"
                            icon={<MdLocalOffer />}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

