import API from "@/helpers/api";
// import Vue from "vue"

// Initial state
const state = () => ({
  installed: [],
  store: [],
  installing: [],
  uninstalling: [],
  updating: [],
  noAppsInstalled: false // we store this seperately instead of checking for empty installed array as that's the default state
});

// Functions to update the state directly
const mutations = {
  setInstalledApps(state, apps) {
    const alphabeticallySortedApps = apps.sort((a, b) => a.name.localeCompare(b.name));
    state.installed = alphabeticallySortedApps;
    state.noAppsInstalled = !apps.length;
  },
  setAppStore(state, appStore) {
    state.store = appStore;
  },
  addInstallingApp(state, appId) {
    if (!state.installing.includes(appId)) {
      state.installing.push(appId);
    }
  },
  removeInstallingApp(state, appId) {
    const index = state.installing.findIndex((id) => id === appId);
    if (index !== -1) {
      state.installing.splice(index, 1);
    }
  },
  addUninstallingApp(state, appId) {
    if (!state.uninstalling.includes(appId)) {
      state.uninstalling.push(appId);
    }
  },
  removeUninstallingApp(state, appId) {
    const index = state.uninstalling.findIndex((id) => id === appId);
    if (index !== -1) {
      state.uninstalling.splice(index, 1);
    }
  },
  addUpdatingApp(state, appId) {
    if (!state.updating.includes(appId)) {
      state.updating.push(appId);
    }
  },
  removeUpdatingApp(state, appId) {
    const index = state.updating.findIndex((id) => id === appId);
    if (index !== -1) {
      state.updating.splice(index, 1);
    }
  }
};

// Functions to get data from the API
const actions = {
  async getInstalledApps({ commit }) {
    const installedApps = await API.get(`${process.env.VUE_APP_MANAGER_API_URL}/v1/apps?installed=1`);
    if (installedApps) {
      commit("setInstalledApps", installedApps);
    }
  },
  async getAppStore({ commit, dispatch }) {
    dispatch("getInstalledApps");
    const appStore = await API.get(`${process.env.VUE_APP_MANAGER_API_URL}/v1/apps`);
    if (appStore) {
      commit("setAppStore", appStore);
    }
  },
  async update({ state, commit, dispatch }, appId) {
    commit("addUpdatingApp", appId);
    try {
      await API.post(
        `${process.env.VUE_APP_MANAGER_API_URL}/v1/apps/${appId}/update`
      );
    } catch (error) {
      commit("removeUpdatingApp", appId);

      throw error;
    }

    const poll = window.setInterval(async () => {
      await dispatch("getAppStore");
      const index = state.store.findIndex((app) => app.id === appId);
      if (index === -1 || !state.store[index].updateAvailable) {
        commit("removeUpdatingApp", appId);
        window.clearInterval(poll);
      }
    }, 5000);
  },
  async uninstall({ state, commit, dispatch }, appId) {
    commit("addUninstallingApp", appId);

    try {
      await API.post(
        `${process.env.VUE_APP_MANAGER_API_URL}/v1/apps/${appId}/uninstall`
      );
    } catch(error) {
      commit("removeUninstallingApp", appId);

      throw error;
    }

    const poll = window.setInterval(async () => {
      await dispatch("getInstalledApps");
      const index = state.installed.findIndex((app) => app.id === appId);
      if (index === -1) {
        commit("removeUninstallingApp", appId);
        window.clearInterval(poll);
      }
    }, 5000);
  },
  async install({ state, commit, dispatch }, appId) {
    commit("addInstallingApp", appId);
    try {
      await API.post(
        `${process.env.VUE_APP_MANAGER_API_URL}/v1/apps/${appId}/install`
      );
    } catch (error) {
      commit("removeInstallingApp", appId);

      throw error;
    }

    const poll = window.setInterval(async () => {
      await dispatch("getInstalledApps");
      const index = state.installed.findIndex((app) => app.id === appId);
      if (index !== -1) {
        commit("removeInstallingApp", appId);
        window.clearInterval(poll);
      }
    }, 5000);
  }
};

const getters = {};

export default {
  namespaced: true,
  state,
  actions,
  getters,
  mutations
};
