import { DEFAULT_SETTINGS } from '../models/settingsModel.js';

const SETTINGS_KEY = 'gtt_agency_settings_v1';
const DRAFT_TICKET_KEY = 'gtt_draft_ticket_v1';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Error loading settings from localStorage:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Error saving settings to localStorage:', err);
    return false;
  }
}

export function exportSettingsAsJson(settings) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `gaurav_travels_settings_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importSettingsFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        saveSettings(merged);
        resolve(merged);
      } catch (err) {
        reject(new Error('Invalid settings JSON file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function saveDraftTicket(ticketData) {
  try {
    localStorage.setItem(DRAFT_TICKET_KEY, JSON.stringify(ticketData));
  } catch (e) {
    console.warn('Could not save draft ticket:', e);
  }
}

export function loadDraftTicket() {
  try {
    const raw = localStorage.getItem(DRAFT_TICKET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
