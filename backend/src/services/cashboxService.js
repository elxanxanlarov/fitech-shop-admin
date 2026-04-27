/**
 * cashboxService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vahid kassa balansı hesablama xidməti.
 * Bu fayl bütün kassa hesablamalarını tək bir yerdə saxlayır.
 * statisticsController, cashHandoverController — hamısı buradan istifadə edir.
 *
 * FORMULA (bütün zamanlar, tarix filtri olmadan):
 *   Kassa = cashSales(paidAmount)
 *           + creditPayments(nəqd ödənişlər)
 *           - saleReturns(nəqd satışlara aid qaytarmalar)
 *           - expenses(bütün xərclər)
 *           - cashHandovers(bütün təslimatlar)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import prisma from '../lib/prisma.js';

/**
 * branchId dəyərindən Prisma filter obyekti qaytar.
 *
 * @param {string|null|undefined} branchId
 *   - undefined / null / ''  → bütün filiallar  {}
 *   - 'central'              → yalnız mərkəzi   { branchId: null }
 *   - '<uuid>'               → konkret filial   { branchId: '<uuid>' }
 * @returns {{ branchId?: string|null }}
 */
export function buildBranchFilter(branchId) {
    if (branchId && branchId !== 'central') {
        return { branchId };
    }
    if (branchId === 'central') {
        return { branchId: null };
    }
    return {}; // bütün filiallar
}

/**
 * Kassa balansını hesabla.
 *
 * @param {{ branchId?: string|null }} branchFilter  buildBranchFilter() nəticəsi
 * @param {{ excludeHandoverId?: string }} [opts]    update zamanı cari id xaric et
 * @returns {Promise<{
 *   balance: number,       // yekun kassa balansı (< 0 ola bilməz)
 *   cashSales: number,
 *   creditPayments: number,
 *   returns: number,
 *   expenses: number,
 *   handovers: number,
 *   cashIn: number,        // cashSales + creditPayments
 *   cashOut: number,       // returns + expenses
 * }>}
 */
export async function computeCashboxBalance(branchFilter = {}, opts = {}) {
    const { excludeHandoverId } = opts;

    const [
        salesAgg,
        creditAgg,
        returnsAgg,
        expensesAgg,
        handoversAgg,
    ] = await Promise.all([

        // 1. Nəğd satışlar — yalnız silinməmiş, qaytarılmamış, nəğd ödənişli
        prisma.sale.aggregate({
            where: {
                deleteType: 'NONE',
                isRefunded: false,
                paymentType: 'cash',
                ...branchFilter,
            },
            _sum: { paidAmount: true },
        }),

        // 2. Kredit ödənişləri — nəğd ödənilmiş, silinməmiş satışa aid
        prisma.creditpayment.aggregate({
            where: {
                paymentType: 'cash',
                sale: { deleteType: 'NONE', ...branchFilter },
            },
            _sum: { amount: true },
        }),

        // 3. Qaytarmalar — nəğd satışa aid, silinməmiş
        prisma.salereturn.aggregate({
            where: {
                sale: {
                    paymentType: 'cash',
                    deleteType: 'NONE',
                    isRefunded: false, // Only subtract from balance if original sale wasn't already excluded
                    ...branchFilter,
                },
            },
            _sum: { returnedAmount: true },
        }),

        // 4. Xərclər — silinməmiş
        prisma.expense.aggregate({
            where: { deleteType: 'NONE', ...branchFilter },
            _sum: { amount: true },
        }),

        // 5. Məbləğ Təslimatları — silinməmiş, (update zamanı cari id xaric)
        prisma.cashhandover.aggregate({
            where: {
                deleteType: 'NONE',
                ...branchFilter,
                ...(excludeHandoverId ? { id: { not: excludeHandoverId } } : {}),
            },
            _sum: { amount: true },
        }),
    ]);

    const cashSales      = Number(salesAgg._sum.paidAmount      || 0);
    const creditPayments = Number(creditAgg._sum.amount         || 0);
    const returns        = Number(returnsAgg._sum.returnedAmount || 0);
    const expenses       = Number(expensesAgg._sum.amount       || 0);
    const handovers      = Number(handoversAgg._sum.amount      || 0);

    const cashIn  = cashSales + creditPayments;
    const cashOut = returns + expenses;
    const balance = Math.round((cashIn - cashOut - handovers) * 100) / 100;

    return {
        balance,
        cashSales,
        creditPayments,
        returns,
        expenses,
        handovers,
        cashIn,
        cashOut,
    };
}
