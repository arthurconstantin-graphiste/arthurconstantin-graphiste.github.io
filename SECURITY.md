# Security notes

Ce portfolio est un site statique sans authentification, base de données ni API privée.

## Données publiques
L’adresse e-mail et les comptes sociaux contenus dans `assets/js/config.js` sont volontairement publics car ils sont affichés sur la page Contact. Aucun secret ne doit être ajouté à ce fichier ou à un autre fichier front-end : tout ce qui est poussé sur GitHub Pages est accessible publiquement.

## Formulaire de contact
Le formulaire ne stocke ni ne transmet les données à un serveur du site. Il prépare un e-mail dans Gmail Web ou via le client mail du visiteur.

## Déploiement
- utiliser uniquement HTTPS ;
- ne jamais commit de clé API, token, mot de passe ou fichier `.env` contenant des secrets ;
- conserver les dépendances externes à zéro tant qu’elles ne sont pas nécessaires ;
- si un backend ou un service de formulaire est ajouté plus tard, stocker ses secrets côté serveur uniquement.
