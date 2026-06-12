import { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, AlertTriangle, RotateCcw, Package, DollarSign } from 'lucide-react';
import Alert from '../ui/Alert';
import { ismayilliApi } from '../../api';

/**
 * Excel ilə kütləvi satış yaratmaq modalı (İsmayıllı üçün).
 * Excel format:
 *   - Column A: Məhsul adı (məlumat üçün, mütləq deyil)
 *   - Column B: Barkod (mütləq)
 *   - Column C: Ədəd (mütləq, müsbət ədəd)
 */
export default function SalesExcelImportModal({ isOpen, onClose, onSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    // Stoku yenilə (default: bəli)
    const [updateStock, setUpdateStock] = useState(true);
    // Vahid qiymət mənbəyi: 'db' (default) və ya 'excel' (Excel-dəki cəmi məbləğ ÷ miqdar)
    const [priceSource, setPriceSource] = useState('db');

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            Alert.error('Xəta!', 'Yalnız .xlsx / .xls / .csv faylları yüklənə bilər');
            e.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            Alert.error('Xəta!', 'Fayl 10MB-dan böyük ola bilməz');
            e.target.value = '';
            return;
        }
        setSelectedFile(file);
        setResult(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.error('Xəta!', 'Zəhmət olmasa fayl seçin');
            return;
        }
        setUploading(true);
        try {
            const res = await ismayilliApi.importSalesExcel(selectedFile, { updateStock, priceSource });
            if (res.success) {
                setResult(res.data);
                if ((res.data.createdCount > 0 || res.data.returnedCount > 0) && updateStock) {
                    onSuccess?.();
                }
            } else {
                Alert.error('Xəta!', res.message || 'İdxal zamanı xəta baş verdi');
            }
        } catch (err) {
            console.error('Sales excel import error:', err);
            Alert.error('Xəta!', err.response?.data?.message || 'Gözlənilməz xəta baş verdi');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setResult(null);
        setUpdateStock(true);
        setPriceSource('db');
        const inp = document.getElementById('sales-excel-file-input');
        if (inp) inp.value = '';
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-blue-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Excel ilə Satış İdxalı</h2>
                            <p className="text-xs text-slate-500">İsmayıllı — Excel-dən kütləvi satış yarat</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Format requirements */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div className="flex-1 text-sm">
                                <h3 className="font-bold text-blue-900 mb-2">Excel Formatı:</h3>
                                <ul className="space-y-1 text-blue-800">
                                    <li>• <strong>Sütun A:</strong> Məhsul adı (məlumat üçün)</li>
                                    <li>• <strong>Sütun B:</strong> Barkod <span className="text-rose-600 font-bold">(mütləq)</span></li>
                                    <li>• <strong>Sütun C:</strong> Ədəd — <span className="font-bold">müsbət</span> = satış</li>
                                </ul>
                                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                    <p className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Qaytarma sətirləri:
                                    </p>
                                    <p className="text-xs text-orange-800 mt-0.5">
                                        Sütun C <b>boş</b> (yalnız Mal + Barkod var) və ya <b>mənfi</b> (məs. -1) olsa, sətir <b>qaytarma</b> kimi qəbul edilir.
                                    </p>
                                </div>
                                <p className="text-xs text-blue-700 mt-2 italic">
                                    Header sətri varsa avtomatik atılacaq. Hər row üçün ayrı sənəd yaranır.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Vahid qiymət mənbəyi */}
                    <div className="bg-violet-50/60 border border-violet-200 rounded-xl p-3">
                        <div className="text-[11px] font-extrabold text-violet-800 uppercase mb-2 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            Vahid satış qiyməti mənbəyi
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPriceSource('db')}
                                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                                    priceSource === 'db'
                                        ? 'border-violet-500 bg-white shadow-sm'
                                        : 'border-violet-200 bg-white/60 hover:bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-extrabold text-violet-900">Bazadakı qiymət</span>
                                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${
                                        priceSource === 'db' ? 'border-violet-600 bg-violet-600' : 'border-violet-300'
                                    }`} />
                                </div>
                                <p className="text-[10px] text-violet-700/80">
                                    Hər məhsul üçün DB-də olan vahid qiymət.
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriceSource('excel')}
                                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                                    priceSource === 'excel'
                                        ? 'border-violet-500 bg-white shadow-sm'
                                        : 'border-violet-200 bg-white/60 hover:bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-extrabold text-violet-900">Excel-dəki faktiki qiymət</span>
                                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${
                                        priceSource === 'excel' ? 'border-violet-600 bg-violet-600' : 'border-violet-300'
                                    }`} />
                                </div>
                                <p className="text-[10px] text-violet-700/80">
                                    <b>D sütunu ÷ miqdar</b> — endirim/güzəştli qiymət üçün (1C ilə eyni).
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Stoku yenilə toggle */}
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                        <div className="text-[11px] font-extrabold text-emerald-800 uppercase mb-2 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            Stok rejimi
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setUpdateStock(true)}
                                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                                    updateStock
                                        ? 'border-emerald-500 bg-white shadow-sm'
                                        : 'border-emerald-200 bg-white/60 hover:bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-extrabold text-emerald-900">Stoku yenilə</span>
                                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${
                                        updateStock ? 'border-emerald-600 bg-emerald-600' : 'border-emerald-300'
                                    }`} />
                                </div>
                                <p className="text-[10px] text-emerald-700/80">Satış stoku azaldır</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setUpdateStock(false)}
                                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                                    !updateStock
                                        ? 'border-emerald-500 bg-white shadow-sm'
                                        : 'border-emerald-200 bg-white/60 hover:bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-extrabold text-emerald-900">Stoku yeniləmə</span>
                                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${
                                        !updateStock ? 'border-emerald-600 bg-emerald-600' : 'border-emerald-300'
                                    }`} />
                                </div>
                                <p className="text-[10px] text-emerald-700/80">Yalnız sənəd yarat, anbar dəyişmir</p>
                            </button>
                        </div>
                    </div>

                    {/* Sample */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Nümunə</h4>
                        <table className="w-full text-xs border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-200">
                                    <th className="border border-slate-300 px-2 py-1.5 text-left">Məhsul adı</th>
                                    <th className="border border-slate-300 px-2 py-1.5 text-left">Barkod</th>
                                    <th className="border border-slate-300 px-2 py-1.5 text-left">Ədəd</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-200 px-2 py-1.5">8376</td>
                                    <td className="border border-slate-200 px-2 py-1.5 font-mono">2000090000001</td>
                                    <td className="border border-slate-200 px-2 py-1.5 font-bold">8</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 px-2 py-1.5">QADIN CORAB</td>
                                    <td className="border border-slate-200 px-2 py-1.5 font-mono">2000498000009</td>
                                    <td className="border border-slate-200 px-2 py-1.5 font-bold">25</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* File picker */}
                    {!result && (
                        <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-8 text-center bg-emerald-50/30">
                            <Upload className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <label
                                htmlFor="sales-excel-file-input"
                                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold shadow-md"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Excel Faylı Seç
                            </label>
                            <input
                                id="sales-excel-file-input"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={uploading}
                            />
                            {selectedFile && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-slate-800">{selectedFile.name}</span>
                                    <span className="text-slate-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                                </div>
                            )}
                            <p className="text-[11px] text-slate-500 mt-3">.xlsx · .xls · .csv (maks 10MB)</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                <ResultCard icon={<CheckCircle className="w-5 h-5" />} label="Satış" value={result.createdCount} color="emerald" />
                                <ResultCard icon={<RotateCcw className="w-5 h-5" />} label="Qaytarma" value={result.returnedCount} color="orange" />
                                <ResultCard icon={<XCircle className="w-5 h-5" />} label="Tapılmadı" value={result.notFoundCount} color="rose" />
                                <ResultCard icon={<AlertTriangle className="w-5 h-5" />} label="Stok yox" value={result.insufficientStockCount} color="amber" />
                                <ResultCard icon={<AlertCircle className="w-5 h-5" />} label="Skip" value={result.skippedCount} color="slate" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {result.createdCount > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Satış cəmi</p>
                                        <p className="font-bold text-emerald-900 mt-0.5">
                                            {result.totalQty} ədəd · {Number(result.totalAmount).toFixed(2)} AZN
                                        </p>
                                    </div>
                                )}
                                {result.returnedCount > 0 && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
                                        <p className="text-[10px] font-bold text-orange-700 uppercase">Qaytarma cəmi</p>
                                        <p className="font-bold text-orange-900 mt-0.5">
                                            {result.totalReturnQty} ədəd · {Number(result.totalReturnAmount).toFixed(2)} AZN
                                        </p>
                                    </div>
                                )}
                            </div>

                            {result.updateStock === false && (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
                                    <b>ℹ️ Stok rejimi:</b> Yenilənmədi — yalnız satış/qaytarma sənədləri yaradıldı, anbar miqdarı dəyişməyib.
                                </div>
                            )}

                            {result.notFound?.length > 0 && (
                                <details className="bg-rose-50 border border-rose-200 rounded-xl">
                                    <summary className="p-3 cursor-pointer font-bold text-rose-900 text-sm">
                                        Tapılmayan barkodlar ({result.notFound.length})
                                    </summary>
                                    <div className="px-3 pb-3 max-h-48 overflow-y-auto text-xs space-y-1">
                                        {result.notFound.map((n, i) => (
                                            <div key={i} className="text-rose-800">
                                                <span className="font-mono">{n.barcode}</span> ×{n.qty} — {n.excelName || '—'}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {result.insufficientStock?.length > 0 && (
                                <details className="bg-amber-50 border border-amber-200 rounded-xl">
                                    <summary className="p-3 cursor-pointer font-bold text-amber-900 text-sm">
                                        Stokda kifayət qədər yoxdur ({result.insufficientStock.length})
                                    </summary>
                                    <div className="px-3 pb-3 max-h-48 overflow-y-auto text-xs space-y-1">
                                        {result.insufficientStock.map((n, i) => (
                                            <div key={i} className="text-amber-800">
                                                {n.productName} — istənilən: <b>{n.qty}</b>, mövcud: <b>{n.available}</b>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {result.skipped?.length > 0 && (
                                <details className="bg-slate-50 border border-slate-200 rounded-xl">
                                    <summary className="p-3 cursor-pointer font-bold text-slate-700 text-sm">
                                        Atlanılan sətirlər ({result.skipped.length})
                                    </summary>
                                    <div className="px-3 pb-3 max-h-48 overflow-y-auto text-xs space-y-1">
                                        {result.skipped.map((n, i) => (
                                            <div key={i} className="text-slate-700">
                                                Row {n.row}: {n.reason}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                        {result ? 'Bağla' : 'Ləğv et'}
                    </button>
                    {!result && (
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    İdxal edilir...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Satışları İdxal Et
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResultCard({ icon, label, value, color }) {
    const colorMap = {
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        orange: 'bg-orange-50 border-orange-200 text-orange-700',
        rose: 'bg-rose-50 border-rose-200 text-rose-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        slate: 'bg-slate-50 border-slate-200 text-slate-700',
    };
    return (
        <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-black mt-1">{value || 0}</p>
        </div>
    );
}
