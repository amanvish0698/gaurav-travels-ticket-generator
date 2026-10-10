import { extractTextFromPdf } from '../pdf/reader.js';
import { parseTicketText } from '../parsers/index.js';
import { showToast } from './toast.js';

export function initUploadView(onTicketParsed) {
  const container = document.getElementById('upload-pane');
  if (!container) return;

  container.innerHTML = `
    <div class="card" style="max-width: 840px; margin: 0 auto;">
      <div class="card-header" style="text-align: center; display: block; border-bottom: none; margin-bottom: 0.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-primary); margin-bottom: 0.35rem;">
          Generate Branded Travel Agency Ticket
        </h2>
        <p style="font-size: 0.95rem; color: var(--color-text-muted);">
          Upload any flight booking PDF from EaseMyTrip, Cleartrip, Goibibo, or MakeMyTrip. We'll extract the trip facts and apply your Gaurav Tour and Travels agency branding instantly.
        </p>
      </div>

      <div id="dropzone" class="dropzone-container">
        <div class="dropzone-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <div class="dropzone-title">Drag & Drop OTA Flight Ticket PDF Here</div>
        <div class="dropzone-sub">or click to browse your computer (PDF only, max 20MB)</div>
        <input type="file" id="file-input" accept="application/pdf" style="display: none;" />
        <button type="button" id="browse-btn" class="btn btn-primary">Select Ticket PDF</button>

        <div class="sample-load-bar">
          <span style="font-size: 0.85rem; color: var(--color-text-muted);">Quick Testing:</span>
          <button type="button" id="load-sample-btn" class="sample-pill">
            <span style="color: var(--color-primary); font-weight: 800;">📄</span>
            Load EaseMyTrip Sample (EDNBKA)
          </button>
        </div>
      </div>

      <div id="upload-status" style="display: none; margin-top: 1.5rem; padding: 1.25rem; border-radius: var(--radius-md); background: var(--color-bg-alt); border: 1px solid var(--color-border); text-align: center;">
        <div id="status-spinner" style="display: inline-block; width: 24px; height: 24px; border: 3px solid rgba(227, 30, 36, 0.2); border-radius: 50%; border-top-color: var(--color-primary); animation: spin 0.8s linear infinite; margin-bottom: 0.5rem;"></div>
        <div id="status-title" style="font-weight: 700; color: var(--color-text);">Reading PDF contents...</div>
        <div id="status-desc" style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.25rem;">Extracting text layers and flight segments...</div>
      </div>
    </div>
  `;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  const loadSampleBtn = document.getElementById('load-sample-btn');
  const uploadStatus = document.getElementById('upload-status');
  const statusTitle = document.getElementById('status-title');
  const statusDesc = document.getElementById('status-desc');
  const statusSpinner = document.getElementById('status-spinner');

  browseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone?.addEventListener('click', () => {
    fileInput.click();
  });

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  loadSampleBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    setStatus(true, 'Fetching sample ticket PDF...', 'Loading samples/easemytrip_sample.pdf');
    try {
      const response = await fetch('./easemytrip_sample.pdf');
      if (!response.ok) throw new Error('Sample file could not be loaded via HTTP: ' + response.statusText);
      const arrayBuffer = await response.arrayBuffer();
      await processPdfBuffer(arrayBuffer, 'easemytrip_sample.pdf');
    } catch (err) {
      console.error(err);
      setStatus(false);
      showToast('Error loading sample: ' + err.message, 'error');
    }
  });

  function setStatus(show, title = '', desc = '', isError = false) {
    if (!uploadStatus) return;
    uploadStatus.style.display = show ? 'block' : 'none';
    if (statusTitle) statusTitle.textContent = title;
    if (statusDesc) statusDesc.textContent = desc;
    if (statusSpinner) statusSpinner.style.display = isError ? 'none' : 'inline-block';
    if (isError) {
      uploadStatus.style.borderColor = 'var(--color-danger)';
      uploadStatus.style.backgroundColor = 'var(--color-danger-bg)';
      if (statusTitle) statusTitle.style.color = 'var(--color-danger)';
    } else {
      uploadStatus.style.borderColor = 'var(--color-border)';
      uploadStatus.style.backgroundColor = 'var(--color-bg-alt)';
      if (statusTitle) statusTitle.style.color = 'var(--color-text)';
    }
  }

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      showToast('Please upload a valid PDF file.', 'warning');
      return;
    }
    setStatus(true, `Reading ${file.name}...`, 'Extracting text and identifying OTA format...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      await processPdfBuffer(arrayBuffer, file.name);
    } catch (err) {
      console.error('PDF Read error:', err);
      setStatus(true, 'Failed to read PDF file', err.message || 'The PDF file is corrupted or unreadable.', true);
      showToast('Failed to read PDF: ' + err.message, 'error');
    }
  }

  async function processPdfBuffer(arrayBuffer, filename) {
    setStatus(true, 'Extracting text layer...', 'Running parser on PDF data...');
    const result = await extractTextFromPdf(arrayBuffer);
    if (!result.success) {
      setStatus(true, 'Unreadable PDF', result.error, true);
      showToast('PDF could not be parsed: ' + result.error, 'error');
      return;
    }

    if (!result.fullText || result.fullText.trim().length < 40) {
      setStatus(true, 'No text detected (Scanned PDF)', 'This PDF appears to be a scanned image without a native text layer. Please use a digital e-ticket PDF.', true);
      showToast('No readable text found in PDF.', 'warning');
      return;
    }

    setStatus(true, 'Analyzing trip facts...', 'Detecting OTA & parsing segments...');
    const ticketData = parseTicketText(result.fullText);
    ticketData.sourceFilename = filename;

    setStatus(false);
    showToast(`Successfully extracted ticket (${ticketData.validation.detectedOta?.name || 'OTA'})!`, 'success');
    if (onTicketParsed) {
      onTicketParsed(ticketData);
    }
  }
}
