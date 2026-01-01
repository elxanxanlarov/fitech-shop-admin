import { Prisma } from "@prisma/client";

/**
 * Məhsulun stokunu hesablayır (tam qutular + açıq qutu)
 * @param {Object} product - Product object
 * @returns {number} - Ümumi stok miqdarı
 */
export const calculateProductStock = (product) => {
    const unitType = product.unitType || 'PIECE';
    const fullBoxes = product.fullBoxes || 0;
    const piecesPerBox = product.piecesPerBox;
    const openedBoxQuantity = product.openedBoxQuantity || 0;

    // Əgər PIECE-dirsə, sadəcə stock-u qaytar
    if (unitType === 'PIECE') {
        return product.stock || 0;
    }

    // BOX, LITER, METER, KILOGRAM üçün hesabla
    if (piecesPerBox && piecesPerBox > 0) {
        return (fullBoxes * piecesPerBox) + openedBoxQuantity;
    }

    return product.stock || 0;
};

/**
 * Məhsuldan stok çıxarır (qutu/ədəd məntiqinə uyğun)
 * @param {Object} product - Product object
 * @param {number} quantity - Çıxarılan miqdar
 * @returns {Object} - Yeni fullBoxes və openedBoxQuantity dəyərləri
 */
export const decreaseProductStock = (product, quantity) => {
    const unitType = product.unitType || 'PIECE';
    let fullBoxes = product.fullBoxes || 0;
    let openedBoxQuantity = product.openedBoxQuantity || 0;
    let stock = product.stock || 0;

    // Əgər PIECE-dirsə, sadəcə stock azalt
    if (unitType === 'PIECE') {
        return {
            stock: Math.max(0, stock - quantity),
            fullBoxes: fullBoxes,
            openedBoxQuantity: 0
        };
    }

    // BOX, LITER, METER, KILOGRAM üçün
    const piecesPerBox = product.piecesPerBox;
    if (!piecesPerBox || piecesPerBox <= 0) {
        // Əgər piecesPerBox yoxdursa, sadəcə stock azalt
        return {
            stock: Math.max(0, stock - quantity),
            fullBoxes: fullBoxes,
            openedBoxQuantity: openedBoxQuantity
        };
    }

    let remainingQuantity = quantity;

    // Əvvəlcə açıq qutudan çıx
    if (openedBoxQuantity > 0 && remainingQuantity > 0) {
        if (openedBoxQuantity >= remainingQuantity) {
            openedBoxQuantity -= remainingQuantity;
            remainingQuantity = 0;
        } else {
            remainingQuantity -= openedBoxQuantity;
            openedBoxQuantity = 0;
        }
    }

    // Əgər hələ də miqdar qalıbsa, tam qutulardan çıx
    if (remainingQuantity > 0 && fullBoxes > 0) {
        const boxesNeeded = Math.ceil(remainingQuantity / piecesPerBox);
        
        if (boxesNeeded <= fullBoxes) {
            // Kifayət qədər qutu var
            fullBoxes -= boxesNeeded;
            const openedFromBox = remainingQuantity % piecesPerBox;
            
            // Əgər qalan miqdar varsa, yeni açıq qutu yarat
            if (openedFromBox > 0) {
                openedBoxQuantity = piecesPerBox - openedFromBox;
                // Yeni qutu açdıqda, bir qutu azalt
                fullBoxes = Math.max(0, fullBoxes - 1);
            }
        } else {
            // Kifayət qədər qutu yoxdur - bütün qutuları çıx və açıq qutu miqdarını hesabla
            const totalPieces = (fullBoxes * piecesPerBox) + openedBoxQuantity;
            const remainingAfterSale = totalPieces - quantity;
            
            if (remainingAfterSale < 0) {
                // Stokda kifayət qədər məhsul yoxdur
                throw new Error(`Stokda kifayət qədər məhsul yoxdur. Mövcud stok: ${totalPieces}, tələb olunan: ${quantity}`);
            }
            
            fullBoxes = Math.floor(remainingAfterSale / piecesPerBox);
            openedBoxQuantity = remainingAfterSale % piecesPerBox;
        }
    } else if (remainingQuantity > 0) {
        // Tam qutu yoxdur və açıq qutu da bitib - stokda kifayət qədər məhsul yoxdur
        throw new Error(`Stokda kifayət qədər məhsul yoxdur. Mövcud stok: ${(fullBoxes * piecesPerBox) + openedBoxQuantity}, tələb olunan: ${quantity}`);
    }

    // Yeni stock hesabla
    stock = (fullBoxes * piecesPerBox) + openedBoxQuantity;

    return {
        stock,
        fullBoxes,
        openedBoxQuantity
    };
};

/**
 * Məhsula stok əlavə edir (qutu/ədəd məntiqinə uyğun)
 * @param {Object} product - Product object
 * @param {number} quantity - Əlavə edilən miqdar
 * @returns {Object} - Yeni fullBoxes və openedBoxQuantity dəyərləri
 */
export const increaseProductStock = (product, quantity) => {
    const unitType = product.unitType || 'PIECE';
    let fullBoxes = product.fullBoxes || 0;
    let openedBoxQuantity = product.openedBoxQuantity || 0;
    let stock = product.stock || 0;

    // Əgər PIECE-dirsə, sadəcə stock artır
    if (unitType === 'PIECE') {
        return {
            stock: stock + quantity,
            fullBoxes: fullBoxes,
            openedBoxQuantity: 0
        };
    }

    // BOX, LITER, METER, KILOGRAM üçün
    const piecesPerBox = product.piecesPerBox;
    if (!piecesPerBox || piecesPerBox <= 0) {
        // Əgər piecesPerBox yoxdursa, sadəcə stock artır
        return {
            stock: stock + quantity,
            fullBoxes: fullBoxes,
            openedBoxQuantity: openedBoxQuantity
        };
    }

    // Açıq qutuya əlavə et
    openedBoxQuantity += quantity;

    // Əgər açıq qutu tam dolubsa, tam qutuya çevir
    const newFullBoxes = Math.floor(openedBoxQuantity / piecesPerBox);
    if (newFullBoxes > 0) {
        fullBoxes += newFullBoxes;
        openedBoxQuantity = openedBoxQuantity % piecesPerBox;
    }

    // Yeni stock hesabla
    stock = (fullBoxes * piecesPerBox) + openedBoxQuantity;

    return {
        stock,
        fullBoxes,
        openedBoxQuantity
    };
};

/**
 * Məhsulun qiymətini hesablayır (qutu/ədəd məntiqinə uyğun)
 * @param {Object} product - Product object
 * @param {number} quantity - Satılan miqdar (ədəd/litr/metr)
 * @returns {number} - Ümumi qiymət
 */
export const calculateProductPrice = (product, quantity) => {
    const unitType = product.unitType || 'PIECE';
    const salePrice = parseFloat(product.salePrice || 0);
    const boxPrice = product.boxPrice ? parseFloat(product.boxPrice) : null;
    const piecesPerBox = product.piecesPerBox;

    // Endirim qiyməti varsa onu istifadə et
    const finalSalePrice = product.hasDiscount && product.discountPrice
        ? parseFloat(product.discountPrice)
        : salePrice;

    // Əgər PIECE-dirsə, sadəcə ədəd qiyməti
    if (unitType === 'PIECE') {
        return finalSalePrice * quantity;
    }

    // BOX, LITER, METER, KILOGRAM üçün
    // Əgər boxPrice varsa və quantity tam qutudursa, boxPrice istifadə et
    if (boxPrice && piecesPerBox && quantity >= piecesPerBox && quantity % piecesPerBox === 0) {
        const boxes = quantity / piecesPerBox;
        return boxPrice * boxes;
    }

    // Əks halda, ədəd qiymətindən hesabla
    if (piecesPerBox && boxPrice) {
        // Qarışıq: tam qutular + açıq ədədlər
        const boxes = Math.floor(quantity / piecesPerBox);
        const pieces = quantity % piecesPerBox;
        return (boxPrice * boxes) + (finalSalePrice * pieces);
    }

    // Default: ədəd qiyməti
    return finalSalePrice * quantity;
};

