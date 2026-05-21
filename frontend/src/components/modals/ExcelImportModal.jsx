import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, MapPin, Tag, Percent, Layers } from 'lucide-react';
import Alert from '../ui/Alert';
import { useAuth, useBranch } from '../../hooks';
import { branchApi } from '../../api';

export default function ExcelImportModal({ isOpen, onClose, onImport, isHeaderIsmayilli }) {
    const { t } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const { user } = useAuth();
    const { selectedBranchId: contextBranchId } = useBranch();
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [branches, setBranches] = useState([]);
    const [targetBranchId, setTargetBranchId] = useState(contextBranchId || 'central');

    // Şablon seçimi: 'standard' (mövcud) və ya 'qabqacaq' (Sıra/Kod/Cəm skip + Satış opsional)
    const [template, setTemplate] = useState('standard');
    const [categoryName, setCategoryName] = useState('');
    const [profitPercent, setProfitPercent] = useState(50);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await branchApi.getAll();
                if (response.success) {
                    setBranches(response.data);
                }
            } catch (error) {
                console.error('Fetch branches error:', error);
            }
        };

        if (isOpen) {
            fetchBranches();
            // Set initial branch based on user or context
            const initialBranch = user?.branchId || contextBranchId || 'central';
            setTargetBranchId(initialBranch);
        }
    }, [isOpen, user, contextBranchId]);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check if file is Excel
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-excel', // .xls
                'text/csv' // .csv
            ];
            
            if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
                Alert.error(tAlert('error') || 'Xəta!', t('invalid_file_type') || 'Yalnız Excel faylları (.xlsx, .xls) və ya CSV faylları yüklənə bilər');
                e.target.value = '';
                return;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB
                Alert.error(tAlert('error') || 'Xəta!', t('file_too_large') || 'Fayl ölçüsü 10MB-dan böyük ola bilməz');
                e.target.value = '';
                return;
            }

            setSelectedFile(file);
        }
    };

    const activeBranch = branches.find(b => b.id === targetBranchId);
    const isIsmayilli = isHeaderIsmayilli || (activeBranch && (
        activeBranch.name.toLowerCase().includes('ismayilli') || 
        activeBranch.name.toLowerCase().includes('ismayıllı')
    ));

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.error(tAlert('error') || 'Xəta!', t('no_file_selected') || 'Zəhmət olmasa fayl seçin');
            return;
        }

        setUploading(true);
        try {
            const opts = {};
            if (categoryName.trim()) opts.categoryName = categoryName.trim();
            if (template === 'qabqacaq' && profitPercent !== '' && profitPercent !== null) {
                opts.profitPercent = profitPercent;
            }
            await onImport(selectedFile, targetBranchId, isIsmayilli, opts);
            setSelectedFile(null);
            const fileInput = document.getElementById('excel-file-input');
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        const fileInput = document.getElementById('excel-file-input');
        if (fileInput) fileInput.value = '';
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                            {t('excel_import') || 'Excel ilə Məhsul Əlavə Et'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Template Switch — yalnız non-Ismayilli üçün göstərilir */}
                    {!isIsmayilli && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-1">Şablon:</span>
                            <button
                                type="button"
                                onClick={() => setTemplate('standard')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                                    template === 'standard'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                }`}
                            >
                                <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                                Standart
                            </button>
                            <button
                                type="button"
                                onClick={() => setTemplate('qabqacaq')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                                    template === 'qabqacaq'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                                }`}
                            >
                                <Layers className="w-4 h-4 inline mr-1" />
                                Qabqacaq
                            </button>
                            <p className="text-[11px] text-slate-500 ml-auto italic">
                                {template === 'qabqacaq'
                                    ? 'Sıra № / Kod / Cəmi məbləğ sütunları skip olunur, satış qiyməti faizlə hesablana bilər'
                                    : 'Hazır cədvəlinizi olduğu kimi yükləyin'}
                            </p>
                        </div>
                    )}

                    {/* Kateqoriya & Faiz */}
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-amber-700 uppercase block mb-1.5">
                                Kateqoriya Adı (Opsional)
                            </label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                <input
                                    type="text"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="Məs: Qabqacaq"
                                    className="w-full pl-10 pr-3 py-2 border-2 border-amber-300 bg-white rounded-lg text-sm font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                            </div>
                            <p className="text-[11px] text-amber-600 mt-1">
                                Verilərsə, bütün məhsullar bu kateqoriyaya assign olunacaq. Yoxdursa, avtomatik yaradılacaq.
                            </p>
                        </div>

                        {template === 'qabqacaq' && !isIsmayilli && (
                            <div>
                                <label className="text-xs font-bold text-amber-700 uppercase block mb-1.5">
                                    Mənfəət Faizi (%)
                                </label>
                                <div className="relative">
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={profitPercent}
                                        onChange={(e) => setProfitPercent(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border-2 border-amber-300 bg-white rounded-lg text-sm font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                </div>
                                <p className="text-[11px] text-amber-600 mt-1">
                                    Excel-də satış qiyməti yoxdursa: Satış = Alış × {(1 + parseFloat(profitPercent || 0) / 100).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Format Information */}
                    {isIsmayilli ? (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-1">
                            <p className="font-bold">⚠️ Vacib qeyd:</p>
                            <p>• Excel faylındakı sütun başlıqları avtomatik tanınır.</p>
                            <p>• Kateqoriya adları (məsələn, <b>Geyim, Ətir, Xırdavat</b>) qalın başlıqlı sətirlərdən və ya Kateqoriya sütunundan oxunaraq avtomatik yaradılacaqdır.</p>
                            <p>• Eyni ştrihkoda malik məhsullar təkrar yükləndikdə qiymət və stok miqdarı yenilənəcəkdir.</p>
                        </div>
                    ) : template === 'qabqacaq' ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-emerald-900 mb-2">
                                        Qabqacaq Şablonu — Tələblər
                                    </h3>
                                    <div className="text-sm text-emerald-800 space-y-2">
                                        <p className="font-medium">Sütun başlıqları:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Sıra №</strong> - Skip olunur</li>
                                            <li><strong>Kod</strong> - Skip olunur (barkod arxa planda yaranır)</li>
                                            <li><strong>Məhsul Adı</strong> - Mütləq</li>
                                            <li><strong>Miqdar</strong> - Mütləq</li>
                                            <li><strong>Ölçü vahidi</strong> - əd, kq, litr...</li>
                                            <li><strong>Qiymət (AZN)</strong> - Alış qiyməti (mütləq)</li>
                                            <li><strong>Məbləğ (AZN)</strong> - Cəmi məbləğ (skip olunur)</li>
                                            <li><strong>Satış Qiymət</strong> - <em>Opsional</em> — yoxdursa faizlə hesablanacaq</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-blue-900 mb-2">
                                        {t('excel_format_requirements') || 'Excel Formatı Tələbləri'}
                                    </h3>
                                    <div className="text-sm text-blue-800 space-y-2">
                                        <p className="font-medium">{t('required_columns') || 'Tələb olunan sütunlar:'}</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Strixkod</strong> - Barkod nömrəsi</li>
                                            <li><strong>Ad</strong> - Məhsulun adı (mütləq)</li>
                                            <li><strong>Miqdar</strong> - Stok miqdarı (mütləq)</li>
                                            <li><strong>Ölçü vahidi</strong> - Ədəd, kq, litr və s.</li>
                                            <li><strong>Qiymət (AZN)</strong> - Alış qiyməti (mütləq)</li>
                                            <li><strong>Endirimli qiymət</strong> - Bu sütun keçiləcək</li>
                                            <li><strong>Cəmi məbləğ</strong> - Bu sütun keçiləcək (cəmi məbləğ)</li>
                                            <li><strong>Satış Qiyməti</strong> - Satış qiyməti (mütləq)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Example Table */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                            {t('excel_example') || 'Nümunə Format:'}
                        </h3>
                        <div className="overflow-x-auto">
                            {(!isIsmayilli && template === 'qabqacaq') ? (
                                <table className="min-w-full text-sm border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-slate-400">Sıra №</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-slate-400">Kod</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Məhsul Adı</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Miqdar</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Ölçü vahidi</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Qiymət (AZN)</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-slate-400">Məbləğ (AZN)</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold bg-green-100">Satış Qiymət</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-300 px-3 py-2 text-slate-400">1</td>
                                            <td className="border border-gray-300 px-3 py-2 text-slate-400">16577</td>
                                            <td className="border border-gray-300 px-3 py-2">CSJ2 caska nelbeki</td>
                                            <td className="border border-gray-300 px-3 py-2">2</td>
                                            <td className="border border-gray-300 px-3 py-2">əd</td>
                                            <td className="border border-gray-300 px-3 py-2">25,00</td>
                                            <td className="border border-gray-300 px-3 py-2 text-slate-400">50,00</td>
                                            <td className="border border-gray-300 px-3 py-2 bg-green-50 font-bold">38,00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <table className="min-w-full text-sm border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Strixkod</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Ad</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Miqdar</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Ölçü vahidi</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Qiymət (AZN)</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Cəmi məbləğ</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold bg-green-100">Satış Qiyməti</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-300 px-3 py-2">2400000028109</td>
                                            <td className="border border-gray-300 px-3 py-2">TOZSORAN SULU</td>
                                            <td className="border border-gray-300 px-3 py-2">2</td>
                                            <td className="border border-gray-300 px-3 py-2">əd</td>
                                            <td className="border border-gray-300 px-3 py-2">60.00</td>
                                            <td className="border border-gray-300 px-3 py-2">120.00</td>
                                            <td className="border border-gray-300 px-3 py-2 bg-green-50 font-bold">85.00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Branch Selection */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">
                                {t('target_branch') || 'Hədəf Filial'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            {t('import_branch_desc') || 'Məhsulların hansı filiala əlavə olunacağını seçin:'}
                        </p>
                        <select
                            value={targetBranchId}
                            onChange={(e) => setTargetBranchId(e.target.value)}
                            disabled={user?.role?.name !== 'superadmin' && user?.isBoss !== true}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="central">{t('central_warehouse') || 'Mərkəzi Anbar'}</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                        {(user?.role?.name !== 'superadmin' && user?.isBoss !== true) && (
                            <p className="mt-2 text-xs text-amber-600 italic">
                                {t('branch_fixed_for_staff') || 'İşçi statusunda olduğunuz üçün filial seçimi sabitdir.'}
                            </p>
                        )}
                    </div>

                    {/* File Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <label
                                htmlFor="excel-file-input"
                                className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                <span>{t('select_excel_file') || 'Excel Faylı Seç'}</span>
                            </label>
                            <input
                                id="excel-file-input"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={uploading}
                            />
                            {selectedFile && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-700">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="font-medium">{selectedFile.name}</span>
                                    <span className="text-gray-500">
                                        ({(selectedFile.size / 1024).toFixed(2)} KB)
                                    </span>
                                </div>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                                {t('supported_formats') || 'Dəstəklənən formatlar: .xlsx, .xls, .csv'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('uploading') || 'Yüklənir...'}
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                {t('import_products') || 'Məhsulları İdxal Et'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

