import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, FileSpreadsheet, AlertCircle, MapPin } from 'lucide-react';
import Alert from '../ui/Alert';
import { productApi, branchApi } from '../../api';
import { useAuth, useBranch } from '../../hooks';

export default function ExcelTableModal({ isOpen, onClose, onRefresh, isIsmayilli = false }) {
    const { t } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const { user } = useAuth();
    const { selectedBranchId: contextBranchId } = useBranch();
    
    const initialRow = {
        barcode: '',
        name: '',
        stock: '',
        unitType: 'PIECE',
        purchasePrice: '',
        salePrice: ''
    };

    const [rows, setRows] = useState([{ ...initialRow }]);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const [targetBranchId, setTargetBranchId] = useState(contextBranchId || 'central');

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

    if (!isOpen) return null;

    const addRow = () => {
        setRows([...rows, { ...initialRow }]);
    };

    const removeRow = (index) => {
        if (rows.length === 1) {
            setRows([{ ...initialRow }]);
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
                
                // Unit type mapping
                const rawUnit = (cells[3] || '').toLowerCase().trim();
                let unitType = 'PIECE';
                if (rawUnit.includes('qutu') || rawUnit.includes('box')) unitType = 'BOX';
                else if (rawUnit.includes('kq') || rawUnit.includes('kg') || rawUnit.includes('kilo')) unitType = 'KILOGRAM';
                else if (rawUnit.includes('litr') || rawUnit.includes('ltr') || rawUnit === 'l') unitType = 'LITER';
                else if (rawUnit.includes('metr') || rawUnit.includes('mtr') || rawUnit === 'm') unitType = 'METER';

                const rowData = {
                    barcode: cells[0] || '',
                    name: cells[1] || '',
                    stock: cells[2] || '',
                    unitType: unitType,
                    purchasePrice: cells[4] || '',
                    // cells[5] is discount price - skipped
                    // cells[6] is cəmi məbləğ - only use as fallback if cells[7] (SATIŞ) is missing
                    salePrice: cells.length >= 8 ? (cells[7] || '') : (cells[6] || '')
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
        // Validate rows
        const validProducts = rows.filter(row => row.name && row.purchasePrice && row.salePrice);
        
        if (validProducts.length === 0) {
            Alert.error(tAlert('error') || 'Xəta!', t('fill_required_fields') || 'Zəhmət olmasa tələb olunan sahələri doldurun (Ad, Alış və Satış qiyməti)');
            return;
        }

        setLoading(true);
        try {
            Alert.loading(t('saving') || 'Yadda saxlanılır...');
            
            const response = await productApi.bulkCreate({
                products: validProducts,
                branchId: isIsmayilli ? undefined : targetBranchId,
                store: isIsmayilli ? 'ISMAYILLI' : undefined
            });

            Alert.close();

            if (response.success) {
                Alert.success(
                    t('success') || 'Uğurlu!',
                    response.message || `${response.data?.successCount} məhsul əlavə edildi`
                );
                onRefresh();
                onClose();
                setRows([{ ...initialRow }]);
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                            <strong>İpucu:</strong> Excel-dəki cədvəlinizi (Strixkod, Ad, Miqdar, Ölçü, Qiymət, Endirim, Cəmi) seçib kopyalayın və birinci xanaya yapışdırın (Ctrl+V). Endirimli qiymət avtomatik keçiləcək.
                        </p>
                    </div>

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 sticky top-0 z-10">
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-12 text-center">#</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700">{t('barcode') || 'Strixkod'}</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700">{t('name') || 'Ad'}*</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-24">{t('quantity') || 'Miqdar'}</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-32">{t('unit') || 'Ölçü vahidi'}</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-32">{t('purchase_price') || 'Alış Qiyməti'}*</th>
                                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-32">{t('sale_price') || 'Satış Qiyməti (Cəmi)'}*</th>
                                <th className="border border-gray-300 p-2 text-center text-sm font-semibold text-gray-700 w-12">
                                    <Trash2 className="w-4 h-4 mx-auto" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="border border-gray-300 p-1 text-center text-gray-500 text-sm">{index + 1}</td>
                                    <td className="border border-gray-300 p-0">
                                        <input
                                            type="text"
                                            className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors"
                                            value={row.barcode}
                                            onChange={(e) => handleChange(index, 'barcode', e.target.value)}
                                            onPaste={(e) => handlePaste(e, index)}
                                            placeholder="Barkod..."
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-0">
                                        <input
                                            type="text"
                                            className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors"
                                            value={row.name}
                                            onChange={(e) => handleChange(index, 'name', e.target.value)}
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
                                    <td className="border border-gray-300 p-0">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors"
                                            value={row.purchasePrice}
                                            onChange={(e) => handleChange(index, 'purchasePrice', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-0">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full h-10 px-2 outline-none focus:bg-blue-50 transition-colors font-semibold text-blue-700"
                                            value={row.salePrice}
                                            onChange={(e) => handleChange(index, 'salePrice', e.target.value)}
                                            placeholder="0.00"
                                        />
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
                            ))}
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
        </div>
    );
}
