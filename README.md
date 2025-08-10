**World War Game project** is a Worms-like game with emoji, HTML5 and JS.

## Contrôles

Les actions du jeu sont unifiées via un gestionnaire d'entrées :

- **Flèches gauche/droite** ou boutons à l'écran ← → : déplacement du ver.
- **Flèches haut/bas** ou boutons à l'écran ↑ ↓ : ajuster l'angle de tir.
- **Espace** ou bouton "Jump" : sauter.
- **Entrée**, bouton "Fire" ou touche correspondante de la manette : tirer/charger l'arme.
- **Bouton de changement d'arme** de la manette : faire défiler les armes disponibles.

Le `InputManager` permet de combiner librement clavier, tactile/souris et manette. Par exemple, il est possible de viser au clavier tout en tirant depuis l'écran tactile ou d'utiliser simultanément manette et commandes tactiles.

## Gamepad Support

The game supports controllers through the HTML5 Gamepad API. Connect a gamepad to move, aim, jump, fire and switch weapons as described in the controls above.
