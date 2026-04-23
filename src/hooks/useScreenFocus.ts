/**
 * src/hooks/useScreenFocus.ts
 *
 * RÔLE :
 *   Exécute un callback dès qu'un écran reçoit le focus de navigation
 *   (ex : retour depuis un écran enfant, changement d'onglet).
 *   Utilisé pour rafraîchir les données sans avoir à appuyer sur un bouton.
 *
 * UTILISÉ PAR :
 *   - HomeScreen   : rafraîchit le listing au retour
 *   - SearchScreen : relance la recherche si des résultats existaient déjà
 *   - MapScreen    : recharge les marqueurs de la carte
 *
 * PATTERN ANTI-BOUCLE INFINIE :
 *   Problème naïf : passer [callback] comme dep de useCallback dans useFocusEffect
 *   provoque une boucle → callback change → effet se relance → setState →
 *   re-render → nouveau callback → etc.
 *
 *   Solution : stocker le callback dans une ref (callbackRef).
 *   La ref est mise à jour à chaque render via un useEffect,
 *   mais ce useEffect ne redéclenche PAS useFocusEffect (tableau vide []).
 *   useFocusEffect ne se relance qu'aux vrais changements de focus.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useScreenFocus(callback: (() => void | Promise<void>) | null) {
  // Stocke toujours la version la plus récente du callback
  // sans provoquer de re-render (les refs sont mutées silencieusement)
  const callbackRef = useRef<typeof callback>(callback);

  // Synchronise la ref à chaque render, sans déclencher useFocusEffect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useFocusEffect(
    useCallback(() => {
      // Appelle la version à jour du callback via la ref
      // Les dépendances vides [] garantissent que cet effet ne se relance
      // jamais lui-même — il ne se déclenche qu'au changement de focus réel
      if (callbackRef.current) {
        callbackRef.current();
      }
    }, []) // [] volontairement vide pour briser la boucle
  );
}
