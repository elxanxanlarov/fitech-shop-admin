import { useState } from 'react';
import Alert from '../components/ui/Alert';
import { productApi, uploadApi } from '../api';

export function useProductFormSubmit(
    formData,
    selectedImageFile,
    isEditMode,
    productId,
    navigate,
    productPagePath,
    validateForm,
    hasFormChanged,
    t,
    tAlert
) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            return false;
        }

        // In edit mode, check if form has changed
        if (isEditMode && hasFormChanged && !hasFormChanged()) {
            Alert.info(t('no_changes') || 'Xəbərdarlıq', t('no_changes_text') || 'Formda heç bir dəyişiklik edilməyib');
            return false;
        }

        setIsLoading(true);

        try {
            let imageUrlValue = formData.imageUrl?.trim() || null;

            // If image file is selected, upload it first
            if (selectedImageFile) {
                try {
                    const uploadResponse = await uploadApi.uploadImage(selectedImageFile);
                    if (uploadResponse.success && uploadResponse.data) {
                        imageUrlValue = uploadResponse.data.url;
                    } else {
                        throw new Error(uploadResponse.message || 'Upload failed');
                    }
                } catch (uploadError) {
                    console.error('Image upload error:', uploadError);
                    Alert.error(t('error') || 'Xəta!', uploadError.response?.data?.message || t('upload_error') || 'Şəkil yüklənərkən xəta baş verdi');
                    setIsLoading(false);
                    return false;
                }
            }

            // Stock hesablaması (qutu/ədəd məntiqinə uyğun)
            let calculatedStock = parseInt(formData.stock) || 0;
            let calculatedFullBoxes = parseInt(formData.fullBoxes) || 0;
            let calculatedOpenedBoxQuantity = parseInt(formData.openedBoxQuantity) || 0;
            const piecesPerBox = formData.piecesPerBox ? parseInt(formData.piecesPerBox) : null;

            // Əgər qutu tipindədirsə və stok verilibsə, fullBoxes və openedBoxQuantity hesabla
            if (piecesPerBox && piecesPerBox > 0 && formData.stock) {
                calculatedFullBoxes = Math.floor(calculatedStock / piecesPerBox);
                calculatedOpenedBoxQuantity = calculatedStock % piecesPerBox;
            }

            const payload = {
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                imageUrl: imageUrlValue,
                purchasePrice: parseFloat(formData.purchasePrice),
                salePrice: parseFloat(formData.salePrice),
                hasDiscount: formData.hasDiscount || false,
                discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
                discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
                barcode: formData.barcode?.trim() || null,
                categoryId: formData.categoryId,
                subCategoryId: formData.subCategoryId,
                unitType: formData.unitType,
                piecesPerBox: piecesPerBox,
                fullBoxes: calculatedFullBoxes,
                openedBoxQuantity: calculatedOpenedBoxQuantity,
                stock: calculatedStock,
                boxPrice: formData.boxPrice ? parseFloat(formData.boxPrice) : null,
                isActive: formData.isActive !== undefined ? formData.isActive : true,
                isOfficial: formData.isOfficial !== undefined ? formData.isOfficial : false
            };

            if (isEditMode && productId) {
                await productApi.update(productId, payload);
                Alert.success(t('product_updated') || 'Uğurlu!', t('product_updated_text') || 'Məhsul uğurla yeniləndi');
            } else {
                await productApi.create(payload);
                Alert.success(t('product_created') || 'Uğurlu!', t('product_created_text') || 'Məhsul uğurla yaradıldı');
            }

            navigate(productPagePath);
            return true;
        } catch (error) {
            console.error('Error saving product:', error);
            Alert.error(t('error') || 'Xəta!', error.response?.data?.message || t('save_error') || 'Məhsul saxlanarkən xəta baş verdi');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        handleSubmit,
        setIsLoading
    };
}

