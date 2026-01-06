import { useTranslation } from 'react-i18next';

export function useProductFormValidation(formData, setErrors) {
    const { t } = useTranslation('product');

    const validateForm = () => {
        const newErrors = {};

        // Ad
        if (!formData.name.trim()) {
            newErrors.name = t('name_required') || 'Ad tələb olunur';
        }

        // Qiymətlər (string -> number)
        const purchasePriceNum = parseFloat(formData.purchasePrice || '0');
        const salePriceNum = parseFloat(formData.salePrice || '0');

        // Alış qiyməti
        if (!formData.purchasePrice || purchasePriceNum <= 0) {
            newErrors.purchasePrice =
                t('purchase_price_required') ||
                'Alış qiyməti tələb olunur və 0-dan böyük olmalıdır';
        }

        // Satış qiyməti
        if (!formData.salePrice || salePriceNum <= 0) {
            newErrors.salePrice =
                t('sale_price_required') ||
                'Satış qiyməti tələb olunur və 0-dan böyük olmalıdır';
        }

        // Satış qiyməti maya dəyərindən kiçik ola bilməz
        if (purchasePriceNum > 0 && salePriceNum > 0 && salePriceNum < purchasePriceNum) {
            newErrors.salePrice =
                t('sale_price_less_than_cost') ||
                'Satış qiyməti maya dəyərindən kiçik ola bilməz';
        }

        // ENDİRİM MƏNTİQİ
        if (formData.hasDiscount) {
            const hasDiscountPrice =
                formData.discountPrice !== '' && formData.discountPrice !== null;
            const hasDiscountPercent =
                formData.discountPercent !== '' && formData.discountPercent !== null;

            const discountPriceNum = parseFloat(formData.discountPrice || '0');
            const discountPercentNum = parseFloat(formData.discountPercent || '0');

            // Heç biri doldurulmayıbsa
            if (!hasDiscountPrice && !hasDiscountPercent) {
                newErrors.discount =
                    t('discount_required') ||
                    'Endirim aktivdirsə, endirim qiyməti və ya faizi tələb olunur';
            }

            // 💸 Endirim qiyməti (endirimdən SONRA satış qiyməti)
            if (hasDiscountPrice) {
                // 0-dan böyük olsun
                if (discountPriceNum <= 0) {
                    newErrors.discountPrice =
                        t('discount_price_invalid') ||
                        'Endirim qiyməti 0-dan böyük olmalıdır';
                }

                // Satış qiymətindən böyük və ya bərabər ola bilməz
                if (salePriceNum > 0 && discountPriceNum >= salePriceNum) {
                    newErrors.discountPrice =
                        t('discount_price_greater_than_sale') ||
                        'Endirim qiyməti satış qiymətindən böyük və ya bərabər ola bilməz';
                }
            }

            // 💰 Endirim faizi
            if (hasDiscountPercent) {
                // 0-dan böyük və 100-dən kiçik olsun
                if (discountPercentNum <= 0 || discountPercentNum >= 100) {
                    newErrors.discountPercent =
                        t('discount_percent_invalid') ||
                        'Endirim faizi 0-dan böyük və 100-dən kiçik olmalıdır';
                }
            }
        }

        // Category (mütləq tələb olunur)
        if (!formData.categoryId) {
            newErrors.categoryId = t('category_required') || 'Kateqoriya tələb olunur';
        }

        // SubCategory - artıq məcburi deyil, istəyə bağlıdır

        // Unit Type
        if (!formData.unitType) {
            newErrors.unitType = t('unit_type_required') || 'Ölçü vahidi tələb olunur';
        }

        // Pieces Per Box (required for non-PIECE unit types)
        if (formData.unitType !== 'PIECE' && (!formData.piecesPerBox || parseInt(formData.piecesPerBox) <= 0)) {
            newErrors.piecesPerBox =
                t('pieces_per_box_required') ||
                'Qutu başına ədəd tələb olunur və 0-dan böyük olmalıdır';
        }

        // Stok
        if (formData.stock !== undefined && formData.stock < 0) {
            newErrors.stock = t('stock_invalid') || 'Stok mənfi ola bilməz';
        }

        // UnitType və qutu məlumatları validation
        const unitType = formData.unitType || 'PIECE';
        if (['BOX', 'LITER', 'METER', 'KILOGRAM'].includes(unitType)) {
            const piecesPerBox = formData.piecesPerBox ? parseInt(formData.piecesPerBox) : null;
            if (!piecesPerBox || piecesPerBox <= 0) {
                newErrors.piecesPerBox = t('pieces_per_box_required') || 'Qutu/Litr/Metr/Kiloqram tipi üçün hər qutu/paketdəki miqdar tələb olunur';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    return {
        validateForm
    };
}

