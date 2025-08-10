worl war game project is a Worms-like game with emoji
html5 and js

## Gamepad Support

This project supports controllers that expose the standard mapping of the
Gamepad API. Preset layouts are provided for DualSense (PS5), Xbox,
Nintendo Switch Pro and generic gamepads. Button indices can be remapped
through the **Gamepad Mapping** panel on the start menu. The custom
configuration is saved to `localStorage` and applied when the game runs.

### Remapping procedure

1. Open the game and navigate to the start menu.
2. In the *Gamepad Mapping* section enter the button numbers for **Fire**,
   **Jump**, **Weapon Change** and **Validate**.
3. Click **Save Mapping** to persist the layout.
4. Start the game and the chosen mapping will be used for all controllers.
