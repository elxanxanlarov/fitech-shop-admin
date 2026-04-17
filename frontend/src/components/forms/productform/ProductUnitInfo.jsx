import React from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../ui/Input';
import { MdInventory, MdAttachMoney, MdStorage } from 'react-icons/md';

export default function ProductUnitInfo({
    formData,
    errors,
    isLoading,
    isEditMode,
    onInputChange
}) {
    const { t } = useTranslation('product');

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                <MdInventory className="inline w-5 h-5 mr-2" />
                {t('unit_info') || 'Ölçü Vahidi Məlumatları'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
                {t('unit_info_description') || 'Məhsulun ölçü vahidini və qutu/paket məlumatlarını təyin edin'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('unit_type') || 'Ölçü Vahidi'} <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.unitType || 'PIECE'}
                        onChange={(e) => {
                            if (!isEditMode) {
                                onInputChange('unitType', e.target.value);
                                // Əgər PIECE seçilibsə, piecesPerBox-u təmizlə
                                if (e.target.value === 'PIECE') {
                                    onInputChange('piecesPerBox', '');
                                    onInputChange('openedBoxQuantity', 0);
                                    onInputChange('fullBoxes', 0);
                                    onInputChange('boxPrice', '');
                                } else {
                                    // Qutu tipindədirsə, boxPrice avtomatik hesabla
                                    const salePrice = parseFloat(formData.salePrice) || 0;
                                    const piecesPerBox = parseInt(formData.piecesPerBox) || 0;
                                    if (salePrice > 0 && piecesPerBox > 0 && (!formData.boxPrice || formData.boxPrice === '')) {
                                        const calculatedBoxPrice = (salePrice * piecesPerBox).toFixed(2);
                                        onInputChange('boxPrice', calculatedBoxPrice);
                                    }
                                }
                            }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading || isEditMode}
                    >
                        <option value="PIECE">{t('unit_type_piece') || 'Ədəd'}</option>
                        <option value="BOX">{t('unit_type_box') || 'Qutu'}</option>
                        <option value="LITER">{t('unit_type_liter') || 'Litr'}</option>
                        <option value="METER">{t('unit_type_meter') || 'Metr'}</option>
                        <option value="KILOGRAM">{t('unit_type_kilogram') || 'Kiloqram'}</option>
                    </select>
                    {errors.unitType && (
                        <p className="mt-1 text-sm text-red-600">{errors.unitType}</p>
                    )}
                </div>

                {formData.unitType !== 'PIECE' && (
                    <>
                        <div>
                            <Input
                                label={
                                    formData.unitType === 'BOX' ? (t('pieces_per_box_box') || 'Hər Qutuda Neçə Ədəd') :
                                        formData.unitType === 'METER' ? (t('pieces_per_box_meter') || 'Hər Paketdə Neçə Metr') :
                                            formData.unitType === 'LITER' ? (t('pieces_per_box_liter') || 'Hər Paketdə Neçə Litr') :
                                                formData.unitType === 'KILOGRAM' ? (t('pieces_per_box_kilogram') || 'Hər Paketdə Neçə Kiloqram') :
                                                    (t('pieces_per_box') || 'Hər Qutu/Paketdəki Miqdar')
                                }
                                type="text"
                                value={formData.piecesPerBox}
                                onChange={(e) => {
                                    if (!isEditMode) {
                                        onInputChange('piecesPerBox', e.target.value);
                                    }
                                }}
                                error={errors.piecesPerBox}
                                disabled={isEditMode}
                                placeholder={
                                    formData.unitType === 'BOX' ? (t('pieces_per_box_box_placeholder') || 'Məs: 12 (hər qutuda 12 ədəd)') :
                                        formData.unitType === 'METER' ? (t('pieces_per_box_meter_placeholder') || 'Məs: 500 (hər paketdə 500 metr)') :
                                            formData.unitType === 'LITER' ? (t('pieces_per_box_liter_placeholder') || 'Məs: 5 (hər paketdə 5 litr)') :
                                                formData.unitType === 'KILOGRAM' ? (t('pieces_per_box_kilogram_placeholder') || 'Məs: 25 (hər paketdə 25 kq)') :
                                                    (t('pieces_per_box_placeholder') || 'Məs: 12 (hər qutuda 12 ədəd)')
                                }
                                icon={<MdStorage />}
                                required
                            />
                        </div>

                        <div>
                            <Input
                                label={
                                    formData.unitType === 'BOX' ? (t('full_boxes_box') || 'Tam Qutular') :
                                        (t('full_boxes_meter') || 'Tam Paketlər')
                                }
                                type="text"
                                value={formData.fullBoxes}
                                onChange={(e) => {
                                    if (!isEditMode) {
                                        onInputChange('fullBoxes', e.target.value);
                                        // Stock-u yenilə
                                        const piecesPerBox = parseInt(formData.piecesPerBox) || 0;
                                        const openedBoxQuantity = parseInt(formData.openedBoxQuantity) || 0;
                                        const fullBoxes = parseInt(e.target.value) || 0;
                                        if (piecesPerBox > 0) {
                                            const calculatedStock = (fullBoxes * piecesPerBox) + openedBoxQuantity;
                                            onInputChange('stock', calculatedStock);
                                        }
                                    }
                                }}
                                error={errors.fullBoxes}
                                placeholder={
                                    formData.unitType === 'BOX' ? (t('full_boxes_placeholder') || 'Tam qutuların sayı') :
                                        (t('full_boxes_placeholder') || 'Tam paketlərin sayı')
                                }
                                icon={<MdStorage />}
                                disabled={isEditMode}
                            />
                        </div>

                        <div>
                            <Input
                                label={
                                    formData.unitType === 'BOX' ? (t('opened_box_quantity_box') || 'Açıq Ədəd (Qutu Daxilində Olmayan)') :
                                        formData.unitType === 'METER' ? (t('opened_box_quantity_meter') || 'Açıq Metr (Paket Daxilində Olmayan)') :
                                            formData.unitType === 'LITER' ? (t('opened_box_quantity_liter') || 'Açıq Litr (Paket Daxilində Olmayan)') :
                                                formData.unitType === 'KILOGRAM' ? (t('opened_box_quantity_kilogram') || 'Açıq Kiloqram (Paket Daxilində Olmayan)') :
                                                    (t('opened_box_quantity') || 'Açıq Məhsul (Qutu Daxilində Olmayan)')
                                }
                                type="text"
                                value={formData.openedBoxQuantity}
                                onChange={(e) => {
                                    onInputChange('openedBoxQuantity', e.target.value);
                                    // Stock-u yenilə
                                    const piecesPerBox = parseInt(formData.piecesPerBox) || 0;
                                    const openedBoxQuantity = parseInt(e.target.value) || 0;
                                    const fullBoxes = parseInt(formData.fullBoxes) || 0;
                                    if (piecesPerBox > 0) {
                                        const calculatedStock = (fullBoxes * piecesPerBox) + openedBoxQuantity;
                                        onInputChange('stock', calculatedStock);
                                    }
                                }}
                                error={errors.openedBoxQuantity}
                                placeholder={
                                    formData.unitType === 'BOX' ? (t('opened_box_quantity_box_placeholder') || 'Məs: 5 (qutu daxilində olmayan 5 ədəd)') :
                                        formData.unitType === 'METER' ? (t('opened_box_quantity_meter_placeholder') || 'Məs: 40 (paket daxilində olmayan 40 metr)') :
                                            formData.unitType === 'LITER' ? (t('opened_box_quantity_liter_placeholder') || 'Məs: 2 (paket daxilində olmayan 2 litr)') :
                                                formData.unitType === 'KILOGRAM' ? (t('opened_box_quantity_kilogram_placeholder') || 'Məs: 3 (paket daxilində olmayan 3 kq)') :
                                                    (t('opened_box_quantity_placeholder') || 'Məs: 5 (qutu daxilində olmayan 5 ədəd)')
                                }
                                icon={<MdStorage />}
                                disabled={isEditMode}
                            />
                        </div>

                        <div>
                            <Input
                                label={
                                    formData.unitType === 'BOX' ? (t('box_price_box') || 'Qutu Qiyməti') :
                                        (t('box_price_meter') || 'Paket Qiyməti')
                                }
                                type="text"
                                value={(() => {
                                    const salePrice = parseFloat(formData.salePrice) || 0;
                                    const piecesPerBox = parseInt(formData.piecesPerBox) || 0;
                                    if (salePrice > 0 && piecesPerBox > 0) {
                                        // Avtomatik hesabla: salePrice * piecesPerBox
                                        const autoBoxPrice = (salePrice * piecesPerBox).toFixed(2);
                                        return autoBoxPrice;
                                    }
                                    return formData.boxPrice || '';
                                })()}
                                onChange={() => {
                                    // Dəyişdirmək olmaz, disabled-dir
                                }}
                                error={errors.boxPrice}
                                placeholder={t('box_price_placeholder') || 'Avtomatik hesablanacaq'}
                                icon={<MdAttachMoney />}
                                disabled={true}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {formData.unitType === 'BOX'
                                    ? (t('box_price_info') || 'Qutu qiyməti ədəd qiymətindən avtomatik hesablanır (Satış Qiyməti × Hər Qutudakı Miqdar)')
                                    : formData.unitType === 'METER'
                                        ? (t('box_price_info_meter') || 'Paket qiyməti metr qiymətindən avtomatik hesablanır (Satış Qiyməti × Hər Paketdəki Metr)')
                                        : formData.unitType === 'LITER'
                                            ? (t('box_price_info_liter') || 'Paket qiyməti litr qiymətindən avtomatik hesablanır (Satış Qiyməti × Hər Paketdəki Litr)')
                                            : formData.unitType === 'KILOGRAM'
                                                ? (t('box_price_info_kilogram') || 'Paket qiyməti kiloqram qiymətindən avtomatik hesablanır (Satış Qiyməti × Hər Paketdəki Kiloqram)')
                                                : (t('box_price_info') || 'Paket qiyməti ədəd qiymətindən avtomatik hesablanır (Satış Qiyməti × Hər Paketdəki Miqdar)')
                                }
                            </p>
                        </div>
                    </>
                )}

                {/* Hesablanmış Stok Input */}
                <div className="md:col-span-2">
                    <Input
                        label={t('calculated_stock') || 'Hesablanmış Stok'}
                        type="text"
                        value={(() => {
                            if (formData.unitType !== 'PIECE' && formData.piecesPerBox && parseInt(formData.piecesPerBox) > 0) {
                                const piecesPerBox = parseInt(formData.piecesPerBox) || 0;
                                const fullBoxes = parseInt(formData.fullBoxes) || 0;
                                const openedBoxQuantity = parseInt(formData.openedBoxQuantity) || 0;
                                return (fullBoxes * piecesPerBox) + openedBoxQuantity;
                            }
                            // ədəd tipində olanda input boş qala bilsin, avtomatik 0 yazılmasın
                            if (formData.stock === null || formData.stock === undefined || formData.stock === '') {
                                return '';
                            }
                            return formData.stock;
                        })()}
                        onChange={(e) => {
                            // Yalnız yeni yaradılarkən (create mode) və ədəd tipindədirsə stok birbaşa formdan dəyişsin
                            if (!isEditMode && formData.unitType === 'PIECE') {
                                onInputChange('stock', e.target.value);
                            }
                        }}
                        error={errors.stock}
                        placeholder="0"
                        icon={<MdStorage />}
                        disabled={
                            isEditMode ||
                            (formData.unitType !== 'PIECE' && formData.piecesPerBox && parseInt(formData.piecesPerBox) > 0)
                        }
                    />
                    {formData.unitType !== 'PIECE' && formData.piecesPerBox && parseInt(formData.piecesPerBox) > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                            {t('stock_calculation_info') || 'Stok tam qutular və açıq məhsullardan avtomatik hesablanır'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

