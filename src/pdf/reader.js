import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to local bundled worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
}

/**
 * Read ArrayBuffer of PDF and extract all text and layout items
 */
export async function extractTextFromPdf(arrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';
    const pagesData = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageStrings = textContent.items.map(item => item.str);
      const pageText = pageStrings.join(' ');
      
      pagesData.push({
        pageNum,
        text: pageText,
        itemCount: textContent.items.length
      });

      fullText += pageText + '\n\n';
    }

    return {
      success: true,
      numPages,
      fullText,
      pagesData
    };
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    return {
      success: false,
      error: error.message || 'Failed to read PDF'
    };
  }
}
