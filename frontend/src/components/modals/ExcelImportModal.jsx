import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import Alert from '../ui/Alert';

export default function ExcelImportModal({ isOpen, onClose, onImport }) {
    const { t } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

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

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.error(tAlert('error') || 'Xəta!', t('no_file_selected') || 'Zəhmət olmasa fayl seçin');
            return;
        }

        setUploading(true);
        try {
            await onImport(selectedFile);
            setSelectedFile(null);
            // Reset file input
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
                    {/* Format Information */}
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
                                        <li><strong>{t('name') || 'Ad'}</strong> - {t('excel_name_desc') || 'Məhsul adı (mütləq)'}</li>
                                        <li><strong>{t('purchase_price') || 'Alış Qiyməti'}</strong> - {t('excel_purchase_price_desc') || 'Alış qiyməti (mütləq)'}</li>
                                        <li><strong>{t('sale_price') || 'Satış Qiyməti'}</strong> - {t('excel_sale_price_desc') || 'Satış qiyməti (mütləq)'}</li>
                                        <li><strong>{t('stock') || 'Stok'}</strong> - {t('excel_stock_desc') || 'Stok miqdarı (mütləq)'}</li>
                                        <li><strong>{t('barcode') || 'Barcode'}</strong> - {t('excel_barcode_desc') || 'Barcode (istəyə bağlı)'}</li>
                                        <li><strong>{t('description') || 'Təsvir'}</strong> - {t('excel_description_desc') || 'Məhsul təsviri (istəyə bağlı)'}</li>
                                        <li><strong>{t('category') || 'Kateqoriya'}</strong> - {t('excel_category_desc') || 'Kateqoriya adı (istəyə bağlı)'}</li>
                                        <li><strong>{t('subcategory') || 'Alt Kateqoriya'}</strong> - {t('excel_subcategory_desc') || 'Alt kateqoriya adı (istəyə bağlı)'}</li>
                                        <li><strong>{t('is_active') || 'Aktiv'}</strong> - {t('excel_is_active_desc') || 'true/false və ya 1/0 (istəyə bağlı, default: true)'}</li>
                                        <li><strong>{t('is_official') || 'Rəsmi'}</strong> - {t('excel_is_official_desc') || 'true/false və ya 1/0 (istəyə bağlı, default: false)'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Example Table */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                            {t('excel_example') || 'Nümunə Format:'}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('name') || 'Ad'}</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('purchase_price') || 'Alış Qiyməti'}</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('sale_price') || 'Satış Qiyməti'}</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('stock') || 'Stok'}</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('barcode') || 'Barcode'}</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('category') || 'Kateqoriya'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">Məhsul 1</td>
                                        <td className="border border-gray-300 px-3 py-2">10.00</td>
                                        <td className="border border-gray-300 px-3 py-2">15.00</td>
                                        <td className="border border-gray-300 px-3 py-2">100</td>
                                        <td className="border border-gray-300 px-3 py-2">123456789</td>
                                        <td className="border border-gray-300 px-3 py-2">Elektronika</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">Məhsul 2</td>
                                        <td className="border border-gray-300 px-3 py-2">20.00</td>
                                        <td className="border border-gray-300 px-3 py-2">30.00</td>
                                        <td className="border border-gray-300 px-3 py-2">50</td>
                                        <td className="border border-gray-300 px-3 py-2">987654321</td>
                                        <td className="border border-gray-300 px-3 py-2">Geyim</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
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

