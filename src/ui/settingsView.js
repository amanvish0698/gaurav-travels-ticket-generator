import { loadSettings, saveSettings, exportSettingsAsJson, importSettingsFromJson } from '../utils/storage.js';
import { DEFAULT_SETTINGS } from '../models/settingsModel.js';
import { showToast } from './toast.js';

export function initSettingsView(onSettingsChange) {
  const container = document.getElementById('settings-pane');
  if (!container) return;

  let currentSettings = loadSettings();

  function render() {
    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        <!-- Page Title & Header Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--color-primary);">
              Agency Configuration & Settings
            </h2>
            <div style="font-size: 0.85rem; color: var(--color-text-muted);">
              Customize your travel agency branding, contact information, service fee, and custom terms for all generated tickets.
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" id="btn-export-settings" class="btn btn-secondary btn-sm">Export Settings JSON</button>
            <label class="btn btn-secondary btn-sm" style="margin: 0; cursor: pointer;">
              Import Settings JSON
              <input type="file" id="input-import-settings" accept=".json" style="display: none;" />
            </label>
            <button type="button" id="btn-reset-settings" class="btn btn-outline btn-sm">Reset Defaults</button>
          </div>
        </div>

        <form id="settings-form">
          <!-- CARD 1: Brand Identity & Logo -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">1. Brand Identity & Agency Logo</div>
            </div>
            <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.25rem;">
              <div style="border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: 0.5rem; background: #FFF; width: 170px; height: 85px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: var(--shadow-sm);">
                <img id="settings-logo-preview" src="${currentSettings.logoDataUrl || './logo.png'}" alt="Agency Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
              </div>
              <div style="flex: 1; min-width: 240px;">
                <label class="form-label">Upload Custom Company Logo (PNG / JPG)</label>
                <input type="file" id="input-settings-logo" accept="image/png, image/jpeg" class="form-control" style="margin-bottom: 0.5rem;" />
                <div style="font-size: 0.8rem; color: var(--color-text-muted);">
                  Recommended: High-resolution PNG with transparent background. Appears on PDF header and app top bar.
                </div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Company / Agency Name <span class="required">*</span></label>
                <input type="text" id="set-company-name" class="form-control" value="${escapeHtml(currentSettings.companyName)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Agency Tagline</label>
                <input type="text" id="set-tagline" class="form-control" value="${escapeHtml(currentSettings.tagline)}" placeholder="e.g. Your Trusted Journey Partner" />
              </div>
            </div>
          </div>

          <!-- CARD 2: Contact Details & Office Address -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">2. Contact Information & Office Address</div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Primary Phone <span class="required">*</span></label>
                <input type="text" id="set-phone1" class="form-control" value="${escapeHtml(currentSettings.phone1)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Secondary Phone / Landline</label>
                <input type="text" id="set-phone2" class="form-control" value="${escapeHtml(currentSettings.phone2 || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Number <span class="required">*</span></label>
                <input type="text" id="set-whatsapp" class="form-control" value="${escapeHtml(currentSettings.whatsapp)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Customer Support Email <span class="required">*</span></label>
                <input type="email" id="set-email" class="form-control" value="${escapeHtml(currentSettings.email)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Official Website</label>
                <input type="text" id="set-website" class="form-control" value="${escapeHtml(currentSettings.website)}" />
              </div>
              <div class="form-group">
                <label class="form-label">GSTIN / Tax ID</label>
                <input type="text" id="set-gstin" class="form-control" value="${escapeHtml(currentSettings.gstin)}" />
              </div>
              <div class="form-group" style="grid-column: 1 / -1;">
                <label class="form-label">Physical Office Address <span class="required">*</span></label>
                <input type="text" id="set-address" class="form-control" value="${escapeHtml(currentSettings.address)}" required />
              </div>
            </div>
          </div>

          <!-- CARD 3: Service Fee & Operational Support -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">3. Service Fees & Support Helpline</div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Default Service Fee (₹)</label>
                <input type="number" id="set-default-fee" class="form-control" value="${currentSettings.defaultServiceFee || 500}" min="0" step="50" />
                <span style="font-size: 0.75rem; color: var(--color-text-muted);">Default facilitation fee added to tickets automatically.</span>
              </div>
              <div class="form-group">
                <label class="form-label">Default Price Display Mode</label>
                <select id="set-default-display" class="form-control">
                  <option value="total_only" ${currentSettings.defaultFeeDisplay === 'total_only' ? 'selected' : ''}>Show Final Total Only (Recommended)</option>
                  <option value="split" ${currentSettings.defaultFeeDisplay === 'split' ? 'selected' : ''}>Show Base Airfare + Service Fee Separately</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Support Hours</label>
                <input type="text" id="set-support-hours" class="form-control" value="${escapeHtml(currentSettings.supportHours)}" placeholder="Mon - Sat: 09:00 AM - 09:00 PM" />
              </div>
              <div class="form-group">
                <label class="form-label">24x7 Emergency Contact</label>
                <input type="text" id="set-emergency-number" class="form-control" value="${escapeHtml(currentSettings.emergencyNumber)}" placeholder="+91 98765 43210 (24x7)" />
              </div>
            </div>
          </div>

          <!-- CARD 4: Custom Terms & Conditions (Page 2 of PDF) -->
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">4. Terms & Conditions (Printed on Page 2 of PDF)</div>
                <div class="card-subtitle">Separate paragraphs by blank lines or numbers (1, 2, 3...). Each paragraph wraps cleanly across the page.</div>
              </div>
            </div>
            <div class="form-group">
              <textarea id="set-terms" class="form-control" style="min-height: 180px; font-size: 0.85rem; line-height: 1.6;" placeholder="Enter custom terms and conditions here...">${(currentSettings.termsAndConditions || []).join('\n\n')}</textarea>
            </div>
          </div>

          <!-- CARD 5: Important Passenger Guidelines (Printed on Page 1 of PDF) -->
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">5. Quick Travel Guidelines (Printed on Page 1 of PDF)</div>
                <div class="card-subtitle">Key instructions shown directly on the main itinerary page (e.g. ID proof, reporting times).</div>
              </div>
            </div>
            <div class="form-group">
              <textarea id="set-instructions" class="form-control" style="min-height: 120px; font-size: 0.85rem; line-height: 1.6;" placeholder="Enter quick guidelines (one per line)...">${(currentSettings.importantInstructions || []).join('\n')}</textarea>
            </div>
            <div class="form-group" style="margin-top: 1rem;">
              <label class="form-label">Footer Disclaimer</label>
              <input type="text" id="set-footer-disclaimer" class="form-control" value="${escapeHtml(currentSettings.footerDisclaimer)}" />
            </div>
          </div>

          <!-- Save Button Bar with Status Indicator -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem; padding: 1.15rem 1.25rem; background: var(--color-bg-alt); border-radius: var(--radius-md); border: 1px solid var(--color-border); box-shadow: var(--shadow-sm);">
            <div id="settings-status-indicator" style="font-size: 0.875rem; color: var(--color-success); font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>✓ All settings saved and synced with Review & Price.</span>
            </div>
            <button type="submit" id="btn-save-settings" class="btn btn-secondary btn-lg" style="min-width: 220px;" disabled>
              ✓ All Settings Saved
            </button>
          </div>
        </form>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const form = document.getElementById('settings-form');
    const saveBtn = document.getElementById('btn-save-settings');
    const statusIndicator = document.getElementById('settings-status-indicator');
    const logoInput = document.getElementById('input-settings-logo');
    const logoPreview = document.getElementById('settings-logo-preview');
    const exportBtn = document.getElementById('btn-export-settings');
    const importInput = document.getElementById('input-import-settings');
    const resetBtn = document.getElementById('btn-reset-settings');

    function markDirty() {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.className = 'btn btn-primary btn-lg';
        saveBtn.innerHTML = '💾 Save All Settings';
      }
      if (statusIndicator) {
        statusIndicator.innerHTML = '<span style="color: var(--color-primary); font-weight: 700;">● Unsaved changes detected</span> — Click Save to apply to all tickets.';
      }
    }

    function markSaved() {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.className = 'btn btn-secondary btn-lg';
        saveBtn.innerHTML = '✓ All Settings Saved';
      }
      if (statusIndicator) {
        statusIndicator.innerHTML = '<span style="color: var(--color-success); font-weight: 600;">✓ All settings saved and synced with Review & Price.</span>';
      }
    }

    // Attach dirty-tracking listeners to all form controls
    form?.querySelectorAll('input, textarea, select').forEach(control => {
      control.addEventListener('input', markDirty);
      control.addEventListener('change', markDirty);
    });

    logoInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        currentSettings.logoDataUrl = event.target.result;
        logoPreview.src = event.target.result;
        markDirty();
        showToast('Logo changed. Click "Save All Settings" to apply.', 'info');
      };
      reader.readAsDataURL(file);
    });

    exportBtn?.addEventListener('click', () => {
      exportSettingsAsJson(currentSettings);
      showToast('Settings exported as JSON', 'success');
    });

    importInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const imported = await importSettingsFromJson(file);
        currentSettings = imported;
        saveSettings(currentSettings);
        render();
        if (onSettingsChange) onSettingsChange(currentSettings);
        showToast('Settings imported successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    resetBtn?.addEventListener('click', () => {
      if (confirm('Reset all agency settings to defaults? Your customized terms will be restored to Gaurav Tour & Travels defaults.')) {
        currentSettings = { ...DEFAULT_SETTINGS };
        saveSettings(currentSettings);
        render();
        if (onSettingsChange) onSettingsChange(currentSettings);
        showToast('Settings restored to defaults', 'success');
      }
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      currentSettings.companyName = document.getElementById('set-company-name').value.trim();
      currentSettings.tagline = document.getElementById('set-tagline').value.trim();
      currentSettings.phone1 = document.getElementById('set-phone1').value.trim();
      currentSettings.phone2 = document.getElementById('set-phone2').value.trim();
      currentSettings.whatsapp = document.getElementById('set-whatsapp').value.trim();
      currentSettings.email = document.getElementById('set-email').value.trim();
      currentSettings.website = document.getElementById('set-website').value.trim();
      currentSettings.gstin = document.getElementById('set-gstin').value.trim();
      currentSettings.address = document.getElementById('set-address').value.trim();
      currentSettings.supportHours = document.getElementById('set-support-hours').value.trim();
      currentSettings.emergencyNumber = document.getElementById('set-emergency-number').value.trim();
      currentSettings.defaultServiceFee = parseInt(document.getElementById('set-default-fee').value, 10) || 0;
      currentSettings.defaultFeeDisplay = document.getElementById('set-default-display').value;

      // Parse terms paragraphs cleanly: split by double newlines or single newlines
      const termsRaw = document.getElementById('set-terms').value.trim();
      let parsedTerms = [];
      if (termsRaw.includes('\n\n')) {
        parsedTerms = termsRaw.split(/\n\n+/).map(t => t.trim()).filter(Boolean);
      } else {
        parsedTerms = termsRaw.split('\n').map(t => t.trim()).filter(Boolean);
      }
      currentSettings.termsAndConditions = parsedTerms;

      const instRaw = document.getElementById('set-instructions').value.trim();
      currentSettings.importantInstructions = instRaw.split('\n').map(t => t.trim()).filter(Boolean);

      currentSettings.footerDisclaimer = document.getElementById('set-footer-disclaimer').value.trim();

      saveSettings(currentSettings);
      markSaved();
      if (onSettingsChange) onSettingsChange(currentSettings);
      showToast('All agency settings saved and synced with Review & Price!', 'success');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  render();
  return {
    getSettings: () => currentSettings
  };
}
