import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';

Vue.use(Vuex);

const BUFFER_TIME = 30;

/**
 * Storage for data that needs to be accessed from various compoentns.
 */
const store = new Vuex.Store({
  state: {
    filter: null, // Username to filter shown freets by (null = show all)
    freets: [], // All freets created in the app
    username: null, // Username of the logged in user
    alerts: {}, // global success/error messages encountered during submissions to non-visible forms
    refreshTimeout: null,
    deviceId: null,
    myLikedPlaylists: [],
    mySpotifyPlaylists: [],
    publicPlaylists: [],

  },
  getters: {
    getPlaylistById: (state) => (spotifyId) => {
      return state.mySpotifyPlaylists.find((playlist) => playlist.id === spotifyId) ?? state.publicPlaylists.find((playlist) => playlist.id === spotifyId);
    }
  },
  mutations: {
    alert(state, payload) {
      /**
       * Add a new message to the global alerts.
       */
      Vue.set(state.alerts, payload.message, payload.status);
      setTimeout(() => {
        Vue.delete(state.alerts, payload.message);
      }, 3000);
    },
    setUsername(state, username) {
      /**
       * Update the stored username to the specified one.
       * @param username - new username to set
       */
      state.username = username;
    },
    setDeviceId(state, deviceId) {
      state.deviceId = deviceId;
    },
    updateFilter(state, filter) {
      /**
       * Update the stored freets filter to the specified one.
       * @param filter - Username of the user to fitler freets by
       */
      state.filter = filter;
    },
    updateFreets(state, freets) {
      /**
       * Update the stored freets to the provided freets.
       * @param freets - Freets to store
       */
      state.freets = freets;
    },
    async refreshFreets(state) {
      /**
       * Request the server for the currently available freets.
       */
      const url = state.filter ? `/api/users/${state.filter}/freets` : '/api/freets';
      const res = await fetch(url).then(async r => r.json());
      state.freets = res;
    },
    async scheduleRefresh(state) {
      if (state.username) {
        const expiryTime = (await (await fetch('/api/spotify/getExpiryTime')).json()).expiryTime;
        // Everything is in seconds
        const timeFromNow = expiryTime - (new Date().getTime() / 1000) - BUFFER_TIME;        
        // Convert to MS for setTimeout
        const timeFromNowMS = timeFromNow * 1000;
        if (state.refreshTimeout) clearTimeout(state.refreshTimeout);
        if (timeFromNowMS < 0) {
          await fetch('/api/spotify/refreshAccessToken')
        } else {
          state.refreshTimeout = setTimeout(async () => {
            await fetch('/api/spotify/refreshAccessToken');
            store.commit("scheduleRefresh");
          }, timeFromNowMS)
        }

      }

    },
    addMyLikedPlaylists(state, playlist) {
      const objIdx = state.myLikedPlaylists.findIndex(
          (obj) => obj.id === playlist.id
      );
      if (objIdx <= -1) {
        state.myLikedPlaylists.push(playlist)
        if (playlist.username === 'jerrya') {
                  // find in mySpotifyPlaylists
        const objIdx2 = state.mySpotifyPlaylists.findIndex(
            (obj) => obj.id === playlist.id
        );
        state.mySpotifyPlaylists[objIdx2].liked = true;
        }
        // find in publicPlaylists
        const objIdx3 = state.publicPlaylists.findIndex(
          (obj) => obj.id === playlist.id
        );
        state.publicPlaylists[objIdx3].liked = true;
      }
    },
    removeMyLikedPlaylists(state, playlist) {
      const objIdx = state.myLikedPlaylists.findIndex(
          (obj) => obj.id === playlist.id
      );
      if (objIdx > -1) {
        state.myLikedPlaylists.splice(objIdx, 1);
        if (playlist.username === 'jerrya') {
                  // find in mySpotifyPlaylists
        const objIdx2 = state.mySpotifyPlaylists.findIndex(
          (obj) => obj.id === playlist.id
        );
        state.mySpotifyPlaylists[objIdx2].liked = false;
        }
        // find in publicPlaylists
        const objIdx3 = state.publicPlaylists.findIndex(
          (obj) => obj.id === playlist.id
        );
        state.publicPlaylists[objIdx3].liked = false;
      }
    },
    setMyLikedPlaylists(state, playlists) {
      state.myLikedPlaylists = playlists
    },
    setMySpotifyPlaylists(state, playlists) {
      state.mySpotifyPlaylists = playlists
    },
    setPublicPlaylists(state, playlists) {
      state.publicPlaylists = playlists
    },
    
  },

  // Store data across page refreshes, only discard on browser close
  plugins: [createPersistedState()]
});

export default store;
