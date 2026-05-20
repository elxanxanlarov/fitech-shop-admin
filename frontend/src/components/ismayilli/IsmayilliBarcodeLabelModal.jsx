import { useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, Barcode } from 'lucide-react';
import IsmayilliBarcodeLabelBody from './IsmayilliBarcodeLabelBody';
import {
  BARCODE_LABEL_PRESETS,
  DEFAULT_BARCODE_LABEL_PRESET_ID,
  buildBarcodeLabelConfig,
  getBarcodeLabelPageStyle,
} from '../../constants/ismayilliBarcodeLabelPaper';

export default function IsmayilliBarcodeLabelModal({
  isOpen,
  onClose,
  product,
  barcodeValue,
  storeName = 'İsmayıllı',
}) {
  const printRef = useRef(null);

  const [presetId, setPresetId] = useState(DEFAULT_BARCODE_LABEL_PRESET_ID);
  const [customWidth, setCustomWidth] = useState('30');
  const [customHeight, setCustomHeight] = useState('20');

  const paper = useMemo(
    () =>
      buildBarcodeLabelConfig(presetId, {
        widthMm: customWidth,
        heightMm: customHeight,
      }),
    [presetId, customWidth, customHeight]
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Etiket-${product?.name || 'barcode'}`,
    pageStyle: getBarcodeLabelPageStyle(paper),
  });

  if (!isOpen || !product || !barcodeValue?.trim()) return null;

  const presetOptions = Object.values(BARCODE_LABEL_PRESETS);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ştrixkod etiketi</h2>
              <p className="text-xs text-slate-500">Etiket ölçüsünü seçin, önizləyin və çap edin</p>
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
                Etiket ölçüsü
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
                    min={20}
                    max={120}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Hündürlük (mm)</label>
                  <input
                    type="number"
                    min={15}
                    max={200}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Printer dialoqunda da eyni ölçünü seçin (məs: <strong>ETİKET 30×20 mm</strong>). Default: 30×20 mm.
            </p>
          </div>

          <div className="md:col-span-3 bg-slate-100 p-4 rounded-xl border border-slate-200 overflow-auto max-h-[55vh] flex flex-col items-center justify-start">
            <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Ön baxış</p>
            <div
              className="bg-white shadow-md border border-slate-200 flex items-center justify-center"
              style={{
                width: `${paper.widthMm}mm`,
                height: `${paper.heightMm}mm`,
                minWidth: `${paper.widthMm}mm`,
                minHeight: `${paper.heightMm}mm`,
              }}
            >
              <div ref={printRef} id="ismayilli-barcode-label-print">
                <IsmayilliBarcodeLabelBody
                  product={product}
                  barcodeValue={barcodeValue}
                  paper={paper}
                  storeName={storeName}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              {paper.widthMm} × {paper.heightMm} mm — {product.name}
            </p>
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
          #ismayilli-barcode-label-print, #ismayilli-barcode-label-print * { visibility: visible; }
          #ismayilli-barcode-label-print {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
