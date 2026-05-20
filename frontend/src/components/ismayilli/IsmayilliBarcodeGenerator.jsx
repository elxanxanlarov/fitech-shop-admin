import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ismayilliApi } from '../../api';
import Alert from '../ui/Alert';
import JsBarcode from 'jsbarcode';
import { Barcode, Search, Sparkles, Printer, Save, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import IsmayilliBarcodeLabelModal from './IsmayilliBarcodeLabelModal';

export default function IsmayilliBarcodeGenerator() {
  const location = useLocation();
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
  const [showLabelModal, setShowLabelModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    // Close dropdown on click outside
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Re-render barcode when barcode value changes
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
      const res = await ismayilliApi.getAllProducts();
      if (res.success) {
        setProducts(res.data);
        
        // Check for auto-select from location state
        if (location.state?.selectedBarcode) {
          const autoSelectTarget = res.data.find(p => p.barcode === location.state.selectedBarcode);
          if (autoSelectTarget) {
            setSelectedProduct(autoSelectTarget);
            setBarcodeValue(autoSelectTarget.barcode || '');
            setSearchQuery(autoSelectTarget.name);
          }
        }
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
    // EAN-13 style random retail code starting with 200 (store coupon / retail prefix)
    const prefix = '2000';
    let code = prefix;
    for (let i = 0; i < 8; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    // Add check digit
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

    // Check if barcode belongs to another product
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
      const res = await ismayilliApi.updateProduct(selectedProduct.id, payload);
      if (res.success) {
        Alert.success('Uğurlu', 'Məhsulun ştrixkodu uğurla yeniləndi!');
        
        // Update local list
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

  const handleOpenPrintModal = () => {
    if (!selectedProduct || !barcodeValue?.trim()) return;
    setShowLabelModal(true);
  };


  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
          <Barcode className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ştrixkod Generator (İsmayıllı)</h1>
          <p className="text-slate-500 text-sm mt-1">İsmayıllı məhsulları üçün sürətli ştrixkod yaradılması, redaktəsi və etiket çapı</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Side: Search & Selection (3 cols) */}
        <div className="md:col-span-3 space-y-6">
          {/* Search Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <label className="block text-sm font-bold text-slate-700">Məhsul Seçin</label>
            <div ref={dropdownRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Məhsul adı və ya barkoduna görə axtarın..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all"
                />
              </div>

              {/* Search Dropdown */}
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
                          {parseFloat(p.unitPriceSale).toFixed(2)} AZN
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
                  <Layers className="text-purple-600 w-5 h-5" /> Məhsul Məlumatları
                </h3>
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Seçilib
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Məhsulun Adı</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedProduct.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Kateqoriya</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedProduct.category?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Stok Miqdarı</span>
                  <span className="font-bold text-slate-800 text-sm">{parseFloat(selectedProduct.quantity)} ədəd</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Satış Qiyməti</span>
                  <span className="font-extrabold text-blue-600 text-sm">{parseFloat(selectedProduct.unitPriceSale).toFixed(2)} AZN</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-sm font-bold text-slate-700">Ştrixkod Dəyəri</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    placeholder="Ştrixkodu daxil edin və ya yaradın..."
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
                  <Save className="w-4 h-4" /> Barkodu Yadda Saxla
                </button>
                <button
                  type="button"
                  onClick={handleOpenPrintModal}
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
                {/* Visual Stick label mimicking standard 30mm x 20mm barcode tag */}
                <div 
                  className="bg-white border border-slate-200 shadow-md rounded-lg p-2.5 w-[220px] min-h-[140px] flex flex-col justify-between items-center text-center select-none"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  <div className="text-[7px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 w-full">
                    İsmayıllı Mağazası
                  </div>
                  <div className="text-[9px] font-bold text-slate-800 line-clamp-2 leading-tight my-1 min-h-[22px] w-full px-1">
                    {selectedProduct.name}
                  </div>
                  <div className="w-full flex items-center justify-center my-0.5" id="barcode-svg-container">
                    <svg id="barcode-svg" className="w-full max-h-12"></svg>
                  </div>
                  <div className="text-[10px] font-black text-slate-950 border-t border-dashed border-slate-100 pt-1 w-full mt-0.5">
                    Qiymət: {parseFloat(selectedProduct.unitPriceSale).toFixed(2)} AZN
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-medium">Bu görünüş termal barkod kağızı (30mm × 20mm) üçün optimallaşdırılmışdır</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 text-center text-slate-400 space-y-3">
                <Barcode className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-semibold">Önizləmə üçün məhsul seçin və ştrixkod daxil edin</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <IsmayilliBarcodeLabelModal
        isOpen={showLabelModal}
        product={selectedProduct}
        barcodeValue={barcodeValue}
        onClose={() => setShowLabelModal(false)}
      />
    </div>
  );
}
