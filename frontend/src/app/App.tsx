import React from 'react';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
};

export default App;
