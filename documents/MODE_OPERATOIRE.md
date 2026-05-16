# Mode opératoire — Application Goodnight

## Prérequis

Avant toute utilisation, lancer l'API PHP depuis le dossier du projet :

```powershell
npm run api
```

Puis lancer l'application :

- **Sur navigateur web** : `npx expo start --web` → ouvrir http://localhost:8081
- **Sur mobile (iOS/Android)** : `npx expo start` → scanner le QR code avec l'application Expo Go (même réseau Wi-Fi)

---

## 1. Espace Locataire

### 1.1 Créer un compte
Depuis l'onglet **Profil**, appuyer sur **S'inscrire**.  
Remplir le formulaire : nom, prénom, email, mot de passe (6 caractères minimum), téléphone (optionnel).  
Valider. Le compte est créé et la connexion est automatique.  
*(capture : inscription.png — RegisterScreen, formulaire complet visible)*

### 1.2 Se connecter
Depuis l'onglet **Profil**, appuyer sur **Se connecter**.  
Saisir l'email et le mot de passe, puis appuyer sur **Connexion**.  
*(capture : connexion.png — LoginScreen)*

### 1.3 Explorer les biens
L'onglet **Explorer** (icône maison) affiche la liste des biens disponibles sous forme de cartes.  
Chaque carte contient la photo principale, le nom, la ville, le type et le prix par semaine.  
Faire défiler vers le bas pour charger automatiquement les biens suivants.  
*(capture : explorer.png — HomeScreen, liste de biens chargée)*

### 1.4 Trier les résultats
Sous la barre de recherche, des chips de tri permettent de choisir entre : **Pertinence**, **Prix croissant**, **Prix décroissant**, **Mieux notés**.  
Appuyer sur un chip pour l'activer (un seul actif à la fois).  
*(capture : tri.png — chips de tri visibles sous la barre de recherche, un chip actif mis en évidence)*

### 1.5 Rechercher par mot-clé
Saisir un terme dans la barre de recherche en haut de l'écran Explorer et valider pour lancer la recherche.  
*(capture : recherche.png — barre de recherche avec texte saisi et résultats filtrés)*

### 1.6 Filtrer les biens
Appuyer sur le bouton **Filtres** depuis l'écran Explorer.  
Le panneau s'ouvre et permet de combiner : villes (autocomplétion, plusieurs sélectionnables), type de logement, prix min/max par semaine, dates de disponibilité, nombre de voyageurs, note minimale, équipements.  
Un compteur de résultats se met à jour en temps réel.  
Appuyer sur **Appliquer** pour lancer la recherche filtrée.  
*(capture : filtres.png — panneau de filtres ouvert avec plusieurs critères renseignés)*

### 1.7 Voir les filtres actifs
Après application, les filtres sélectionnés apparaissent sous forme de chips sous la barre de tri.  
Appuyer sur **✕** sur un chip pour le supprimer individuellement.  
*(capture : filtres_actifs.png — chips de filtres affichés sous les chips de tri)*

### 1.8 Consulter le détail d'un bien
Appuyer sur une carte depuis l'écran Explorer.  
La fiche affiche : galerie de photos, nom, description, type, surface, couchages, ville, note moyenne, avis, équipements et prix.  
*(capture : detail_bien.png — BienDetailScreen, fiche complète visible)*

### 1.9 Ajouter un bien en favori
Sur la fiche d'un bien, appuyer sur l'icône **cœur**.  
Le cœur devient plein : le bien est ajouté aux favoris. Appuyer à nouveau pour le retirer.  
*(capture : favori_ajout.png — icône cœur plein visible sur la fiche du bien)*

### 1.10 Consulter ses favoris
Accéder à l'onglet **Favoris** (icône cœur).  
Les biens sauvegardés s'affichent sous forme de cartes identiques à l'Explorer.  
Appuyer sur une carte pour accéder à sa fiche. Appuyer sur le cœur pour retirer un bien directement depuis cet écran.  
*(capture : favoris.png — FavoritesScreen, liste de biens sauvegardés)*

### 1.11 Favoris sans connexion
Si l'utilisateur n'est pas connecté, l'onglet Favoris affiche un écran d'invitation à la connexion avec deux boutons : **Se connecter** et **Créer un compte**.  
*(capture : favoris_non_connecte.png — écran cadenas avec boutons de connexion)*

### 1.12 Effectuer une réservation
Sur la fiche d'un bien, appuyer sur **Réserver** (utilisateur connecté requis).  
Sélectionner les dates d'arrivée et de départ sur le calendrier.  
Vérifier le récapitulatif du montant total, puis confirmer.  
*(capture : reservation.png — ReservationScreen, calendrier avec dates sélectionnées et récapitulatif)*

### 1.13 Voir la confirmation de réservation
Après validation, un écran de confirmation s'affiche avec le résumé du séjour réservé.  
*(capture : confirmation.png — ConfirmationScreen)*

### 1.14 Consulter ses réservations
Accéder à l'onglet **Voyages** (icône avion).  
La liste des réservations s'affiche avec : nom du bien, dates de séjour, montant total et statut.  
*(capture : voyages.png — ReservationsScreen, liste de réservations avec statuts)*

### 1.15 Voyages sans connexion
Si l'utilisateur n'est pas connecté, l'onglet Voyages affiche un écran d'invitation à la connexion.  
*(même capture que 1.11 ou voyages_non_connecte.png — écran cadenas avec boutons)*

### 1.16 Consulter les notifications
Depuis l'onglet **Profil**, appuyer sur **Notifications**.  
Les notifications liées au compte s'affichent. Un badge rouge sur l'onglet Profil indique le nombre de notifications non lues.  
*(capture : notifications.png — NotificationsScreen + badge visible sur l'onglet Profil)*

### 1.17 Consulter son profil
Accéder à l'onglet **Profil** (icône personne).  
Le nom, prénom et email du compte connecté sont affichés. Appuyer sur **Se déconnecter** pour fermer la session.  
*(capture : profil.png — ProfileScreen, utilisateur connecté avec menu visible)*

---

## 2. Espace Propriétaire

### 2.1 Accéder à ses annonces
Se connecter avec un compte propriétaire.  
Depuis l'onglet **Profil**, appuyer sur **Mes biens**.  
La liste s'affiche avec un badge de statut coloré sur chaque carte : **En attente** (jaune), **Validé** (vert), **Refusé** (rouge). Les biens En attente apparaissent en premier.  
*(capture : mes_biens.png — MyBiensScreen, liste avec badges de statut)*

### 2.2 Consulter le statut d'une annonce
Sur la liste Mes biens, appuyer sur le badge de statut d'un bien.  
Une modale s'ouvre avec le statut détaillé et, en cas de refus, le motif communiqué par l'administrateur.  
*(capture : statut_modal.png — modale ouverte sur un bien avec statut et message contextuel)*

### 2.3 Ajouter un bien
Depuis **Mes biens**, appuyer sur **Ajouter un bien**.  
Remplir le formulaire : nom, rue, complément, description, superficie, couchages, prix par semaine, animaux acceptés, type de bien, commune (autocomplétion).  
Appuyer sur **Créer**. Le bien passe automatiquement en statut **En attente de validation**.  
*(capture : ajouter_bien.png — AddBienScreen, formulaire de création)*

### 2.4 Modifier un bien
Sur la carte d'un bien dans Mes biens, appuyer sur l'icône **crayon**.  
Tous les champs sont pré-remplis avec les valeurs actuelles.  
Modifier les informations souhaitées et appuyer sur **Sauvegarder**.  
*(capture : modifier_bien.png — EditBienScreen, formulaire pré-rempli)*

### 2.5 Gérer les photos d'un bien
Sur la carte d'un bien dans Mes biens, appuyer sur l'icône **images**.  
La galerie s'affiche en grille à 2 colonnes avec le nombre de photos en en-tête.  
Appuyer sur **Ajouter une photo** pour ajouter via une URL ou depuis la galerie/caméra du téléphone.  
Appuyer sur l'**étoile** d'une photo pour la définir comme photo principale (étoile dorée + badge "Principale").  
Appuyer sur la **poubelle** pour supprimer une photo (confirmation requise).  
*(capture : galerie_photos.png — GalerieBienScreen, grille de photos avec étoile dorée sur la photo principale)*

### 2.6 Gérer les blocages
Sur la carte d'un bien dans Mes biens, appuyer sur l'icône **calendrier**.  
Les périodes d'indisponibilité existantes s'affichent avec leur motif.  
Appuyer sur **Ajouter un blocage**, choisir les dates et le motif : ménage, entretien, réparation ou usage personnel.  
Ces périodes ne seront pas disponibles à la réservation.  
Appuyer sur **Supprimer** pour retirer un blocage.  
*(capture : blocages.png — BienBlocagesScreen, liste de blocages avec motifs)*

---

## 3. Fonctionnalité exclusive mobile — Carte

### 3.1 Accéder à la carte
Depuis l'onglet **Profil**, appuyer sur **Carte**.  
*(Cette fonctionnalité est disponible uniquement sur l'application mobile iOS/Android — sur navigateur web, un écran informatif s'affiche à la place.)*  
Les biens disponibles s'affichent sous forme de marqueurs géolocalisés.  
La carte se centre automatiquement sur la position de l'utilisateur (permission requise).  
Appuyer sur un marqueur pour afficher la mini-fiche du bien (photo, nom, prix), puis appuyer sur la fiche pour accéder au détail complet.  
Une barre de recherche permet de filtrer les marqueurs affichés localement.  
Un badge indique si de nouveaux biens sont apparus pendant la navigation. Appuyer sur le badge pour les charger.  
*(capture : carte.png — MapScreen sur mobile, marqueurs visibles sur la carte avec callout ouvert)*
