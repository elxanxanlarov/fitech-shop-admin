import React from 'react';
import ProductStockStatus from './ProductStockStatus';
import ProductStockManagement from './ProductStockManagement';

export default function ProductStockSection({
    formData,
    isEditMode,
    productId,
    showStockManagement,
    stockQuantity,
    stockBoxes,
    stockPieces,
    stockNote,
    stockMovementType,
    processingStock,
    onInputChange,
    onToggleStockManagement,
    onStockQuantityChange,
    onStockBoxesChange,
    onStockPiecesChange,
    onStockNoteChange,
    onStockMovementTypeChange,
    onStockMovement,
    onShowHistoryModal
}) {
    // Calculate current stock for display
    const calculateCurrentStock = () => {
        if (formData.unitType === 'PIECE' || !formData.unitType) {
            return formData.stock || 0;
        }
        const piecesPerBox = parseInt(formData.piecesPerBox) || 1;
        const fullBoxes = parseInt(formData.fullBoxes) || 0;
        const openedQuantity = parseInt(formData.openedBoxQuantity) || 0;
        return (fullBoxes * piecesPerBox) + openedQuantity;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ProductStockStatus
                formData={formData}
                isEditMode={isEditMode}
                onInputChange={onInputChange}
                onToggleStockManagement={onToggleStockManagement}
                showStockManagement={showStockManagement}
            />

            {/* Stock Management Section */}
            {isEditMode && showStockManagement && (
                <ProductStockManagement
                    formData={formData}
                    isEditMode={isEditMode}
                    productId={productId}
                    stockQuantity={stockQuantity}
                    stockBoxes={stockBoxes}
                    stockPieces={stockPieces}
                    stockNote={stockNote}
                    stockMovementType={stockMovementType}
                    processingStock={processingStock}
                    currentStock={calculateCurrentStock()}
                    onStockQuantityChange={onStockQuantityChange}
                    onStockBoxesChange={onStockBoxesChange}
                    onStockPiecesChange={onStockPiecesChange}
                    onStockNoteChange={onStockNoteChange}
                    onStockMovementTypeChange={onStockMovementTypeChange}
                    onStockMovement={onStockMovement}
                    onShowHistoryModal={onShowHistoryModal}
                />
            )}
        </div>
    );
}

