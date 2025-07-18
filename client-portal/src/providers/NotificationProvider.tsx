import React, { createContext, useContext, ReactNode } from 'react';

const NotificationContext = createContext<any[]>([]);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  // Stub notification provider
  const notifications: any[] = [];

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
