import { initUploadView } from './ui/uploadView.js';
import { initReviewView } from './ui/reviewView.js';
import { initSettingsView } from './ui/settingsView.js';
import { loadDraftTicket, saveDraftTicket, loadSettings } from './utils/storage.js';
import { createEmptyTicket } from './models/ticketModel.js';
import { showToast } from './ui/toast.js';

let currentTicket = loadDraftTicket() || createEmptyTicket();
let activeTab = 'upload';
let reviewController = null;

function setActiveTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabName}-pane`);
  });
}

function handleTicketParsed(parsedTicket) {
  currentTicket = parsedTicket;
  saveDraftTicket(currentTicket);
  
  // Update review tab indicator
  const reviewBadge = document.getElementById('review-badge');
  if (reviewBadge) {
    reviewBadge.style.display = 'inline-block';
    reviewBadge.textContent = currentTicket.airlinePnr || 'Ready';
  }

  // Initialize and switch to review view
  reviewController = initReviewView(currentTicket, () => {
    saveDraftTicket(currentTicket);
  });
  setActiveTab('review');
}

function initApp() {
  const settings = loadSettings();

  // Header Brand Name sync
  const headerBrandName = document.getElementById('header-brand-name');
  if (headerBrandName && settings.companyName) {
    headerBrandName.textContent = settings.companyName;
  }
  const headerBrandLogo = document.getElementById('header-brand-logo');
  if (headerBrandLogo && settings.logoDataUrl) {
    headerBrandLogo.src = settings.logoDataUrl;
  }

  // Navigation tab clicks
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      if (tabName === 'review' && !currentTicket.airlinePnr && !currentTicket.passengers[0]?.name) {
        showToast('Please upload or load a sample ticket first, or fill in flight details.', 'info');
      }
      setActiveTab(tabName);
    });
  });

  // Initialize Views
  initUploadView(handleTicketParsed);
  reviewController = initReviewView(currentTicket, () => {
    saveDraftTicket(currentTicket);
  });
  initSettingsView((updatedSettings) => {
    if (headerBrandName) headerBrandName.textContent = updatedSettings.companyName;
    if (headerBrandLogo && updatedSettings.logoDataUrl) headerBrandLogo.src = updatedSettings.logoDataUrl;
    if (reviewController?.onSettingsUpdated) {
      reviewController.onSettingsUpdated(updatedSettings);
    }
  });

  // Modal close handlers
  const modal = document.getElementById('preview-modal');
  const modalClose = document.getElementById('modal-close-btn');
  const modalCloseCross = document.getElementById('modal-close-cross');

  modalClose?.addEventListener('click', () => modal?.classList.remove('open'));
  modalCloseCross?.addEventListener('click', () => modal?.classList.remove('open'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  // Initial tab
  setActiveTab('upload');
}

window.addEventListener('DOMContentLoaded', initApp);
