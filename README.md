# Arthur Constantin / Kaissa - Portfolio

Portfolio statique HTML/CSS/JavaScript d’Arthur Constantin. Le site est autonome : aucune dépendance npm, aucun framework et aucun backend ne sont nécessaires.

## Lancer le site en local

Le plus fiable est de servir le dossier avec un petit serveur HTTP :

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`.

Un double-clic sur `index.html` fonctionne aussi pour l’essentiel, mais un serveur local reproduit mieux le comportement d’un hébergement web.

## Structure

- `index.html` - accueil
- `portfolio.html` - portfolio filtrable et études de cas
- `about.html` - parcours et présentation
- `contact.html` - contact, Discord, X et préparation d’e-mail
- `assets/css/` - styles
- `assets/js/` - interactions
- `assets/data/` - données du portfolio et de la galerie photo
- `assets/img/`, `assets/portfolio/`, `assets/photos/`, `assets/projects/`, `assets/video/` - médias locaux

## Contact

Les coordonnées publiques sont centralisées dans `assets/js/config.js`. Le formulaire ne transmet aucune donnée à un serveur : il prépare un message Gmail dans le navigateur, avec un fallback `mailto:`.

## GitHub Pages

Le dépôt est prêt pour un hébergement statique GitHub Pages depuis la racine. Le fichier `.nojekyll` évite tout traitement Jekyll inutile.

## Sécurité

- aucun secret, token ou mot de passe n’est nécessaire au fonctionnement du site ;
- les ressources du site sont locales ;
- les liens externes ouverts dans un nouvel onglet utilisent `noopener noreferrer` ;
- une Content Security Policy limite les sources de scripts, styles, images et médias ;
- les paramètres de filtre du portfolio sont limités à une liste autorisée ;
- les contenus dynamiques provenant des données locales sont échappés avant insertion lorsqu’ils contiennent du texte.

Les adresses e-mail et comptes sociaux présents dans le code sont publics par conception, puisqu’ils sont affichés sur la page Contact.
