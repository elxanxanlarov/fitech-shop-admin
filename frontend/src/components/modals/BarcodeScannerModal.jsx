import React, { useState } from 'react';
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { useTranslation } from 'react-i18next';
import { MdClose, MdRefresh, MdVideocamOff, MdFlashOn, MdFlashOff } from 'react-icons/md';

export default function BarcodeScannerModal({ isOpen, onClose, onScanSuccess }) {
    const { t } = useTranslation('product');
    const [error, setError] = useState(null);

    const [torch, setTorch] = useState(false);

    const handleScan = (err, result) => {
        if (result) {
            onScanSuccess(result.text);
            onClose();
        }
        if (err) {
            // bəzi xətalar sadəcə "tapılmadı" deməkdir, onları görməzdən gəlirik
            if (!err.message?.includes("No multi-format codes found")) {
                console.error("Skan xətası:", err);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/95 backdrop-blur-md transition-all duration-300"
        >
            <div className="bg-white w-full max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 max-h-[95vh]">
                {/* Header */}
                <div className="relative flex items-center justify-center p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full absolute top-3 sm:hidden" />
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-2 sm:mt-0">
                        {t('scan_barcode') || 'Barkod Skan Et'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="absolute right-4 sm:right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
                    >
                        <MdClose className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                    <div className="relative mx-auto max-w-[320px] sm:max-w-none">
                        <div className="overflow-hidden rounded-3xl border-4 border-slate-100 bg-slate-900 aspect-square sm:aspect-video min-h-[250px] shadow-2xl relative flex items-center justify-center">
                            <BarcodeScannerComponent
                                width="100%"
                                height="100%"
                                onUpdate={handleScan}
                                facingMode="environment"
                                torch={torch}
                                onError={(err) => {
                                    console.error("Kamera xətası:", err);
                                    setError(err.message || "Kamera açılmadı");
                                }}
                            />
                            
                            {error && (
                                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white z-10">
                                    <MdVideocamOff className="w-12 h-12 text-red-500 mb-4" />
                                    <p className="text-sm font-bold text-red-400 mb-2">Kamera xətası</p>
                                    <p className="text-xs text-slate-400 mb-4">{error}</p>
                                    <button 
                                        onClick={() => { setError(null); }}
                                        className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold"
                                    >
                                        Yenidən yoxla
                                    </button>
                                </div>
                            )}

                            {/* Torch Button */}
                            {!error && (
                                <button
                                    onClick={() => setTorch(!torch)}
                                    className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-all z-20 ${
                                        torch ? 'bg-yellow-400 text-slate-900' : 'bg-black/50 text-white hover:bg-black/70'
                                    }`}
                                >
                                    {torch ? <MdFlashOff className="w-5 h-5" /> : <MdFlashOn className="w-5 h-5" />}
                                </button>
                            )}

                            {/* Scanner Frame Decoration */}
                            {!error && (
                                <div className="absolute inset-0 pointer-events-none border-[20px] sm:border-[32px] border-transparent">
                                     <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                                     <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-blue-700 text-sm font-bold">
                                    {t('scan_hint') || 'Skaner aktivdir'}
                                </p>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-400 text-center px-2 sm:px-4 leading-relaxed">
                                Barkodu çərçivənin daxilinə gətirin. Skaner avtomatik olaraq kodu tanıyacaq.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 text-base font-bold text-white bg-slate-900 hover:bg-black rounded-2xl shadow-xl transition-all duration-200 active:scale-[0.98]"
                    >
                        {t('close') || 'Bağla'}
                    </button>
                </div>
            </div>
        </div>
    );
}
