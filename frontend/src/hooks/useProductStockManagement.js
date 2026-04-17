import { useState } from 'react';
import Alert from '../components/ui/Alert';
import { stockApi, productApi } from '../api';
import { useBranch } from '../context/BranchContext';

export function useProductStockManagement(productId, formData, setFormData, t, tAlert) {
    const [stockQuantity, setStockQuantity] = useState('');
    const [stockBoxes, setStockBoxes] = useState('');
    const [stockPieces, setStockPieces] = useState('');
    const [stockNote, setStockNote] = useState('');
    const [stockMovementType, setStockMovementType] = useState('OUT');
    const [processingStock, setProcessingStock] = useState(false);
    const [showStockManagement, setShowStockManagement] = useState(false);
    const { selectedBranchId } = useBranch();

    const handleStockMovement = async () => {
        if (!productId) {
            Alert.error(tAlert('error') || 'Xəta!', t('product_must_be_saved_first') || 'Əvvəlcə məhsulu saxlayın');
            return;
        }

        if (!stockMovementType) {
            Alert.error(tAlert('error') || 'Xəta!', t('movement_type_required') || 'Hərəkət növü seçilməlidir');
            return;
        }

        // Calculate quantity based on unit type
        let finalQuantity = 0;
        const unitType = formData.unitType || 'PIECE';
        const piecesPerBox = formData.piecesPerBox || 1;

        if (unitType === 'PIECE') {
            if (!stockQuantity || parseInt(stockQuantity) <= 0) {
                Alert.error(tAlert('error') || 'Xəta!', t('quantity_required') || 'Miqdar tələb olunur və 0-dan böyük olmalıdır');
                return;
            }
            finalQuantity = parseInt(stockQuantity);
            
            // For OUT, check if quantity exceeds current stock
            if (stockMovementType === 'OUT') {
                const currentStock = parseInt(formData.stock) || 0;
                if (finalQuantity > currentStock) {
                    Alert.error(tAlert('error') || 'Xəta!', t('quantity_exceeds_stock') || `Miqdar cari stokdan (${currentStock}) çox ola bilməz`);
                    return;
                }
            }
        } else {
            // For BOX, LITER, METER, KILOGRAM - use boxes and pieces
            const boxes = parseInt(stockBoxes) || 0;
            const pieces = parseInt(stockPieces) || 0;
            
            if (boxes === 0 && pieces === 0) {
                Alert.error(tAlert('error') || 'Xəta!', t('quantity_required') || 'Miqdar tələb olunur və 0-dan böyük olmalıdır');
                return;
            }

            // For OUT, check if pieces are valid
            if (stockMovementType === 'OUT' && pieces >= piecesPerBox) {
                Alert.error(tAlert('error') || 'Xəta!', `Açıq miqdar ${piecesPerBox}-dən az olmalıdır`);
                return;
            }

            finalQuantity = (boxes * piecesPerBox) + pieces;
            
            // For OUT, check if quantity exceeds current stock
            if (stockMovementType === 'OUT') {
                const fullBoxes = parseInt(formData.fullBoxes) || 0;
                const openedQuantity = parseInt(formData.openedBoxQuantity) || 0;
                const currentStock = (fullBoxes * piecesPerBox) + openedQuantity;
                if (finalQuantity > currentStock) {
                    Alert.error(tAlert('error') || 'Xəta!', t('quantity_exceeds_stock') || `Miqdar cari stokdan (${currentStock}) çox ola bilməz`);
                    return;
                }
            }
        }

        setProcessingStock(true);
        try {
            await stockApi.create({
                productId,
                type: stockMovementType,
                quantity: finalQuantity,
                note: stockNote.trim() || null,
                branchId: (selectedBranchId && selectedBranchId !== 'central') ? selectedBranchId : null
            });

            // Refresh product data to get updated stock
            const productResponse = await productApi.getById(productId, { branchId: selectedBranchId });
            if (productResponse.success && productResponse.date) {
                const updatedProduct = productResponse.date;
                setFormData(prev => ({
                    ...prev,
                    stock: updatedProduct.stock,
                    fullBoxes: updatedProduct.fullBoxes || 0,
                    openedBoxQuantity: updatedProduct.openedBoxQuantity || 0
                }));
            }

            // Reset form
            setStockQuantity('');
            setStockBoxes('');
            setStockPieces('');
            setStockNote('');
            setShowStockManagement(false);

            Alert.success(t('stock_movement_success') || 'Uğurlu!', t('stock_movement_success_text') || 'Stok hərəkəti uğurla yaradıldı');
        } catch (error) {
            console.error('Error creating stock movement:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || t('stock_movement_error') || 'Stok hərəkəti yaradılarkən xəta baş verdi');
        } finally {
            setProcessingStock(false);
        }
    };

    return {
        stockQuantity,
        stockBoxes,
        stockPieces,
        stockNote,
        stockMovementType,
        processingStock,
        showStockManagement,
        setStockQuantity,
        setStockBoxes,
        setStockPieces,
        setStockNote,
        setStockMovementType,
        setShowStockManagement,
        handleStockMovement
    };
}

