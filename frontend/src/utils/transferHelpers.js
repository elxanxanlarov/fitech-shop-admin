/**
 * transferHelpers.js
 * Shared helpers for stock-transfer status display.
 */

/**
 * Returns Azerbaijani label + Tailwind colour classes for a transfer status.
 *
 * @param {'PENDING'|'COMPLETED'|'CANCELLED'|string} status
 * @returns {{ label: string, badgeCls: string, textCls: string, iconCls: string }}
 */
export function transferStatusInfo(status) {
    switch (status) {
        case 'COMPLETED':
            return {
                label:     'Tamamlandı',
                badgeCls:  'bg-green-100 text-green-800 border border-green-200',
                textCls:   'text-green-700',
                iconCls:   'text-green-500',
            };
        case 'CANCELLED':
            return {
                label:     'Ləğv edildi',
                badgeCls:  'bg-red-100 text-red-800 border border-red-200',
                textCls:   'text-red-700',
                iconCls:   'text-red-500',
            };
        case 'PENDING':
        default:
            return {
                label:     'Gözləmədədir',
                badgeCls:  'bg-amber-100 text-amber-800 border border-amber-200',
                textCls:   'text-amber-700',
                iconCls:   'text-amber-500',
            };
    }
}
