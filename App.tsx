import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/hooks/useAuth';
import { NotificationsProvider } from './src/hooks/useNotifications';
import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppNavigator />
          </NavigationContainer>
        </NotificationsProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
