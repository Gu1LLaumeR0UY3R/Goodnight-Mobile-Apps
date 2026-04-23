/**
 * src/services/biensService.ts
 *
 * RÔLE :
 *   Centralise tous les appels API liés aux biens (annonces) et
 *   aux entités associées : photos, blocages, communes.
 *
 * DÉPEND DE :
 *   - apiClient.ts   → apiFetch (JSON) et apiUpload (multipart)
 *   - models.ts      → types Bien, Photo, Blocage, CommuneOption
 *
 * UTILISÉ PAR :
 *   - HomeScreen        (getAll)
 *   - SearchScreen      (getAll)
 *   - MapScreen         (getAll)
 *   - MyBiensScreen     (getMine)
 *   - EditBienScreen    (update, searchCommunes)
 *   - GalerieBienScreen (getPhotos, addPhoto, deletePhoto, setPhotoAsFirst, uploadPhoto)
 *   - AddBienScreen     (create)
 *   - BienBlocagesScreen (getBlocages, createBlocage, deleteBlocage)
 *   - BienDetailScreen  (getById)
 *
 * MÉTHODES CLÉS :
 *   getAll(filters)              → GET /biens?...             Listing avec filtres
 *   getMine()                    → GET /biens/mine            Biens du propriétaire
 *   update(id, payload)          → PUT /biens/:id             Modifier un bien
 *   create(payload)              → POST /biens                Créer un bien
 *   getPhotos(id)                → GET /biens/:id/photos      Lister les photos
 *   addPhoto(id, url)            → POST /biens/:id/photos     Ajouter une photo
 *   deletePhoto(id, photoId)     → DELETE /biens/:id/photos/:photoId
 *   setPhotoAsFirst(id, photoId) → PUT /biens/:id/photos/:photoId (photo principale)
 *   uploadPhoto(fileUri)         → POST /biens/upload-photo   Upload multipart
 */
import { apiFetch, apiUpload } from './apiClient';
import type { Bien, Blocage, CommuneOption, Photo } from '../types/models';

export interface UpdateBienPayload {
  designation_bien: string;
  rue_biens: string;
  complement_biens?: string;
  superficie_biens: number;
  description_biens?: string;
  animaux_biens: boolean;
  nb_couchage: number;
  id_TypeBien: number;
  id_commune: number;
  prix_semaine: number;
}

export interface CreateBienPayload extends UpdateBienPayload {
  photo_url?: string;
}

export interface CreateBlocagePayload {
  date_debut: string;
  date_fin: string;
  motif: string;
}

export interface BienFilters {
  search?: string;
  ville?: string;
  exclude_owner_id?: number;
  types?: number[];       // id_TypeBien[] — OU entre eux
  equipements?: number[]; // id_equipement[] — ET entre eux
  prix_min?: number;      // prix_semaine minimum
  prix_max?: number;      // prix_semaine maximum
  min_note?: number;      // note AVG minimum (HAVING)
  voyageurs?: number;     // nb_couchage minimum
  distance_km?: number;   // km autour de la ville (nécessite lat/lng)
  lat?: number;
  lng?: number;
  date_debut?: string;    // YYYY-MM-DD
  date_fin?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc';
  page?: number;
  limit?: number;
}

export const biensService = {
  async uploadPhoto(fileUri: string): Promise<{ path: string; message: string }> {
    const filename = fileUri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const ext = filename.toLowerCase().split('.').pop();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const formData = new FormData();
    formData.append('photo', {
      uri: fileUri,
      name: filename,
      type: mime,
    } as any);

    return apiUpload<{ path: string; message: string }>('/biens/upload-photo', formData);
  },

  async create(data: CreateBienPayload): Promise<{ id_biens: number; message: string }> {
    return apiFetch<{ id_biens: number; message: string }>('/biens', 'POST', data);
  },

  async getMine(): Promise<Bien[]> {
    return apiFetch<Bien[]>('/biens/mine');
  },

  async searchCommunes(query: string): Promise<CommuneOption[]> {
    return apiFetch<CommuneOption[]>(`/biens/communes?q=${encodeURIComponent(query)}`);
  },

  async getBlocages(id: number): Promise<Blocage[]> {
    return apiFetch<Blocage[]>(`/biens/${id}/blocages`);
  },

  async createBlocage(id: number, data: CreateBlocagePayload): Promise<{ id_blocage: number; message: string }> {
    return apiFetch<{ id_blocage: number; message: string }>(`/biens/${id}/blocages`, 'POST', data);
  },

  async deleteBlocage(id: number, blocageId: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/biens/${id}/blocages/${blocageId}`, 'DELETE');
  },

  async update(id: number, data: UpdateBienPayload): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/biens/${id}`, 'PUT', data);
  },

  async getPhotos(id: number): Promise<Photo[]> {
    return apiFetch<Photo[]>(`/biens/${id}/photos`);
  },

  async addPhoto(id: number, lienPhoto: string): Promise<{ id_photo: number; message: string }> {
    return apiFetch<{ id_photo: number; message: string }>(`/biens/${id}/photos`, 'POST', { lien_photo: lienPhoto });
  },

  async deletePhoto(id: number, photoId: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/biens/${id}/photos/${photoId}`, 'DELETE');
  },

  async setPhotoAsFirst(id: number, photoId: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/biens/${id}/photos/${photoId}`, 'PUT');
  },

  async getAll(filters: BienFilters = {}): Promise<Bien[]> {
    const params = new URLSearchParams();
    if (filters.search)       params.set('search', filters.search);
    if (filters.ville)        params.set('ville', filters.ville);
    if (filters.exclude_owner_id != null) params.set('exclude_owner_id', String(filters.exclude_owner_id));
    if (filters.types?.length)        params.set('types', filters.types.join(','));
    if (filters.equipements?.length)  params.set('equipements', filters.equipements.join(','));
    if (filters.prix_min != null)     params.set('prix_min', String(filters.prix_min));
    if (filters.prix_max != null)     params.set('prix_max', String(filters.prix_max));
    if (filters.min_note != null)     params.set('min_note', String(filters.min_note));
    if (filters.voyageurs != null)    params.set('voyageurs', String(filters.voyageurs));
    if (filters.distance_km != null)  params.set('distance_km', String(filters.distance_km));
    if (filters.lat != null)          params.set('lat', String(filters.lat));
    if (filters.lng != null)          params.set('lng', String(filters.lng));
    if (filters.date_debut)  params.set('date_debut', filters.date_debut);
    if (filters.date_fin)    params.set('date_fin', filters.date_fin);
    if (filters.sort)        params.set('sort', filters.sort);
    if (filters.page != null) params.set('page', String(filters.page));
    if (filters.limit != null) params.set('limit', String(filters.limit));
    return apiFetch<Bien[]>(`/biens?${params.toString()}`);
  },

  async getCount(filters: BienFilters = {}): Promise<number> {
    const service = biensService as typeof biensService & { _buildParams: (f: BienFilters) => URLSearchParams };
    const params = new URLSearchParams();
    if (filters.search)       params.set('search', filters.search);
    if (filters.ville)        params.set('ville', filters.ville);
    if (filters.exclude_owner_id != null) params.set('exclude_owner_id', String(filters.exclude_owner_id));
    if (filters.types?.length)        params.set('types', filters.types.join(','));
    if (filters.equipements?.length)  params.set('equipements', filters.equipements.join(','));
    if (filters.prix_min != null)     params.set('prix_min', String(filters.prix_min));
    if (filters.prix_max != null)     params.set('prix_max', String(filters.prix_max));
    if (filters.min_note != null)     params.set('min_note', String(filters.min_note));
    if (filters.voyageurs != null)    params.set('voyageurs', String(filters.voyageurs));
    if (filters.distance_km != null)  params.set('distance_km', String(filters.distance_km));
    if (filters.lat != null)          params.set('lat', String(filters.lat));
    if (filters.lng != null)          params.set('lng', String(filters.lng));
    if (filters.date_debut)  params.set('date_debut', filters.date_debut);
    if (filters.date_fin)    params.set('date_fin', filters.date_fin);
    const data = await apiFetch<{ total: number }>(`/biens/count?${params.toString()}`);
    return data.total;
  },

  async getById(id: number): Promise<Bien> {
    return apiFetch<Bien>(`/biens/${id}`);
  },
};
