import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function IsmayilliBarcodeLabelBody({ product, barcodeValue, paper, storeName = 'İsmayıllı' }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !barcodeValue?.trim()) return;
    try {
      JsBarcode(svgRef.current, barcodeValue.trim(), {
        format: 'CODE128',
        lineColor: '#0f172a',
        width: paper.barcodeWidth,
        height: paper.barcodeHeight,
        displayValue: true,
        fontSize: paper.barcodeFontSize,
        fontOptions: 'bold',
        margin: 0,
      });
    } catch (err) {
      console.error('Barcode render error:', err);
    }
  }, [barcodeValue, paper]);

  if (!product || !barcodeValue?.trim()) return null;

  const price = parseFloat(product.unitPriceSale || 0).toFixed(2);

  return (
    <div
      style={{
        width: `${paper.labelWidthMm}mm`,
        height: `${paper.labelHeightMm}mm`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        padding: `${paper.paddingMm}mm`,
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: '#fff',
        color: '#0f172a',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: `${paper.storeFontPx}px`,
          fontWeight: 800,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          color: '#1e293b',
          borderBottom: '0.5px solid #cbd5e1',
          width: '100%',
          paddingBottom: '0.5px',
        }}
      >
        {storeName}
      </div>
      <div
        style={{
          fontSize: `${paper.nameFontPx}px`,
          fontWeight: 700,
          lineHeight: 1.1,
          maxHeight: `${paper.nameFontPx * 2.4}px`,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          margin: '0.5px 0',
          width: '100%',
        }}
      >
        {product.name}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: `${paper.barcodeAreaMm}mm`,
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        <svg ref={svgRef} style={{ width: '100%', height: '100%', maxHeight: `${paper.barcodeAreaMm}mm` }} />
      </div>
      <div
        style={{
          fontSize: `${paper.priceFontPx}px`,
          fontWeight: 900,
          color: '#000',
          borderTop: '0.5px dashed #cbd5e1',
          width: '100%',
          paddingTop: '0.5px',
        }}
      >
        {price} AZN
      </div>
    </div>
  );
}
