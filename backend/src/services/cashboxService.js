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
 * @param {{ excludeHandoverId?: string, store?: 'FITECH'|'ISMAYILLI' }} [opts]
 *   - excludeHandoverId: update zamanı cari id xaric et
 *   - store: hansı mağaza (default FITECH)
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
    // Backward compat: əgər branchFilter-in özündə `store` property varsa onu götür
    const { store: storeFromFilter, ...pureBranchFilter } = branchFilter;
    branchFilter = pureBranchFilter;
    const storeUpper = String(opts.store || storeFromFilter || 'FITECH').toUpperCase();

    // İsmayıllı: ayrı table-lar, branch və paymentType-dən asılı deyil
    if (storeUpper === 'ISMAYILLI') {
        const [salesAgg, returnsAgg, expensesAgg, handoversAgg] = await Promise.all([
            prisma.ismayilliSale.aggregate({
                where: { isRefunded: false },
                _sum: { paidAmount: true },
            }),
            prisma.ismayilliSaleReturn.aggregate({
                _sum: { returnedAmount: true },
            }),
            prisma.expense.aggregate({
                where: { deleteType: 'NONE', store: 'ISMAYILLI', ...branchFilter },
                _sum: { amount: true },
            }),
            prisma.cashhandover.aggregate({
                where: {
                    deleteType: 'NONE',
                    store: 'ISMAYILLI',
                    ...branchFilter,
                    ...(excludeHandoverId ? { id: { not: excludeHandoverId } } : {}),
                },
                _sum: { amount: true },
            }),
        ]);

        const cashSales = Number(salesAgg._sum.paidAmount || 0);
        const creditPayments = 0;
        const returns = Number(returnsAgg._sum.returnedAmount || 0);
        const expenses = Number(expensesAgg._sum.amount || 0);
        const handovers = Number(handoversAgg._sum.amount || 0);

        const cashIn = cashSales + creditPayments;
        const cashOut = returns + expenses;
        const balance = Math.round((cashIn - cashOut - handovers) * 100) / 100;

        return { balance, cashSales, creditPayments, returns, expenses, handovers, cashIn, cashOut };
    }

    // FITECH (default)
    const [
        salesAgg,
        creditAgg,
        returnsAgg,
        expensesAgg,
        handoversAgg,
    ] = await Promise.all([

        prisma.sale.aggregate({
            where: {
                deleteType: 'NONE',
                isRefunded: false,
                paymentType: 'cash',
                store: 'FITECH',
                ...branchFilter,
            },
            _sum: { paidAmount: true },
        }),

        prisma.creditpayment.aggregate({
            where: {
                paymentType: 'cash',
                sale: { deleteType: 'NONE', store: 'FITECH', ...branchFilter },
            },
            _sum: { amount: true },
        }),

        prisma.salereturn.aggregate({
            where: {
                sale: {
                    paymentType: 'cash',
                    deleteType: 'NONE',
                    isRefunded: false,
                    store: 'FITECH',
                    ...branchFilter,
                },
            },
            _sum: { returnedAmount: true },
        }),

        prisma.expense.aggregate({
            where: { deleteType: 'NONE', store: 'FITECH', ...branchFilter },
            _sum: { amount: true },
        }),

        prisma.cashhandover.aggregate({
            where: {
                deleteType: 'NONE',
                store: 'FITECH',
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
