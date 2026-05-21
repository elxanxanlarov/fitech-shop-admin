import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { MdPrint, MdArrowBack } from 'react-icons/md';
import IsmayilliReceiptBody from '../ismayilli/IsmayilliReceiptBody';
import {
    buildPaperConfig,
    DEFAULT_RECEIPT_PAPER_PRESET_ID,
    RECEIPT_PAPER_PRESETS,
    getPrintPageStyle,
} from '../../constants/ismayilliReceiptPaper';
import { formatCheckNumber } from '../../utils/ismayilliReceiptFormat';
import { saleApi, ismayilliApi, returnApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Alert from '../ui/Alert';

export default function SellerReceipt() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const saleId = searchParams.get('id');
    const store = (searchParams.get('store') || 'FITECH').toUpperCase();
    const type = (searchParams.get('type') || 'sale').toLowerCase();
    const returnIdParam = searchParams.get('returnId');
    const isReturn = type === 'return';
    const isIsmayilli = store === 'ISMAYILLI';

    const [sale, setSale] = useState(null);
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [presetId, setPresetId] = useState(DEFAULT_RECEIPT_PAPER_PRESET_ID);

    const paper = useMemo(() => buildPaperConfig(presetId), [presetId]);
    const printRef = useRef(null);

    useEffect(() => {
        const fetchAll = async () => {
            if (!saleId) {
                Alert.error('Xəta', 'Satış ID tələb olunur');
                navigate('/seller/history');
                return;
            }
            setLoading(true);
            try {
                if (isIsmayilli) {
                    const saleRes = await ismayilliApi.getSaleById(saleId);
                    if (!saleRes?.success || !saleRes?.data) {
                        Alert.error('Tapılmadı', 'Satış tapılmadı');
                        navigate('/seller/history');
                        return;
                    }
                    setSale(saleRes.data);
                    try {
                        const retRes = await ismayilliApi.getReturnsBySaleId(saleId);
                        if (retRes?.success && retRes?.data) setReturns(retRes.data);
                    } catch {
                        /* ignore */
                    }
                } else {
                    const saleRes = await saleApi.getById(saleId);
                    if (!saleRes?.success || !saleRes?.data) {
                        Alert.error('Tapılmadı', 'Satış tapılmadı');
                        navigate('/seller/history');
                        return;
                    }
                    setSale(saleRes.data);
                    try {
                        const retRes = await returnApi.getBySaleId(saleId);
                        if (retRes?.success) {
                            // returnApi may return data under `data` or `date`
                            const list = retRes.data || retRes.date || [];
                            setReturns(list);
                        }
                    } catch {
                        /* ignore */
                    }
                }
            } catch (e) {
                console.error('receipt load error', e);
                Alert.error('Xəta', 'Çek yüklənərkən xəta baş verdi');
                navigate('/seller/history');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [saleId, navigate, isIsmayilli]);

    // Title for the document (used by print)
    useEffect(() => {
        const prev = document.title;
        const num = sale ? formatCheckNumber(sale.checkNumber, sale.id) : '';
        document.title = sale ? `${isReturn ? 'Qaytarma' : 'Satış'} çeki ${num}` : 'Çek';
        return () => {
            document.title = prev;
        };
    }, [sale, isReturn]);

    // Build the synthetic "sale" shape that IsmayilliReceiptBody expects for either case.
    const receiptSale = useMemo(() => {
        if (!sale) return null;
        const sellerName = `${user?.name || ''} ${user?.surName || ''}`.trim() || null;
        const originalPaid = parseFloat(
            sale.paidAmount != null ? sale.paidAmount : sale.totalAmount || 0
        );
        const originalTotal = parseFloat(sale.totalAmount || 0);

        // Bu satış üçün ümumilikdə qaytarılmış məbləğ.
        const totalReturnedOnSale = (returns || []).reduce(
            (sum, r) => sum + parseFloat(r.returnedAmount ?? r.totalAmount ?? 0),
            0
        );

        if (!isReturn) {
            return {
                id: sale.id,
                checkNumber: sale.checkNumber,
                createdAt: sale.createdAt,
                totalAmount: originalTotal,
                paidAmount: originalPaid,
                returnedAmount: totalReturnedOnSale, // varsa "Qaytarılmalı: -X" göstərilir
                customerName: sale.customerName || null,
                customerSurname: sale.customerSurname || null,
                sellerName,
                items: (sale.items || []).map((it) => ({
                    id: it.id,
                    product: it.product || { name: it.name, barcode: it.barcode },
                    quantity: it.quantity,
                    pricePerItem: it.pricePerItem,
                    totalPrice:
                        it.totalPrice ??
                        parseFloat(it.quantity || 0) * parseFloat(it.pricePerItem || 0),
                })),
            };
        }

        // Return case — pick the specific return (or the most recent one)
        const ret =
            (returnIdParam && returns.find((r) => r.id === returnIdParam)) ||
            returns[0] ||
            null;
        if (!ret) return null;

        const returnedTotal = parseFloat(ret.returnedAmount ?? ret.totalAmount ?? 0);
        return {
            id: ret.id,
            checkNumber: ret.checkNumber ?? sale.checkNumber,
            createdAt: ret.createdAt,
            totalAmount: returnedTotal,
            // "Nəğd:" sətri orijinal satışın ödənişini göstərir.
            paidAmount: originalPaid,
            // Bu konkret qaytarmanın məbləği — "Qaytarılmalı: -X" göstərilir.
            returnedAmount: returnedTotal,
            // Çekdə orijinal satış məbləğini də göstərmək üçün.
            originalSaleAmount: originalTotal,
            customerName: ret.customerName || sale.customerName || null,
            customerSurname: ret.customerSurname || sale.customerSurname || null,
            sellerName,
            items: (ret.items || []).map((it) => ({
                id: it.id,
                product:
                    it.product || it.saleItem?.product || { name: it.name, barcode: it.barcode },
                quantity: it.quantity,
                pricePerItem: it.pricePerItem,
                totalPrice:
                    it.totalPrice ??
                    parseFloat(it.quantity || 0) * parseFloat(it.pricePerItem || 0),
            })),
        };
    }, [sale, returns, returnIdParam, isReturn, user]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: receiptSale
            ? `Cek-${formatCheckNumber(receiptSale.checkNumber, receiptSale.id)}`
            : 'Cek',
        pageStyle: getPrintPageStyle(paper),
    });

    const handleBack = () => navigate('/seller/history');

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
                    <p className="mt-3 text-sm text-slate-500">Yüklənir...</p>
                </div>
            </div>
        );
    }

    if (!sale || !receiptSale) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-sm text-slate-500">
                        {isReturn
                            ? 'Qaytarma tapılmadı. Satış üzrə qaytarma qeydi yoxdur.'
                            : 'Çek tapılmadı.'}
                    </p>
                    <button
                        type="button"
                        onClick={handleBack}
                        className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
                    >
                        <MdArrowBack className="w-4 h-4" />
                        Geri qayıt
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {/* Action bar (hidden when printing) */}
            <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
                >
                    <MdArrowBack className="w-4 h-4" />
                    Geri
                </button>

                {/* Paper size presets */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {Object.values(RECEIPT_PAPER_PRESETS).map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setPresetId(p.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                presetId === p.id
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => handlePrint()}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold shadow-md"
                >
                    <MdPrint className="w-4 h-4" />
                    Çap et
                </button>
            </div>

            {/* Receipt preview */}
            <div className="py-6 print:py-0 flex justify-center">
                <div
                    className="bg-white shadow-md print:shadow-none"
                    style={{ width: `${paper.widthMm}mm`, maxWidth: '100%' }}
                >
                    <div ref={printRef} id="seller-receipt-print">
                        <IsmayilliReceiptBody
                            sale={receiptSale}
                            type={isReturn ? 'return' : 'sale'}
                            paper={paper}
                        />
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
                    body * { visibility: hidden; }
                    #seller-receipt-print, #seller-receipt-print * { visibility: visible; }
                    #seller-receipt-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
}
