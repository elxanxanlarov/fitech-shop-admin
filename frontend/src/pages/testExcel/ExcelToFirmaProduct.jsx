import { useState } from 'react';
import axios from 'axios';

export default function ExcelParserPage() {
    const [file, setFile] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUploadAndParse = async () => {
        if (!file) {
            alert("Xahiş olunur öncə Excel faylını seçin!");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            // Backend-ə göndəririk
            const response = await axios.post('/api/products/parse-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                // Cavab gələn kimi cədvələ ötürürük
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error("Xəta:", error);
            alert("Excel analiz edilə bilmədi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Excel-dən Məhsul Oxuma Paneli</h1>

            {/* Yükləmə Alətləri */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center gap-4 mb-6">
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange} 
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <button
                    onClick={handleUploadAndParse}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md transition-all disabled:bg-gray-400"
                >
                    {loading ? "Fayl Oxunur..." : "Exceli Cədvələ Çevir"}
                </button>
            </div>

            {/* Önizləmə Cədvəli */}
            {products.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                        <thead className="bg-gray-800 text-white uppercase text-xs font-semibold tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Ştrixkod</th>
                                <th className="px-4 py-3">Məhsul Adı</th>
                                <th className="px-4 py-3">Aid Olduğu Firma</th>
                                <th className="px-4 py-3">Kateqoriya</th>
                                <th className="px-4 py-3 text-center">Stok (Ədəd)</th>
                                <th className="px-4 py-3 text-right">Alış (1 ədəd)</th>
                                <th className="px-4 py-3 text-right">Satış (1 ədəd)</th>
                                <th className="px-4 py-3 text-right">Cəmi Alış Dəyəri</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-gray-700">
                            {products.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-gray-900 font-medium">{item.barcode}</td>
                                    <td className="px-4 py-3 font-medium text-gray-800">{item.product_name}</td>
                                    <td className="px-4 py-3 text-blue-600 font-semibold">{item.company_name}</td>
                                    <td className="px-4 py-3"><span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{item.category_name}</span></td>
                                    <td className="px-4 py-3 text-center text-green-600 font-bold">{item.stock_quantity}</td>
                                    <td className="px-4 py-3 text-right">{item.single_purchase_price.toFixed(2)} AZN</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{item.single_sale_price.toFixed(2)} AZN</td>
                                    <td className="px-4 py-3 text-right text-gray-500">{item.total_purchase_amount.toFixed(2)} AZN</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                !loading && (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        Cədvəldə göstəriləcək məhsul yoxdur. Zəhmət olmasa yuxarıdan Excel faylı seçib yükləyin.
                    </div>
                )
            )}
        </div>
    );
}