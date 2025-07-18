import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SitesState {
  sites: any[];
}

const initialState: SitesState = {
  sites: [],
};

const sitesSlice = createSlice({
  name: 'sites',
  initialState,
  reducers: {
    setSites(state, action: PayloadAction<any[]>) {
      state.sites = action.payload;
    },
    addSite(state, action: PayloadAction<any>) {
      state.sites.push(action.payload);
    },
    removeSite(state, action: PayloadAction<string>) {
      state.sites = state.sites.filter(site => site.id !== action.payload);
    },
  },
});

export const { setSites, addSite, removeSite } = sitesSlice.actions;
export default sitesSlice.reducer;
