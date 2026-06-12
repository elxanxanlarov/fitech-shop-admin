import { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, AlertTriangle, Building2 } from 'lucide-react';
import Alert from '../ui/Alert';
import { ismayilliApi } from '../../api';

/**
 * Excel-dən firma → məhsul bağlantısı idxalı (İsmayıllı).
 * Yalnız iki sütun istifadə olunur: firması və ştrixkod.
 * Firma DB-də yoxdursa avtomatik yaradılır.
 */
export default function FirmaProductsImportModal({ isOpen, onClose, onSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

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
            const res = await ismayilliApi.importFirmaProductsExcel(selectedFile);
            if (res.success) {
                setResult(res.data);
                if (res.data.linkedCount > 0 || res.data.firmasCreatedCount > 0) {
                    onSuccess?.();
                }
            } else {
                Alert.error('Xəta!', res.message || 'İdxal zamanı xəta baş verdi');
            }
        } catch (err) {
            console.error('Firma products excel import error:', err);
            Alert.error('Xəta!', err.response?.data?.message || 'Gözlənilməz xəta baş verdi');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setResult(null);
        const inp = document.getElementById('firma-products-excel-input');
        if (inp) inp.value = '';
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-blue-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Excel ilə Firma → Məhsul Bağla</h2>
                            <p className="text-xs text-slate-500">İsmayıllı — barkoda görə məhsullar firmalara bağlanır</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div className="flex-1 text-sm">
                                <h3 className="font-bold text-blue-900 mb-2">Necə işləyir:</h3>
                                <ul className="space-y-1 text-blue-800 text-xs">
                                    <li>• Excel-də <b>"firması"</b> və <b>"Ştrixkod"</b> sütunlarını avtomatik tapır.</li>
                                    <li>• Hər sətr üçün barkoda görə məhsulu tapır və həmin firmaya bağlayır.</li>
                                    <li>• Firma DB-də yoxdursa, <b>avtomatik yaradılır</b>.</li>
                                    <li>• Firma adı sətirdə boşdursa, <b>əvvəlki sətirdəki firma davam edir</b> (merged cell üçün).</li>
                                    <li>• Digər sütunlar (miqdar, qiymət, kateqoriya) <b>oxunmur</b> — yalnız bağlantı yaradılır.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* File picker */}
                    {!result && (
                        <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center bg-blue-50/30">
                            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                            <label
                                htmlFor="firma-products-excel-input"
                                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-md"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Excel Faylı Seç
                            </label>
                            <input
                                id="firma-products-excel-input"
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <ResultCard icon={<CheckCircle className="w-5 h-5" />} label="Bağlandı" value={result.linkedCount} color="emerald" />
                                <ResultCard icon={<Building2 className="w-5 h-5" />} label="Yeni firma" value={result.firmasCreatedCount} color="blue" />
                                <ResultCard icon={<XCircle className="w-5 h-5" />} label="Məhsul tapılmadı" value={result.notFoundCount} color="rose" />
                                <ResultCard icon={<AlertTriangle className="w-5 h-5" />} label="Skip" value={result.skippedCount} color="amber" />
                            </div>

                            {result.firmasCreated?.length > 0 && (
                                <details className="bg-blue-50 border border-blue-200 rounded-xl" open>
                                    <summary className="p-3 cursor-pointer font-bold text-blue-900 text-sm">
                                        Yeni yaradılan firmalar ({result.firmasCreated.length})
                                    </summary>
                                    <div className="px-3 pb-3 max-h-40 overflow-y-auto text-xs space-y-1">
                                        {result.firmasCreated.map((f) => (
                                            <div key={f.id} className="text-blue-800 font-semibold">
                                                {f.name}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {result.linked?.length > 0 && (
                                <details className="bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <summary className="p-3 cursor-pointer font-bold text-emerald-900 text-sm">
                                        Bağlanan məhsullar ({result.linked.length})
                                    </summary>
                                    <div className="px-3 pb-3 max-h-60 overflow-y-auto text-xs space-y-1">
                                        {result.linked.map((l, i) => (
                                            <div key={i} className="flex items-center gap-2 text-emerald-800">
                                                <span className="font-mono text-emerald-500">{l.barcode}</span>
                                                <span className="font-semibold">{l.productName}</span>
                                                <span className="text-emerald-500">→</span>
                                                <span className="font-bold">{l.firmaName}</span>
                                                {l.status === 'reassigned' && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">DƏYİŞDİRİLDİ</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {result.totalNotFound > 0 && (
                                <details className="bg-rose-50 border border-rose-200 rounded-xl">
                                    <summary className="p-3 cursor-pointer font-bold text-rose-900 text-sm">
                                        Sistemdə tapılmayan barkodlar ({result.totalNotFound}{result.totalNotFound > 50 ? ', ilk 50 göstərilir' : ''})
                                    </summary>
                                    <div className="px-3 pb-3 max-h-60 overflow-y-auto text-xs space-y-1">
                                        {result.notFound.map((n, i) => (
                                            <div key={i} className="text-rose-800">
                                                <span className="font-mono">{n.barcode}</span> — {n.firma}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {result.totalSkipped > 0 && (
                                <details className="bg-amber-50 border border-amber-200 rounded-xl">
                                    <summary className="p-3 cursor-pointer font-bold text-amber-900 text-sm">
                                        Atlanılan sətirlər ({result.totalSkipped}{result.totalSkipped > 50 ? ', ilk 50' : ''})
                                    </summary>
                                    <div className="px-3 pb-3 max-h-60 overflow-y-auto text-xs space-y-1">
                                        {result.skipped.map((s, i) => (
                                            <div key={i} className="text-amber-800">
                                                Row {s.row}: {s.reason} {s.firma && `— ${s.firma}`} {s.barcode && `· ${s.barcode}`}
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
                            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
                                    Firmalara Bağla
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
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        rose: 'bg-rose-50 border-rose-200 text-rose-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
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
