import { useCallback } from 'react';

export function useProductDiscountHandler(formData, setFormData) {
    const customDiscountHandler = useCallback((field, value) => {
        // Auto-calculate discount (qazanc üzərindən)
        // Qazanc = salePrice - purchasePrice
        // Endirim məbləği = Qazanc * (discountPercent / 100)
        // discountPrice = salePrice - Endirim məbləği
        // discountPrice >= purchasePrice olmalıdır

        const calculateDiscount = (purchasePrice, salePrice, discountPercent) => {
            if (!purchasePrice || !salePrice || purchasePrice <= 0 || salePrice <= 0) return null;
            if (salePrice <= purchasePrice) return null; // Qazanc yoxdursa endirim ola bilməz

            const profit = salePrice - purchasePrice; // Qazanc
            const discountAmount = profit * (discountPercent / 100); // Endirim məbləği
            let discountPrice = salePrice - discountAmount; // Endirim qiyməti

            // Endirim qiyməti maya dəyərindən az ola bilməz
            if (discountPrice < purchasePrice) {
                discountPrice = purchasePrice;
            }

            return discountPrice.toFixed(2);
        };

        const calculateDiscountPercent = (purchasePrice, salePrice, discountPrice) => {
            if (!purchasePrice || !salePrice || !discountPrice || purchasePrice <= 0 || salePrice <= 0 || discountPrice <= 0) return null;
            if (salePrice <= purchasePrice) return null; // Qazanc yoxdursa endirim ola bilməz
            if (discountPrice < purchasePrice) return null; // Endirim qiyməti maya dəyərindən az ola bilməz

            const profit = salePrice - purchasePrice; // Qazanc
            const discountAmount = salePrice - discountPrice; // Endirim məbləği
            const discountPercent = (discountAmount / profit) * 100; // Endirim faizi

            return discountPercent.toFixed(2);
        };

        if (field === 'hasDiscount' && value) {
            // Endirim aktiv edildikdə
        } else if (field === 'discountPercent' && formData.purchasePrice && formData.salePrice) {
            // Endirim faizi dəyişdikdə, endirim qiymətini hesabla
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const salePrice = parseFloat(formData.salePrice) || 0;
            const discountPercent = parseFloat(value) || 0;

            if (discountPercent > 0 && discountPercent <= 100 && purchasePrice > 0 && salePrice > purchasePrice) {
                const calculatedDiscountPrice = calculateDiscount(purchasePrice, salePrice, discountPercent);
                if (calculatedDiscountPrice) {
                    setFormData(prev => ({
                        ...prev,
                        discountPrice: calculatedDiscountPrice
                    }));
                }
            }
        } else if (field === 'discountPrice' && formData.purchasePrice && formData.salePrice) {
            // Endirim qiyməti dəyişdikdə, endirim faizini hesabla
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const salePrice = parseFloat(formData.salePrice) || 0;
            const discountPrice = parseFloat(value) || 0;

            if (discountPrice >= purchasePrice && salePrice > purchasePrice) {
                const calculatedDiscountPercent = calculateDiscountPercent(purchasePrice, salePrice, discountPrice);
                if (calculatedDiscountPercent) {
                    setFormData(prev => ({
                        ...prev,
                        discountPercent: calculatedDiscountPercent
                    }));
                }
            }
        } else if (field === 'purchasePrice' && formData.hasDiscount && formData.salePrice && formData.discountPercent) {
            // Maya dəyəri dəyişdikdə, endirim qiymətini yenilə
            const purchasePrice = parseFloat(value) || 0;
            const salePrice = parseFloat(formData.salePrice) || 0;
            const discountPercent = parseFloat(formData.discountPercent) || 0;

            if (discountPercent > 0 && purchasePrice > 0 && salePrice > purchasePrice) {
                const calculatedDiscountPrice = calculateDiscount(purchasePrice, salePrice, discountPercent);
                if (calculatedDiscountPrice) {
                    setFormData(prev => ({
                        ...prev,
                        discountPrice: calculatedDiscountPrice
                    }));
                }
            }
        } else if (field === 'salePrice' && formData.hasDiscount && formData.purchasePrice && formData.discountPercent) {
            // Satış qiyməti dəyişdikdə, endirim qiymətini yenilə
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const salePrice = parseFloat(value) || 0;
            const discountPercent = parseFloat(formData.discountPercent) || 0;

            if (discountPercent > 0 && purchasePrice > 0 && salePrice > purchasePrice) {
                const calculatedDiscountPrice = calculateDiscount(purchasePrice, salePrice, discountPercent);
                if (calculatedDiscountPrice) {
                    setFormData(prev => ({
                        ...prev,
                        discountPrice: calculatedDiscountPrice
                    }));
                }
            }
        }

        // Qutu qiyməti avtomatik hesabla (salePrice və piecesPerBox dəyişdikdə)
        const currentUnitType = field === 'unitType' ? value : formData.unitType;
        if ((field === 'salePrice' || field === 'piecesPerBox' || field === 'unitType') && currentUnitType !== 'PIECE') {
            const salePrice = field === 'salePrice' ? parseFloat(value) : parseFloat(formData.salePrice || 0);
            const piecesPerBox = field === 'piecesPerBox' ? parseInt(value) : (field === 'unitType' ? parseInt(value || 0) : parseInt(formData.piecesPerBox || 0));

            // Həmişə avtomatik hesabla
            if (salePrice > 0 && piecesPerBox > 0) {
                const calculatedBoxPrice = (salePrice * piecesPerBox).toFixed(2);
                setFormData(prev => ({
                    ...prev,
                    boxPrice: calculatedBoxPrice
                }));
            } else {
                // Əgər məlumat yoxdursa, boxPrice-u təmizlə
                setFormData(prev => ({
                    ...prev,
                    boxPrice: ''
                }));
            }
        }
    }, [formData, setFormData]);

    return {
        customDiscountHandler
    };
}

