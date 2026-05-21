import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, FileSpreadsheet, AlertCircle, MapPin, Percent, Search, Layers, Tag } from 'lucide-react';
import Alert from '../ui/Alert';
import { productApi, branchApi, categoryApi, subCategoryApi, ismayilliApi } from '../../api';
import { useAuth, useBranch } from '../../hooks';
import BarcodePrintModal from './BarcodePrintModal';

export default function ExcelTableModal({ isOpen, onClose, onRefresh, isIsmayilli = false }) {
    const { t } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const { user } = useAuth();
    const { selectedBranchId: contextBranchId } = useBranch();
    
    const initialRow = {
        name: '',
        stock: '',
        unitType: 'PIECE',
        purchasePrice: '',
        categoryId: '',
        subCategoryId: '',
    };

    const [rows, setRows] = useState([{ ...initialRow }]);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const [targetBranchId, setTargetBranchId] = useState(contextBranchId || 'central');
    const [profitPercent, setProfitPercent] = useState(50);

    // Categories
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    // Print modal state
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [createdProducts, setCreatedProducts] = useState([]);

    // Per-row search state
    const [activeSearchRow, setActiveSearchRow] = useState(null);
    const [searchQuery, setSearchQuery] = useState({ category: '', subCategory: '' });

    // Global category / subcategory (default for every row)
    const [globalCategoryId, setGlobalCategoryId] = useState('');
    const [globalSubCategoryId, setGlobalSubCategoryId] = useState('');
    const [globalCatSearch, setGlobalCatSearch] = useState('');
    const [globalSubSearch, setGlobalSubSearch] = useState('');
    const [globalCatOpen, setGlobalCatOpen] = useState(false);
    const [globalSubOpen, setGlobalSubOpen] = useState(false);

    // Sürətli kateqoriya yaratma
    const [quickCatName, setQuickCatName] = useState('Qabqacaq');
    const [quickCatLoading, setQuickCatLoading] = useState(false);

    const computeSalePrice = (purchase, percent) => {
        const p = parseFloat(purchase);
        const pct = parseFloat(percent);
        if (!Number.isFinite(p) || !Number.isFinite(pct)) return 0;
        return p * (1 + pct / 100);
    };

    const multiplier = (() => {
        const pct = parseFloat(profitPercent);
        if (!Number.isFinite(pct)) return 1;
        return 1 + pct / 100;
    })();

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

        if (isOpen && !isIsmayilli) {
            fetchBranches();
            const initialBranch = user?.branchId || contextBranchId || 'central';
            setTargetBranchId(initialBranch);
        }
    }, [isOpen, user, contextBranchId, isIsmayilli]);

    // Categories load on open
    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            try {
                if (isIsmayilli) {
                    const res = await ismayilliApi.getAllCategories();
                    if (res.success) setCategories(res.data || []);
                } else {
                    const [cRes, sRes] = await Promise.all([
                        categoryApi.getAll(),
                        subCategoryApi.getAll(),
                    ]);
                    if (cRes.success) setCategories(cRes.data || []);
                    if (sRes.success) setSubCategories(sRes.data || []);
                }
            } catch (err) {
                console.error('Category fetch error:', err);
            }
        };
        load();
    }, [isOpen, isIsmayilli]);

    // Filtered categories for per-row search (HOOKS MUST BE CALLED BEFORE EARLY RETURN)
    const filteredCategories = useMemo(() => {
        const q = (searchQuery.category || '').toLowerCase().trim();
        if (!q) return categories;
        return categories.filter(c => c.name?.toLowerCase().includes(q));
    }, [categories, searchQuery.category]);

    const globalFilteredCategories = useMemo(() => {
        const q = globalCatSearch.toLowerCase().trim();
        if (!q) return categories;
        return categories.filter(c => c.name?.toLowerCase().includes(q));
    }, [categories, globalCatSearch]);

    const globalFilteredSubCategories = useMemo(() => {
        if (!globalCategoryId) return [];
        const list = subCategories.filter(s => s.categoryId === globalCategoryId);
        const q = globalSubSearch.toLowerCase().trim();
        if (!q) return list;
        return list.filter(s => s.name?.toLowerCase().includes(q));
    }, [subCategories, globalCategoryId, globalSubSearch]);

    if (!isOpen) return null;

    const newRowWithDefaults = () => ({
        ...initialRow,
        categoryId: globalCategoryId || '',
        subCategoryId: globalCategoryId ? (globalSubCategoryId || '') : '',
    });

    const addRow = () => {
        setRows([...rows, newRowWithDefaults()]);
    };

    const removeRow = (index) => {
        if (rows.length === 1) {
            setRows([newRowWithDefaults()]);
            return;
        }
        const newRows = [...rows];
        newRows.splice(index, 1);
        setRows(newRows);
    };

    const handleChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const handlePaste = (e, rowIndex) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('Text');
        const lines = clipboardData.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length > 0) {
            const newRows = [...rows];
            
            lines.forEach((line, i) => {
                const cells = line.split('\t');

                // ─── Adaptive sütun mapping ──────────────────────────────
                // 8+ sütun = "Sıra | Kod | Ad | Miq | Ölçü | Alış | Cəm | Satış" formatı
                // 7   sütun = "Sıra | Kod | Ad | Miq | Ölçü | Alış | Cəm"
                // 5-6 sütun + birinci barkod = "Barkod | Ad | Miq | Ölçü | Alış [...]"
                // 4-5 sütun = "Ad | Miq | Ölçü | Alış"
                let nameIdx, stockIdx, unitIdx, purchaseIdx;
                const c0 = (cells[0] || '').trim();
                const c1 = (cells[1] || '').trim();
                const firstIsBarcode = /^\d{6,}$/.test(c0);
                const firstIsRowNum  = /^\d{1,4}$/.test(c0) && !firstIsBarcode && c1.length > 0;

                if (cells.length >= 7 && firstIsRowNum) {
                    // Excel template ilə: Sıra | Kod | Ad | Miqdar | Ölçü | Qiymət | Məbləğ | (Satış)
                    nameIdx = 2; stockIdx = 3; unitIdx = 4; purchaseIdx = 5;
                } else if (firstIsBarcode) {
                    nameIdx = 1; stockIdx = 2; unitIdx = 3; purchaseIdx = 4;
                } else {
                    nameIdx = 0; stockIdx = 1; unitIdx = 2; purchaseIdx = 3;
                }

                const rawUnit = (cells[unitIdx] || '').toLowerCase().trim();
                let unitType = 'PIECE';
                if (rawUnit.includes('qutu') || rawUnit.includes('box')) unitType = 'BOX';
                else if (rawUnit.includes('kq') || rawUnit.includes('kg') || rawUnit.includes('kilo')) unitType = 'KILOGRAM';
                else if (rawUnit.includes('litr') || rawUnit.includes('ltr') || rawUnit === 'l') unitType = 'LITER';
                else if (rawUnit.includes('metr') || rawUnit.includes('mtr') || rawUnit === 'm') unitType = 'METER';

                const rowData = {
                    name: cells[nameIdx] || '',
                    stock: cells[stockIdx] || '',
                    unitType: unitType,
                    purchasePrice: cells[purchaseIdx] || '',
                    categoryId: globalCategoryId || '',
                    subCategoryId: globalCategoryId ? (globalSubCategoryId || '') : '',
                };

                if (i === 0) {
                    newRows[rowIndex] = rowData;
                } else {
                    newRows.push(rowData);
                }
            });

            setRows(newRows);
        }
    };

    const handleSave = async () => {
        const pct = parseFloat(profitPercent);
        if (!Number.isFinite(pct) || pct < 0) {
            Alert.error(tAlert('error') || 'Xəta!', 'Düzgün mənfəət faizi daxil edin');
            return;
        }

        // Ismayilli üçün categoryId mütləqdir
        if (isIsmayilli) {
            const missingCat = rows.find(r => r.name && r.purchasePrice && !r.categoryId);
            if (missingCat) {
                Alert.error(tAlert('error') || 'Xəta!', 'Hər məhsul üçün kateqoriya seçməlisiniz');
                return;
            }
        }

        const validRows = rows.filter(row => row.name && row.purchasePrice);

        if (validRows.length === 0) {
            Alert.error(tAlert('error') || 'Xəta!', t('fill_required_fields') || 'Zəhmət olmasa tələb olunan sahələri doldurun (Ad və Alış qiyməti)');
            return;
        }

        setLoading(true);
        try {
            Alert.loading(t('saving') || 'Yadda saxlanılır...');

            let response;
            if (isIsmayilli) {
                const products = validRows.map(row => ({
                    name: row.name,
                    quantity: row.stock || 0,
                    unitPricePurchase: row.purchasePrice,
                    unitPriceSale: computeSalePrice(row.purchasePrice, pct).toFixed(2),
                    categoryId: row.categoryId,
                }));
                response = await ismayilliApi.bulkCreateProducts({ products });
            } else {
                const products = validRows.map(row => ({
                    name: row.name,
                    stock: row.stock,
                    unitType: row.unitType,
                    purchasePrice: row.purchasePrice,
                    salePrice: computeSalePrice(row.purchasePrice, pct).toFixed(2),
                    barcode: null,
                    categoryId: row.categoryId || null,
                    subCategoryId: row.subCategoryId || null,
                }));
                response = await productApi.bulkCreate({
                    products,
                    branchId: targetBranchId,
                });
            }

            Alert.close();

            if (response.success) {
                const created = response.data?.products || [];
                Alert.success(
                    t('success') || 'Uğurlu!',
                    response.message || `${response.data?.successCount} məhsul əlavə edildi`
                );
                onRefresh?.();
                setRows([{ ...initialRow }]);
                if (created.length > 0) {
                    setCreatedProducts(created);
                    setPrintModalOpen(true);
                } else {
                    onClose();
                }
            } else {
                Alert.error(tAlert('error') || 'Xəta!', response.message);
            }
        } catch (error) {
            Alert.close();
            console.error('Bulk save error:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || 'Gözlənilməz xəta baş verdi');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintModalClose = () => {
        setPrintModalOpen(false);
        setCreatedProducts([]);
        onClose();
    };

    // Helper funksiyalar (hook deyil — inline funksiyalardır)
    const getSubCategoriesForRow = (categoryId) => {
        if (!categoryId) return [];
        return subCategories.filter(s => s.categoryId === categoryId);
    };

    const filteredSubCategoriesFor = (categoryId) => {
        const q = (searchQuery.subCategory || '').toLowerCase().trim();
        const list = getSubCategoriesForRow(categoryId);
        if (!q) return list;
        return list.filter(s => s.name?.toLowerCase().includes(q));
    };

    const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '';
    const getSubCategoryName = (id) => subCategories.find(s => s.id === id)?.name || '';

    // Apply global category to all rows (only fill rows that don't already have their own)
    const applyGlobalCategory = (catId) => {
        setGlobalCategoryId(catId);
        setGlobalSubCategoryId('');
        setRows(prev => prev.map(r => ({
            ...r,
            categoryId: catId,
            subCategoryId: '',
        })));
    };

    const applyGlobalSubCategory = (subId) => {
        setGlobalSubCategoryId(subId);
        setRows(prev => prev.map(r => (
            r.categoryId === globalCategoryId ? { ...r, subCategoryId: subId } : r
        )));
    };

    const clearGlobalCategory = () => {
        setGlobalCategoryId('');
        setGlobalSubCategoryId('');
    };

    // Sürətli kateqoriya yaratma: əgər ad varsa onu seç, yoxdursa yarat və seç
    const createOrPickQuickCategory = async () => {
        const name = (quickCatName || '').trim();
        if (!name) {
            Alert.error(tAlert('error') || 'Xəta!', 'Kateqoriya adı boş ola bilməz');
            return;
        }
        setQuickCatLoading(true);
        try {
            // Eyni adlı kateqoriya varsa onu istifadə et (case-insensitive)
            const existing = categories.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
            if (existing) {
                applyGlobalCategory(existing.id);
                Alert.success(t('success') || 'Hazır', `"${existing.name}" kateqoriyası bütün məhsullara tətbiq edildi`);
                return;
            }

            let res;
            if (isIsmayilli) {
                res = await ismayilliApi.createCategory({ name });
            } else {
                res = await categoryApi.create({ name });
            }

            if (res?.success && res.data) {
                const newCat = res.data;
                setCategories(prev => [...prev, newCat]);
                applyGlobalCategory(newCat.id);
                Alert.success(t('success') || 'Hazır', `"${newCat.name}" kateqoriyası yaradıldı və seçildi`);
            } else {
                Alert.error(tAlert('error') || 'Xəta!', res?.message || 'Kateqoriya yaradıla bilmədi');
            }
        } catch (err) {
            console.error('Quick category create error:', err);
            Alert.error(tAlert('error') || 'Xəta!', err.response?.data?.message || 'Kateqoriya yaradıla bilmədi');
        } finally {
            setQuickCatLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] max-h-[90vh] flex flex-col mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {t('excel_bulk_add') || 'Excel Üslubunda Məhsul Əlavə Et'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {t('excel_bulk_desc') || 'Excel-dən kopyalayıb bura yapışdıra və ya birbaşa daxil edə bilərsiniz'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isIsmayilli && (
                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 shadow-sm">
                                <div className="bg-blue-600 p-1.5 rounded-lg">
                                    <MapPin className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider leading-none mb-1">
                                        {t('target_branch') || 'Hədəf Filial'}
                                    </span>
                                    <select
                                        value={targetBranchId}
                                        onChange={(e) => setTargetBranchId(e.target.value)}
                                        disabled={user?.role?.name !== 'superadmin' && user?.isBoss !== true}
                                        className="text-sm font-bold text-gray-900 bg-transparent outline-none disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <option value="central">{t('central_warehouse') || 'Mərkəzi Anbar'}</option>
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Table Area */}
                <div className="flex-1 overflow-auto p-4">
                    {/* Global mənfəət % */}
                    <div className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-600 p-2 rounded-lg">
                                <Percent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-purple-900">Mənfəət Faizi (Global)</p>
                                <p className="text-xs text-purple-700">Bütün məhsullara tətbiq olunacaq · Satış = Alış × {multiplier.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {[20, 30, 50, 70, 100].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setProfitPercent(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        Number(profitPercent) === p
                                            ? 'bg-purple-600 text-white border-purple-600 shadow'
                                            : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-50'
                                    }`}
                                >
                                    {p}%
                                </button>
                            ))}
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={profitPercent}
                                    onChange={(e) => setProfitPercent(e.target.value)}
                                    className="w-24 h-9 pl-3 pr-7 text-sm font-bold text-purple-900 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-500" />
                            </div>
                        </div>
                    </div>

                    {/* Global Kateqoriya / Alt Kateqoriya */}
                    <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-600 p-2 rounded-lg">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-amber-900">Kateqoriya (Global)</p>
                                <p className="text-xs text-amber-700">
                                    Seçim bütün məhsullara tətbiq olunur · Hər sətirdə fərqli də seçə bilərsiniz
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 relative">
                            {/* Global Category */}
                            <div className="relative">
                                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500" />
                                <input
                                    type="text"
                                    placeholder="Kateqoriya seç..."
                                    value={globalCatOpen ? globalCatSearch : getCategoryName(globalCategoryId)}
                                    onFocus={() => { setGlobalCatOpen(true); setGlobalCatSearch(''); }}
                                    onBlur={() => setTimeout(() => setGlobalCatOpen(false), 200)}
                                    onChange={(e) => setGlobalCatSearch(e.target.value)}
                                    className={`w-52 h-9 pl-8 pr-3 text-sm border-2 border-amber-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 ${globalCategoryId ? 'font-bold text-amber-900' : 'text-amber-700'}`}
                                />
                                {globalCatOpen && (
                                    <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-white border border-amber-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                        {globalFilteredCategories.length === 0 ? (
                                            <div className="p-2 text-xs text-gray-400 italic">Tapılmadı</div>
                                        ) : globalFilteredCategories.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); applyGlobalCategory(c.id); setGlobalCatOpen(false); }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b border-gray-50 last:border-0 truncate ${globalCategoryId === c.id ? 'bg-amber-100 font-bold' : ''}`}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Global SubCategory — yalnız Fitech */}
                            {!isIsmayilli && (
                                <div className="relative">
                                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500" />
                                    <input
                                        type="text"
                                        placeholder={globalCategoryId ? "Alt kateqoriya..." : "Əvvəl kateqoriya"}
                                        disabled={!globalCategoryId}
                                        value={globalSubOpen ? globalSubSearch : getSubCategoryName(globalSubCategoryId)}
                                        onFocus={() => { setGlobalSubOpen(true); setGlobalSubSearch(''); }}
                                        onBlur={() => setTimeout(() => setGlobalSubOpen(false), 200)}
                                        onChange={(e) => setGlobalSubSearch(e.target.value)}
                                        className={`w-52 h-9 pl-8 pr-3 text-sm border-2 border-orange-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200 ${globalSubCategoryId ? 'font-bold text-orange-900' : 'text-orange-700'}`}
                                    />
                                    {globalSubOpen && globalCategoryId && (
                                        <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-white border border-orange-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                            {globalFilteredSubCategories.length === 0 ? (
                                                <div className="p-2 text-xs text-gray-400 italic">Tapılmadı</div>
                                            ) : globalFilteredSubCategories.map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onMouseDown={(e) => { e.preventDefault(); applyGlobalSubCategory(s.id); setGlobalSubOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 truncate ${globalSubCategoryId === s.id ? 'bg-orange-100 font-bold' : ''}`}
                                                >
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(globalCategoryId || globalSubCategoryId) && (
                                <button
                                    type="button"
                                    onClick={clearGlobalCategory}
                                    className="px-2 py-1 text-xs font-bold text-amber-700 hover:text-amber-900 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
                                    title="Qlobal seçimi təmizlə"
                                >
                                    Təmizlə
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sürətli kateqoriya yaratma */}
                    <div className="mb-4 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-600 p-1.5 rounded-lg">
                                <Plus className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-900">Sürətli Kateqoriya Yarat</p>
                                <p className="text-[11px] text-emerald-700">Ad yazın və "Yarat və Tətbiq Et" düyməsinə basın — bütün məhsullara assign olunacaq</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {['Qabqacaq', 'Geyim', 'Xırdavat', 'İçki'].map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setQuickCatName(preset)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                        quickCatName === preset
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                            <input
                                type="text"
                                value={quickCatName}
                                onChange={(e) => setQuickCatName(e.target.value)}
                                placeholder="Kateqoriya adı"
                                className="w-40 h-9 px-3 text-sm border-2 border-emerald-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 font-semibold text-emerald-900"
                            />
                            <button
                                type="button"
                                onClick={createOrPickQuickCategory}
                                disabled={quickCatLoading || !quickCatName.trim()}
                                className="flex items-center gap-1.5 px-3 h-9 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {quickCatLoading ? 'Yaradılır...' : 'Yarat və Tətbiq Et'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                            <strong>İpucu:</strong> Yuxarıdakı qlobal kateqoriya seçimi bütün sətirlərə tətbiq olunur, lakin hər sətirdə fərqli kateqoriya da seçə bilərsiniz. Excel-dəki cədvəlinizi (Ad, Miqdar, Ölçü, Alış Qiyməti) seçib kopyalayıb Ad xanasına yapışdırın. Satış qiyməti faizə əsasən, strixkod isə arxa planda avtomatik yaradılır.
                        </p>
                    </div>

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 sticky top-0 z-10">
                                <th className="border border-gray-300 p-2 text-center text-sm font-semibold text-gray-700 w-12">#</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700">{t('name') || 'Ad'}*</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-24">{t('quantity') || 'Miqdar'}</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-32">{t('unit') || 'Ölçü vahidi'}</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-44 bg-amber-50">
                                    Kateqoriya{isIsmayilli ? '*' : ''}
                                </th>
                                {!isIsmayilli && (
                                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-44 bg-amber-50">
                                        Alt Kateqoriya
                                    </th>
                                )}
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-32">{t('purchase_price') || 'Alış Qiyməti'}*</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-64 bg-purple-50">
                                    Hesablanan Satış Qiyməti
                                </th>
                                <th className="border border-gray-300 p-2 text-center text-sm font-semibold text-gray-700 w-12">
                                    <Trash2 className="w-4 h-4 mx-auto" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const purchase = parseFloat(row.purchasePrice);
                                const hasPurchase = Number.isFinite(purchase) && purchase > 0;
                                const sale = computeSalePrice(row.purchasePrice, profitPercent);
                                return (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="border border-gray-300 p-1 text-center text-gray-500 text-sm">{index + 1}</td>
                                        <td className="border border-gray-300 p-0">
                                            <input
                                                type="text"
                                                className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors"
                                                value={row.name}
                                                onChange={(e) => handleChange(index, 'name', e.target.value)}
                                                onPaste={(e) => handlePaste(e, index)}
                                                placeholder="Məhsul adı..."
                                            />
                                        </td>
                                        <td className="border border-gray-300 p-0">
                                            <input
                                                type="number"
                                                className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors"
                                                value={row.stock}
                                                onChange={(e) => handleChange(index, 'stock', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="border border-gray-300 p-0">
                                            <select
                                                className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors bg-transparent"
                                                value={row.unitType}
                                                onChange={(e) => handleChange(index, 'unitType', e.target.value)}
                                            >
                                                <option value="PIECE">Ədəd (Pcs)</option>
                                                <option value="BOX">Qutu (Box)</option>
                                                <option value="KILOGRAM">Kilogram (Kg)</option>
                                                <option value="LITER">Litr (L)</option>
                                                <option value="METER">Metr (M)</option>
                                            </select>
                                        </td>
                                        {/* Kateqoriya */}
                                        <td className="border border-gray-300 p-0 relative bg-amber-50/30">
                                            {isIsmayilli ? (
                                                <select
                                                    className={`w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors bg-transparent ${row.categoryId ? 'font-semibold text-amber-700' : 'text-gray-400'}`}
                                                    value={row.categoryId || ''}
                                                    onChange={(e) => handleChange(index, 'categoryId', e.target.value)}
                                                >
                                                    <option value="">— Seç —</option>
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Axtar..."
                                                        value={activeSearchRow === `cat-${index}` ? searchQuery.category : getCategoryName(row.categoryId)}
                                                        onFocus={() => { setActiveSearchRow(`cat-${index}`); setSearchQuery(q => ({ ...q, category: '' })); }}
                                                        onBlur={() => setTimeout(() => setActiveSearchRow(null), 200)}
                                                        onChange={(e) => setSearchQuery(q => ({ ...q, category: e.target.value }))}
                                                        className={`w-full h-10 px-2 pr-7 outline-none focus:bg-blue-50 transition-colors ${row.categoryId ? 'font-semibold text-amber-700' : ''}`}
                                                    />
                                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                                    {activeSearchRow === `cat-${index}` && (
                                                        <div className="absolute z-30 top-full left-0 right-0 bg-white border border-amber-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                            {filteredCategories.length === 0 ? (
                                                                <div className="p-2 text-xs text-gray-400 italic">Tapılmadı</div>
                                                            ) : filteredCategories.map(c => (
                                                                <button
                                                                    key={c.id}
                                                                    type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleChange(index, 'categoryId', c.id);
                                                                        handleChange(index, 'subCategoryId', '');
                                                                        setActiveSearchRow(null);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b border-gray-50 last:border-0 truncate"
                                                                >
                                                                    {c.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        {/* Alt Kateqoriya - yalnız Fitech */}
                                        {!isIsmayilli && (
                                            <td className="border border-gray-300 p-0 relative bg-amber-50/30">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder={row.categoryId ? "Axtar..." : "Əvvəl kateqoriya"}
                                                        disabled={!row.categoryId}
                                                        value={activeSearchRow === `sub-${index}` ? searchQuery.subCategory : getSubCategoryName(row.subCategoryId)}
                                                        onFocus={() => { setActiveSearchRow(`sub-${index}`); setSearchQuery(q => ({ ...q, subCategory: '' })); }}
                                                        onBlur={() => setTimeout(() => setActiveSearchRow(null), 200)}
                                                        onChange={(e) => setSearchQuery(q => ({ ...q, subCategory: e.target.value }))}
                                                        className={`w-full h-10 px-2 pr-7 outline-none focus:bg-blue-50 transition-colors disabled:bg-gray-50 disabled:text-gray-300 ${row.subCategoryId ? 'font-semibold text-amber-700' : ''}`}
                                                    />
                                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                                    {activeSearchRow === `sub-${index}` && row.categoryId && (
                                                        <div className="absolute z-30 top-full left-0 right-0 bg-white border border-amber-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                            {filteredSubCategoriesFor(row.categoryId).length === 0 ? (
                                                                <div className="p-2 text-xs text-gray-400 italic">Tapılmadı</div>
                                                            ) : filteredSubCategoriesFor(row.categoryId).map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleChange(index, 'subCategoryId', s.id);
                                                                        setActiveSearchRow(null);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b border-gray-50 last:border-0 truncate"
                                                                >
                                                                    {s.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td className="border border-gray-300 p-0">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors font-semibold"
                                                value={row.purchasePrice}
                                                onChange={(e) => handleChange(index, 'purchasePrice', e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-1 bg-purple-50/40">
                                            {hasPurchase ? (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-gray-600 font-medium">{purchase.toFixed(2)} ₼</span>
                                                    <span className="text-purple-500 font-bold">×</span>
                                                    <span className="text-purple-700 font-bold">{multiplier.toFixed(2)}</span>
                                                    <span className="text-purple-400 font-bold">=</span>
                                                    <span className="text-emerald-700 font-black text-base">{sale.toFixed(2)} ₼</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Alış qiyməti daxil edin...</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 p-1 text-center">
                                            <button
                                                onClick={() => removeRow(index)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    <button
                        onClick={addRow}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                    >
                        <Plus className="w-4 h-4" />
                        {t('add_row') || 'Sətir Əlavə Et'}
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500 font-medium">
                        {rows.filter(r => r.name).length} {t('valid_products_ready') || 'məhsul hazırda daxil edilib'}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {t('cancel') || 'Ləğv et'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || rows.filter(r => r.name).length === 0}
                            className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? (t('saving') || 'Saxlanılır...') : (t('save_all') || 'Hamısını Yadda Saxla')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Barcode Print Modal — Save uğurlu olduqdan sonra açılır */}
            <BarcodePrintModal
                isOpen={printModalOpen}
                onClose={handlePrintModalClose}
                products={createdProducts}
            />
        </div>
    );
}
