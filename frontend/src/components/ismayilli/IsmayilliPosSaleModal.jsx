import { ShoppingCart, X, Plus, Minus, Trash2, CheckCircle2, DollarSign, FileText } from 'lucide-react';

export default function IsmayilliPosSaleModal({
  isOpen,
  onClose,
  basket,
  onUpdateQuantity,
  onRemoveItem,
  paidAmount,
  onPaidAmountChange,
  note,
  onNoteChange,
  totalAmount,
  onCompleteSale,
  submitting,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-purple-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg">Sürətli Satış (Barkod)</h2>
              <p className="text-white/80 text-xs">Skan edilmiş məhsullar — satışı buradan tamamlayın</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-slate-50/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200/50 text-xs font-extrabold uppercase">
                  <th className="p-3">Məhsul</th>
                  <th className="p-3 text-center">Barkod</th>
                  <th className="p-3 text-right">Qiymət</th>
                  <th className="p-3 text-center w-28">Say</th>
                  <th className="p-3 text-right">Cəmi</th>
                  <th className="p-3 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm bg-white">
                {basket.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Barkod skan edin — məhsul buraya əlavə olunacaq
                    </td>
                  </tr>
                ) : (
                  basket.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50/30">
                      <td className="p-3 font-bold text-slate-800">{item.name}</td>
                      <td className="p-3 text-center font-mono text-xs text-slate-400">{item.barcode || '-'}</td>
                      <td className="p-3 text-right font-semibold text-slate-600">{item.price.toFixed(2)} AZN</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.productId, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.productId, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-purple-600">
                        {(item.quantity * item.price).toFixed(2)} AZN
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-red-500 hover:bg-red-50 p-1 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-purple-600" /> Qeyd
              </label>
              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Satış qeydi..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Ümumi:</span>
                <span className="font-bold text-slate-700">{totalAmount.toFixed(2)} AZN</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-purple-600" /> Ödənilən (AZN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => onPaidAmountChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-extrabold text-lg"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onPaidAmountChange(totalAmount.toString())}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Tam ödəniş
                </button>
                {[5, 10, 20, 50, 100].map((cash) => (
                  <button
                    key={cash}
                    type="button"
                    onClick={() => onPaidAmountChange(String(cash))}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    {cash} AZN
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <div className="text-sm">
            Cəmi: <span className="font-extrabold text-purple-600 text-xl">{totalAmount.toFixed(2)} AZN</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-sm"
            >
              Bağla
            </button>
            <button
              type="button"
              onClick={onCompleteSale}
              disabled={submitting || basket.length === 0}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Satışı tamamla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
