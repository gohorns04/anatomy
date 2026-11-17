const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

export function renderSheet(part) {
  const e = (field) => escapeHtml(part[field]);
  return `
    <h2 class="sheet-title" id="sheet-title">${e('name_ko')}</h2>
    <p class="sheet-terms"><span lang="en">${e('name_en')}</span><i lang="la">${e('name_la')}</i></p>
    <p class="sheet-summary">${e('summary')}</p>
    <div class="sheet-fact">
      <span class="sheet-fact-label">알고 계셨나요?</span>
      <p>${e('fact')}</p>
    </div>`;
}
