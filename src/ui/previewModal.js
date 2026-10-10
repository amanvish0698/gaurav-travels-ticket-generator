import * as pdfjsLib from 'pdfjs-dist';
import { downloadPdfBlob } from '../pdf/generator.js';
import { showToast } from './toast.js';

let cachedPdfBytes = null;
let cachedFilename = 'Ticket.pdf';
let currentPdfDoc = null;

/**
 * Open the PDF preview modal and render all pages onto canvas elements
 */
export async function openPdfPreviewModal(pdfBytes, filename) {
  cachedPdfBytes = pdfBytes;
  cachedFilename = filename;

  const modal = document.getElementById('preview-modal');
  const previewBody = document.getElementById('modal-preview-body');
  const modalTitle = document.getElementById('modal-preview-title');
  if (!modal || !previewBody) return;

  if (modalTitle) {
    modalTitle.textContent = `Ticket Preview: ${filename}`;
  }

  // Show loading indicator
  previewBody.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; color: var(--color-text-muted);">
      <div style="width: 32px; height: 32px; border: 3px solid rgba(227, 30, 36, 0.2); border-radius: 50%; border-top-color: var(--color-primary); animation: spin 0.8s linear infinite; margin-bottom: 0.75rem;"></div>
      <div style="font-weight: 600; font-size: 0.95rem;">Rendering Pages (Page 1 & Page 2)...</div>
    </div>
  `;

  modal.classList.add('open');

  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    currentPdfDoc = await loadingTask.promise;
    const numPages = currentPdfDoc.numPages;

    previewBody.innerHTML = `
      <div style="padding: 1rem; background: #525659; min-height: 100%; display: flex; flex-direction: column; align-items: center; gap: 1.25rem;">
        <div style="width: 100%; max-width: 650px; display: flex; justify-content: space-between; align-items: center; background: #323639; padding: 0.5rem 1rem; border-radius: var(--radius-md); color: #FFF; font-size: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>Showing ${numPages} Page${numPages > 1 ? 's' : ''} (A4 Official Ticket)</div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" id="btn-modal-open-tab" class="btn btn-secondary btn-sm" style="background: #4A4D51; color: #FFF; border: none;">
              ↗ Open in New Tab
            </button>
            <button type="button" id="btn-modal-download" class="btn btn-primary btn-sm">
              ⬇ Download PDF
            </button>
          </div>
        </div>
        <div id="canvas-pages-container" style="width: 100%; max-width: 650px; display: flex; flex-direction: column; gap: 1.25rem;"></div>
      </div>
    `;

    const pagesContainer = document.getElementById('canvas-pages-container');

    // Render each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await currentPdfDoc.getPage(pageNum);
      
      // Calculate responsive scale for mobile and desktop
      const containerWidth = Math.min(window.innerWidth - 48, 650);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth / unscaledViewport.width) * (window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale });

      const canvasWrapper = document.createElement('div');
      canvasWrapper.style.position = 'relative';
      canvasWrapper.style.background = '#FFFFFF';
      canvasWrapper.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
      canvasWrapper.style.borderRadius = '4px';
      canvasWrapper.style.overflow = 'hidden';

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';

      canvasWrapper.appendChild(canvas);
      pagesContainer.appendChild(canvasWrapper);

      const renderContext = {
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
      };
      await page.render(renderContext).promise;
    }

    // Bind action buttons
    document.getElementById('btn-modal-download')?.addEventListener('click', () => {
      if (cachedPdfBytes) {
        downloadPdfBlob(cachedPdfBytes, cachedFilename);
        showToast(`Downloaded ${cachedFilename}!`, 'success');
      }
    });

    document.getElementById('btn-modal-open-tab')?.addEventListener('click', () => {
      if (cachedPdfBytes) {
        const blob = new Blob([cachedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    });

  } catch (err) {
    console.error('Failed to render PDF preview:', err);
    previewBody.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <div style="color: var(--color-danger); font-weight: 700; margin-bottom: 0.5rem;">Could not render visual preview</div>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem;">${err.message}</p>
        <button type="button" id="btn-fallback-download" class="btn btn-primary">Download PDF Directly</button>
      </div>
    `;
    document.getElementById('btn-fallback-download')?.addEventListener('click', () => {
      if (cachedPdfBytes) downloadPdfBlob(cachedPdfBytes, cachedFilename);
    });
  }
}
