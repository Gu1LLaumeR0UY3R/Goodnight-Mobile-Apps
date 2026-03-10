// src/utils/errorHandler.ts
// Issue #15 — Gestion centralisée des erreurs avec messages en français

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Une erreur inattendue est survenue';

  const msg = error.message.toLowerCase();

  if (msg.includes('session expirée'))
    return 'Session expirée, veuillez vous reconnecter';

  if (msg.includes('trop de temps'))
    return 'La requête a pris trop de temps, réessayez';

  if (msg.includes('connexion internet') || msg.includes('network request failed'))
    return 'Vérifiez votre connexion internet';

  if (msg.includes('erreur est survenue') || msg.includes('serveur'))
    return 'Une erreur est survenue, réessayez plus tard';

  return error.message;
}
