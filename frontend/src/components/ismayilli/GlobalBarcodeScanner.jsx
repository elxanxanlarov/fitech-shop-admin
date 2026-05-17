import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ismayilliApi, productApi, saleApi } from '../../api';
import Alert from '../ui/Alert';
import { ShoppingCart, X, Plus, Minus, Trash2, CheckCircle2, DollarSign, FileText } from 'lucide-react';

export default function GlobalBarcodeScanner() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [basket, setBasket] = useState([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isIsmayilli = user?.store === 'ISMAYILLI';

  // Play standard commercial POS checkout beep sound
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1100; // standard cash register beep frequency
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.error("Beep error:", e);
    }
  };

  useEffect(() => {
    // Only works if logged in
    if (!user) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = async (e) => {
      // Ignore if any input field is active
      const active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.tagName === 'SELECT' ||
        active.isContentEditable
      )) {
        return;
      }

      const currentTime = Date.now();

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          const barcode = buffer.trim();
          buffer = '';
          await handleFindAndAddProduct(barcode);
        }
      } else if (e.key.length === 1) {
        // Reset buffer if delay is too long (clear slow manual typing)
        if (currentTime - lastKeyTime > 150) {
          buffer = '';
        }
        buffer += e.key;
        lastKeyTime = currentTime;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, basket, isOpen]);

  const handleFindAndAddProduct = async (barcode) => {
    try {
      let res;
      if (isIsmayilli) {
        res = await ismayilliApi.getAllProducts({ search: barcode });
      } else {
        res = await productApi.getAll({ search: barcode });
      }

      if (res.success && res.data && res.data.length > 0) {
        // Find exact barcode match
        const matched = res.data.find(p => p.barcode === barcode);
        if (matched) {
          playBeep();
          addProductToBasket(matched);
        } else {
          Alert.error('Xəta', `"${barcode}" barkoduna tam uyğun məhsul tapılmadı`);
        }
      } else {
        Alert.error('Xəta', `Bu barkoda uyğun məhsul tapılmadı: ${barcode}`);
      }
    } catch (err) {
      console.error("Global barcode lookup error:", err);
    }
  };

  const addProductToBasket = (prod) => {
    setIsOpen(true);
    setBasket(prev => {
      const existingIndex = prev.findIndex(item => item.productId === prod.id);
      const stockKey = isIsmayilli ? 'quantity' : 'stock';
      const priceKey = isIsmayilli ? 'unitPriceSale' : 'salePrice';
      
      const maxStock = parseFloat(prod[stockKey] || 0);
      const price = parseFloat(prod[priceKey] || 0);

      if (existingIndex > -1) {
        const nextQty = prev[existingIndex].quantity + 1;
        if (nextQty > maxStock) {
          Alert.error('Xəta', `Stokda kifayət qədər məhsul yoxdur! Mövcud stok: ${maxStock}`);
          return prev;
        }
        const newBasket = [...prev];
        newBasket[existingIndex].quantity = nextQty;
        return newBasket;
      } else {
        if (maxStock <= 0) {
          Alert.error('Xəta', 'Bu məhsulun stoku tükənib!');
          return prev;
        }
        return [...prev, {
          productId: prod.id,
          name: prod.name,
          barcode: prod.barcode,
          price: price,
          maxStock: maxStock,
          quantity: 1
        }];
      }
    });
  };

  const updateQuantity = (productId, amount) => {
    setBasket(prev => {
      const idx = prev.findIndex(item => item.productId === productId);
      if (idx === -1) return prev;
      const nextQty = prev[idx].quantity + amount;
      if (nextQty <= 0) {
        return prev.filter(item => item.productId !== productId);
      }
      if (nextQty > prev[idx].maxStock) {
        Alert.error('Xəta', `Kifayət qədər stok yoxdur. Maksimum: ${prev[idx].maxStock}`);
        return prev;
      }
      const newBasket = [...prev];
      newBasket[idx].quantity = nextQty;
      return newBasket;
    });
  };

  const totalAmount = useMemo(() => {
    return basket.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [basket]);

  // Sync paidAmount when totalAmount changes unless user modified it
  useEffect(() => {
    setPaidAmount(totalAmount.toString());
  }, [totalAmount]);

  const handleCompleteSale = async () => {
    if (basket.length === 0) return;
    setSubmitting(true);
    try {
      Alert.loading('Satış tamamlanır...');
      let res;
      
      if (isIsmayilli) {
        const payload = {
          items: basket.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          paidAmount: paidAmount ? parseFloat(paidAmount) : totalAmount,
          note: note
        };
        res = await ismayilliApi.createSale(payload);
      } else {
        const payload = {
          items: basket.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            pricePerItem: item.price
          })),
          totalAmount: totalAmount,
          paidAmount: paidAmount ? parseFloat(paidAmount) : totalAmount,
          customerName: "Sürətli Müştəri",
          note: note,
          branchId: user?.branchId || 'central'
        };
        res = await saleApi.create(payload);
      }

      if (res.success) {
        Alert.success('Uğurlu', 'Sürətli satış uğurla tamamlandı!');
        setBasket([]);
        setPaidAmount('');
        setNote('');
        setIsOpen(false);
        // Refresh product list slightly delayed
        setTimeout(() => window.location.reload(), 1500);
      } else {
        Alert.error('Xəta', res.message || 'Satış xətası');
      }
    } catch (err) {
      console.error("Global scanner checkout error:", err);
      Alert.error('Xəta', err.response?.data?.message || 'Satış tamamlanarkən xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || basket.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-purple-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg">
                Sürətli Barkod Satışı {isIsmayilli ? '(İsmayıllı)' : '(Mərkəzi/Filial)'}
              </h2>
              <p className="text-white/80 text-xs">Barkod oxuyucu vasitəsilə sürətli kassa satışı</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setBasket([]);
              setIsOpen(false);
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Scanned Products Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-slate-50/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200/50 text-xs font-extrabold uppercase">
                  <th className="p-3">Məhsul Adı</th>
                  <th className="p-3 text-center">Barkod</th>
                  <th className="p-3 text-right">Qiymət</th>
                  <th className="p-3 text-center w-28">Say</th>
                  <th className="p-3 text-right">Cəmi</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm bg-white">
                {basket.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-3 font-bold text-slate-800">{item.name}</td>
                    <td className="p-3 text-center font-mono text-xs text-slate-400">{item.barcode || '-'}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">{item.price.toFixed(2)} AZN</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-slate-800 text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-purple-600">{(item.quantity * item.price).toFixed(2)} AZN</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setBasket(prev => prev.filter(p => p.productId !== item.productId))}
                        className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Checkout & Payment Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Left: Notes & Note inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" /> Satış Qeydi
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Satış üçün əlavə qeydlər..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
                />
              </div>
            </div>

            {/* Right: Payment details */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center text-slate-500 text-sm">
                <span>Ümumi Məbləğ:</span>
                <span className="font-bold text-slate-700">{totalAmount.toFixed(2)} AZN</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-purple-600" /> Ödənilən Məbləğ (AZN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-extrabold text-slate-800 text-lg"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setPaidAmount(totalAmount.toString())}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  Tam Ödəniş
                </button>
                {[5, 10, 20, 50, 100].map(cash => (
                  <button
                    key={cash}
                    onClick={() => setPaidAmount(cash.toString())}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    {cash} AZN
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <div className="text-sm">
            Cəmi Yekun: <span className="font-extrabold text-purple-600 text-xl">{totalAmount.toFixed(2)} AZN</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setBasket([]);
                setIsOpen(false);
              }}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition-colors"
            >
              Ləğv Et
            </button>
            <button
              onClick={handleCompleteSale}
              disabled={submitting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm transition-colors shadow-md shadow-purple-100 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Satışı Tamamla
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
