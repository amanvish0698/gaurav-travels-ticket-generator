import bwipjs from 'bwip-js';

/**
 * Generate a PDF417 airline barcode PNG byte array in browser or Node environment
 */
export async function generateBarcodePngBytes(barcodeText) {
  const text = barcodeText || 'EDNBKA/SANABOYINA 91022013808283';

  // Check if running in browser (document and canvas available)
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid: 'pdf417',
      text: text,
      scale: 2,
      height: 12,
      includetext: false,
      paddingwidth: 2,
      paddingheight: 2
    });

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }

  // Node environment fallback (for unit tests / scripts)
  if (typeof bwipjs.toBuffer === 'function') {
    const buffer = await bwipjs.toBuffer({
      bcid: 'pdf417',
      text: text,
      scale: 2,
      height: 12,
      includetext: false,
      paddingwidth: 2,
      paddingheight: 2
    });
    return new Uint8Array(buffer);
  }

  throw new Error('Barcode generation unsupported in current runtime');
}
