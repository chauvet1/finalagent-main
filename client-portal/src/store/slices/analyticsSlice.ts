import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AnalyticsState {
  analyticsData: any;
}

const initialState: AnalyticsState = {
  analyticsData: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setAnalyticsData(state, action: PayloadAction<any>) {
      state.analyticsData = action.payload;
    },
    clearAnalyticsData(state) {
      state.analyticsData = null;
    },
  },
});

export const { setAnalyticsData, clearAnalyticsData } = analyticsSlice.actions;
export default analyticsSlice.reducer;
