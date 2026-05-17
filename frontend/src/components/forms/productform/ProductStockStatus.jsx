import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdStorage } from 'react-icons/md';

export default function ProductStockStatus({
    formData,
    isEditMode,
    onInputChange,
    onToggleStockManagement,
    showStockManagement
}) {
    const { t } = useTranslation('product');

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 flex-1">
                    <MdStorage className="inline w-5 h-5 mr-2" />
                    {t('stock_status') || 'Stok və Status'}
                </h3>
                {isEditMode && (
                    <div className="flex gap-2 ml-4">
                        <button
                            type="button"
                            onClick={onToggleStockManagement}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            {showStockManagement ? (t('hide_stock_management') || 'Gizlət') : (t('manage_stock') || 'İdarə Et')}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => onInputChange('isActive', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            {t('product_active') || 'Məhsul aktivdir'}
                        </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                        {t('product_active_description') || 'Deaktiv məhsullar satışda görünməz'}
                    </p>
                </div>

                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isOfficial}
                            onChange={(e) => onInputChange('isOfficial', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            {t('is_official') || 'Rəsmi məhsul'}
                        </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                        {t('is_official_description') || 'Rəsmi məhsullar qeydiyyatdan keçmiş məhsullardır'}
                    </p>
                </div>
            </div>
        </>
    );
}

