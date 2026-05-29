// src/types/auth.ts
// Role: typage des roles applicatifs et des variantes d'authentification.
export type AppRole = 'visiteur' | 'locataire' | 'proprietaire' | 'admin';

export type AuthenticatedRole = Exclude<AppRole, 'visiteur'>;

export type RegisterAccountType = Exclude<AuthenticatedRole, 'admin'>;
