(() => {
  const form = document.querySelector('#search-form');
  const input = document.querySelector('#search-query');
  const results = document.querySelector('#search-results');
  const summary = document.querySelector('#search-summary');
  if (!form || !input || !results || !summary) return;

  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let index = [];
  const preloaded = window.MISSION_PASSED_SEARCH_INDEX;
  (Array.isArray(preloaded) ? Promise.resolve(preloaded) : fetch('/search-index.json').then((response) => response.json()))
    .then((data) => { index = Array.isArray(data) ? data : []; run(); })
    .catch(() => { summary.textContent = 'No se pudo cargar el índice.'; });

  function run() {
    const query = new URLSearchParams(location.search).get('q') || input.value;
    input.value = query;
    results.replaceChildren();
    if (!query.trim()) { summary.textContent = 'Escribe un término para buscar.'; return; }
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const matches = index.filter((item) => terms.every((term) => normalize(`${item.title} ${item.text}`).includes(term)));
    summary.textContent = `${matches.length} resultado${matches.length === 1 ? '' : 's'} para “${query}”`;
    matches.forEach((item) => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.url;
      const title = document.createElement('h2');
      title.textContent = item.title;
      const text = document.createElement('p');
      text.textContent = item.text;
      link.append(title, text);
      results.append(link);
    });
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); const url = new URL(location.href); url.searchParams.set('q', input.value.trim()); history.replaceState({}, '', url); run(); });
})();
