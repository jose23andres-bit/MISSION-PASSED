// Compact flag-first language selector. Spanish is the source language.
(() => {
  const FEATURED = ['es','en','pt','fr','de','it','nl','pl','ru','uk','tr','ar','hi','bn','zh-CN','ja','ko','id','vi','th','tl','fa','ur','sw'];
  const MORE = ['af','sq','am','hy','az','eu','be','bs','bg','ca','ceb','zh-TW','co','hr','cs','da','eo','et','fi','fy','gl','ka','el','gu','ht','ha','haw','he','hmn','hu','is','ig','ga','jv','kn','kk','km','rw','ku','ky','lo','la','lv','lt','lb','mk','mg','ms','ml','mt','mi','mr','mn','my','ne','no','ny','or','ps','pa','ro','sm','gd','sr','st','sn','sd','si','sk','sl','so','su','sv','tg','ta','tt','te','tk','ug','uz','cy','xh','yi','yo','zu'];
  const FLAGS = {es:'🇪🇸',en:'🇬🇧',pt:'🇧🇷',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹',nl:'🇳🇱',pl:'🇵🇱',ru:'🇷🇺',uk:'🇺🇦',tr:'🇹🇷',ar:'🇸🇦',hi:'🇮🇳',bn:'🇧🇩','zh-CN':'🇨🇳','zh-TW':'🇹🇼',ja:'🇯🇵',ko:'🇰🇷',id:'🇮🇩',vi:'🇻🇳',th:'🇹🇭',tl:'🇵🇭',fa:'🇮🇷',ur:'🇵🇰',sw:'🇰🇪'};
  const flag = (code) => FLAGS[code] || '🌐';
  const native = (code) => { try { return new Intl.DisplayNames([code],{type:'language'}).of(code)||code; } catch { return code; } };
  const originalUrl = () => {
    const {hostname,pathname,search,hash}=window.location;
    if(!hostname.endsWith('.translate.goog')) return window.location.href;
    const host=hostname.slice(0,-'.translate.goog'.length).replace(/--/g,'\u0000').replace(/-/g,'.').replace(/\u0000/g,'-');
    const params=new URLSearchParams(search);
    [...params.keys()].filter(k=>k.startsWith('_x_tr_')).forEach(k=>params.delete(k));
    const query=params.toString();
    return `https://${host}${pathname}${query?`?${query}`:''}${hash}`;
  };
  // Only accept known language codes: the value is shown in the page.
  const current=()=>{const c=new URLSearchParams(window.location.search).get('_x_tr_tl');return c&&(FEATURED.includes(c)||MORE.includes(c))?c:'es';};
  const go=(code)=>{const url=originalUrl();window.location.href=code==='es'?url:`https://translate.google.com/translate?sl=es&tl=${encodeURIComponent(code)}&hl=${encodeURIComponent(code)}&u=${encodeURIComponent(url)}`;};
  const wrap=document.createElement('div');wrap.className='lang-switch';wrap.setAttribute('translate','no');
  wrap.innerHTML=`<button type="button" class="lang-toggle" aria-expanded="false" aria-controls="lang-panel" aria-label="Cambiar idioma"><span class="lang-current-flag" aria-hidden="true">${flag(current())}</span><span class="lang-current-code">${current().split('-')[0].toUpperCase()}</span><span class="lang-chevron" aria-hidden="true">⌄</span></button><div class="lang-panel" id="lang-panel" role="dialog" aria-label="Seleccionar idioma" hidden><p class="lang-title">Selecciona tu idioma</p><div class="lang-grid">${FEATURED.map(c=>`<button type="button" data-lang="${c}" lang="${c}"${c===current()?' aria-current="true"':''}><span aria-hidden="true">${flag(c)}</span>${native(c)}</button>`).join('')}</div><label class="lang-more">Más idiomas <select aria-label="Más idiomas"><option value="">Seleccionar</option>${MORE.map(c=>`<option value="${c}" lang="${c}">${native(c)}</option>`).join('')}</select></label><p class="lang-note">Traducción automática. La versión original está en español.</p></div>`;
  const host=document.querySelector('.header-actions,.ps-top,.site-header')||document.body;
  if(host.classList.contains('header-actions'))host.prepend(wrap);else host.append(wrap);
  const toggle=wrap.querySelector('.lang-toggle'),panel=wrap.querySelector('.lang-panel');
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  wrap.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.lang)));
  wrap.querySelector('select').addEventListener('change',e=>{if(e.target.value)go(e.target.value);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
  document.addEventListener('click',e=>{if(!wrap.contains(e.target))setOpen(false);});
})();