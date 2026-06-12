import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, Printer, Trash2, Search } from 'lucide-react';
import ExcelPrintModal from '../modals/ExcelPrintModal';

// Başlıq adlarını normallaşdırmaq üçün utilit
const norm = (s) => {
    if (s == null) return '';
    return String(s)
        .toLowerCase()
        .replace(/ə/g, 'e')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/i̇/g, 'i')
        .replace(/\s+/g, ' ')
        .trim();
};

// Excel-də başlıq sətrini avtomatik tap (sadə yanaşma: "miqdar" və ya "qiymet" sözünü axtar)
const findHeaderRow = (rows) => {
    const limit = Math.min(rows.length, 200);
    // 1-ci cəhd: "miqdar" sözünü ehtiva edən sətir
    for (let i = 0; i < limit; i++) {
        const row = rows[i] || [];
        for (const cell of row) {
            const c = norm(cell);
            if (c === 'miqdar' || c === 'miqdari' || c.includes('miqdar')) {
                return i;
            }
        }
    }
    // 2-ci cəhd: ən azı 3 açar sözü olan sətir
    const KEYS = ['ad', 'qiymet', 'kod', 'olcu', 'vahid', 'satis', 'meblg', 'mebleg', 'sira'];
    for (let i = 0; i < limit; i++) {
        const row = rows[i] || [];
        const cells = row.map(norm);
        let score = 0;
        for (const c of cells) {
            if (!c) continue;
            for (const k of KEYS) {
                if (c.includes(k)) { score++; break; }
            }
        }
        if (score >= 3) return i;
    }
    return -1;
};

// Sütun indekslərini başlıq sətrindən tap
const detectColumns = (headerRow) => {
    const cols = {
        sira: -1,
        code: -1,
        name: -1,
        qty: -1,
        unit: -1,
        purchase: -1,
        sale: -1,
        amount: -1
    };
    headerRow.forEach((cell, idx) => {
        const c = norm(cell);
        if (!c) return;
        if (cols.sira === -1 && (c.includes('sira') || c === 's/s' || c === 's/n' || c === '№' || c === 'no' || c === 'n')) cols.sira = idx;
        else if (cols.code === -1 && (c === 'kod' || c.includes('kod') || c.includes('barkod') || c.includes('strixkod'))) cols.code = idx;
        else if (cols.name === -1 && (c.includes('mehsul ad') || c.includes('malin ad') || c.includes('mal ad') || c === 'ad' || c === 'adi' || c === 'ad i')) cols.name = idx;
        else if (cols.qty === -1 && (c.includes('miqdar') || c === 'say' || c.includes('quant') || c === 'qty')) cols.qty = idx;
        else if (cols.unit === -1 && (c.includes('olcu') || c.includes('vahid') || c.includes('unit'))) cols.unit = idx;
        // VACIB: əvvəl satış qiyməti (daha spesifik), sonra adi qiymət (alış)
        else if (cols.sale === -1 && c.includes('satis') && c.includes('qiymet')) cols.sale = idx;
        else if (cols.purchase === -1 && c.includes('qiymet')) cols.purchase = idx;
        else if (cols.amount === -1 && (c.includes('meblg') || c.includes('mebleg') || c.includes('total'))) cols.amount = idx;
    });
    // Əgər name yalnız "ad" axtarışında tapılmadısa, sadəcə "ad" sözü ilə cəhd et
    if (cols.name === -1) {
        headerRow.forEach((cell, idx) => {
            if (cols.name !== -1) return;
            const c = norm(cell);
            if (c === 'ad' || c === 'adi' || c.endsWith(' ad') || c.endsWith(' adi')) cols.name = idx;
        });
    }
    return cols;
};

const toNumber = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const cleaned = String(v).replace(/\s/g, '').replace(/,/g, '.');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
};

export default function ExcelToPdf() {
    const [file, setFile] = useState(null);
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [parsing, setParsing] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const [search, setSearch] = useState('');

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setError('');
        setItems([]);
        parseExcel(f);
    };

    const parseExcel = async (f) => {
        setParsing(true);
        try {
            const buf = await f.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });

            // Bütün sheet-ləri yoxla, headeri olanı seç
            let chosenRows = null;
            let chosenSheet = '';
            let headerIdx = -1;
            let cols = null;

            for (const sheetName of wb.SheetNames) {
                const sheet = wb.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false, defval: '' });
                if (!rows.length) continue;

                let hIdx = findHeaderRow(rows);
                let c = hIdx !== -1 ? detectColumns(rows[hIdx]) : null;

                // Hər sətri ayrıca yoxla
                if (!c || c.name === -1 || c.qty === -1) {
                    for (let i = 0; i < Math.min(rows.length, 200); i++) {
                        const tryCols = detectColumns(rows[i] || []);
                        if (tryCols.name !== -1 && tryCols.qty !== -1) {
                            hIdx = i;
                            c = tryCols;
                            break;
                        }
                    }
                }

                if (hIdx !== -1 && c && c.name !== -1 && c.qty !== -1) {
                    chosenRows = rows;
                    chosenSheet = sheetName;
                    headerIdx = hIdx;
                    cols = c;
                    break;
                }

                // Ən azı bir sheet üçün debug üçün məlumat saxla
                if (!chosenRows) {
                    chosenRows = rows;
                    chosenSheet = sheetName;
                }
            }

            console.log('[ExcelToPdf] Sheets:', wb.SheetNames);
            console.log('[ExcelToPdf] Chosen sheet:', chosenSheet, '| headerIdx:', headerIdx, '| cols:', cols);
            if (chosenRows) console.log('[ExcelToPdf] First 15 rows:', chosenRows.slice(0, 15));

            if (!chosenRows || !chosenRows.length) {
                setError('Excel boşdur');
                setParsing(false);
                return;
            }

            if (headerIdx === -1 || !cols || cols.name === -1 || cols.qty === -1) {
                const preview = chosenRows.slice(0, 15).map((r, i) => `${i + 1}: ${(r || []).slice(0, 12).map(c => c == null ? '' : String(c)).join(' | ')}`).join('\n');
                setError(`Başlıq sətri tapılmadı (sheet: "${chosenSheet}"). Faylın ilk 15 sətri:\n${preview}`);
                setParsing(false);
                return;
            }

            const rows = chosenRows;
            const result = [];
            for (let i = headerIdx + 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r || r.length === 0) continue;
                const name = (cols.name !== -1 && r[cols.name] != null) ? String(r[cols.name]).trim() : '';
                if (!name) continue;
                // Cəmi sətirlərini keçir
                if (/^(c[əe]mi|toplam|yek[uu]n|total)/i.test(name)) continue;

                const qty = toNumber(cols.qty !== -1 ? r[cols.qty] : 0);
                const purchase = toNumber(cols.purchase !== -1 ? r[cols.purchase] : 0);
                const sale = toNumber(cols.sale !== -1 ? r[cols.sale] : 0);
                const code = cols.code !== -1 && r[cols.code] != null ? String(r[cols.code]).trim() : '';
                const unit = cols.unit !== -1 && r[cols.unit] != null ? String(r[cols.unit]).trim() : 'ƏD';

                if (qty <= 0 && purchase <= 0 && sale <= 0) continue;

                result.push({
                    code,
                    name,
                    quantity: qty,
                    unit: unit || 'ƏD',
                    purchasePrice: purchase,
                    salePrice: sale
                });
            }

            if (result.length === 0) {
                setError('Heç bir məhsul tapılmadı (cəmi sətirləri çıxılandan sonra)');
            } else {
                setItems(result);
            }
        } catch (err) {
            console.error(err);
            setError('Excel oxunarkən xəta: ' + err.message);
        } finally {
            setParsing(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setItems([]);
        setError('');
        setSearch('');
    };

    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(it =>
            (it.name || '').toLowerCase().includes(q) ||
            (it.code || '').toLowerCase().includes(q)
        );
    }, [items, search]);

    const totals = useMemo(() => {
        let qty = 0, purchase = 0, sale = 0;
        for (const it of items) {
            const q = Number(it.quantity || 0);
            qty += q;
            purchase += q * Number(it.purchasePrice || 0);
            sale += q * Number(it.salePrice || 0);
        }
        return { qty, purchase, sale, profit: sale - purchase };
    }, [items]);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 py-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Excel-dən PDF Yaratma</h1>
                            <p className="text-teal-100 opacity-90">Excel faylını yükləyin və hesabat formatında çap edin</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Upload */}
                    <div className="border-2 border-dashed border-teal-200 rounded-xl p-6 bg-teal-50/30">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            <label className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-teal-400 transition-colors">
                                    <Upload className="w-5 h-5 text-teal-600" />
                                    <span className="text-sm text-gray-700 truncate">
                                        {file ? file.name : 'Excel faylını seçin (.xlsx, .xls)'}
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            {items.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setPrintOpen(true)}
                                        className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-sm"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Çap Et / PDF
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        className="flex items-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Təmizlə
                                    </button>
                                </>
                            )}
                        </div>
                        {parsing && <div className="mt-3 text-sm text-teal-600">Fayl oxunur...</div>}
                        {error && <div className="mt-3 text-xs text-red-700 bg-red-50 px-3 py-2 rounded border border-red-100 font-mono whitespace-pre-line max-h-64 overflow-auto">{error}</div>}
                    </div>

                    {/* Summary cards */}
                    {items.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                <div className="text-[10px] font-black uppercase text-blue-500">Sətir Sayı</div>
                                <div className="text-2xl font-bold text-blue-900">{items.length}</div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                                <div className="text-[10px] font-black uppercase text-amber-600">Ümumi Miqdar</div>
                                <div className="text-2xl font-bold text-amber-900">{totals.qty}</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                                <div className="text-[10px] font-black uppercase text-orange-600">Alış Cəmi</div>
                                <div className="text-xl font-bold text-orange-900">{totals.purchase.toFixed(2)} AZN</div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                                <div className="text-[10px] font-black uppercase text-emerald-600">Satış Cəmi</div>
                                <div className="text-xl font-bold text-emerald-900">{totals.sale.toFixed(2)} AZN</div>
                            </div>
                        </div>
                    )}

                    {/* Preview table */}
                    {items.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-700">
                                    Önizləmə
                                    <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-md text-xs text-gray-500">{filteredItems.length}</span>
                                </h3>
                                <div className="relative w-64">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Axtar..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="max-h-[500px] overflow-auto">
                                    <table className="w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">№</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Kod</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Məhsul Adı</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Vahid</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Miqdar</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Alış</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Satış</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Alış Cəmi</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Satış Cəmi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {filteredItems.map((it, idx) => {
                                                const q = Number(it.quantity || 0);
                                                const pp = Number(it.purchasePrice || 0);
                                                const sp = Number(it.salePrice || 0);
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                                                        <td className="px-3 py-2 font-mono text-xs text-gray-700">{it.code || '-'}</td>
                                                        <td className="px-3 py-2 font-medium text-gray-900">{it.name}</td>
                                                        <td className="px-3 py-2 text-center text-xs text-gray-600">{it.unit}</td>
                                                        <td className="px-3 py-2 text-center font-bold text-teal-700">{q}</td>
                                                        <td className="px-3 py-2 text-right text-orange-700">{pp.toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{sp.toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{(q * pp).toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right text-gray-900 font-semibold">{(q * sp).toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {!items.length && !parsing && !error && (
                        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>Excel faylı yükləyin: Sıra №, Kod, Məhsul Adı, Miqdar, Ölçü vahidi, Qiymət (alış), satış qiyməti</p>
                            <p className="text-xs mt-2 text-gray-400">"Məbləğ (AZN)" sütunu nəzərə alınmır</p>
                        </div>
                    )}
                </div>
            </div>

            <ExcelPrintModal
                isOpen={printOpen}
                onClose={() => setPrintOpen(false)}
                items={items}
                fileName={file?.name || ''}
            />
        </div>
    );
}
