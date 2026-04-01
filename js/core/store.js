// core/store.js
// Responsabilità: contenere TUTTO lo stato globale, fornire getter/setter chiari.
// NON tocca DOM, NON fa playback.

// Stato iniziale
const store = {
  currentTrack: null, // track attualmente in riproduzione
  playlist: [],       // playlist principale
  queue: [],          // queue di riproduzione
  history: [],        // tracce già riprodotte

  isPlaying: false,
  isShuffle: false,
  isLoop: false,

  currentTime: 0,
  duration: 0
};

// API pubblica
const Store = {
  getState: () => ({ ...store }),

  getCurrentTrack: () => store.currentTrack,
  setCurrentTrack: (track) => {
    store.currentTrack = track;
  },

  getPlaylist: () => [...store.playlist],
  setPlaylist: (playlist) => {
    store.playlist = [...playlist];
  },

  getQueue: () => [...store.queue],
  setQueue: (queue) => {
    store.queue = [...queue];
  },

  getHistory: () => [...store.history],
  addHistory: (track) => {
    if (track) store.history.push(track);
  },

  getIsPlaying: () => store.isPlaying,
  setIsPlaying: (value) => {
    store.isPlaying = Boolean(value);
  },

  getIsShuffle: () => store.isShuffle,
  setIsShuffle: (value) => {
    store.isShuffle = Boolean(value);
  },

  getIsLoop: () => store.isLoop,
  setIsLoop: (value) => {
    store.isLoop = Boolean(value);
  },

  getCurrentTime: () => store.currentTime,
  setCurrentTime: (time) => {
    store.currentTime = Math.max(0, time);
  },

  getDuration: () => store.duration,
  setDuration: (duration) => {
    store.duration = Math.max(0, duration);
  }
};

export default Store;