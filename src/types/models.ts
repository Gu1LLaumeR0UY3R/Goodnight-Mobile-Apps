// src/types/models.ts
// Issue #11 — Interfaces TypeScript correspondant exactement aux tables de la BDD "goodnight"

export interface Locataire {
  id_locataire: number;
  nom_locataire: string | null;
  prenom_locataire: string | null;
  dateNaissance_locataire: string | null;
  email_locataire: string;
  tel_locataire: string | null;
  rue_locataire: string | null;
  complement_locataire: string | null;
  RaisonSociale: string | null;
  Siret: string | null;
  id_commune: number | null;
  pfp_loca: string | null;
  id_cadre_actif: number | null;
  frames_unlocked: boolean;
}

export interface Bien {
  id_biens: number;
  designation_bien: string;
  rue_biens: string;
  complement_biens: string | null;
  superficie_biens: number;
  description_biens: string | null;
  animaux_biens: boolean;
  nb_couchage: number;
  id_TypeBien: number;
  id_commune: number;
  id_locataire: number | null;
  statut_validation: 'en_attente' | 'valide' | 'refuse';
  // Champs joints
  ville_nom?: string;
  ville_code_postal?: string;
  desc_type_bien?: string;
  prix_nuit?: number;
  note_moyenne?: number;
  nb_avis?: number;
  photo_principale?: string;
}

export interface Commune {
  id_commune: number;
  ville_nom: string;
  ville_nom_simple: string;
  ville_departement: string;
  ville_code_postal: string;
  ville_slug: string;
}

export interface Favori {
  id_favori: number;
  id_locataire: number;
  id_biens: number;
  date_ajout: string;
}

export interface Commentaire {
  id_commentaire: number;
  id_biens: number;
  id_locataire: number;
  note: number | null;
  titre: string | null;
  contenu: string;
  date_creation: string;
  statut: 'publie' | 'en_attente' | 'rejete';
  signale: boolean;
  // Champs joints
  auteur_prenom?: string;
  nb_likes?: number;
  user_liked?: boolean;
}

export interface Reservation {
  id_reservation: number;
  id_locataire: number;
  id_biens: number;
  date_debut: string;
  date_fin: string;
  id_tarif: number;
  // Champs joints
  designation_bien?: string;
  ville_nom?: string;
  photo_principale?: string;
  prix_semaine?: number;
}

export interface Notification {
  id_notification: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CadreProfil {
  id: number;
  nom: string;
  description: string | null;
  chemin_fichier: string | null;
}
