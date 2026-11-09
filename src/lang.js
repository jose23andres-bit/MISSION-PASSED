// Language switcher: opens the current page through Google Translate's page proxy.
// The site is written in Spanish; elements with translate="no" (brand, wallet, mint) stay untouched.
(() => {
  const FEATURED = ['es', 'en', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'ru', 'uk', 'tr', 'ar', 'hi', 'bn', 'zh-CN', 'ja', 'ko', 'id', 'vi', 'th', 'tl', 'fa', 'ur', 'sw'];
  const MORE = ['af', 'sq', 'am', 'hy', 'az', 'eu', 'be', 'bs', 'bg', 'ca', 'ceb', 'zh-TW', 'co', 'hr', 'cs', 'da', 'eo', 'et', 'fi', 'fy', 'gl', 'ka', 'el', 'gu', 'ht', 'ha', 'haw', 'he', 'hmn', 'hu', 'is', 'ig', 'ga', 'jv', 'kn', 'kk', 'km', 'rw', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'ny', 'or', 'ps', 'pa', 'ro', 'sm', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'su', 'sv', 'tg', 'ta', 'tt', 'te', 'tk', 'ug', 'uz', 'cy', 'xh', 'yi', 'yo', 'zu'];
  const native = (code) => {
    try {
      const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
      return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
    } catch { return code; }
  };

  // When already viewed through translate.goog, recover the original URL.
  const originalUrl = () => {
    const { hostname, pathname, search, hash } = window.location;
    if (!hostname.endsWith('.translate.goog')) return window.location.href;
    const host = hostname.slice(0, -'.translate.goog'.length).replace(/--/g, '\u0000').replace(/-/g, '.').replace(/\u0000/g, '-');
    const params = new URLSearchParams(search);
    [...params.keys()].filter((k) => k.startsWith('_x_tr_')).forEach((k) => params.delete(k));
    const query = params.toString();
    return `https://${host}${pathname}${query ? `?${query}` : ''}${hash}`;
  };
  const current = () => new URLSearchParams(window.location.search).get('_x_tr_tl') || 'es';
  const go = (code) => {
    const url = originalUrl();
    window.location.href = code === 'es' ? url : `https://translate.google.com/translate?sl=es&tl=${encodeURIComponent(code)}&hl=${encodeURIComponent(code)}&u=${encodeURIComponent(url)}`;
  };

  const wrap = document.createElement('div');
  wrap.className = 'lang-switch';
  wrap.setAttribute('translate', 'no');
  wrap.innerHTML = `
    <button type="button" class="lang-toggle" aria-expanded="false" aria-controls="lang-panel" aria-label="Idioma / Language">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 4 6 4 9.5s-1.4 6.7-4 9.5c-2.6-2.8-4-6-4-9.5s1.4-6.7 4-9.5Z"/></svg>
      <span>${current().split('-')[0].toUpperCase()}</span>
    </button>
    <div class="lang-panel" id="lang-panel" role="dialog" aria-label="Idioma / Language" hidden>
      <p class="lang-title">Idioma · Language · 语言 · اللغة</p>
      <div class="lang-grid">${FEATURED.map((c) => `<button type="button" data-lang="${c}" lang="${c}"${c === current() ? ' aria-current="true"' : ''}>${native(c)}</button>`).join('')}</div>
      <label class="lang-more">+${MORE.length} <select aria-label="Más idiomas / More languages"><option value="">Más idiomas · More languages</option>${MORE.map((c) => `<option value="${c}" lang="${c}">${native(c)}</option>`).join('')}</select></label>
      <p class="lang-note">Traducción automática de Google. El original en español es la versión de referencia.</p>
    </div>`;
  document.body.appendChild(wrap);

  const toggle = wrap.querySelector('.lang-toggle');
  const panel = wrap.querySelector('.lang-panel');
  const setOpen = (open) => { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  wrap.querySelectorAll('[data-lang]').forEach((btn) => btn.addEventListener('click', () => go(btn.dataset.lang)));
  wrap.querySelector('select').addEventListener('change', (e) => { if (e.target.value) go(e.target.value); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) setOpen(false); });
})();
