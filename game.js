const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const scoreDiv = document.getElementById('score');
const factBox = document.getElementById('factBox');

const popperLeft = document.getElementById('popper-left');
const popperRight = document.getElementById('popper-right');

const pauseBtn = document.getElementById('pauseBtn');

const facts = [
  "771 million people lack access to clean water.",
  "Women and girls spend 200 million hours every day collecting water.",
  "Access to clean water can improve education and health.",
  "charity: water has funded over 100,000 water projects worldwide."
];

let gameActive = false;
let paused = false;
let score = 0;
let drop = { x: 200, y: 500, radius: 20 };
let obstacles = [];
let collectibles = [];
let speed = 2;
let animationId = null; // Add this at the top with your other variables

// Track last milestone for party popper
let lastPopperScore = 0;
let lives = 3;

function resetGame() {
  score = 0;
  drop = { x: 200, y: 500, radius: 20 };
  obstacles = [];
  collectibles = [];
  speed = 2;
  lives = 3;
  updateLivesDisplay();
  scoreDiv.textContent = "Score: 0";
  paused = false;
  pauseBtn.textContent = "Pause";
}

function updateLivesDisplay() {
  for (let i = 1; i <= 3; i++) {
    const heart = document.getElementById(`life${i}`);
    if (heart) {
      heart.classList.toggle('lost', i > lives);
    }
  }
}

function randomX() {
  return Math.random() * (canvas.width - 40) + 20;
}

function spawnObstacle() {
  // Gradually increase obstacle spawn rate as score increases
  let baseChance = 0.008; // very easy at first
  if (score > 50) baseChance = 0.012;
  if (score > 100) baseChance = 0.018;
  if (score > 200) baseChance = 0.025;
  if (score > 350) baseChance = 0.035;
  if (Math.random() < baseChance) {
    obstacles.push({ x: randomX(), y: -20, size: 30 });
  }
}

function spawnCollectible() {
  // Optionally, make collectibles a bit less frequent as score increases
  let dropChance = 0.018;
  if (score > 100) dropChance = 0.014;
  if (score > 200) dropChance = 0.011;
  if (score > 350) dropChance = 0.009;
  if (Math.random() < dropChance) {
    collectibles.push({ x: randomX(), y: -20, size: 20 });
  }
}

const charityWaterImg = new Image();
charityWaterImg.src = 'charitywater.png'; // Make sure this path is correct

charityWaterImg.onload = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCharityWaterBrand();
};

function drawDrop() {
  const iconWidth = 70;
  const iconHeight = 85;
  // Draw the icon centered at drop.x, drop.y
  ctx.save();
  ctx.drawImage(
    charityWaterImg,
    drop.x - iconWidth / 4,
    drop.y - iconHeight / 2,
    iconWidth,
    iconHeight
  );
  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach(o => {
    ctx.save();
    ctx.translate(o.x, o.y);

    // Draw dirty water drop shape
    ctx.beginPath();
    ctx.moveTo(0, -o.size); // Top point
    ctx.bezierCurveTo(
      o.size, -o.size / 2,   // Right control point
      o.size, o.size,        // Right bottom control
      0, o.size              // Bottom point
    );
    ctx.bezierCurveTo(
      -o.size, o.size,       // Left bottom control
      -o.size, -o.size / 2,  // Left control point
      0, -o.size             // Back to top
    );
    ctx.closePath();
    ctx.fillStyle = '#4e342e'; // dark brown for dirty water
    ctx.fill();

    // Add some "dirt" spots
    ctx.beginPath();
    ctx.arc(-o.size / 3, o.size / 3, o.size / 6, 0, Math.PI * 2);
    ctx.arc(o.size / 4, o.size / 4, o.size / 8, 0, Math.PI * 2);
    ctx.arc(0, o.size / 2.5, o.size / 10, 0, Math.PI * 2);
    ctx.fillStyle = '#212121';
    ctx.fill();

    ctx.restore();
  });
}

function drawCollectibles() {
  collectibles.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);

    // Draw water drop shape
    ctx.beginPath();
    ctx.moveTo(0, -c.size); // Top point
    ctx.bezierCurveTo(
      c.size, -c.size / 2,   // Right control point
      c.size, c.size,        // Right bottom control
      0, c.size              // Bottom point
    );
    ctx.bezierCurveTo(
      -c.size, c.size,       // Left bottom control
      -c.size, -c.size / 2,  // Left control point
      0, -c.size             // Back to top
    );
    ctx.closePath();
    ctx.fillStyle = '#2196f3';
    ctx.fill();

    // Draw eyes
    ctx.beginPath();
    ctx.arc(-c.size * 0.25, -c.size * 0.2, c.size * 0.10, 0, Math.PI * 2); // Left eye
    ctx.arc(c.size * 0.25, -c.size * 0.2, c.size * 0.10, 0, Math.PI * 2);  // Right eye
    ctx.fillStyle = '#222';
    ctx.fill();

    // Draw nose (small oval)
    ctx.beginPath();
    ctx.ellipse(0, 0, c.size * 0.07, c.size * 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1565c0';
    ctx.fill();

    ctx.restore();
  });
}

// Add a fullscreen button to the top-right corner
const fullscreenBtn = document.createElement('button');
fullscreenBtn.textContent = '⛶';
fullscreenBtn.title = 'Fullscreen';
fullscreenBtn.style.position = 'absolute';
fullscreenBtn.style.top = '10px';
fullscreenBtn.style.right = '10px';
fullscreenBtn.style.fontSize = '1.5em';
fullscreenBtn.style.background = '#0288d1';
fullscreenBtn.style.color = '#fff';
fullscreenBtn.style.border = 'none';
fullscreenBtn.style.borderRadius = '5px';
fullscreenBtn.style.cursor = 'pointer';
fullscreenBtn.style.zIndex = 10;
document.body.appendChild(fullscreenBtn);

// Fullscreen logic
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// Draw party popper explosion in the top-right corner at each 200-point milestone
function drawPartyPoppers() {
  if (score >= 200 && score % 200 < 20) {
    // Top-right corner popper
    ctx.save();
    ctx.translate(canvas.width - 40, 40);
    drawPopperShape();
    drawPopperExplosion();
    ctx.restore();
  }
}

// Helper to draw a simple party popper
function drawPopperShape() {
  // Cone
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-12, 30);
  ctx.lineTo(12, 30);
  ctx.closePath();
  ctx.fillStyle = "#ffb300";
  ctx.fill();

  // Top circle
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#e040fb";
  ctx.fill();
}

// Helper to draw an explosion of confetti
function drawPopperExplosion() {
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 16);
    ctx.beginPath();
    ctx.arc(0, -35, 4, 0, Math.PI * 2);
    ctx.fillStyle = ["#ff5252", "#ffd600", "#69f0ae", "#40c4ff"][i % 4];
    ctx.fill();
    ctx.restore();
  }
}

function moveEntities() {
  obstacles.forEach(o => o.y += speed);
  collectibles.forEach(c => c.y += speed);
}

function checkCollisions() {
  // Collectibles
  collectibles = collectibles.filter(c => {
    let dx = drop.x - c.x;
    let dy = drop.y - c.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < drop.radius + c.size) {
      score += 10;
      scoreDiv.textContent = "Score: " + score;
      return false;
    }
    return true;
  });

  // Obstacles
  for (let o of obstacles) {
    let dx = drop.x - o.x;
    let dy = drop.y - o.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < drop.radius + o.size) {
      lives--;
      updateLivesDisplay();
      if (lives <= 0) {
        endGame();
      }
      // Remove the obstacle that was hit
      obstacles = obstacles.filter(obj => obj !== o);
      break;
    }
  }
}

function endGame() {
  gameActive = false;
  factBox.textContent = facts[Math.floor(Math.random() * facts.length)];
  factBox.classList.remove('hidden');
  startBtn.disabled = false;
}

function updatePartyPoppers() {
  // Show for 1.5 seconds at each 200-point milestone
  if (score > 0 && score % 200 === 0 && gameActive) {
    popperLeft.classList.remove('hidden');
    popperRight.classList.remove('hidden');
    setTimeout(() => {
      popperLeft.classList.add('hidden');
      popperRight.classList.add('hidden');
    }, 1500);
  }
}

// Call this in your gameLoop after updating the score
function gameLoop() {
  if (!gameActive || paused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCharityWaterBrand(); // <-- Add this line

  drawDrop();
  drawObstacles();
  drawCollectibles();
  drawLives(); // <-- Add this line
  moveEntities();
  checkCollisions();

  // Remove off-screen
  obstacles = obstacles.filter(o => o.y < canvas.height + 30);
  collectibles = collectibles.filter(c => c.y < canvas.height + 20);

  // Spawn new
  spawnObstacle();
  spawnCollectible();

  // Gradually increase speed as score increases
  if (score < 100) {
    speed = 2 + score * 0.01;
  } else if (score < 200) {
    speed = 3 + (score - 100) * 0.015;
  } else {
    speed = 4.5 + (score - 200) * 0.02;
  }

  updatePartyPoppers();

  animationId = requestAnimationFrame(gameLoop); // Save the frame id
}

// Update your reset/start logic:
startBtn.addEventListener('click', () => {
  // Always end the current game and start over
  gameActive = false; // End any running game
  if (animationId) {
    cancelAnimationFrame(animationId); // Stop previous loop
    animationId = null;
  }
  resetGame();
  factBox.classList.add('hidden');
  startBtn.textContent = "Reset";
  gameActive = true;
  gameLoop();
});

pauseBtn.addEventListener('click', () => {
  if (!gameActive) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  if (!paused) gameLoop();
});

document.addEventListener('keydown', e => {
  if (!gameActive) return;
  if (e.key === 'ArrowLeft' && drop.x - drop.radius > 0) drop.x -= 20;
  if (e.key === 'ArrowRight' && drop.x + drop.radius < canvas.width) drop.x += 20;
});

// Add mouse movement for the bucket
canvas.addEventListener('mousemove', (e) => {
  if (!gameActive) return;
  // Get mouse position relative to canvas
  const rect = canvas.getBoundingClientRect();
  let mouseX = e.clientX - rect.left;
  // Clamp bucket within canvas bounds
  const bucketWidth = 50;
  if (mouseX < bucketWidth / 2) mouseX = bucketWidth / 2;
  if (mouseX > canvas.width - bucketWidth / 2) mouseX = canvas.width - bucketWidth / 2;
  drop.x = mouseX;
});

function drawLives() {
  const heartSize = 24;
  const padding = 10;
  for (let i = 0; i < 3; i++) {
    const x = canvas.width - padding - (heartSize + 8) * i;
    const y = padding + heartSize / 2;
    ctx.save();
    ctx.font = `${heartSize}px Arial`;
    ctx.globalAlpha = (i < lives) ? 1 : 0.2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("❤️", x, y);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawCharityWaterBrand() {
  const iconSize = 32;
  const paddingY = 10;
  const creamy = "#fffde7";
  const text = "Charity: water";
  ctx.save();

  // Set font and measure text
  ctx.font = "bold 16px Arial";
  const textHeight = 16; // Approximate font size
  const textWidth = ctx.measureText(text).width;
  const totalWidth = iconSize + 10 + textWidth + 20; // 10px spacing, 20px padding
  const totalHeight = Math.max(iconSize, textHeight) + 8;

  // Center horizontally
  const x = (canvas.width - totalWidth) / 2;
  const y = paddingY;

  // Draw creamy background
  ctx.fillStyle = creamy;
  ctx.strokeStyle = "#ffd600";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, totalWidth, totalHeight, 12);
  ctx.fill();
  ctx.stroke();

  // Vertically center icon and text within the background
  const centerY = y + totalHeight / 2;

  // Draw icon
  ctx.drawImage(charityWaterImg, x + 10, centerY - iconSize / 2, iconSize, iconSize);

  // Draw text
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + iconSize + 20, centerY);

  ctx.restore();
}

// Draw the brand on initial load
ctx.clearRect(0, 0, canvas.width, canvas.height);
drawCharityWaterBrand();

window.addEventListener('DOMContentLoaded', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCharityWaterBrand();
});

// Also call drawCharityWaterBrand() at the start of your gameLoop as you already do

// Optionally, if you want it to update on window resize or other events, you can call it again as needed.