/**
 * src/navigation/AppNavigator.tsx
 *
 * RÔLE :
 *   Définit l'arborescence complète de navigation de l'application.
 *   Aucune logique métier ici — uniquement la structure des routes.
 *
 * STRUCTURE :
 *   RootStack
 *   └── MainTabs (BottomTabNavigator : 5 onglets)
 *       ├── Explorer  → HomeStack (HomeScreen → BienDetail → Reservation → Confirmation)
 *       ├── Search    → SearchScreen
 *       ├── Favorites → FavoritesGate (FavoritesScreen ou écran de connexion)
 *       ├── Trips     → TripsGate     (ReservationsScreen ou écran de connexion)
 *       └── Profile   → ProfileStack
 *           (ProfileScreen, MyBiensScreen, AddBienScreen, EditBienScreen,
 *            GalerieBienScreen, BienBlocagesScreen, NotificationsScreen, MapScreen)
 *
 * GUARDS D'AUTH :
 *   FavoritesGate et TripsGate vérifient `isAuthenticated` (useAuth).
 *   Si non connecté, affichent un écran invitant à se connecter
 *   sans bloquer la navigation principale.
 *
 * BADGE NOTIFICATION :
 *   L'onglet Profil affiche un badge rouge avec le compteur de notifications
 *   non lues, fourni par useNotifications().unreadCount.
 */
// src/navigation/AppNavigator.tsx
// Issue #1 — Navigation principale avec onglets

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BienDetailScreen from '../screens/BienDetailScreen';
import ReservationsScreen from '../screens/ReservationsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReservationScreen from '../screens/ReservationScreen';
import ConfirmationScreen from '../screens/ConfirmationScreen';
import MapScreen from '../screens/MapScreen';
import MyBiensScreen from '../screens/MyBiensScreen';
import AddBienScreen from '../screens/AddBienScreen';
import EditBienScreen from '../screens/EditBienScreen';
import GalerieBienScreen from '../screens/GalerieBienScreen';
import BienBlocagesScreen from '../screens/BienBlocagesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OwnerReservationsScreen from '../screens/OwnerReservationsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { RequireAuth, RequireRole } from './ProtectedRoute';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();

function FavoritesGate(props: any) {
  return (
    <RequireAuth navigation={props.navigation} title="Favoris">
      <FavoritesScreen {...props} />
    </RequireAuth>
  );
}

function TripsGate(props: any) {
  return (
    <RequireAuth navigation={props.navigation} title="Voyages">
      <ReservationsScreen {...props} />
    </RequireAuth>
  );
}

function MyBiensGate(props: any) {
  return (
    <RequireRole navigation={props.navigation} title="Mes biens" roles={['proprietaire', 'admin']}>
      <MyBiensScreen {...props} />
    </RequireRole>
  );
}

function AddBienGate(props: any) {
  return (
    <RequireRole navigation={props.navigation} title="Ajouter un bien" roles={['proprietaire', 'admin']}>
      <AddBienScreen {...props} />
    </RequireRole>
  );
}

function EditBienGate(props: any) {
  return (
    <RequireRole navigation={props.navigation} title="Modifier le bien" roles={['proprietaire', 'admin']}>
      <EditBienScreen {...props} />
    </RequireRole>
  );
}

function GalerieBienGate(props: any) {
  return (
    <RequireRole navigation={props.navigation} title="Photos" roles={['proprietaire', 'admin']}>
      <GalerieBienScreen {...props} />
    </RequireRole>
  );
}

function BlocagesGate(props: any) {
  return (
    <RequireRole navigation={props.navigation} title="Blocages" roles={['proprietaire', 'admin']}>
      <BienBlocagesScreen {...props} />
    </RequireRole>
  );
}

function OwnerReservationsGate(props: any) {
  return (
    <RequireRole navigation={props.navigation} title="Réservations reçues" roles={['proprietaire', 'admin']}>
      <OwnerReservationsScreen {...props} />
    </RequireRole>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain"     component={HomeScreen}         options={{ title: 'Explorer' }} />
      <Stack.Screen name="BienDetail"   component={BienDetailScreen}   options={{ title: 'Détail du bien' }} />
      <Stack.Screen name="Reservation"  component={ReservationScreen}  options={{ title: 'Réserver ce bien' }} />
      <Stack.Screen name="Confirmation" component={ConfirmationScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profil' }} />
      <Stack.Screen name="MyBiens" component={MyBiensGate} options={{ title: 'Mes biens' }} />
      <Stack.Screen name="AddBien" component={AddBienGate} options={{ title: 'Ajouter un bien' }} />
      <Stack.Screen name="EditBien" component={EditBienGate} options={{ title: 'Modifier le bien' }} />
      <Stack.Screen name="GalerieBien" component={GalerieBienGate} options={{ title: 'Photos' }} />
      <Stack.Screen name="BienBlocages" component={BlocagesGate} options={{ title: 'Blocages' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Carte' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Modifier mon profil' }} />
      <Stack.Screen name="OwnerReservations" component={OwnerReservationsGate} options={{ title: 'Réservations reçues' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Explorer') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Trips') {
            iconName = focused ? 'airplane' : 'airplane-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarBadge: route.name === 'Profile' && unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: {
          backgroundColor: '#dc2626',
          color: '#fff',
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
      })}
    >
      <Tab.Screen name="Explorer" component={HomeStack} options={{ title: 'Explorer', headerShown: false }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Recherche' }} />
      <Tab.Screen name="Favorites" component={FavoritesGate} options={{ title: 'Favoris' }} />
      <Tab.Screen name="Trips" component={TripsGate} options={{ title: 'Voyages' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Profil', headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <RootStack.Navigator>
      <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Screen
        name="Login"
        options={{ title: 'Connexion', presentation: 'modal' }}
      >
        {(props) => (
          <LoginScreen
            {...props}
            onLoginSuccess={() => props.navigation.goBack()}
            onGoToRegister={() => props.navigation.navigate('Register')}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen
        name="Register"
        options={{ title: 'Inscription', presentation: 'modal' }}
      >
        {(props) => (
          <RegisterScreen
            {...props}
            onRegisterSuccess={() => props.navigation.goBack()}
            onGoToLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </RootStack.Screen>
    </RootStack.Navigator>
  );
}
