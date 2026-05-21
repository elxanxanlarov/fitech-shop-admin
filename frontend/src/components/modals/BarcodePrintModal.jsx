import React, { useRef, useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import JsBarcode from 'jsbarcode';

// Predefined sticker / receipt sizes
const SIZES = {
  '30x20': {
    label: '30mm x 20mm (Kiçik)',
    width: '30mm',
    height: '20mm',
    barcodeHeight: 20,
    barcodeWidth: 1.1,
    fontSize: 7,
    textMargin: 1,
    nameSize: '7px',
    priceSize: '11px',
    maxSvgHeight: '9mm'
  },
  '40x30': {
    label: '40mm x 30mm (Orta)',
    width: '40mm',
    height: '30mm',
    barcodeHeight: 35,
    barcodeWidth: 1.3,
    fontSize: 9,
    textMargin: 2,
    nameSize: '9px',
    priceSize: '15px',
    maxSvgHeight: '14mm'
  },
  '58x40': {
    label: '58mm x 40mm (Standart)',
    width: '58mm',
    height: '40mm',
    barcodeHeight: 50,
    barcodeWidth: 1.6,
    fontSize: 11,
    textMargin: 3,
    nameSize: '12px',
    priceSize: '22px',
    maxSvgHeight: '19mm'
  },
  '80': {
    label: '80mm x 80mm (Geniş)',
    width: '80mm',
    height: '80mm',
    barcodeHeight: 100,
    barcodeWidth: 2.0,
    fontSize: 14,
    textMargin: 4,
    nameSize: '16px',
    priceSize: '32px',
    maxSvgHeight: '38mm'
  }
};

// Individual Barcode Card Sub-component for printing
function BarcodeCard({ product, sizeConfig }) {
  const localBarcodeRef = useRef(null);

  useEffect(() => {
    if (product?.barcode && localBarcodeRef.current) {
      try {
        // Strictly use CODE128 to bypass checksum validation issues with custom values
        JsBarcode(localBarcodeRef.current, product.barcode.trim(), {
          format: "CODE128",
          lineColor: "#000",
          width: sizeConfig.barcodeWidth,
          height: sizeConfig.barcodeHeight,
          displayValue: true,
          fontSize: sizeConfig.fontSize,
          margin: 0,
          textMargin: 1
        });
      } catch (error) {
        console.error("Barcode generation error:", error);
      }
    }
  }, [product, sizeConfig]);

  return (
    <div 
      className="bg-white flex flex-col items-center justify-between p-[2px] overflow-hidden barcode-print-card print:m-0"
      style={{ 
        width: sizeConfig.width, 
        height: sizeConfig.height, 
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        border: 'none',
        outline: 'none',
        boxShadow: 'none'
      }}
    >
      {/* Product Name */}
      <div 
        className="text-center font-bold uppercase tracking-tight leading-none w-full px-[2px] truncate"
        style={{ fontSize: sizeConfig.nameSize, fontFamily: 'Arial, sans-serif' }}
      >
        {product.name}
      </div>
      
      {/* Price */}
      <div 
        className="text-center font-extrabold whitespace-nowrap"
        style={{ 
          fontFamily: 'Arial, sans-serif', 
          fontSize: sizeConfig.priceSize, 
          lineHeight: '1', 
          margin: sizeConfig.width === '30mm' ? '2px 0' : '4px 0' 
        }}
      >
        {typeof product.salePrice === 'number' 
          ? product.salePrice.toFixed(2) 
          : parseFloat(product.salePrice || 0).toFixed(2)} man.
      </div>

      {/* Barcode SVG */}
      <div className="flex items-center justify-center w-full overflow-hidden" style={{ border: 'none' }}>
        <svg 
          ref={localBarcodeRef} 
          style={{ 
            maxWidth: '100%', 
            height: 'auto', 
            maxHeight: sizeConfig.maxSvgHeight,
            shapeRendering: 'crispEdges',
            border: 'none',
            outline: 'none'
          }}
        ></svg>
      </div>
    </div>
  );
}

export default function BarcodePrintModal({ isOpen, onClose, product, products }) {
  const componentRef = useRef(null);
  const screenBarcodeRef = useRef(null);
  const [selectedSize, setSelectedSize] = useState('30x20');
  const [previewIdx, setPreviewIdx] = useState(0);

  // Normalize: either bulk products list, or single product
  const productList = Array.isArray(products) && products.length > 0
    ? products
    : (product ? [product] : []);
  const isBulk = productList.length > 1;
  const previewProduct = productList[Math.min(previewIdx, productList.length - 1)] || null;

  // Generate the clean barcode preview on screen (always fixed size for gorgeous UI)
  useEffect(() => {
    if (isOpen && previewProduct?.barcode && screenBarcodeRef.current) {
      try {
        JsBarcode(screenBarcodeRef.current, previewProduct.barcode.trim(), {
          format: "CODE128",
          lineColor: "#000",
          width: 1.3,
          height: 35,
          displayValue: true,
          fontSize: 10,
          margin: 0,
          textMargin: 2
        });
      } catch (error) {
        console.error("Screen preview barcode error:", error);
      }
    }
  }, [isOpen, previewProduct]);

  // Reset preview index when products change
  useEffect(() => { setPreviewIdx(0); }, [productList.length, isOpen]);

  const activeSize = SIZES[selectedSize] || SIZES['30x20'];

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: isBulk ? `Barcodes_${productList.length}` : (previewProduct ? `Barcode_${previewProduct.barcode}` : 'Barcode'),
    pageStyle: `
      @page {
        size: ${activeSize.width} ${activeSize.height} !important;
        margin: 0 !important;
      }
      @media print {
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff;
        }
      }
    `
  });

  if (!isOpen || productList.length === 0) return null;

  // Print-only styling rules
  const printStyles = `
    @media print {
      /* Hide everything except print area */
      body *, html * {
        visibility: hidden !important;
      }
      .barcode-print-container, 
      .barcode-print-container *,
      .barcode-print-card, 
      .barcode-print-card * {
        visibility: visible !important;
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
      }
      .barcode-print-card {
        page-break-after: always !important;
        break-after: page !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        width: ${activeSize.width} !important;
        height: ${activeSize.height} !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      .barcode-print-card:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  `;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            Barkod Çapı
            {isBulk && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700">
                {productList.length} ədəd
              </span>
            )}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center bg-gray-50/50 overflow-y-auto">
          
          {/* Options Panel: Size Selector */}
          <div className="flex flex-col gap-3 w-full bg-white p-3 rounded-xl border border-slate-100 shadow-sm mb-4">
            
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-600">Ölçü Seçimi:</span>
              <select 
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-sm font-medium focus:outline-none focus:border-green-500"
              >
                {Object.entries(SIZES).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            {isBulk && (
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-600">Önizləmə:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}
                    disabled={previewIdx === 0}
                    className="px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >‹</button>
                  <span className="text-xs font-black text-purple-700">
                    {previewIdx + 1} / {productList.length}
                  </span>
                  <button
                    onClick={() => setPreviewIdx(i => Math.min(productList.length - 1, i + 1))}
                    disabled={previewIdx >= productList.length - 1}
                    className="px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >›</button>
                </div>
              </div>
            )}
          </div>

          {/* Clean Screen Preview */}
          {previewProduct && (
            <div className="flex justify-center items-center w-full bg-white shadow-inner p-4 rounded-lg">
              <div 
                className="bg-white flex flex-col items-center justify-between p-2 overflow-hidden select-none pointer-events-none"
                style={{ width: '150px', height: '100px', boxSizing: 'border-box' }}
              >
                <div 
                  className="text-center font-bold uppercase tracking-tight leading-none w-full px-1 truncate text-slate-800"
                  style={{ fontSize: '9px', fontFamily: 'Arial, sans-serif' }}
                >
                  {previewProduct.name}
                </div>
                
                <div 
                  className="text-center font-extrabold whitespace-nowrap text-slate-900"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '1', margin: '2px 0' }}
                >
                  {(() => {
                    const price = previewProduct.salePrice ?? previewProduct.unitPriceSale ?? 0;
                    return (typeof price === 'number' ? price : parseFloat(price || 0)).toFixed(2);
                  })()} man.
                </div>

                <div className="flex items-center justify-center w-full overflow-hidden">
                  <svg 
                    ref={screenBarcodeRef} 
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto', 
                      maxHeight: '40px',
                      shapeRendering: 'crispEdges'
                    }}
                  ></svg>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Print Container - render all products sequentially */}
          <div className="hidden">
            <div ref={componentRef} className="bg-white flex flex-col items-center barcode-print-container">
              <style dangerouslySetInnerHTML={{ __html: printStyles }} />
              {productList.map((p, idx) => (
                <BarcodeCard
                  key={p.id || p.barcode || idx}
                  product={{
                    ...p,
                    salePrice: p.salePrice ?? p.unitPriceSale ?? 0,
                  }}
                  sizeConfig={activeSize}
                />
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 mt-4 text-center">
            Etiket ölçüsü: {activeSize.label}
            {isBulk && ` · ${productList.length} ədəd ardıcıl çap olunacaq`}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            Bağla
          </button>
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Çap et
          </button>
        </div>
      </div>
    </div>
  );
}
