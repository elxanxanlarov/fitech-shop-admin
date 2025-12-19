// Azərbaycan dilində ay adları
export const months = {
    az: [
        'Yanvar',
        'Fevral',
        'Mart',
        'Aprel',
        'May',
        'İyun',
        'İyul',
        'Avqust',
        'Sentyabr',
        'Oktyabr',
        'Noyabr',
        'Dekabr'
    ],
    en: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ]
};

// Ay nömrəsindən ay adını almaq
export const getMonthName = (monthIndex, language = 'az') => {
    const monthNames = months[language] || months.az;
    return monthNames[monthIndex] || '';
};

// Tarixdən ay adını almaq
export const getMonthNameFromDate = (date, language = 'az') => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const monthIndex = dateObj.getMonth();
    return getMonthName(monthIndex, language);
};

// Tarix və il ilə tam format
export const getFullMonthYear = (date, language = 'az') => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const monthName = getMonthNameFromDate(dateObj, language);
    const year = dateObj.getFullYear();
    return `${monthName} ${year}`;
};

