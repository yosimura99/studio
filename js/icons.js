/* Bộ icon SVG nét mảnh */
(function () {
  const S = (window.S = window.S || {});
  const w = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  S.ICONS = {
    home: w('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
    photo: w('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>'),
    video: w('<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/>'),
    face: w('<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 15c1.8 1.6 5.2 1.6 7 0"/>'),
    back: w('<path d="M15 5l-7 7 7 7"/>'),
    open: w('<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>'),
    undo: w('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>'),
    redo: w('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>'),
    compare: w('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><path d="M3 20L12 11"/>'),
    play: w('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
    pause: w('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
    presets: w('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    light: w('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    color: w('<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>'),
    mixer: w('<circle cx="8" cy="9" r="5"/><circle cx="16" cy="9" r="5"/><circle cx="12" cy="15" r="5"/>'),
    grade: w('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
    curve: w('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M5 19C10 19 9 5 19 5"/>'),
    effects: w('<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    detail: w('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'),
    crop: w('<path d="M6 2v16h16"/><path d="M2 6h16v16"/>'),
    film: w('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    auto: w('<path d="M5 19l5-14 5 14"/><path d="M7 14h6"/><path d="M18 3l.7 1.8 1.8.7-1.8.7L18 8l-.7-1.8-1.8-.7 1.8-.7z"/>'),
    rotate: w('<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    flipH: w('<path d="M12 3v18"/><path d="M8 7L3 12l5 5z"/><path d="M16 7l5 5-5 5z"/>'),
    flipV: w('<path d="M3 12h18"/><path d="M7 8l5-5 5 5z"/><path d="M7 16l5 5 5-5z"/>'),
    reset: w('<path d="M4 4v6h6"/><path d="M4.5 15a8 8 0 102-8.5L4 10"/>'),
    save: w('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3"/><rect x="8" y="13" width="8" height="6"/>'),
    import: w('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
    export: w('<path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M4 17v3h16v-3"/>'),
    more: w('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
    music: w('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    mute: w('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>'),
    sound: w('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/>'),
    trash: w('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    edit: w('<path d="M4 20h4L19 9l-4-4L4 16z"/>')
  };
  S.icon = n => S.ICONS[n] || '';
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = S.icon(el.dataset.icon); });
})();
