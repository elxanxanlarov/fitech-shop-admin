import { useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, FileText } from 'lucide-react';
import IsmayilliReceiptBody from './IsmayilliReceiptBody';
import { formatCheckNumber } from '../../utils/ismayilliReceiptFormat';
import {
  RECEIPT_PAPER_PRESETS,
  DEFAULT_RECEIPT_PAPER_PRESET_ID,
  buildPaperConfig,
  getPrintPageStyle,
} from '../../constants/ismayilliReceiptPaper';

export default function IsmayilliReceiptModal({ isOpen, onClose, sale, type = 'sale' }) {
  const printRef = useRef(null);

  const [presetId, setPresetId] = useState(DEFAULT_RECEIPT_PAPER_PRESET_ID);
  const [customWidth, setCustomWidth] = useState('80');
  const [customHeight, setCustomHeight] = useState('');
  const [customFontSize, setCustomFontSize] = useState('11');

  const paper = useMemo(
    () =>
      buildPaperConfig(presetId, {
        widthMm: customWidth,
        bodyWidthMm: Math.max(Number(customWidth) - 8, 52),
        fontSizePx: customFontSize,
        heightMm: customHeight,
      }),
    [presetId, customWidth, customHeight, customFontSize]
  );

  const checkNo = sale ? formatCheckNumber(sale.checkNumber, sale.id) : '';

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Cek-${checkNo}`,
    pageStyle: getPrintPageStyle(paper),
  });

  if (!isOpen || !sale) return null;

  const presetOptions = Object.values(RECEIPT_PAPER_PRESETS);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Satış çeki</h2>
              <p className="text-xs text-slate-500">Ölçünü seçin, önizləyin və istəsəniz çap edin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 block">
                Kağız ölçüsü
              </label>
              <div className="grid grid-cols-1 gap-2">
                {presetOptions.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPresetId(preset.id)}
                    className={`text-left px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      presetId === preset.id
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-100 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    {preset.label}
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                      En: {preset.widthMm}mm · Hündürlük: avtomatik
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPresetId('custom')}
                  className={`text-left px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    presetId === 'custom'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  Xüsusi ölçü
                </button>
              </div>
            </div>

            {presetId === 'custom' && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">En (mm)</label>
                  <input
                    type="number"
                    min={48}
                    max={120}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">
                    Hündürlük (mm) — boş = avtomatik
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={400}
                    placeholder="Avtomatik"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Şrift (px)</label>
                  <input
                    type="number"
                    min={8}
                    max={18}
                    value={customFontSize}
                    onChange={(e) => setCustomFontSize(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Standart termal printer üçün <strong>Normal (80mm)</strong> seçin. Dar kağız üçün 58mm, daha böyük
              mətn üçün böyük şrift variantını istifadə edin.
            </p>
          </div>

          <div className="md:col-span-3 bg-slate-100 p-3 rounded-xl border border-slate-200 overflow-y-auto max-h-[55vh]">
            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">Ön baxış</p>
            <div
              className="bg-white shadow-sm mx-auto overflow-hidden"
              style={{ width: `${Math.min(paper.widthMm, 80)}mm`, maxWidth: '100%' }}
            >
              <div ref={printRef} id="ismayilli-receipt-print">
                <IsmayilliReceiptBody sale={sale} type={type} paper={paper} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/80 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-white font-bold transition-all"
          >
            Bağla
          </button>
          <button
            type="button"
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-8 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold transition-all shadow-lg shadow-purple-600/20"
          >
            <Printer className="w-4 h-4" />
            Çap et
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ismayilli-receipt-print, #ismayilli-receipt-print * { visibility: visible; }
          #ismayilli-receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
