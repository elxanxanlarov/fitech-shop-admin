import { useCallback } from 'react';

export function useProductFormChangeDetection(formData, initialFormData, selectedImageFile, isEditMode) {
    const hasFormChanged = useCallback(() => {
        if (!isEditMode || !initialFormData) return true; // Always allow submit in create mode

        // Compare form data with initial data
        const currentData = {
            name: formData.name.trim(),
            description: formData.description?.trim() || '',
            imageUrl: formData.imageUrl?.trim() || '',
            purchasePrice: formData.purchasePrice?.toString() || '',
            salePrice: formData.salePrice?.toString() || '',
            hasDiscount: formData.hasDiscount || false,
            discountPrice: formData.discountPrice?.toString() || '',
            discountPercent: formData.discountPercent?.toString() || '',
            barcode: formData.barcode?.trim() || '',
            stock: formData.stock || 0,
            isActive: formData.isActive !== undefined ? formData.isActive : true,
            isOfficial: formData.isOfficial !== undefined ? formData.isOfficial : false,
            categoryId: formData.categoryId || '',
            subCategoryId: formData.subCategoryId || '',
            unitType: formData.unitType || 'PIECE',
            piecesPerBox: formData.piecesPerBox?.toString() || '',
            openedBoxQuantity: formData.openedBoxQuantity || 0,
            boxPrice: formData.boxPrice?.toString() || '',
            fullBoxes: formData.fullBoxes || 0
        };

        const initial = {
            name: initialFormData.name.trim(),
            description: initialFormData.description?.trim() || '',
            imageUrl: initialFormData.imageUrl?.trim() || '',
            purchasePrice: initialFormData.purchasePrice?.toString() || '',
            salePrice: initialFormData.salePrice?.toString() || '',
            hasDiscount: initialFormData.hasDiscount || false,
            discountPrice: initialFormData.discountPrice?.toString() || '',
            discountPercent: initialFormData.discountPercent?.toString() || '',
            barcode: initialFormData.barcode?.trim() || '',
            stock: initialFormData.stock || 0,
            isActive: initialFormData.isActive !== undefined ? initialFormData.isActive : true,
            isOfficial: initialFormData.isOfficial !== undefined ? initialFormData.isOfficial : false,
            categoryId: initialFormData.categoryId || '',
            subCategoryId: initialFormData.subCategoryId || ''
        };

        // Check if any field has changed
        const hasChanged = JSON.stringify(currentData) !== JSON.stringify(initial) || selectedImageFile !== null;
        return hasChanged;
    }, [formData, initialFormData, selectedImageFile, isEditMode]);

    return {
        hasFormChanged
    };
}

