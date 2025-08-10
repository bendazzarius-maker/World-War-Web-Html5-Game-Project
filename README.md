worl war game project is a Worms-like game with emoji
html5 and js

## Contrôles

Les actions du jeu sont unifiées via un gestionnaire d'entrées :

- **Flèches gauche/droite** ou boutons à l'écran ← → : déplacement du ver.
- **Flèches haut/bas** ou boutons à l'écran ↑ ↓ : ajuster l'angle de tir.
- **Espace** ou bouton "Jump" : sauter.
- **Entrée**, bouton "Fire" ou touche correspondante de la manette : tirer/charger l'arme.
- **Bouton de changement d'arme** de la manette : faire défiler les armes disponibles.

Le `InputManager` permet de combiner librement clavier, tactile/souris et manette. Par exemple, il est possible de viser au clavier tout en tirant depuis l'écran tactile ou d'utiliser simultanément manette et commandes tactiles.
