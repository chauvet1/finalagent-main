import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationsState {
  notifications: any[];
}

const initialState: NotificationsState = {
  notifications: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<any[]>) {
      state.notifications = action.payload;
    },
    addNotification(state, action: PayloadAction<any>) {
      state.notifications.push(action.payload);
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter(notification => notification.id !== action.payload);
    },
  },
});

export const { setNotifications, addNotification, removeNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
