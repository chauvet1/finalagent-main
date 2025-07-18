import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ShiftsState {
  shifts: any[];
}

const initialState: ShiftsState = {
  shifts: [],
};

const shiftsSlice = createSlice({
  name: 'shifts',
  initialState,
  reducers: {
    setShifts(state, action: PayloadAction<any[]>) {
      state.shifts = action.payload;
    },
    addShift(state, action: PayloadAction<any>) {
      state.shifts.push(action.payload);
    },
    removeShift(state, action: PayloadAction<string>) {
      state.shifts = state.shifts.filter(shift => shift.id !== action.payload);
    },
  },
});

export const { setShifts, addShift, removeShift } = shiftsSlice.actions;
export default shiftsSlice.reducer;
