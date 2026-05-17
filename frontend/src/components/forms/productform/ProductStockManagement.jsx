import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../ui/Input';
import { MdRemove, MdAdd, MdHistory } from 'react-icons/md';

export default function ProductStockManagement({
    formData,
    isEditMode,
    productId,
    stockQuantity,
    stockBoxes,
    stockPieces,
    stockNote,
    stockMovementType,
    processingStock,
    currentStock,
    onStockQuantityChange,
    onStockBoxesChange,
    onStockPiecesChange,
    onStockNoteChange,
    onStockMovementTypeChange,
    onStockMovement,
    onShowHistoryModal
}) {
    const { t } = useTranslation('product');

    const calculateCurrentStock = () => {
        if (formData.unitType === 'PIECE' || !formData.unitType) {
            return formData.stock || 0;
        }
        const piecesPerBox = parseInt(formData.piecesPerBox) || 1;
        const fullBoxes = parseInt(formData.fullBoxes) || 0;
        const openedQuantity = parseInt(formData.openedBoxQuantity) || 0;
        return (fullBoxes * piecesPerBox) + openedQuantity;
    };

    const calculatedQuantity = () => {
        if (formData.unitType === 'PIECE' || !formData.unitType) {
            return stockQuantity || '0';
        }
        const boxes = parseInt(stockBoxes) || 0;
        const pieces = parseInt(stockPieces) || 0;
        const piecesPerBox = formData.piecesPerBox || 1;
        const total = (boxes * piecesPerBox) + pieces;
        const unitLabel = formData.unitType === 'BOX' ? 'ədəd' : 
                         formData.unitType === 'METER' ? 'metr' : 
                         formData.unitType === 'LITER' ? 'litr' : 
                         formData.unitType === 'KILOGRAM' ? 'kq' : 'ədəd';
        return total > 0 ? `${total} ${unitLabel}` : '0 ədəd';
    };

    return (
        <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-4">
                {t('stock_management') || 'Stok İdarəetməsi'}
            </h4>

            {/* Current Stock Display */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                    <span className="font-semibold">{t('current_stock') || 'Mövcud stok'}:</span>{' '}
                    <span className="text-blue-700 font-medium">{currentStock || calculateCurrentStock()}</span>
                </p>
            </div>

            {/* Stock Movement Form */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="space-y-6">
                    {/* Movement Type Selection */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                            {t('movement_type') || 'Hərəkət Növü'} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-6">
                            <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                stockMovementType === 'IN' 
                                    ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                            }`}>
                                <input
                                    type="radio"
                                    name="stockMovementType"
                                    value="IN"
                                    checked={stockMovementType === 'IN'}
                                    onChange={(e) => onStockMovementTypeChange(e.target.value)}
                                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"
                                />
                                <span className="text-sm font-bold">{t('stock_in') || 'Stok Girişi'}</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                stockMovementType === 'OUT' 
                                    ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' 
                                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                            }`}>
                                <input
                                    type="radio"
                                    name="stockMovementType"
                                    value="OUT"
                                    checked={stockMovementType === 'OUT'}
                                    onChange={(e) => onStockMovementTypeChange(e.target.value)}
                                    className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300"
                                />
                                <span className="text-sm font-bold">{t('stock_out') || 'Stok Çıxışı'}</span>
                            </label>
                        </div>
                    </div>

                    {/* Quantity Input - Based on Unit Type */}
                    <div>
                        {(formData.unitType === 'PIECE' || !formData.unitType) ? (
                            <Input
                                type="text"
                                name="stockQuantity"
                                label={`${t('quantity') || 'Miqdar'} (ədəd)`}
                                value={stockQuantity}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Only allow positive integers
                                    if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0)) {
                                        onStockQuantityChange(value);
                                    }
                                }}
                                placeholder="0"
                                size="md"
                                variant="filled"
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    type="text"
                                    name="stockBoxes"
                                    label={formData.unitType === 'BOX' ? (t('full_boxes_box') || 'Tam Qutular') :
                                           formData.unitType === 'METER' ? (t('full_boxes_meter') || 'Tam Paketlər') :
                                           formData.unitType === 'LITER' ? (t('full_boxes_liter') || 'Tam Paketlər') :
                                           formData.unitType === 'KILOGRAM' ? (t('full_boxes_kilogram') || 'Tam Paketlər') :
                                           'Tam Qutular/Paketlər'}
                                    value={stockBoxes}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Only allow non-negative integers
                                        if (value === '' || (/^\d+$/.test(value))) {
                                            onStockBoxesChange(value);
                                        }
                                    }}
                                    placeholder="0"
                                    size="md"
                                    variant="filled"
                                />
                                <Input
                                    type="text"
                                    name="stockPieces"
                                    label={
                                        formData.unitType === 'BOX' ? (t('opened_product_quantity_box') || 'Qutu Daxilində Olmayan') :
                                        formData.unitType === 'METER' ? (t('opened_product_quantity_meter') || 'Paket Daxilində Olmayan') :
                                        formData.unitType === 'LITER' ? (t('opened_product_quantity_liter') || 'Paket Daxilində Olmayan') :
                                        formData.unitType === 'KILOGRAM' ? (t('opened_product_quantity_kilogram') || 'Paket Daxilində Olmayan') :
                                        'Qutu/Paket Daxilində Olmayan'
                                    }
                                    value={stockPieces}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Only allow non-negative integers
                                        if (value === '' || /^\d+$/.test(value)) {
                                            onStockPiecesChange(value);
                                        }
                                    }}
                                    placeholder="0"
                                    size="md"
                                    variant="filled"
                                />
                                <Input
                                    type="text"
                                    name="calculatedQuantity"
                                    label={t('calculated_quantity') || 'Hesablanmış Miqdar'}
                                    value={calculatedQuantity()}
                                    disabled
                                    size="md"
                                    variant="filled"
                                />
                            </div>
                        )}
                    </div>

                    {/* Note and Action Button */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                {t('note') || 'Qeyd'} ({t('optional') || 'İstəyə bağlı'})
                            </label>
                            <input
                                type="text"
                                value={stockNote}
                                onChange={(e) => onStockNoteChange(e.target.value)}
                                placeholder={t('note_placeholder') || 'Qeyd daxil edin...'}
                                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={onStockMovement}
                            disabled={processingStock || !stockMovementType || ((formData.unitType === 'PIECE' || !formData.unitType) ? !stockQuantity : (!stockBoxes && !stockPieces))}
                            className={`w-full px-6 py-4 text-sm font-black text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] ${
                                stockMovementType === 'IN' 
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-200' 
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                            }`}
                        >
                            {processingStock ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t('processing') || 'İşlənir...'}
                                </>
                            ) : (
                                <>
                                    {stockMovementType === 'IN' ? (
                                        <MdAdd className="w-5 h-5" />
                                    ) : (
                                        <MdRemove className="w-5 h-5" />
                                    )}
                                    {stockMovementType === 'IN' 
                                        ? (t('add_stock') || 'Stok Əlavə Et')
                                        : (t('reduce_stock') || 'Stok Azalt')
                                    }
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stock History Button */}
            {isEditMode && productId && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onShowHistoryModal}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <MdHistory className="w-4 h-4" />
                        {t('view_full_history') || 'Tam Tarixçə'}
                    </button>
                </div>
            )}
        </div>
    );
}

