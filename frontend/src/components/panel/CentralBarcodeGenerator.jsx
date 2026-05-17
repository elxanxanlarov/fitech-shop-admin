import { useState, useEffect, useMemo, useRef } from 'react';
import { productApi } from '../../api';
import Alert from '../ui/Alert';
import JsBarcode from 'jsbarcode';
import { Barcode, Search, Sparkles, Printer, Save, Layers, CheckCircle2, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CentralBarcodeGenerator() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Barcode State
  const [barcodeValue, setBarcodeValue] = useState('');
  const [saving, setSaving] = useState(false);

  const isHeadAdmin = useMemo(() => {
    if (!user || !user.role) return false;
    const r = user.role.name?.toLowerCase();
    return r === 'superadmin';
  }, [user]);

  useEffect(() => {
    fetchProducts();
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (barcodeValue) {
      try {
        JsBarcode("#barcode-svg", barcodeValue, {
          format: "CODE128",
          lineColor: "#0f172a",
          width: 1.4,
          height: 38,
          displayValue: true,
          fontSize: 9,
          fontOptions: "bold"
        });
      } catch (err) {
        console.error("Barcode rendering error:", err);
      }
    }
  }, [barcodeValue]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll();
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
      Alert.error('Xəta', 'Məhsullar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setBarcodeValue(prod.barcode || '');
    setSearchQuery(prod.name);
    setShowDropdown(false);
  };

  const handleGenerateRandomBarcode = () => {
    if (!selectedProduct) {
      Alert.error('Xəta', 'Zəhmət olmasa əvvəlcə məhsul seçin');
      return;
    }
    const prefix = '2000006';
    let code = prefix;
    for (let i = 0; i < 5; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const finalBarcode = code + checkDigit;

    setBarcodeValue(finalBarcode);
    Alert.toast('Uğurlu', 'Unikal yeni ştrixkod yaradıldı!');
  };

  const handleSaveBarcode = async () => {
    if (!selectedProduct) return;
    if (!barcodeValue.trim()) {
      Alert.error('Xəta', 'Ştrixkod sahəsi boş ola bilməz');
      return;
    }

    const conflict = products.find(p => p.barcode === barcodeValue.trim() && p.id !== selectedProduct.id);
    if (conflict) {
      Alert.error('Xəta', `Bu ştrixkod artıq digər bir məhsula aiddir: "${conflict.name}"`);
      return;
    }

    setSaving(true);
    try {
      Alert.loading('Ştrixkod yaddaşa yazılır...');
      const payload = {
        ...selectedProduct,
        barcode: barcodeValue.trim()
      };
      const res = await productApi.update(selectedProduct.id, payload);
      if (res.success) {
        Alert.success('Uğurlu', 'Məhsulun ştrixkodu uğurla yeniləndi!');
        setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, barcode: barcodeValue.trim() } : p));
        setSelectedProduct(prev => ({ ...prev, barcode: barcodeValue.trim() }));
      }
    } catch (err) {
      console.error("Save barcode error:", err);
      Alert.close();
      Alert.error('Xəta', err.response?.data?.message || 'Yadda saxlanılarkən xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintLabel = () => {
    if (!selectedProduct || !barcodeValue) return;

    const printWindow = window.open('', '_blank');
    const svgHtml = document.getElementById('barcode-svg-container').innerHTML;
    
    const invasion = `
      <html>
        <head>
          <title>Ştrixkod Çapı - ${selectedProduct.name}</title>
          <style>
            @page {
              size: 30mm 20mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              height: 20mm;
              width: 30mm;
              background-color: white;
              overflow: hidden;
            }
            .label-card {
              width: 28mm;
              height: 18mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              box-sizing: border-box;
              padding: 1px 2px;
              text-align: center;
            }
            .store-header {
              font-size: 4.5px;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #1e293b;
              border-bottom: 0.5px solid #cbd5e1;
              width: 100%;
              padding-bottom: 0.5px;
            }
            .product-name {
              font-size: 5.5px;
              font-weight: 700;
              color: #0f172a;
              line-height: 1.1;
              max-height: 12px;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              word-break: break-word;
            }
            .barcode-area {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              height: 10mm;
            }
            .barcode-area svg {
              max-height: 100%;
              max-width: 100%;
            }
            .price-tag {
              font-size: 6px;
              font-weight: 900;
              color: #020617;
              border-top: 0.5px dashed #cbd5e1;
              width: 100%;
              padding-top: 0.5px;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="store-header">Fitech</div>
            <div class="product-name">${selectedProduct.name}</div>
            <div class="barcode-area">${svgHtml}</div>
            <div class="price-tag">Qiymət: ${parseFloat(selectedProduct.salePrice || selectedProduct.unitPriceSale || 0).toFixed(2)} AZN</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(invasion);
    printWindow.document.close();
  };

  const handleBulkAssignBarcodes = async () => {
    if (!window.confirm('DİQQƏT! Bütün məhsulların barkodunu "2000006xxxxxx" formatında təsadüfi olaraq yenidən təyin etmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz!')) {
      return;
    }

    try {
      Alert.loading('Bütün barkodlar təyin edilir...');
      const res = await productApi.bulkAssignBarcodes();
      if (res.success) {
        Alert.success('Uğurlu', res.message || 'Barkodlar uğurla təyin edildi');
        fetchProducts(); // Refresh list
        setSelectedProduct(null);
        setBarcodeValue('');
        setSearchQuery('');
      } else {
        Alert.error('Xəta', res.message || 'Barkodlar təyin edilərkən xəta baş verdi');
      }
    } catch (error) {
      console.error('Bulk assign barcodes error:', error);
      Alert.error('Xəta', 'Server ilə əlaqə saxlanılarkən xəta baş verdi');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Barcode className="text-purple-600 w-7 h-7" /> Mərkəzi Ştrixkod Yaradıcı
          </h1>
          <p className="text-slate-500 text-sm mt-1">Fitech (Mərkəzi anbar) məhsulları üçün ştrixkod dizaynı və çapı</p>
        </div>
        
        {isHeadAdmin && (
          <button
            onClick={handleBulkAssignBarcodes}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm transition-all border border-indigo-200"
            title="Bütün məhsullara avtomatik barkod təyin et"
          >
            <RefreshCcw className="w-4 h-4" /> Kütləvi Barkod Təyin Et
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Side: Controls (3 cols) */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 relative">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Məhsul Seçimi</label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Məhsul adı və ya barkoduna görə axtarın..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all"
                />
              </div>

              {/* Dropdown */}
              {showDropdown && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-2 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-50">
                  {loading ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Yüklənir...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Heç bir məhsul tapılmadı</div>
                  ) : (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="p-3 hover:bg-purple-50/50 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800 text-sm block truncate">{p.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{p.barcode || 'Barkodsuz'}</span>
                        </div>
                        <span className="text-xs font-bold text-purple-600 shrink-0">
                          {parseFloat(p.salePrice || p.unitPriceSale || 0).toFixed(2)} AZN
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Product Details Form */}
          {selectedProduct && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="text-purple-600 w-5 h-5" /> Məlumatlar
                </h3>
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Seçilib
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Adı</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedProduct.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Kateqoriya</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedProduct.category?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Stok</span>
                  <span className="font-bold text-slate-800 text-sm">{parseFloat(selectedProduct.stock || selectedProduct.quantity || 0)} {selectedProduct.unitType || 'ədəd'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Satış Qiyməti</span>
                  <span className="font-extrabold text-blue-600 text-sm">{parseFloat(selectedProduct.salePrice || selectedProduct.unitPriceSale || 0).toFixed(2)} AZN</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-sm font-bold text-slate-700">Ştrixkod Dəyəri</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    placeholder="Daxil edin və ya yaradın..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold transition-all"
                  />
                  <button
                    onClick={handleGenerateRandomBarcode}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-semibold shrink-0"
                    title="Avtomatik ştrixkod yarat"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" /> Avto-Yarat
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={handleSaveBarcode}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md shadow-purple-100"
                >
                  <Save className="w-4 h-4" /> Yadda Saxla
                </button>
                <button
                  onClick={handlePrintLabel}
                  disabled={!barcodeValue}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md shadow-slate-900/10"
                >
                  <Printer className="w-4 h-4" /> Etiketi Çap Et
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Sticker Label Preview (2 cols) */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Etiket Önizləmə</h3>

            {selectedProduct && barcodeValue ? (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
                <div 
                  className="bg-white border border-slate-200 shadow-md rounded-lg p-2.5 w-[220px] min-h-[140px] flex flex-col justify-between items-center text-center select-none"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  <div className="text-[7px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 w-full">
                    Fitech
                  </div>
                  <div className="text-[9px] font-bold text-slate-800 line-clamp-2 leading-tight my-1 min-h-[22px] w-full px-1">
                    {selectedProduct.name}
                  </div>
                  <div className="w-full flex items-center justify-center my-0.5" id="barcode-svg-container">
                    <svg id="barcode-svg" className="w-full max-h-12"></svg>
                  </div>
                  <div className="text-[10px] font-black text-slate-950 border-t border-dashed border-slate-100 pt-1 w-full mt-0.5">
                    Qiymət: {parseFloat(selectedProduct.salePrice || selectedProduct.unitPriceSale || 0).toFixed(2)} AZN
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-medium">Bu görünüş termal barkod kağızı (30mm × 20mm) üçün optimallaşdırılmışdır</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 text-center text-slate-400 space-y-3">
                <Barcode className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-semibold">Önizləmə üçün məhsul seçin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
