import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Printer, Car, FileText, CheckCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const TransferPrintModal = ({ isOpen, onClose, transfer }) => {
    const { t } = useTranslation('branch');
    const [printType, setPrintType] = useState('sending'); // 'sending' or 'handover'
    const [transportInfo, setTransportInfo] = useState({
        marka: 'Ford Transit',
        qn: '31085'
    });
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: printType === 'sending' ? 'Filiala_Gonderme_Akti' : 'Tehvil_Teslim_Akti',
    });

    if (!isOpen || !transfer) return null;

    const items = transfer.items || [];
    const totalPrice = items.reduce((sum, item) => sum + (item.quantity * (item.product?.salePrice || 0)), 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{t('print_transfer_act') || 'Köçürmə Aktını Çap Et'}</h2>
                            <p className="text-xs text-gray-500">Akt tipini seçin və məlumatları yoxlayın</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar: Selection & Options */}
                    <div className="md:col-span-1 space-y-6 border-r border-gray-100 pr-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Akt Tipi</label>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => setPrintType('sending')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                                        printType === 'sending'
                                            ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                                            : 'border-gray-100 hover:border-gray-200 text-gray-600'
                                    }`}
                                >
                                    <FileText className="w-5 h-5" />
                                    <span className="font-bold text-sm">Filiala Göndərmə Aktı</span>
                                </button>
                                <button
                                    onClick={() => setPrintType('handover')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                                        printType === 'handover'
                                            ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                                            : 'border-gray-100 hover:border-gray-200 text-gray-600'
                                    }`}
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold text-sm">Təhvil-Təslim Aktı</span>
                                </button>
                            </div>
                        </div>

                        {printType === 'sending' && (
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <label className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                                    <Car className="w-3 h-3" />
                                    Nəqliyyat Məlumatları
                                </label>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">Vasilənin Markası</label>
                                        <input
                                            type="text"
                                            value={transportInfo.marka}
                                            onChange={(e) => setTransportInfo({ ...transportInfo, marka: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">Dövlət Qeydiyyat Nişanı (QN)</label>
                                        <input
                                            type="text"
                                            value={transportInfo.qn}
                                            onChange={(e) => setTransportInfo({ ...transportInfo, qn: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview Area */}
                    <div className="md:col-span-2 bg-gray-100 p-4 rounded-xl overflow-y-auto">
                        <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest text-center">Ön Baxış</div>
                        <div className="bg-white shadow-sm mx-auto overflow-x-auto min-w-[600px]">
                            {/* The actual printable component */}
                            <div ref={printRef} className="p-10 text-black font-serif" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: 'white' }}>
                                <div className="flex justify-between items-start mb-10">
                                    <div className="text-red-600 font-bold text-xl italic">Fitechnlogy MMC</div>
                                    <div className="font-bold">Tarix: {new Date(transfer.createdAt).toLocaleDateString('az-AZ')}</div>
                                </div>

                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-bold underline uppercase tracking-widest">
                                        {printType === 'sending' ? 'FILALA GONDERME AKTI' : 'Tehvil-Teslim AKTI'}
                                    </h1>
                                </div>

                                {printType === 'sending' && (
                                    <div className="space-y-2 mb-8 font-bold text-sm">
                                        <div>Göndərən Filial: <span className="font-normal underline ml-1">{transfer.fromBranch?.name || 'Mərkəzi Anbar'}</span></div>
                                        <div>Göndərilən Filial: <span className="font-normal underline ml-1">{transfer.toBranch?.name}</span></div>
                                        <div>Nəqliyyat vasitəsinin markası: <span className="font-normal underline ml-1">{transportInfo.marka}</span></div>
                                        <div>Nəqliyyat vasitəsinin QN: <span className="font-normal underline ml-1">{transportInfo.qn}</span></div>
                                    </div>
                                )}

                            <table className="w-full border-collapse border border-black mb-10 text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-black px-2 py-1 text-center w-12">S\s</th>
                                        <th className="border border-black px-2 py-1 text-left">Malın adı</th>
                                        <th className="border border-black px-2 py-1 text-center">Ölçü vahidi</th>
                                        <th className="border border-black px-2 py-1 text-center">Miqdarı</th>
                                        <th className="border border-black px-2 py-1 text-center">Qiyməti</th>
                                        <th className="border border-black px-2 py-1 text-center">Ümumi məbləğ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id}>
                                            <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                                            <td className="border border-black px-2 py-1">{item.product?.name}</td>
                                            <td className="border border-black px-2 py-1 text-center">{item.product?.unitType || 'ƏDƏD'}</td>
                                            <td className="border border-black px-2 py-1 text-center">{item.quantity}</td>
                                            <td className="border border-black px-2 py-1 text-center">{Number(item.product?.salePrice || 0).toFixed(2)}</td>
                                            <td className="border border-black px-2 py-1 text-center">{Number(item.quantity * (item.product?.salePrice || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {[...Array(Math.max(0, 4 - items.length))].map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-8">
                                            <td className="border border-black px-2 py-1 text-center">{items.length + i + 1}</td>
                                            <td className="border border-black px-2 py-1"></td>
                                            <td className="border border-black px-2 py-1"></td>
                                            <td className="border border-black px-2 py-1"></td>
                                            <td className="border border-black px-2 py-1"></td>
                                            <td className="border border-black px-2 py-1"></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-bold">
                                        <td colSpan="5" className="border border-black px-2 py-1 text-right italic">Cəmi:</td>
                                        <td className="border border-black px-2 py-1 text-center underline">{Number(totalPrice || 0).toFixed(2)} AZN</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-2 gap-20 mt-20 font-bold text-sm">
                                <div className="space-y-8">
                                    <div>Təhvil verən</div>
                                    <div className="border-b border-black w-full pt-4"></div>
                                    <div>Tarix: ________________</div>
                                    <div>M.Y.</div>
                                </div>
                                <div className="space-y-8">
                                    <div>Təhvil alan</div>
                                    <div className="border-b border-black w-full pt-4"></div>
                                    <div>Tarix: ________________</div>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all"
                    >
                        {t('cancel') || 'Ləğv Et'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-8 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold transition-all shadow-lg shadow-teal-600/20"
                    >
                        <Printer className="w-4 h-4" />
                        {t('print') || 'Çap Et'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
};

export default TransferPrintModal;
