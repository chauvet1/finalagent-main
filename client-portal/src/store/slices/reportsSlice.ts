import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ReportsState {
  reports: any[];
}

const initialState: ReportsState = {
  reports: [],
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setReports(state, action: PayloadAction<any[]>) {
      state.reports = action.payload;
    },
    addReport(state, action: PayloadAction<any>) {
      state.reports.push(action.payload);
    },
    removeReport(state, action: PayloadAction<string>) {
      state.reports = state.reports.filter(report => report.id !== action.payload);
    },
  },
});

export const { setReports, addReport, removeReport } = reportsSlice.actions;
export default reportsSlice.reducer;
