// Search box: type part of a name or a NORAD ID, then click a result.
export function addSatelliteSearch(container, satellites, onSelect) {
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search satellites (name or NORAD ID)';
  input.className = 'search-input';

  const results = document.createElement('div');
  results.className = 'search-results';

  container.append(input, results);

  // Runs every time the text in the box changes.
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    results.replaceChildren(); // clear the old results
    if (query.length < 2) return; // wait for at least 2 characters

    const matches = satellites
      .filter((sat) => sat.name.toLowerCase().includes(query) || String(sat.noradId) === query)
      .slice(0, 8); // show at most 8

    if (matches.length === 0) {
      const none = document.createElement('div');
      none.className = 'search-result';
      none.textContent = 'No matches';
      results.appendChild(none);
      return;
    }

    for (const sat of matches) {
      const row = document.createElement('div');
      row.className = 'search-result';
      row.textContent = `${sat.name} (${sat.noradId})`;
      row.addEventListener('click', () => {
        onSelect(sat);
        input.value = sat.name;
        results.replaceChildren();
      });
      results.appendChild(row);
    }
  });
}