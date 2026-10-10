import { generateTicketPdf, downloadPdfBlob } from '../pdf/generator.js';
import { openPdfPreviewModal } from './previewModal.js';
import { loadSettings } from '../utils/storage.js';
import { showToast } from './toast.js';

export function initReviewView(ticketData, onPdfGenerated) {
  const container = document.getElementById('review-pane');
  if (!container) return;

  let settings = loadSettings();

  // If service fee not already set in ticket, initialize from settings
  if (typeof ticketData.pricing.serviceFee !== 'number' || ticketData.pricing.serviceFee === 0) {
    ticketData.pricing.serviceFee = settings.defaultServiceFee || 500;
  }
  ticketData.pricing.customerTotal = (ticketData.pricing.otaTotal || 0) + ticketData.pricing.serviceFee;
  ticketData.pricing.showFeeBreakdown = settings.defaultFeeDisplay === 'split';

  function render() {
    const isPnrMissing = !ticketData.airlinePnr;
    const isPassengerMissing = !(ticketData.passengers && ticketData.passengers[0]?.name);
    const isTimeMissing = !(ticketData.segments && ticketData.segments[0]?.origin?.time);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-text); display: flex; align-items: center; gap: 0.5rem;">
            Review & Edit Ticket Data
            <span class="badge badge-brand">${ticketData.sourceOta.toUpperCase()}</span>
          </h2>
          <div style="font-size: 0.85rem; color: var(--color-text-muted);">
            Verify extracted flight facts below before generating the final branded customer ticket.
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="btn-preview-pdf" class="btn btn-secondary">
            👁 Preview PDF
          </button>
          <button id="btn-generate-pdf" class="btn btn-primary btn-lg">
            ⬇ Download Branded Ticket PDF
          </button>
        </div>
      </div>

      <!-- Agency Profile & Settings Summary Banner -->
      <div style="background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; font-size: 0.85rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <span class="badge badge-brand" style="background: var(--color-primary); color: #FFF; font-size: 0.75rem;">Agency Branding Active</span>
          <span><strong>${escapeHtml(settings.companyName || 'Gaurav Tour and Travels')}</strong></span>
          <span style="color: var(--color-border);">|</span>
          <span>Facilitation Markup: <strong>₹${ticketData.pricing.serviceFee}</strong></span>
          <span style="color: var(--color-border);">|</span>
          <span>Format: <strong>${ticketData.pricing.showFeeBreakdown ? 'Split Fare' : 'All-Inclusive Total'}</strong></span>
        </div>
        <button type="button" id="btn-jump-settings" class="btn btn-outline btn-sm" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;">
          ⚙️ Change in Agency Settings
        </button>
      </div>

      <!-- Validation Warning Banner if critical fields are missing -->
      ${ticketData.validation?.warnings?.length > 0 ? `
        <div style="background: var(--color-warning-bg); border-left: 4px solid var(--color-warning); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
          <div style="font-weight: 700; color: #92400E; margin-bottom: 0.25rem;">⚠️ Attention: Please review highlighted fields</div>
          <ul style="margin-left: 1.25rem; font-size: 0.85rem; color: #78350F;">
            ${ticketData.validation.warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Row 1: Booking Reference & PNR -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">1. Booking References</div>
          <span class="badge ${ticketData.airlinePnr ? 'badge-success' : 'badge-danger'}">
            ${ticketData.airlinePnr ? 'PNR Detected' : 'PNR Missing'}
          </span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Airline PNR <span class="required">*</span></label>
            <input type="text" id="input-pnr" class="form-control ${isPnrMissing ? 'is-danger' : ''}" value="${escapeHtml(ticketData.airlinePnr)}" placeholder="e.g. EDNBKA" style="font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;" />
          </div>
          <div class="form-group">
            <label class="form-label">OTA Booking ID</label>
            <input type="text" id="input-booking-id" class="form-control" value="${escapeHtml(ticketData.bookingId)}" placeholder="e.g. EMT164390052" />
          </div>
          <div class="form-group">
            <label class="form-label">Booking Date & Time</label>
            <input type="text" id="input-booking-date" class="form-control" value="${escapeHtml(ticketData.bookingDate)}" placeholder="e.g. Wed 01 Apr 2026 02:16 PM" />
          </div>
        </div>
      </div>

      <!-- Row 2: Flight Segments -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">2. Flight Segments (${ticketData.segments.length})</div>
          <button id="btn-add-segment" class="btn btn-secondary btn-sm">+ Add Flight Leg</button>
        </div>

        <div id="segments-container">
          ${ticketData.segments.map((seg, sIdx) => `
            <div class="segment-box" data-segment-idx="${sIdx}">
              <div class="segment-header">
                <span style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
                  Leg ${sIdx + 1}: ${escapeHtml(seg.origin.code)} → ${escapeHtml(seg.destination.code)}
                </span>
                ${ticketData.segments.length > 1 ? `
                  <button type="button" class="btn btn-outline btn-sm btn-delete-segment" data-idx="${sIdx}" style="color: var(--color-danger); border-color: var(--color-danger);">Delete Leg</button>
                ` : ''}
              </div>

              <!-- Segment Basic Details -->
              <div class="form-grid" style="margin-bottom: 1rem;">
                <div class="form-group">
                  <label class="form-label">Airline Name</label>
                  <input type="text" class="form-control seg-airline" value="${escapeHtml(seg.airline)}" placeholder="e.g. Oman Aviation" />
                </div>
                <div class="form-group">
                  <label class="form-label">Flight Number</label>
                  <input type="text" class="form-control seg-flight-num" value="${escapeHtml(seg.flightNumber)}" placeholder="e.g. WY-236" />
                </div>
                <div class="form-group">
                  <label class="form-label">Operated By</label>
                  <input type="text" class="form-control seg-operated-by" value="${escapeHtml(seg.operatedBy)}" placeholder="e.g. Oman Aviation" />
                </div>
                <div class="form-group">
                  <label class="form-label">Flight Duration</label>
                  <input type="text" class="form-control seg-duration" value="${escapeHtml(seg.duration)}" placeholder="e.g. 03h 25m" />
                </div>
              </div>

              <!-- Origin & Departure Details -->
              <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--color-text);">Departure Details</div>
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">Origin IATA Code <span class="required">*</span></label>
                    <input type="text" class="form-control seg-origin-code" value="${escapeHtml(seg.origin.code)}" placeholder="e.g. HYD" style="text-transform: uppercase;" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Departure Date <span class="required">*</span></label>
                    <input type="text" class="form-control seg-origin-date" value="${escapeHtml(seg.origin.date)}" placeholder="e.g. Fri 10 Apr 2026" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Departure Time <span class="required">*</span></label>
                    <input type="text" class="form-control seg-origin-time ${!seg.origin.time ? 'is-warning' : ''}" value="${escapeHtml(seg.origin.time)}" placeholder="e.g. 08:20" />
                  </div>
                  <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Origin Airport Name & City</label>
                    <input type="text" class="form-control seg-origin-airport" value="${escapeHtml(seg.origin.airportName)}" placeholder="e.g. Rajiv Gandhi International Airport" />
                  </div>
                </div>
              </div>

              <!-- Destination & Arrival Details -->
              <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--color-text);">Arrival Details</div>
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">Destination IATA Code <span class="required">*</span></label>
                    <input type="text" class="form-control seg-dest-code" value="${escapeHtml(seg.destination.code)}" placeholder="e.g. MCT" style="text-transform: uppercase;" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Arrival Date <span class="required">*</span></label>
                    <input type="text" class="form-control seg-dest-date" value="${escapeHtml(seg.destination.date)}" placeholder="e.g. Fri 10 Apr 2026" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Arrival Time <span class="required">*</span></label>
                    <input type="text" class="form-control seg-dest-time ${!seg.destination.time ? 'is-warning' : ''}" value="${escapeHtml(seg.destination.time)}" placeholder="e.g. 10:15" />
                  </div>
                  <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Destination Airport Name & City</label>
                    <input type="text" class="form-control seg-dest-airport" value="${escapeHtml(seg.destination.airportName)}" placeholder="e.g. Muscat International Airport" />
                  </div>
                </div>
              </div>

              <!-- Class & Baggage -->
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Cabin Class & Fare Type</label>
                  <input type="text" class="form-control seg-class" value="${escapeHtml(seg.cabinClass)}" placeholder="e.g. Economy / R | Comfort Fare" />
                </div>
                <div class="form-group">
                  <label class="form-label">Cabin Baggage</label>
                  <input type="text" class="form-control seg-cabin-bag" value="${escapeHtml(seg.cabinBaggage)}" placeholder="e.g. 7 Kg" />
                </div>
                <div class="form-group">
                  <label class="form-label">Check-in Baggage</label>
                  <input type="text" class="form-control seg-checkin-bag" value="${escapeHtml(seg.checkinBaggage)}" placeholder="e.g. 20 Kg" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Row 3: Passenger Details Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">3. Passengers (${ticketData.passengers.length})</div>
          <button id="btn-add-passenger" class="btn btn-secondary btn-sm">+ Add Passenger</button>
        </div>

        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 35px;">#</th>
                <th style="min-width: 200px;">Passenger Name <span class="required">*</span></th>
                <th style="min-width: 75px;">Type</th>
                <th style="min-width: 150px;">Ticket / E-Ticket Number</th>
                <th style="min-width: 70px;">Seat</th>
                <th style="min-width: 85px;">Status</th>
                <th style="min-width: 130px; text-align: center;">Boarding Barcode</th>
                <th style="width: 50px;">Action</th>
              </tr>
            </thead>
            <tbody id="passenger-rows">
              ${ticketData.passengers.map((p, idx) => `
                <tr data-pax-idx="${idx}">
                  <td style="font-weight: 700; color: var(--color-text-muted);">${idx + 1}</td>
                  <td>
                    <input type="text" class="form-control pax-name ${!p.name ? 'is-danger' : ''}" value="${escapeHtml(p.name)}" placeholder="e.g. Mrs Subbalakshmi Sanaboyina" />
                  </td>
                  <td>
                    <select class="form-control pax-type">
                      <option value="ADT" ${p.type === 'ADT' ? 'selected' : ''}>ADT (Adult)</option>
                      <option value="CHD" ${p.type === 'CHD' ? 'selected' : ''}>CHD (Child)</option>
                      <option value="INF" ${p.type === 'INF' ? 'selected' : ''}>INF (Infant)</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" class="form-control pax-ticket" value="${escapeHtml(p.ticketNumber)}" placeholder="e.g. 91022013808283/1/1" />
                  </td>
                  <td>
                    <input type="text" class="form-control pax-seat" value="${escapeHtml(p.seat || '-')}" />
                  </td>
                  <td>
                    <input type="text" class="form-control pax-status" value="${escapeHtml(p.status || 'Confirm')}" />
                  </td>
                  <td style="text-align: center;">
                    <div style="background: #F8FAFC; border: 1px solid var(--color-border); border-radius: 4px; padding: 4px 8px; display: inline-flex; flex-direction: column; align-items: center; gap: 2px;">
                      <div style="font-family: monospace; font-size: 0.65rem; color: var(--color-text-muted); letter-spacing: 2px; font-weight: 800;">||| | ||||| || |</div>
                      <span class="badge badge-success" style="font-size: 0.65rem; padding: 1px 6px;">PDF417 Active</span>
                    </div>
                  </td>
                  <td>
                    ${ticketData.passengers.length > 1 ? `
                      <button type="button" class="btn btn-outline btn-sm btn-delete-pax" data-idx="${idx}" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.25rem 0.5rem;">✕</button>
                    ` : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Row 4: Support & Cancellation Info -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">4. Airline Support & Cancellation Guidelines</div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Direct Airline Contact / Helpline</label>
            <input type="text" id="input-airline-contact" class="form-control" value="${escapeHtml(ticketData.airlineContact)}" placeholder="e.g. 0124-6421111" />
          </div>
          <div class="form-group">
            <label class="form-label">Cancellation Policy Summary</label>
            <input type="text" id="input-cancellation" class="form-control" value="${escapeHtml(ticketData.cancellationSummary)}" placeholder="e.g. ADT: Non Cancellable, Non Refundable" />
          </div>
        </div>
      </div>

      <!-- Row 5: Pricing, Markup & Customer Invoice Card -->
      <div class="pricing-card" style="margin-bottom: 2rem;">
        <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-primary); margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
          <span>5. Pricing & Customer Fare Calculation</span>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-fee-display" ${ticketData.pricing.showFeeBreakdown ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text);">
              Show fee breakdown to customer
            </span>
          </label>
        </div>

        <div class="form-grid" style="margin-bottom: 1.25rem;">
          <div class="form-group">
            <label class="form-label">
              Source Ticket Cost (₹)
              <span class="secret-badge">🔒 Hidden From Customer</span>
            </label>
            <input type="number" id="input-ota-total" class="form-control" value="${ticketData.pricing.otaTotal || 0}" min="0" />
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">This is your purchase cost from the OTA. It will never appear on customer tickets.</span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Gaurav Travels Service Fee (₹)
            </label>
            <input type="number" id="input-service-fee" class="form-control" value="${ticketData.pricing.serviceFee || 500}" min="0" step="50" />
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Your agency facilitation charge.</span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Live Final Customer Total (₹)
            </label>
            <input type="number" id="input-customer-total" class="form-control" value="${ticketData.pricing.customerTotal}" style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary);" />
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">This is the exact price that appears on the generated ticket.</span>
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.7); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem;">
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text); margin-bottom: 0.25rem;">
            Customer Ticket Appearance Preview:
          </div>
          <div id="pricing-appearance-preview" style="font-size: 0.95rem; color: var(--color-text); font-weight: 500;">
            <!-- Dynamically updated -->
          </div>
        </div>
      </div>

      <!-- Row 6: Travel Instructions & Terms & Conditions Notice -->
      <div class="card" style="margin-bottom: 2rem;">
        <div class="card-header">
          <div>
            <div class="card-title">6. Travel Instructions & Terms & Conditions (Included in PDF)</div>
            <div class="card-subtitle">Both quick travel guidelines (Page 1) and full Terms & Conditions (Page 2) are dynamically pulled from your Agency Settings.</div>
          </div>
          <span class="badge badge-success">2-Page PDF with Barcodes</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
          <div style="background: var(--color-bg-alt); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem; margin-bottom: 0.5rem;">
              Page 1: Quick Travel Guidelines (${(settings.importantInstructions || []).length})
            </div>
            <ul style="font-size: 0.8rem; color: var(--color-text-muted); margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
              ${(settings.importantInstructions || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}
            </ul>
          </div>

          <div style="background: var(--color-bg-alt); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-weight: 700; color: var(--color-orange); font-size: 0.9rem; margin-bottom: 0.5rem;">
              Page 2: Comprehensive Terms & Conditions (${(settings.termsAndConditions || []).length} Clauses)
            </div>
            <ul style="font-size: 0.8rem; color: var(--color-text-muted); margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
              ${(settings.termsAndConditions || []).map((t, idx) => `<li>${escapeHtml(t.slice(0, 115))}${t.length > 115 ? '...' : ''}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-bottom: 2rem;">
        <button id="btn-preview-pdf-bottom" class="btn btn-secondary btn-lg">
          👁 Live Preview PDF
        </button>
        <button id="btn-generate-pdf-bottom" class="btn btn-primary btn-lg">
          ⬇ Download Branded Ticket PDF
        </button>
      </div>
    `;

    bindFormEvents();
    updatePricingPreview();
  }

  function updatePricingPreview() {
    const previewEl = document.getElementById('pricing-appearance-preview');
    if (!previewEl) return;
    const showBreakdown = ticketData.pricing.showFeeBreakdown;
    if (showBreakdown) {
      previewEl.innerHTML = `
        <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
          <div>Base Airfare: <strong>₹${ticketData.pricing.otaTotal}</strong></div>
          <div>Facilitation Fee: <strong>₹${ticketData.pricing.serviceFee}</strong></div>
          <div style="color: var(--color-primary);">Total Amount: <strong>₹${ticketData.pricing.customerTotal}</strong></div>
        </div>
      `;
    } else {
      previewEl.innerHTML = `
        <div>Total Amount Paid: <strong style="color: var(--color-primary); font-size: 1.1rem;">₹${ticketData.pricing.customerTotal}</strong> <span style="font-size: 0.8rem; color: var(--color-text-muted);">(Single all-inclusive amount)</span></div>
      `;
    }
  }

  function syncFormData() {
    ticketData.airlinePnr = (document.getElementById('input-pnr')?.value || '').trim().toUpperCase();
    ticketData.bookingId = (document.getElementById('input-booking-id')?.value || '').trim();
    ticketData.bookingDate = (document.getElementById('input-booking-date')?.value || '').trim();
    ticketData.airlineContact = (document.getElementById('input-airline-contact')?.value || '').trim();
    ticketData.cancellationSummary = (document.getElementById('input-cancellation')?.value || '').trim();

    // Sync segments
    const segmentBoxes = container.querySelectorAll('.segment-box');
    segmentBoxes.forEach((box, idx) => {
      if (ticketData.segments[idx]) {
        const seg = ticketData.segments[idx];
        seg.airline = box.querySelector('.seg-airline')?.value.trim() || '';
        seg.flightNumber = box.querySelector('.seg-flight-num')?.value.trim() || '';
        seg.operatedBy = box.querySelector('.seg-operated-by')?.value.trim() || '';
        seg.duration = box.querySelector('.seg-duration')?.value.trim() || '';

        seg.origin.code = (box.querySelector('.seg-origin-code')?.value || '').trim().toUpperCase();
        seg.origin.date = box.querySelector('.seg-origin-date')?.value.trim() || '';
        seg.origin.time = box.querySelector('.seg-origin-time')?.value.trim() || '';
        seg.origin.airportName = box.querySelector('.seg-origin-airport')?.value.trim() || '';

        seg.destination.code = (box.querySelector('.seg-dest-code')?.value || '').trim().toUpperCase();
        seg.destination.date = box.querySelector('.seg-dest-date')?.value.trim() || '';
        seg.destination.time = box.querySelector('.seg-dest-time')?.value.trim() || '';
        seg.destination.airportName = box.querySelector('.seg-dest-airport')?.value.trim() || '';

        seg.cabinClass = box.querySelector('.seg-class')?.value.trim() || '';
        seg.cabinBaggage = box.querySelector('.seg-cabin-bag')?.value.trim() || '';
        seg.checkinBaggage = box.querySelector('.seg-checkin-bag')?.value.trim() || '';
      }
    });

    // Sync passengers
    const paxRows = container.querySelectorAll('#passenger-rows tr');
    paxRows.forEach((row, idx) => {
      if (ticketData.passengers[idx]) {
        const p = ticketData.passengers[idx];
        p.name = row.querySelector('.pax-name')?.value.trim() || '';
        p.type = row.querySelector('.pax-type')?.value || 'ADT';
        p.ticketNumber = row.querySelector('.pax-ticket')?.value.trim() || '';
        p.seat = row.querySelector('.pax-seat')?.value.trim() || '-';
        p.status = row.querySelector('.pax-status')?.value.trim() || 'Confirm';
      }
    });

    // Sync pricing
    const otaTotal = parseInt(document.getElementById('input-ota-total')?.value, 10) || 0;
    const fee = parseInt(document.getElementById('input-service-fee')?.value, 10) || 0;
    const custTotal = parseInt(document.getElementById('input-customer-total')?.value, 10) || (otaTotal + fee);

    ticketData.pricing.otaTotal = otaTotal;
    ticketData.pricing.serviceFee = fee;
    ticketData.pricing.customerTotal = custTotal;
    ticketData.pricing.showFeeBreakdown = document.getElementById('toggle-fee-display')?.checked || false;
  }

  function bindFormEvents() {
    // Pricing calculation bindings
    const otaTotalInput = document.getElementById('input-ota-total');
    const feeInput = document.getElementById('input-service-fee');
    const custTotalInput = document.getElementById('input-customer-total');
    const toggleDisplay = document.getElementById('toggle-fee-display');

    function recalc() {
      const ota = parseInt(otaTotalInput.value, 10) || 0;
      const fee = parseInt(feeInput.value, 10) || 0;
      const total = ota + fee;
      custTotalInput.value = total;
      ticketData.pricing.otaTotal = ota;
      ticketData.pricing.serviceFee = fee;
      ticketData.pricing.customerTotal = total;
      updatePricingPreview();
    }

    otaTotalInput?.addEventListener('input', recalc);
    feeInput?.addEventListener('input', recalc);

    toggleDisplay?.addEventListener('change', () => {
      ticketData.pricing.showFeeBreakdown = toggleDisplay.checked;
      updatePricingPreview();
    });

    // Add Passenger
    document.getElementById('btn-add-passenger')?.addEventListener('click', () => {
      syncFormData();
      ticketData.passengers.push({
        name: '',
        type: 'ADT',
        ticketNumber: '',
        seat: '-',
        meal: '-',
        baggage: ticketData.segments[0]?.checkinBaggage || '15 Kg',
        status: 'Confirm'
      });
      render();
    });

    // Delete Passenger
    container.querySelectorAll('.btn-delete-pax').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        syncFormData();
        if (ticketData.passengers.length > 1) {
          ticketData.passengers.splice(idx, 1);
          render();
        }
      });
    });

    // Add Segment
    document.getElementById('btn-add-segment')?.addEventListener('click', () => {
      syncFormData();
      const lastSeg = ticketData.segments[ticketData.segments.length - 1];
      ticketData.segments.push({
        airline: lastSeg?.airline || 'Airline',
        flightNumber: '',
        operatedBy: lastSeg?.operatedBy || '',
        origin: {
          code: lastSeg?.destination?.code || '',
          city: lastSeg?.destination?.city || '',
          airportName: lastSeg?.destination?.airportName || '',
          date: '',
          time: '',
          terminal: ''
        },
        destination: {
          code: lastSeg?.origin?.code || '',
          city: lastSeg?.origin?.city || '',
          airportName: lastSeg?.origin?.airportName || '',
          date: '',
          time: '',
          terminal: ''
        },
        duration: '',
        cabinClass: lastSeg?.cabinClass || 'Economy',
        cabinBaggage: lastSeg?.cabinBaggage || '7 Kg',
        checkinBaggage: lastSeg?.checkinBaggage || '15 Kg'
      });
      render();
    });

    // Delete Segment
    container.querySelectorAll('.btn-delete-segment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        syncFormData();
        if (ticketData.segments.length > 1) {
          ticketData.segments.splice(idx, 1);
          render();
        }
      });
    });

    // Jump to Agency Settings button
    document.getElementById('btn-jump-settings')?.addEventListener('click', () => {
      document.querySelector('[data-tab="settings"]')?.click();
    });

    // Generate & Download PDF
    const handleDownload = async () => {
      syncFormData();
      if (!ticketData.airlinePnr) {
        showToast('Please enter an Airline PNR before generating the ticket.', 'warning');
        return;
      }
      if (!ticketData.passengers[0]?.name) {
        showToast('Please enter the primary passenger name.', 'warning');
        return;
      }

      showToast('Generating branded A4 PDF...', 'info');
      try {
        const activeSettings = loadSettings();
        let logoBytes = null;
        if (activeSettings.logoDataUrl) {
          // Convert data url to Uint8Array
          const base64Data = activeSettings.logoDataUrl.split(',')[1];
          const binaryStr = atob(base64Data);
          logoBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            logoBytes[i] = binaryStr.charCodeAt(i);
          }
        } else {
          // Fetch default logo
          const resp = await fetch('./logo.png');
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            logoBytes = new Uint8Array(buf);
          }
        }

        const pdfBytes = await generateTicketPdf(ticketData, activeSettings, logoBytes);
        
        // Filename format: GTT_<PNR>_<FirstPassengerName>.pdf
        const rawPaxName = (ticketData.passengers[0]?.name || 'Passenger').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `GTT_${ticketData.airlinePnr}_${rawPaxName}.pdf`;

        downloadPdfBlob(pdfBytes, filename);
        showToast(`Downloaded ${filename} successfully!`, 'success');
      } catch (err) {
        console.error('PDF Generation Error:', err);
        showToast('Failed to generate PDF: ' + err.message, 'error');
      }
    };

    document.getElementById('btn-generate-pdf')?.addEventListener('click', handleDownload);
    document.getElementById('btn-generate-pdf-bottom')?.addEventListener('click', handleDownload);

    // Live Preview in Modal
    const handlePreview = async () => {
      syncFormData();
      showToast('Rendering preview...', 'info');
      try {
        const activeSettings = loadSettings();
        let logoBytes = null;
        if (activeSettings.logoDataUrl) {
          const base64Data = activeSettings.logoDataUrl.split(',')[1];
          const binaryStr = atob(base64Data);
          logoBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) logoBytes[i] = binaryStr.charCodeAt(i);
        } else {
          const resp = await fetch('./logo.png');
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            logoBytes = new Uint8Array(buf);
          }
        }

        const pdfBytes = await generateTicketPdf(ticketData, activeSettings, logoBytes);
        const rawPaxName = (ticketData.passengers[0]?.name || 'Passenger').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `GTT_${ticketData.airlinePnr || 'TICKET'}_${rawPaxName}.pdf`;

        await openPdfPreviewModal(pdfBytes, filename);
      } catch (err) {
        console.error('Preview Error:', err);
        showToast('Preview Error: ' + err.message, 'error');
      }
    };

    document.getElementById('btn-preview-pdf')?.addEventListener('click', handlePreview);
    document.getElementById('btn-preview-pdf-bottom')?.addEventListener('click', handlePreview);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  render();

  return {
    onSettingsUpdated: (newSettings) => {
      settings = newSettings;
      ticketData.pricing.serviceFee = newSettings.defaultServiceFee || 500;
      ticketData.pricing.customerTotal = (ticketData.pricing.otaTotal || 0) + ticketData.pricing.serviceFee;
      ticketData.pricing.showFeeBreakdown = newSettings.defaultFeeDisplay === 'split';
      render();
    },
    render,
    syncFormData
  };
}
