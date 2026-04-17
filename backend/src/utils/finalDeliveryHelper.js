/**
 * Məhsulun mərkəz və ya filial üzrə cari stok məlumatlarını qaytarır.
 */
export const resolveProductStock = (product, branchId) => {
    let stock = product.stock || 0;
    let fullBoxes = product.fullBoxes || 0;
    let openedBoxQuantity = product.openedBoxQuantity || 0;

    if (branchId && branchId !== 'central') {
        const bStock = product.branchStocks?.find(bs => bs.branchId === branchId);
        if (bStock) {
            stock = bStock.stock || 0;
            fullBoxes = bStock.fullBoxes || 0;
            openedBoxQuantity = bStock.openedBoxQuantity || 0;
        } else {
            stock = 0;
            fullBoxes = 0;
            openedBoxQuantity = 0;
        }
    }

    return { stock, fullBoxes, openedBoxQuantity };
};

/**
 * Başlanğıc və son tarixə əsasən Yekun Təslimat üçün başlıq yaradır.
 */
export const formatDeliveryTitle = (startDate, endDate) => {
    const months = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
        'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];

    const formatDate = (date) => {
        const d = new Date(date);
        return `${months[d.getMonth()]} ${d.getDate()} (${d.getFullYear()})`;
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};
