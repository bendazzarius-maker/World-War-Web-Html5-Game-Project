const Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Mouse = Matter.Mouse,
  MouseConstraint = Matter.MouseConstraint;

// Get and setup canvas
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create engine and world
const engine = Engine.create();
const world = engine.world;
world.gravity.y = 0.5; // Simulate gravity

// Create renderer
const render = Render.create({
  element: document.body,
  engine: engine,
  canvas: canvas,
  options: {
    width: canvas.width,
    height: canvas.height,
    wireframes: false, // Show filled shapes
    background: '#ADD8E6',
    showAngleIndicator: false,
  },
});

// Water level and water body
const waterLevel = canvas.height * 0.9;
function createWater() {
  return Bodies.rectangle(canvas.width / 2, waterLevel + 50, canvas.width, 100, {
    isStatic: true,
    isSensor: true, // Allows bodies to pass through without collision
    render: {
      fillStyle: 'blue',
      strokeStyle: 'black',
      lineWidth: 1
    }
  });
}
let water = createWater();
World.add(world, water);

// Terrain generation functions
function generateTerrain(width, height, smoothness, minHeight, maxHeight) {
  const terrain = [];
  let y = Math.random() * (maxHeight - minHeight) + minHeight;
  for (let x = 0; x < width; x++) {
    const yChange = (Math.random() * 2 - 1) * smoothness;
    y += yChange;
    y = Math.max(minHeight, Math.min(maxHeight, y));
    terrain.push({ x: x, y: y });
  }
  return terrain;
}
let terrainData = generateTerrain(canvas.width, canvas.height / 2, 10, canvas.height / 2 + 50, canvas.height / 2 + 150);
function createTerrainSegment(x1, y1, x2, y2) {
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const segment = Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, distance, 5, {
    isStatic: true,
    angle: angle,
    friction: 0.6,
    render: {
      fillStyle: '#008000', // Green color for terrain
      strokeStyle: 'black',
      lineWidth: 1
    },
    isTerrain: true // Flag to identify terrain segments
  });
  return segment;
}
let terrainBodies = [];
for (let i = 0; i < terrainData.length - 1; i++) {
  const x1 = terrainData[i].x;
  const y1 = terrainData[i].y;
  const x2 = terrainData[i + 1].x;
  const y2 = terrainData[i + 1].y;
  const segment = createTerrainSegment(x1, y1, x2, y2);
  terrainBodies.push(segment);
}
World.add(world, terrainBodies);

// Generate destructible underground pixels
let destructiblePixels = [];
function generateDestructiblePixels() {
  destructiblePixels.forEach(pixel => World.remove(world, pixel));
  destructiblePixels = [];

  for (let x = 0; x < canvas.width; x += 5) {
    // Find the terrain height at this x
    const terrainHeight = terrainData.find(point => Math.abs(point.x - x) < 5);
    if (terrainHeight) {
      for (let y = terrainHeight.y; y < waterLevel; y += 5) {
        const pixel = Bodies.rectangle(x, y, 5, 5, {
          isStatic: true,
          friction: 0.3,
          render: {
            fillStyle: '#8B4513' // Brown color for destructible terrain
          },
          isDestructible: true
        });
        destructiblePixels.push(pixel);
        World.add(world, pixel);
      }
    }
  }
}

generateDestructiblePixels();

// New: Add level decoration objects for environment elements (trees and cactus)
let decorationObjects = [];
function generateLevelDecorations() {
  // Remove any existing decoration objects
  decorationObjects.forEach(deco => World.remove(world, deco));
  decorationObjects = [];
  
  // Define decoration emoji options for level objects:
  // Evergreen Tree, Deciduous Tree, Palm Tree, and Cactus.
  const decorationEmojis = ["🌲", "🌳", "🌴", "🌵"];
  // Iterate over the generated terrain data every 50 pixels.
  // With a 50% chance at each step, place a decoration slightly above the terrain.
  for (let i = 0; i < terrainData.length; i += 50) {
    if (Math.random() < 0.5) {
      const point = terrainData[i];
      const chosenEmoji = decorationEmojis[Math.floor(Math.random() * decorationEmojis.length)];
      // Create a static, colliding body for the decoration with terrain destruction behavior.
      const decoBody = Bodies.rectangle(point.x, point.y - 15, 30, 30, {
        isStatic: true,
        // Remove sensor property so collisions occur and add isTerrain flag for destruction logic
        isTerrain: true,
        render: {
          sprite: {
            texture: getEmojiTexture(chosenEmoji),
            xScale: 1,
            yScale: 1
          }
        },
        isDecoration: true
      });
      decorationObjects.push(decoBody);
      World.add(world, decoBody);
    }
  }
}

// Load custom team emojis
const teamEmojis = JSON.parse(localStorage.getItem("teamEmojis")) || {
  yellow: '😀',
  blue: '😎',
  green: '😂',
  violet: '😍'
};

const teamEmojiStyles = {
  yellow: { emoji: teamEmojis.yellow, fillStyle: 'yellow' },
  blue: { emoji: teamEmojis.blue, fillStyle: 'blue' },
  green: { emoji: teamEmojis.green, fillStyle: 'green' },
  violet: { emoji: teamEmojis.violet, fillStyle: 'purple' }
};

// Update function to apply selected team emojis from localStorage
function updateTeamEmojis() {
  const storedTeamEmojis = JSON.parse(localStorage.getItem("teamEmojis"));

  if (storedTeamEmojis) {
    for (const team in teamEmojiStyles) {
      if (storedTeamEmojis[team]) {
        teamEmojiStyles[team].emoji = storedTeamEmojis[team];
      }
    }
  }
}

// Function to refresh emoji textures for already created worms
function refreshWormEmojis() {
  for (const team in teams) {
    teams[team].forEach(worm => {
      worm.render.sprite.texture = getEmojiTexture(teamEmojiStyles[team].emoji);
    });
  }
}

const wormRadius = 10;

function createEmojiWorm(x, y, teamColor) {
  const worm = Bodies.circle(x, y, wormRadius, {
    friction: 0.6,
    restitution: 0.1,
    density: 0.001,
    health: 25, 
    team: teamColor,
    index: 0,
    render: {
      fillStyle: teamEmojiStyles[teamColor].fillStyle,
      strokeStyle: 'black',
      lineWidth: 2,
      sprite: {
        texture: getEmojiTexture(teamEmojiStyles[teamColor].emoji),
        xScale: 1,
        yScale: 1
      }
    }
  });
  // Initialize a property to track when damage was last applied for out-of-bound conditions
  worm.lastOutOfBoundsDamageTime = 0;
  return worm;
}

// Updated emoji texture generator for improved emoji display (scaled down by 50%)
function getEmojiTexture(emoji) {
  const emojiCanvas = document.createElement('canvas');
  // Reduced canvas size by 50%
  emojiCanvas.width = 40;
  emojiCanvas.height = 40;
  const emojiCtx = emojiCanvas.getContext('2d');
  // Use a reduced font size for emoji rendering
  emojiCtx.font = '30px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  emojiCtx.textAlign = 'center';
  emojiCtx.textBaseline = 'middle';
  // Draw emoji centered in the reduced canvas
  emojiCtx.fillText(emoji, 20, 20);
  return emojiCanvas.toDataURL();
}

// Team creation
const teamSize = 4;
let teams = {
  yellow: [],
  blue: [],
  green: [],
  violet: []
};

function createTeam(teamColor, startX) {
  for (let i = 0; i < teamSize; i++) {
    const x = startX + i * 50;
    const y = canvas.height / 4;
    const worm = createEmojiWorm(x, y, teamColor);
    worm.index = i;
    teams[teamColor].push(worm);
    World.add(world, worm);
    if (worm.position.x < 0 || worm.position.x > canvas.width || worm.position.y < 0 || worm.position.y > canvas.height) {
      applyDamageToWorm(worm, 25);
    }
  }
  updateTeamHealthDisplay(teamColor);
}
const teamSpacing = canvas.width / 4;

// Improved Jump Function
function jumpWorm(worm) {
  Body.applyForce(worm, worm.position, { x: 0, y: -0.0032 }); 
  setTimeout(() => {
    Body.applyForce(worm, worm.position, { x: 0, y: -0.00192 }); 
  }, 150);
}

// Mouse interaction
const mouse = Mouse.create(canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: { stiffness: 0.2, render: { visible: false } }
});
World.add(world, mouseConstraint);
mouse.element.addEventListener("mousewheel", function(e) {
  e.preventDefault();
});

// Weapon selection and firing UI elements
const weaponSelect = document.getElementById('weaponSelect');
const fireButton = document.getElementById('fireButton');
const weaponDamageIndicator = document.getElementById('weaponDamage');
const activeTeamIndicator = document.getElementById('activeTeam');
const chargeBar = document.getElementById('chargeBar');
const restartButton = document.getElementById('restartButton');
const endGameButton = document.getElementById('endGameButton');

const weaponDamage = { apple: 15, banana: 25, carrot: 10 };
weaponSelect.addEventListener('change', () => {
  const selectedWeapon = weaponSelect.value;
  weaponDamageIndicator.textContent = `Damage: ${weaponDamage[selectedWeapon]}`;
});
fireButton.addEventListener('mousedown', () => {
  if (weaponSelect.value === 'apple' || weaponSelect.value === 'banana') {
    if (!isCharging) {
      isCharging = true;
      launchForce = 0;
      const chargeInterval = setInterval(() => {
        if (!isCharging) {
          clearInterval(chargeInterval);
          chargeBar.style.width = '0%';
          return;
        }
        launchForce += 0.5;
        if (launchForce >= 50) {
          launchForce = 50;
          chargeBar.style.width = '100%';
          isCharging = false;
          fireWeaponWithForce(weaponSelect.value, activeWorm, launchForce);
          clearInterval(chargeInterval);
        } else {
          chargeBar.style.width = `${(launchForce / 50) * 100}%`;
        }
      }, 50);
    }
  } else {
    fireWeapon(weaponSelect.value, activeWorm);
  }
});

fireButton.addEventListener('mouseup', () => {
  if (isCharging) {
    isCharging = false;
    fireWeaponWithForce(weaponSelect.value, activeWorm, launchForce);
    launchForce = 0;
    chargeBar.style.width = '0%';
  }
});

restartButton.addEventListener('click', restartGame);
endGameButton.addEventListener('click', () => {
  stopGame();
});

// Gameplay controls and aiming system variables
let activeWorm = null;
let launchForce = 0;
let isCharging = false;
let currentAngle = 0; // Initial fire orientation
const angleIncrement = 0.1; // Adjusted angle change step for noticeable rotation

// Add global flag to ensure we wait for explosion animation before proceeding to next turn.
let explosionScheduled = false;
// Track projectile state
let projectileInFlight = false;
let currentProjectile = null;

// Keyboard controls and aiming adjustments
document.addEventListener('keydown', (event) => {
  const turnOverlay = document.getElementById("turnOverlay");
  // If a turn message is displayed and the event target is not the continue button, block the event.
  if (turnOverlay && event.target.id !== "continueButton") { 
    event.preventDefault(); 
    return; 
  }
  
  if (!activeWorm) {
    nextTurn();
    return;
  }
  switch (event.key) {
    case 'ArrowUp':
      currentAngle += angleIncrement;
      break;
    case 'ArrowDown':
      currentAngle -= angleIncrement;
      break;
    case 'ArrowLeft':
      Body.setVelocity(activeWorm, { x: -2, y: activeWorm.velocity.y });
      break;
    case 'ArrowRight':
      Body.setVelocity(activeWorm, { x: 2, y: activeWorm.velocity.y });
      break;
    case ' ': // Spacebar: Improved Jump
      jumpWorm(activeWorm);
      break;
    case 'Enter': // Enter: Fire weapon
      event.preventDefault();
      if (weaponSelect.value === 'apple' || weaponSelect.value === 'banana') {
        if (!isCharging) { 
          isCharging = true;
          launchForce = 0;
          const chargeInterval = setInterval(() => {
            if (!isCharging) {
              clearInterval(chargeInterval);
              chargeBar.style.width = '0%';
              return;
            }
            launchForce += 0.5;
            if (launchForce >= 50) {
              launchForce = 50;
              chargeBar.style.width = '100%';
              isCharging = false;
              fireWeaponWithForce(weaponSelect.value, activeWorm, launchForce);
              clearInterval(chargeInterval);
            } else {
              chargeBar.style.width = `${(launchForce / 50) * 100}%`;
            }
          }, 50);
        }
      } else {
        fireWeapon(weaponSelect.value, activeWorm);
      }
      break;
  }
});

document.addEventListener('keyup', (event) => {
  const turnOverlay = document.getElementById("turnOverlay");
  if (turnOverlay && event.target.id !== "continueButton") { 
    event.preventDefault(); 
    return; 
  }
  
  if (event.key === 'Enter' && isCharging) {
    isCharging = false;
    fireWeaponWithForce(weaponSelect.value, activeWorm, launchForce);
    launchForce = 0;
    chargeBar.style.width = '0%';
  }
});

// 
/*
addTouchControl('jumpButton', () => {
  if (activeWorm) {
    jumpWorm(activeWorm);
  }
});
*/

// Draw the aiming system attached to the active emoji (with reduced emoji size)
function drawAimingSystem() {
  if (!activeWorm) return;
  const gunLength = 35;
  const gunEndX = activeWorm.position.x + gunLength * Math.cos(currentAngle);
  const gunEndY = activeWorm.position.y - gunLength * Math.sin(currentAngle);
  context.beginPath();
  context.strokeStyle = 'red';
  context.lineWidth = 2;
  context.moveTo(activeWorm.position.x, activeWorm.position.y);
  context.lineTo(gunEndX, gunEndY);
  context.stroke();
  context.closePath();
  // Set a reduced font size for drawing the weapon's emoji by 50%
  context.font = '15px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(getWeaponEmoji(weaponSelect.value), gunEndX, gunEndY);
}

// Turn management
const teamOrder = ['yellow', 'blue', 'green', 'violet'];
let currentTeamIndex = 0;
let currentWormIndex = 0;

async function nextTurn() {
  if (document.getElementById("startMenu").style.display !== "none") {
    return Promise.resolve();
  }
  const validTeams = teamOrder.filter(team => teams[team] && teams[team].length > 0);
  if (validTeams.length <= 1) {
    let winningTeam = validTeams[0];
    showEndGameOverlay(winningTeam);
    return;
  }
  while (true) {
    currentTeamIndex = (currentTeamIndex + 1) % teamOrder.length;
    const currentTeam = teams[teamOrder[currentTeamIndex]];
    if (!currentTeam || currentTeam.length === 0) continue;
    if (currentTeam.some(worm => worm.health > 0)) {
      activeWorm = currentTeam.find(worm => worm.health > 0);
      updateActiveTeamIndicator();
      currentAngle = 0;
      pauseTurnTimer(); // Block timer and commands until turn message is validated
      await showTurnChangeMessage(teamOrder[currentTeamIndex]);
      explosionScheduled = false;
      resumeTurnTimer();
      startTurnTimer();
      return;
    }
  }
}

function updateActiveTeamIndicator() {
  const activeTeamColor = teamOrder[currentTeamIndex];
  activeTeamIndicator.textContent = `Active Team: ${activeTeamColor}`;
  activeTeamIndicator.style.color = activeTeamColor;
}

function applyDamageToWorm(worm, damage) {
  if (!worm || worm.health <= 0) return;
  
  const teamColor = worm.team;
  if (!teamColor) {
    console.error("applyDamageToWorm called with a worm missing a teamColor");
    return;
  }

  // Convert damage to integer to ensure whole number calculations
  const damageInt = Math.round(damage);

  worm.health -= damageInt;
  worm.health = Math.max(0, worm.health); // Ensure health does not go negative

  if (worm.health <= 0) {
    removeWormFromTeam(worm);
  }
  updateTeamHealthDisplay(teamColor);
}

function updateTeamHealthDisplay(teamColor) {
  if (!teamColor) {
    console.error("updateTeamHealthDisplay called with undefined teamColor");
    return;
  }

  teamColor = teamColor.toLowerCase();
  
  if (!teams[teamColor] || teams[teamColor].length === 0) {
    const teamHealthContainer = document.querySelector(`.team-info[data-team="${teamColor}"]`);
    if (teamHealthContainer) {
      teamHealthContainer.remove();
    }
    delete teams[teamColor]; // Remove the team from the teams object
    return;
  }

  let totalHealth = teams[teamColor].reduce((sum, worm) => sum + Math.max(Math.round(worm.health), 0), 0);
  totalHealth = Math.min(totalHealth, 100);
  const teamHealthElement = document.getElementById(`team${teamColor.charAt(0).toUpperCase() + teamColor.slice(1)}Health`);
  if (teamHealthElement) {
    teamHealthElement.textContent = totalHealth;
  }
}

function isGrounded(worm) {
  const raycastOptions = {
    from: worm.position,
    to: { x: worm.position.x, y: worm.position.y + wormRadius + 1 },
    collisionFilter: { mask: 0x0001 }
  };
  const raycast = Matter.Query.ray(terrainBodies, raycastOptions.from, raycastOptions.to);
  return raycast.length > 0;
}

function fireWeaponWithForce(weaponType, worm, force) {
  pauseTurnTimer(); // Pause timer when a shot is fired
  const endX = worm.position.x + 35 * Math.cos(currentAngle);
  const endY = worm.position.y - 35 * Math.sin(currentAngle);
  let projectile;
  switch (weaponType) {
    case 'apple':
      projectile = fireProjectile(worm, force * 0.46875, 0.1, '🍎', weaponDamage['apple'], true, currentAngle, endX, endY); 
      break;
    case 'banana':
      projectile = fireProjectile(worm, force * 0.3125, 0.08, '🍌', weaponDamage['banana'], true, currentAngle, endX, endY); 
      break;
  }
  activeWorm = null;
  projectileInFlight = true;
  currentProjectile = projectile;
  waitForProjectileToStop(projectile);
}

function fireWeapon(weaponType, worm) {
  pauseTurnTimer(); // Pause timer when a shot is fired
  const endX = worm.position.x + 35 * Math.cos(currentAngle);
  const endY = worm.position.y - 35 * Math.sin(currentAngle);
  // Increase carrot's base speed by 25%
  const projectile = fireProjectile(worm, 23.4375, 0.12, '🥕', weaponDamage['carrot'], false, currentAngle, endX, endY);
  activeWorm = null;
  projectileInFlight = true;
  currentProjectile = projectile;
  waitForProjectileToStop(projectile);
}

function fireProjectile(worm, speed, size, emoji, damage, isLobbed, angle, startX = null, startY = null) {
  const projectileStartX = startX !== null ? startX : worm.position.x;
  const projectileStartY = startY !== null ? startY : worm.position.y;
  const velocity = {
    x: speed * Math.cos(angle),
    y: -speed * Math.sin(angle)
  };
  const projectile = Bodies.circle(projectileStartX, projectileStartY, 10, {
    friction: 0.3,
    restitution: 0.5,
    density: 0.001,
    damage: damage,
    isLobbed: isLobbed,
    angle: angle,
    collisionFilter: { category: 0x0002, mask: 0x0001 | 0x0004 },
    render: {
      fillStyle: 'white',
      strokeStyle: 'black',
      lineWidth: 1,
      sprite: {
        texture: getEmojiTexture(emoji),
        xScale: 1,
        yScale: 1
      }
    }
  });

  // Set explosion radius: default for apple = wormRadius * 3.
  // For banana (emoji '🍌'), increase terrain destruction zone by 600%.
  // Originally, explosionRadius was set to wormRadius * 3 * 0.5 (effective zone: wormRadius*3 after doubling).
  // A 600% increase means the effective explosion zone becomes 7 times the original (i.e., wormRadius*3*7).
  // Since the effective explosion radius is later used as explosionRadius * 2, we set:
  // explosionRadius * 2 = wormRadius * 3 * 7  => explosionRadius = wormRadius * 3 * 3.5.
  let explosionRadius = wormRadius * 3;
  if (emoji === '🍌') {
    explosionRadius = wormRadius * 3 * 3.5;
  }
  projectile.explosionRadius = explosionRadius;

  Body.setVelocity(projectile, velocity);
  World.add(world, projectile);
  return projectile;
}

Matter.Events.on(engine, 'collisionStart', function(event) {
  const pairs = event.pairs;
  for (let i = 0, j = pairs.length; i !== j; ++i) {
    const pair = pairs[i];

    // Case 1: Projectile collides with terrain.
    if ((pair.bodyA.isTerrain && pair.bodyB.circleRadius && pair.bodyB.damage) ||
        (pair.bodyB.isTerrain && pair.bodyA.circleRadius && pair.bodyA.damage)) {
      const projectile = pair.bodyA.circleRadius ? pair.bodyA : pair.bodyB;
      const terrain = pair.bodyA.isTerrain ? pair.bodyA : pair.bodyB;
      World.remove(world, terrain);
      World.remove(world, projectile);
      onProjectileFinished(projectile.position.x, projectile.position.y, projectile.damage, projectile.explosionRadius);
    }

    // Case 2: Worm collides with water.
    if ((pair.bodyA === water && pair.bodyB.circleRadius) ||
        (pair.bodyB === water && pair.bodyA.circleRadius)) {
      const worm = pair.bodyA.circleRadius ? pair.bodyA : pair.bodyB;
      applyDamageToWorm(worm, 25);
      if (!explosionScheduled) {
        explosionScheduled = true;
        startExplosionAnimation(worm.position.x, worm.position.y, 25, wormRadius, () => {
          nextTurn();
        });
      }
    }

    // Case 3: Projectile collides with a worm.
    if ((pair.bodyA.circleRadius && pair.bodyA.damage && pair.bodyB.team) ||
        (pair.bodyB.circleRadius && pair.bodyB.damage && pair.bodyA.team)) {
      const projectile = pair.bodyA.damage ? pair.bodyA : pair.bodyB;
      const worm = pair.bodyA.team ? pair.bodyA : pair.bodyB;
      applyDamageToWorm(worm, projectile.damage);
      World.remove(world, projectile);
      onProjectileFinished(projectile.position.x, projectile.position.y, projectile.damage, projectile.explosionRadius);
    }
  }
});

Matter.Events.on(engine, 'afterUpdate', function() {
  const now = performance.now();

  if (projectileInFlight && currentProjectile) {
    if (currentProjectile.position.x < 0 || currentProjectile.position.x > canvas.width) {
      onProjectileFinished();
    }
  }

  Object.keys(teams).forEach(team => {
    teams[team].forEach(worm => {
      // If a worm is outside the canvas bounds, apply damage at most once per second
      if (
        worm.position.x < 0 || 
        worm.position.x > canvas.width || 
        worm.position.y < 0 || 
        worm.position.y > canvas.height
      ) {
        if (!worm.lastOutOfBoundsDamageTime || now - worm.lastOutOfBoundsDamageTime > 1000) {
          worm.lastOutOfBoundsDamageTime = now;
          // Apply damage (e.g., 10 points) for being out of bounds
          applyDamageToWorm(worm, 10);
        }
      }
    });
  });
});

function removeWormFromTeam(worm) {
  if (!worm || !worm.team) {
    console.error("removeWormFromTeam called with an invalid worm");
    return;
  }

  let teamColor = worm.team.toLowerCase();

  if (teams[teamColor]) {
    const index = teams[teamColor].indexOf(worm);
    if (index > -1) {
      teams[teamColor].splice(index, 1);
      World.remove(world, worm);
    }

    updateTeamHealthDisplay(teamColor);
  }

  checkGameOver();
}

function checkGameOver() {
  let survivingTeams = Object.keys(teams).filter(team => teams[team].length > 0);
  if (survivingTeams.length <= 1) {
    let winningTeam = survivingTeams[0];
    showEndGameOverlay(winningTeam);
  }
}

function createExplosionEffect(x, y, explosionRadius) {
  const particles = [];
  const numParticles = 20;

  for (let i = 0; i < numParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    const velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };

    const particle = Bodies.circle(x, y, 3, {
      friction: 0.2,
      restitution: 0.5,
      density: 0.001,
      isSensor: true, // No collisions
      render: {
        fillStyle: 'orange'
      }
    });

    Body.setVelocity(particle, velocity);
    particles.push(particle);
    Matter.World.add(world, particle);
  }

  setTimeout(() => {
    particles.forEach(particle => Matter.World.remove(world, particle));
  }, 1000);
}

function startExplosionAnimation(x, y, damage, explosionRadius, callback) {
  // Play explosion sound effect when an explosion occurs
  const explosionAudio = new Audio('/Explosion.mp3');
  explosionAudio.play();

  const explosionDuration = 1000;
  const startTime = performance.now();
  
  createExplosionEffect(x, y, explosionRadius); // Trigger explosion particles

  function drawExplosion(time) {
    let elapsed = time - startTime;
    let progress = elapsed / explosionDuration;
    if (progress > 1) progress = 1;

    const radius = progress * explosionRadius;
    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 165, 0, ${1 - progress})`;
    context.fill();
    context.restore();

    if (elapsed < explosionDuration) {
      requestAnimationFrame(drawExplosion);
    } else {
      // Further increase the destructive power of explosions
      const effectiveExplosionRadius = explosionRadius * 2; // Increased from 1.5 to 2

      // Remove terrain segments and decoration objects that are within explosion radius
      const affectedObjects = [...terrainBodies, ...decorationObjects].filter(body =>
        Math.sqrt((body.position.x - x) ** 2 + (body.position.y - y) ** 2) < effectiveExplosionRadius
      );
      affectedObjects.forEach(obj => {
        World.remove(world, obj);
        const terrainIndex = terrainBodies.indexOf(obj);
        if (terrainIndex > -1) terrainBodies.splice(terrainIndex, 1);
        const decorationIndex = decorationObjects.indexOf(obj);
        if (decorationIndex > -1) decorationObjects.splice(decorationIndex, 1);
      });

      const affectedPixels = destructiblePixels.filter(pixel =>
        Math.sqrt((pixel.position.x - x) ** 2 + (pixel.position.y - y) ** 2) < effectiveExplosionRadius
      );
      affectedPixels.forEach(pixel => {
        World.remove(world, pixel);
        const index = destructiblePixels.indexOf(pixel);
        if (index > -1) {
          destructiblePixels.splice(index, 1);
        }
      });

      // Increase the explosion effect on worms
      for (const team in teams) {
        teams[team].forEach(worm => {
          const distance = Math.sqrt((worm.position.x - x) ** 2 + (worm.position.y - y) ** 2);
          if (distance < effectiveExplosionRadius) {
            let damageMultiplier = 1 - (distance / effectiveExplosionRadius);
            applyDamageToWorm(worm, damage * 2 * damageMultiplier); // Further increased damage scaling based on distance
          }
        });
      }

      setTimeout(() => {
        if (typeof callback === 'function') {
          callback();
        }
      }, 500); // Small delay before turn change
    }
  }

  requestAnimationFrame(drawExplosion);
}

function onProjectileFinished(x, y, damage, explosionRadius) {
  if (explosionScheduled) return;
  explosionScheduled = true;
  projectileInFlight = false;
  currentProjectile = null;
  if (x !== undefined && y !== undefined && damage !== undefined && explosionRadius !== undefined) {
    startExplosionAnimation(x, y, damage, explosionRadius, () => {
      nextTurn();
    });
  } else {
    nextTurn();
  }
}

function updateHealthBars() {
  for (const team in teams) {
    teams[team].forEach(worm => {
      if (!worm || !worm.render || !worm.position) return;
      const healthBarHeight = 5, healthBarWidth = 30;
      const healthPercentage = worm.health / 25;
      
      const teamColor = teamEmojiStyles[team].fillStyle;
      const healthBarColor = teamColor;
      const borderColor = 'black';

      const healthBarX = worm.position.x - healthBarWidth / 2;
      const healthBarY = worm.position.y - wormRadius - 10;
      
      context.fillStyle = borderColor;
      context.fillRect(healthBarX - 1, healthBarY - 1, healthBarWidth + 2, healthBarHeight + 2);
      
      context.fillStyle = 'red';
      context.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
      
      context.fillStyle = healthBarColor;
      context.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    });
  }
}

function getWeaponEmoji(weaponType) {
  const lang = localStorage.getItem("gameLang") || "en";
  switch (weaponType) {
    case 'apple': return lang === "fr" ? '🍏' : '🍎';
    case 'banana': return '🍌';
    case 'carrot': return '🥕';
    default: return '🔫';
  }
}

// Updates turn timer display
function updateTurnTimerDisplay(timeLeft) {
  const lang = localStorage.getItem("gameLang") || "en";
  const timerDisplay = document.getElementById('turnTimerDisplay');
  if (timerDisplay) {
    timerDisplay.textContent = `${timeLeft} ${translations[lang].seconds}`;
  }
}

function startTurnTimer() {
  clearInterval(turnTimer);
  timeLeft = turnTimeLimit;
  updateTurnTimerDisplay(timeLeft);
  turnTimer = setInterval(() => {
    if (isPaused) return; // Do nothing if paused
    timeLeft--;
    updateTurnTimerDisplay(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(turnTimer);
      nextTurn();
    }
  }, 1000);
}

function pauseTurnTimer() {
  isPaused = true;
}

function resumeTurnTimer() {
  isPaused = false;
}

let turnTimeLimit;
let turnTimer;
let timeLeft;
let isPaused = false; // New flag to pause timer during shots

// Instead of overriding Render.lookAt, attach our overlay drawing using an afterRender event.
Matter.Events.on(render, 'afterRender', function() {
  updateHealthBars();
  drawAimingSystem();
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render.options.width = window.innerWidth;
  render.options.height = window.innerHeight;
});

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("gameStarted")) {
    document.getElementById("startMenu").style.display = "block";
  } else {
    initializeGame();
  }

  const storedTeamEmojis = JSON.parse(localStorage.getItem("teamEmojis"));
  if (storedTeamEmojis) {
    for (const team in teamEmojiStyles) {
      if (storedTeamEmojis[team]) {
        teamEmojiStyles[team].emoji = storedTeamEmojis[team];
      }
    }
  }
});

function initializeGame() {
  turnTimeLimit = parseInt(localStorage.getItem("turnTimeLimit")) || 10;

  const storedTeamNames = JSON.parse(localStorage.getItem("teamNames")) || {
    yellow: "Yellow Team",
    blue: "Blue Team",
    green: "Green Team",
    violet: "Violet Team"
  };

  updateTeamHealthDisplay();
  refreshWormEmojis(); // Ensure the worms update their emoji textures

  for (const team in teamEmojiStyles) {
    const teamInfoContainer = document.querySelector(`.team-info[data-team="${team}"]`);
    if (teamInfoContainer) {
      teamInfoContainer.querySelector(".team-name").textContent = storedTeamNames[team];
      teamInfoContainer.querySelector(".team-color-indicator").textContent = teamEmojiStyles[team].emoji;
    }
  }

  restartGame();
}

function restartGame() {
  clearInterval(turnTimer); // Stop turn timer on game restart
  World.clear(world, false);
  teams = { yellow: [], blue: [], green: [], violet: [] };

  // Use level editor parameters from localStorage if available; otherwise use defaults.
  let terrainSmoothness = parseInt(localStorage.getItem("terrainSmoothness")) || 10;
  let terrainMinHeight = parseInt(localStorage.getItem("terrainMinHeight"));
  if (isNaN(terrainMinHeight)) terrainMinHeight = canvas.height / 2 + 50;
  let terrainMaxHeight = parseInt(localStorage.getItem("terrainMaxHeight"));
  if (isNaN(terrainMaxHeight)) terrainMaxHeight = canvas.height / 2 + 150;
  terrainData = generateTerrain(canvas.width, canvas.height / 2, terrainSmoothness, terrainMinHeight, terrainMaxHeight);
  
  terrainBodies = [];
  for (let i = 0; i < terrainData.length - 1; i++) {
    const x1 = terrainData[i].x;
    const y1 = terrainData[i].y;
    const x2 = terrainData[i + 1].x;
    const y2 = terrainData[i + 1].y;
    const segment = createTerrainSegment(x1, y1, x2, y2);
    terrainBodies.push(segment);
  }
  World.add(world, terrainBodies);

  water = createWater();
  World.add(world, water);

  createTeam("yellow", teamSpacing * 0.5);
  createTeam("blue", teamSpacing * 1.5);
  createTeam("green", teamSpacing * 2.5);
  createTeam("violet", teamSpacing * 3.5);

  generateDestructiblePixels();
  generateLevelDecorations(); // <-- New: Add level decorations (trees and cactus) here

  currentTeamIndex = 0;
  currentWormIndex = 0;
  activeWorm = null;
  nextTurn();
}

function stopGame() {
  clearInterval(turnTimer);
  World.clear(world, false);
  teams = { yellow: [], blue: [], green: [], violet: [] };
  activeWorm = null;
  localStorage.removeItem("gameStarted");
  document.getElementById("startMenu").style.display = "block";
  document.getElementById("uiContainer").style.display = "none";
  document.getElementById("turnTimerDisplay").style.display = "none";
  document.getElementById("touchControls").style.display = "none";
  document.getElementById("interfaceBar").style.display = "none";
}

async function showTurnChangeMessage(team) {
  if (document.getElementById("startMenu").style.display !== "none") {
    return Promise.resolve();
  }
  const overlay = document.createElement("div");
  overlay.id = "turnOverlay";
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0, 0, 0, 0.7)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.color = "white";
  overlay.style.fontSize = "2em";
  overlay.style.flexDirection = "column";
  // Ensure the overlay sits above all other elements and captures all pointer events.
  overlay.style.zIndex = "10000";
  overlay.style.pointerEvents = "all";
  overlay.innerHTML = `<div>Team ${team} is playing next!</div><button id="continueButton">OK</button>`;
  document.body.appendChild(overlay);
  return new Promise(resolve => {
    document.getElementById("continueButton").addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve();
    });
  });
}

function waitForProjectileToStop(projectile) {
  const speedThreshold = 0.5;

  const intervalId = setInterval(() => {
    if (explosionScheduled || !projectileInFlight) {
      clearInterval(intervalId);
      return;
    }
    const speed = Math.sqrt(projectile.velocity.x ** 2 + projectile.velocity.y ** 2);
    if (projectile.isSleeping || speed < speedThreshold) {
      clearInterval(intervalId);
      onProjectileFinished(projectile.position.x, projectile.position.y, projectile.damage, projectile.explosionRadius);
    }
  }, 100);

  Matter.Events.on(projectile, 'beforeRemove', () => {
    clearInterval(intervalId);
    onProjectileFinished(projectile.position.x, projectile.position.y, projectile.damage, projectile.explosionRadius);
  });
}

window.addEventListener("gamepadconnected", function(e) {
  console.log("Gamepad connected:", e.gamepad);
});
window.addEventListener("gamepaddisconnected", function(e) {
  console.log("Gamepad disconnected:", e.gamepad);
});

function updateGamepad() {
  const overlay = document.getElementById("turnOverlay");
  const gamepads = navigator.getGamepads();
  if (gamepads) {
    for (let gp of gamepads) {
      if (!gp) continue;

      // --- Improved PS5 DualSense and Xbox Controller Mapping ---
      // PS5 (DualSense) standard mapping:
      // 0 = Square   (weapon change)
      // 1 = Cross    (fire)
      // 2 = Circle   (jump)
      // 3 = Triangle (validate)
      // Xbox mapping:
      // 0 = A   (fire)
      // 1 = B   (jump)
      // 2 = X   (weapon change)
      // 3 = Y   (validate)

      let isDualSense = gp.id && gp.id.toLowerCase().includes("dualsense");
      let isXbox = gp.id && gp.id.toLowerCase().includes("xbox");
      // PS5 mapping
      let idxWeaponChange = 0, idxFire = 1, idxJump = 2, idxValidate = 3;
      // Xbox mapping
      if (isXbox) {
        idxFire = 0;
        idxJump = 1;
        idxWeaponChange = 2;
        idxValidate = 3;
      }

      // Fallback for non-identified controllers (assume PS/Xbox style layout)
      let buttons = gp.buttons;
      let fireButtonPressed = buttons[idxFire]?.pressed;
      let jumpPressed = buttons[idxJump]?.pressed;
      let weaponChangePressed = buttons[idxWeaponChange]?.pressed;
      let okButtonPressed = buttons[idxValidate]?.pressed;

      // --- Block all controls except validation when turn message overlay is active ---
      if (overlay) {
        // Only process validate (Triangle/Y) button
        if (okButtonPressed && !window.prevGpOkButton) {
          const continueBtn = document.getElementById("continueButton");
          if (continueBtn) {
            continueBtn.click();
          }
        }
        window.prevGpOkButton = okButtonPressed;
        // Skip processing all other gamepad inputs when the turn-change message is displayed.
        continue;
      }
      
      // Normal gamepad processing when no overlay is present.
      if (activeWorm && jumpPressed && !window.prevGpJumpButton) {
        jumpWorm(activeWorm);
      }
      window.prevGpJumpButton = jumpPressed;
      
      if (activeWorm && weaponChangePressed && !window.prevGpChangeWeapon) {
        let currentIndex = weaponSelect.selectedIndex;
        let nextIndex = (currentIndex + 1) % weaponSelect.options.length;
        weaponSelect.selectedIndex = nextIndex;
        weaponDamageIndicator.textContent = `Damage: ${weaponDamage[weaponSelect.value]}`;

        // Sync weapon selection with interface bar
        let weaponSelectBar = document.getElementById("weaponSelectBar");
        if (weaponSelectBar) weaponSelectBar.selectedIndex = nextIndex;
      }
      window.prevGpChangeWeapon = weaponChangePressed;
      
      if (activeWorm) {
        // "Fire" button press begins charging for apple/banana, tap for carrot
        if (fireButtonPressed && !window.prevGpFireButton) {
          if (weaponSelect.value === 'apple' || weaponSelect.value === 'banana') {
            isCharging = true;
            launchForce = 0;
          } else {
            fireWeapon(weaponSelect.value, activeWorm);
          }
        }
        // "Fire" held: Increase launch force for apple/banana
        if (fireButtonPressed && isCharging && (weaponSelect.value === 'apple' || weaponSelect.value === 'banana')) {
          launchForce += 0.5;
          if (launchForce >= 50) {
            launchForce = 50;
            chargeBar.style.width = '100%';
          } else {
            chargeBar.style.width = `${(launchForce / 50) * 100}%`;
          }
        }
        // "Fire" released: Shoot
        if (!fireButtonPressed && window.prevGpFireButton && isCharging && (weaponSelect.value === 'apple' || weaponSelect.value === 'banana')) {
          isCharging = false;
          fireWeaponWithForce(weaponSelect.value, activeWorm, launchForce);
          launchForce = 0;
          chargeBar.style.width = '0%';
        }
        window.prevGpFireButton = fireButtonPressed;
      }
    }
  }
  requestAnimationFrame(updateGamepad);
}

updateGamepad();

function showEndGameOverlay(winningTeam) {
  const overlay = document.getElementById("endGameOverlay");
  let message = "";
  if (winningTeam) {
    const teamNamesStored = JSON.parse(localStorage.getItem("teamNames")) || {};
    const customName = teamNamesStored[winningTeam] || winningTeam;
    const emoji = teamEmojiStyles[winningTeam].emoji;
    const teamHealth = teams[winningTeam].reduce((sum, worm) => sum + Math.max(worm.health, 0), 0);
    message = `<div class="endGameContent">
                 <div class="winnerEmoji">${emoji}</div>
                 <div class="winnerName">${customName}</div>
                 <div class="winnerHealth">Points: ${teamHealth}</div>
                 <button id="restartButtonOverlay">Restart Game</button>
               </div>`;
  } else {
    message = `<div class="endGameContent">
                 <div class="winnerName">It's a draw!</div>
                 <button id="restartButtonOverlay">Restart Game</button>
               </div>`;
  }
  overlay.innerHTML = message;
  overlay.style.display = "flex";
  // Hide in-game UI elements
  document.getElementById("uiContainer").style.display = "none";
  document.getElementById("turnTimerDisplay").style.display = "none";
  document.getElementById("touchControls").style.display = "none";
  document.getElementById("restartButtonOverlay").addEventListener("click", () => {
    window.location.reload();
  });
}

Engine.run(engine);
Render.run(render);