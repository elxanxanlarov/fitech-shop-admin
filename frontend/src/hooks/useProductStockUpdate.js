import { useState } from 'react';
import Alert from '../components/ui/Alert';
import { productApi } from '../api';

export function useProductStockUpdate(productId, formData, setFormData, setInitialFormData, initialFormData, isEditMode, t, tAlert) {
    const [updatingStock, setUpdatingStock] = useState(false);

    const hasStockChanged = () => {
        if (!isEditMode || !initialFormData) return false;
        
        const currentStock = parseInt(formData.stock) || 0;
        const currentFullBoxes = parseInt(formData.fullBoxes) || 0;
        const currentOpenedBoxQuantity = parseInt(formData.openedBoxQuantity) || 0;
        
        const initialStock = parseInt(initialFormData.stock) || 0;
        const initialFullBoxes = parseInt(initialFormData.fullBoxes) || 0;
        const initialOpenedBoxQuantity = parseInt(initialFormData.openedBoxQuantity) || 0;
        
        return currentStock !== initialStock || 
               currentFullBoxes !== initialFullBoxes || 
               currentOpenedBoxQuantity !== initialOpenedBoxQuantity;
    };

    const handleUpdateStock = async () => {
        if (!productId) {
            Alert.error(tAlert('error') || 'Xəta!', t('product_must_be_saved_first') || 'Əvvəlcə məhsulu saxlayın');
            return;
        }

        setUpdatingStock(true);
        try {
            const payload = {
                type: 'ADJUSTMENT',
                fullBoxes: parseInt(formData.fullBoxes) || 0,
                openedBoxQuantity: parseInt(formData.openedBoxQuantity) || 0,
                note: 'Məhsul formundan stok yeniləməsi'
            };

            await productApi.updateStock(productId, payload);

            // Refresh product data
            const productResponse = await productApi.getById(productId);
            if (productResponse.success && productResponse.date) {
                const updatedProduct = productResponse.date;
                setFormData(prev => ({
                    ...prev,
                    stock: updatedProduct.stock,
                    fullBoxes: updatedProduct.fullBoxes || 0,
                    openedBoxQuantity: updatedProduct.openedBoxQuantity || 0
                }));
                if (setInitialFormData) {
                    setInitialFormData(prev => prev ? ({
                        ...prev,
                        stock: updatedProduct.stock,
                        fullBoxes: updatedProduct.fullBoxes || 0,
                        openedBoxQuantity: updatedProduct.openedBoxQuantity || 0
                    }) : prev);
                }
            }

            Alert.success(t('stock_updated') || 'Uğurlu!', t('stock_updated_text') || 'Stok uğurla yeniləndi');
        } catch (error) {
            console.error('Error updating stock:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || t('stock_update_error') || 'Stok yenilənərkən xəta baş verdi');
        } finally {
            setUpdatingStock(false);
        }
    };

    return {
        updatingStock,
        hasStockChanged,
        handleUpdateStock
    };
}

