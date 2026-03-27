// ─── STATE ────────────────────────────────────────────────────────────────────
// Tutte le variabili mutabili condivise tra i moduli.
// Modificare sempre tramite i setter per mantenere la coerenza.

let playlist            = [];
let queue               = [];
let currentPlayingIdx   = -1;
let lastManualLibraryIdx = -1;
let isLooping           = false;
let isShuffle           = false;
let shuffleOrder        = [];
let playHistory         = [];
let startTime           = null;

let ytPlayer            = null;
let ytReady             = false;
let ytPendingVideoId    = null;
let currentYTId         = null;

window.ytResults        = [];

