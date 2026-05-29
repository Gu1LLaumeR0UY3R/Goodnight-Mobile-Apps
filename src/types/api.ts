// src/types/api.ts
// Role: contrats TypeScript communs pour les reponses HTTP et les erreurs API.
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}
