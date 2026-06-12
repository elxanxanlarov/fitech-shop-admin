import React, { useRef, useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const ExcelPrintModal = ({ isOpen, onClose, items = [], fileName = '' }) => {
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Excel_Hesabati_${fileName ? fileName.replace(/\.(xlsx|xls)$/i, '') : new Date().toISOString().slice(0, 10)}`,
    });

    const summary = useMemo(() => {
        let totalQty = 0;
        let totalSale = 0;
        let totalPurchase = 0;
        for (const it of items) {
            const q = Number(it.quantity || 0);
            const sp = Number(it.salePrice || 0);
            const pp = Number(it.purchasePrice || 0);
            totalQty += q;
            totalSale += q * sp;
            totalPurchase += q * pp;
        }
        return {
            totalQty,
            totalSale,
            totalPurchase,
            itemCount: items.length,
            profit: totalSale - totalPurchase
        };
    }, [items]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Excel Hesabatı</h2>
                            <p className="text-xs text-gray-500">
                                {summary.itemCount} sətir · {summary.totalQty} ədəd
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                    <div className="bg-white shadow-sm mx-auto overflow-auto" style={{ maxWidth: '210mm' }}>
                        <div id="printable-excel-area" ref={printRef} className="p-8 text-black font-serif bg-white" style={{ width: '210mm', margin: '0 auto', fontSize: '11pt' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-red-600 font-bold text-xl italic">Fitechnlogy MMC</div>
                                <div className="text-right">
                                    <div className="font-bold">Tarix: {new Date().toLocaleDateString('az-AZ')}</div>
                                    {fileName && <div className="text-xs text-gray-600">Fayl: {fileName}</div>}
                                </div>
                            </div>

                            <div className="text-center mb-4">
                                <h1 className="text-xl font-bold underline uppercase tracking-widest">
                                    Məhsul Hesabatı
                                </h1>
                            </div>

                            {/* Ümumi xülasə */}
                            <div className="summary-cards grid grid-cols-4 gap-2 mb-4 text-xs">
                                <div className="border border-black p-2">
                                    <div className="font-bold text-gray-600 text-[10px] uppercase">Ümumi Miqdar</div>
                                    <div className="text-base font-bold">{summary.totalQty}</div>
                                </div>
                                <div className="border border-black p-2">
                                    <div className="font-bold text-gray-600 text-[10px] uppercase">Alış Cəmi</div>
                                    <div className="text-base font-bold">{summary.totalPurchase.toFixed(2)} AZN</div>
                                </div>
                                <div className="border border-black p-2">
                                    <div className="font-bold text-gray-600 text-[10px] uppercase">Satış Cəmi</div>
                                    <div className="text-base font-bold">{summary.totalSale.toFixed(2)} AZN</div>
                                </div>
                                <div className="border border-black p-2">
                                    <div className="font-bold text-gray-600 text-[10px] uppercase">Qazanc</div>
                                    <div className="text-base font-bold">{summary.profit.toFixed(2)} AZN</div>
                                </div>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 italic">Heç bir məlumat yoxdur</div>
                            ) : (
                                <table className="w-full border-collapse border border-black text-[10pt] print-table">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black px-2 py-1 text-center w-10">S/s</th>
                                            <th className="border border-black px-2 py-1 text-center w-20">Kod</th>
                                            <th className="border border-black px-2 py-1 text-left">Malın adı</th>
                                            <th className="border border-black px-2 py-1 text-center w-16">Vahid</th>
                                            <th className="border border-black px-2 py-1 text-center w-14">Miqdar</th>
                                            <th className="border border-black px-2 py-1 text-center w-20">Alış qiyməti</th>
                                            <th className="border border-black px-2 py-1 text-center w-20">Satış qiyməti</th>
                                            <th className="border border-black px-2 py-1 text-center w-24">Alış cəmi</th>
                                            <th className="border border-black px-2 py-1 text-center w-24">Satış cəmi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => {
                                            const q = Number(item.quantity || 0);
                                            const sp = Number(item.salePrice || 0);
                                            const pp = Number(item.purchasePrice || 0);
                                            return (
                                                <tr key={idx}>
                                                    <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                                                    <td className="border border-black px-2 py-1 text-center">{item.code || '-'}</td>
                                                    <td className="border border-black px-2 py-1">{item.name || '-'}</td>
                                                    <td className="border border-black px-2 py-1 text-center">{item.unit || 'ƏDƏD'}</td>
                                                    <td className="border border-black px-2 py-1 text-center">{q}</td>
                                                    <td className="border border-black px-2 py-1 text-center">{pp.toFixed(2)}</td>
                                                    <td className="border border-black px-2 py-1 text-center">{sp.toFixed(2)}</td>
                                                    <td className="border border-black px-2 py-1 text-center">{(q * pp).toFixed(2)}</td>
                                                    <td className="border border-black px-2 py-1 text-center">{(q * sp).toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="font-bold bg-gray-50">
                                            <td colSpan="4" className="border border-black px-2 py-1 text-right italic">Cəmi:</td>
                                            <td className="border border-black px-2 py-1 text-center">{summary.totalQty}</td>
                                            <td className="border border-black px-2 py-1"></td>
                                            <td className="border border-black px-2 py-1"></td>
                                            <td className="border border-black px-2 py-1 text-center">{summary.totalPurchase.toFixed(2)}</td>
                                            <td className="border border-black px-2 py-1 text-center">{summary.totalSale.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}

                            {items.length > 0 && (
                                <div className="mt-6 pt-4 border-t-2 border-black grand-total">
                                    <table className="w-full border-collapse border border-black text-sm">
                                        <tbody>
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="border border-black px-2 py-2 text-right">YEKUN MİQDAR:</td>
                                                <td className="border border-black px-2 py-2 text-center w-32">{summary.totalQty}</td>
                                                <td className="border border-black px-2 py-2 text-right">YEKUN ALIŞ:</td>
                                                <td className="border border-black px-2 py-2 text-center w-32">{summary.totalPurchase.toFixed(2)} AZN</td>
                                            </tr>
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="border border-black px-2 py-2 text-right">YEKUN SATIŞ:</td>
                                                <td className="border border-black px-2 py-2 text-center">{summary.totalSale.toFixed(2)} AZN</td>
                                                <td className="border border-black px-2 py-2 text-right">QAZANC:</td>
                                                <td className="border border-black px-2 py-2 text-center">{summary.profit.toFixed(2)} AZN</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all"
                    >
                        Ləğv Et
                    </button>
                    <button
                        onClick={() => handlePrint()}
                        disabled={items.length === 0}
                        className="flex items-center gap-2 px-8 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Printer className="w-4 h-4" />
                        Çap Et / PDF
                    </button>
                </div>
            </div>

            <style>
                {`
                @media print {
                  @page {
                    size: A4;
                    margin: 10mm 8mm;
                  }
                  html, body { height: auto !important; }
                  body { visibility: hidden; margin: 0 !important; padding: 0 !important; }
                  #printable-excel-area, #printable-excel-area * { visibility: visible; }
                  #printable-excel-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0 !important;
                    margin: 0 !important;
                    visibility: visible;
                    display: block !important;
                  }
                  tr { page-break-inside: avoid; break-inside: avoid; }
                  thead { display: table-header-group; }
                  .grand-total {
                    page-break-inside: avoid;
                    break-inside: avoid;
                    margin-top: 10px !important;
                  }
                  .summary-cards { page-break-inside: avoid; break-inside: avoid; }
                  .print-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                  }
                  .print-table th, .print-table td { border: 1px solid black !important; }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
                `}
            </style>
        </div>
    );
};

export default ExcelPrintModal;
