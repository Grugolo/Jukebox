// ─── MAIN ─────────────────────────────────────────────────────────────────────
// Entry point. Dipende da tutti gli altri moduli.

// ── Ricerca con debounce ──────────────────────────────────────────────────────
document.getElementById('search-input').oninput = (e) => {
    const val = e.target.value.toLowerCase();

    // Filtra libreria locale
    document.querySelectorAll('.folder-group').forEach(g => {
        let has = false;
        g.querySelectorAll('.track-item').forEach(tr => {
            const match = tr.textContent.toLowerCase().includes(val);
            tr.style.display = match ? 'flex' : 'none';
            if (match) has = true;
        });
        g.style.display = has ? 'block' : 'none';
    });

    // Debounce ricerca YT
    clearTimeout(ytSearchDebounce);
    ytSearchDebounce = setTimeout(() => searchYouTube(val), 500);
};

// ── Click sul titolo → apre player espanso ────────────────────────────────────
document.getElementById('now-playing-title').onclick = () => togglePlayer(true);

// ── Init ──────────────────────────────────────────────────────────────────────
window.onload = () => {
    updateUI();
    renderPlaylists();
    setupExpandedSwipe();
};

