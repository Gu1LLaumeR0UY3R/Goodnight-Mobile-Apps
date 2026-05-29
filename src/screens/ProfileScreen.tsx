// src/screens/ProfileScreen.tsx
// Role: hub du compte utilisateur avec navigation vers les actions liees au profil et au role.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

// Écran profil: centralise les accès aux parcours selon le rôle connecté.

export default function ProfileScreen({ navigation }: any) {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();

  if (!isAuthenticated) {
    return (
      <View style={styles.gateContainer}>
        <Ionicons name="person-circle-outline" size={70} color="#d1d5db" />
        <Text style={styles.gateTitle}>Connectez-vous</Text>
        <Text style={styles.gateSubtitle}>
          Accédez à votre profil, vos voyages et vos favoris.
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerBtnText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + nom */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.name}>
          {user?.prenom_locataire} {user?.nom_locataire}
        </Text>
        <Text style={styles.email}>{user?.email_locataire}</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {user?.type_compte === 'proprietaire' && (
          <MenuItem icon="business-outline" label="Mes biens" onPress={() => navigation.navigate('MyBiens')} />
        )}
        {user?.type_compte === 'proprietaire' && (
          <MenuItem icon="calendar-outline" label="Réservations reçues" onPress={() => navigation.navigate('OwnerReservations')} />
        )}
        <MenuItem icon="airplane-outline" label="Mes voyages"    onPress={() => navigation.navigate('Trips')} />
        <MenuItem icon="heart-outline"    label="Mes favoris"    onPress={() => navigation.navigate('Favorites')} />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          badge={unreadCount > 0 ? String(unreadCount) : undefined}
          onPress={() => navigation.navigate('Notifications')}
        />
        <MenuItem icon="map-outline" label="Carte" onPress={() => navigation.navigate('Map')} />
        <MenuItem icon="create-outline" label="Modifier mon profil" onPress={() => navigation.navigate('EditProfile')} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#374151" />
      <Text style={styles.menuLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f9fafb' },
  content:       { paddingBottom: 40 },

  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  gateTitle:     { marginTop: 16, fontSize: 22, fontWeight: '700', color: '#111827' },
  gateSubtitle:  { marginTop: 8, textAlign: 'center', color: '#6b7280', fontSize: 15, lineHeight: 22 },
  loginBtn:      { marginTop: 24, backgroundColor: '#2563eb', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  loginBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  registerBtn:   { marginTop: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  registerBtnText:{ color: '#374151', fontWeight: '700', fontSize: 15 },

  header:  { alignItems: 'center', paddingTop: 40, paddingBottom: 28, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar:  { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name:    { fontSize: 20, fontWeight: '700', color: '#111827' },
  email:   { marginTop: 4, fontSize: 14, color: '#6b7280' },

  menu:      { marginTop: 16, backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  menuItem:  { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  menuLabel: { fontSize: 15, color: '#111827' },
  badgeWrap: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
