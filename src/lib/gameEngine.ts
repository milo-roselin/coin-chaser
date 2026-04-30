import { checkCollision, Rectangle } from "./collision";

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: 'player' | 'coin' | 'obstacle' | 'goal' | 'powerup';
  vx?: number; // velocity x
  vy?: number; // velocity y
  patrolStartX?: number; // patrol start position
  patrolEndX?: number; // patrol end position
  patrolStartY?: number; // patrol start position
  patrolEndY?: number; // patrol end position
  powerupType?: 'magnet' | 'extralife'; // for powerup objects
}

export interface AvatarInfo {
  id: string;
  name: string;
  image?: string;
}

export interface GameCallbacks {
  onCoinCollected: (score: number) => void;
  onObstacleHit: () => void;
  onLevelComplete: () => void;
  onPlayerMove: (x: number, y: number) => void;
  onPowerupCollected: (type: 'magnet' | 'extralife') => void;
  onShieldUsed: () => void;
  onInvulnerabilityActivated: () => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private player: GameObject;
  private coins: GameObject[] = [];
  private obstacles: GameObject[] = [];
  private powerups: GameObject[] = [];
  private goal: GameObject;
  private callbacks: GameCallbacks;
  private touchPosition: { x: number; y: number } | null = null;
  private isTouching = false;
  private levelWidth: number;
  private cameraX = 0;
  private keys: { [key: string]: boolean } = {};
  private coinClusters: { x: number; y: number; coinsCollected: number; totalCoins: number }[] = [];
  private clustersCompleted = 0;
  private level = 1;
  private score = 0;
  private coinsCollected = 0;
  private isPaused = false;
  private animationFrame = 0;
  private isMoving = false;
  private facingDirection = 1; // 1 for right, -1 for left
  private currentAvatar: AvatarInfo = { id: 'leprechaun', name: 'Leprechaun' };
  private avatarImages: { [key: string]: HTMLImageElement } = {};
  private portalImage: HTMLImageElement | null = null;
  private coinsNeededForPortal = 5; // Number of coins needed to activate portal
  private gameSpeed = 1; // Speed multiplier for the game
  private playerVelocity = { x: 0, y: 0 }; // Player velocity for smoother movement
  private isInitialized = false; // Flag to prevent rendering before proper initialization
  private renderFrameCount = 0; // Count frames to ensure stability before rendering

  constructor(
    private canvasWidth: number, 
    private canvasHeight: number,
    callbacks: GameCallbacks,
    level: number = 1
  ) {
    this.callbacks = callbacks;
    this.level = level;
    this.levelWidth = canvasWidth * 3; // Level is 3 screens wide

    // Initialize player
    this.player = {
      x: 50,
      y: canvasHeight / 2,
      width: 30,
      height: 30,
      color: '#4F46E5',
      type: 'player'
    };

    // Check if on mobile device to adjust for control panel
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const controlPanelWidth = isMobile ? 128 : 0; // 128px control panel on mobile/iPad

    // Initialize goal (portal) - position it so it can be reached when player is at the right edge
    // The player can reach at most: levelWidth - controlPanelWidth - playerWidth
    // So the portal should be positioned where the player can actually reach it
    // The rightmost position where the player can be is when the camera is at maximum position
    // and the player is at the right edge of the visible area (minus control panel)
    const maxCameraX = this.levelWidth - canvasWidth + controlPanelWidth;
    const maxPlayerX = maxCameraX + canvasWidth - controlPanelWidth - 30; // 30 is player width
    const portalX = maxPlayerX - 150; // Position portal further left so it's fully visible and reachable
    
    this.goal = {
      x: portalX,
      y: canvasHeight / 2 - 60,
      width: 120,
      height: 120,
      color: '#8B5CF6',
      type: 'goal'
    };

    // Debug logging
    console.log(`Portal positioning: isMobile=${isMobile}, levelWidth=${this.levelWidth}, controlPanelWidth=${controlPanelWidth}, maxCameraX=${maxCameraX}, maxPlayerX=${maxPlayerX}, portalX=${portalX}`);

    // Portal image no longer needed - using custom rendering

    this.generateLevel();
    this.validateLevelReachability();
    
    // Initialize camera position to follow player from the start
    // This prevents any TNT flash issues at game startup
    this.updateCameraPosition();
    
    // Add a small delay before marking as initialized to ensure proper setup
    setTimeout(() => {
      this.isInitialized = true;
    }, 150); // Increased to 150ms delay to ensure canvas is ready
  }



  private generateLevel() {
    this.coins = [];
    this.obstacles = [];
    this.coinClusters = [];
    this.clustersCompleted = 0;
    this.score = 0;
    this.coinsCollected = 0;

    // Generate coins in clusters with better spacing
    const numClusters = 3 + Math.floor(this.level / 2); // More clusters every 2 levels
    const minDistance = 400; // Minimum distance between clusters
    const clusterPositions: Array<{x: number, y: number}> = [];
    
    for (let cluster = 0; cluster < numClusters; cluster++) {
      let clusterX: number, clusterY: number;
      let attempts = 0;
      
      // Find a position that's not too close to existing clusters and respects control panel
      const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const controlPanelWidth = isMobile ? 128 : 0;
      const maxClusterX = this.levelWidth - 400; // Keep clusters away from right edge
      
      do {
        clusterX = 300 + Math.random() * (maxClusterX - 300);
        clusterY = 100 + Math.random() * (this.canvasHeight - 200);
        attempts++;
      } while (attempts < 50 && clusterPositions.some(pos => 
        Math.sqrt((pos.x - clusterX) ** 2 + (pos.y - clusterY) ** 2) < minDistance
      ));
      
      clusterPositions.push({x: clusterX, y: clusterY});
      
      // Track cluster info
      this.coinClusters.push({
        x: clusterX,
        y: clusterY,
        coinsCollected: 0,
        totalCoins: 3
      });
      
      // 3 coins per cluster with wider spread, ensuring they're within bounds
      for (let i = 0; i < 3; i++) {
        let coinX, coinY;
        let coinAttempts = 0;
        
        // Ensure coins are placed in valid positions and respect control panel
        const isMobileForCoins = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const controlPanelWidthForCoins = isMobileForCoins ? 128 : 0;
        const maxCoinX = this.levelWidth - 200; // Keep coins away from control panel area
        
        do {
          coinX = clusterX + (Math.random() - 0.5) * 160;
          coinY = clusterY + (Math.random() - 0.5) * 120;
          coinAttempts++;
        } while (coinAttempts < 20 && (
          coinX < 50 || coinX > maxCoinX || // Keep away from edges and control panel
          coinY < 50 || coinY > this.canvasHeight - 50
        ));
        
        // Fallback to safe position if no valid position found
        if (coinAttempts >= 20) {
          coinX = clusterX + (i - 1) * 40; // Spread coins linearly as fallback
          coinY = clusterY;
        }
        
        // Ensure coin is within playable area and doesn't overlap control panel
        coinX = Math.max(50, Math.min(maxCoinX, coinX));
        coinY = Math.max(50, Math.min(this.canvasHeight - 50, coinY));
        
        this.coins.push({
          x: coinX,
          y: coinY,
          width: 20,
          height: 20,
          color: '#F59E0B',
          type: 'coin'
        });
      }
    }

    // Generate power-ups (40% chance per cluster) - DESKTOP ONLY to prevent mobile freezing
    this.powerups = [];
    const isMobileForPowerups = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobileForPowerups) {
      // Desktop-only power-up generation with tiny level-based likelihood increase
      const baseProbability = 0.40; // 40% base chance
      const levelMultiplier = Math.min(1 + (this.level - 1) * 0.02, 1.5); // Increase 2% per level, max 1.5x
      const adjustedProbability = Math.min(baseProbability * levelMultiplier, 0.60); // Cap at 60%
      
      for (let cluster = 0; cluster < numClusters; cluster++) {
        if (Math.random() < adjustedProbability) { // Level-scaled chance per cluster
          const clusterX = this.coinClusters[cluster].x;
          const clusterY = this.coinClusters[cluster].y;
          
          // Choose random power-up type
          const powerupTypes: ('magnet' | 'extralife')[] = ['magnet', 'extralife'];
          const powerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
          
          // Place power-up near cluster but not too close to coins
          let powerupX = clusterX + (Math.random() - 0.5) * 200;
          let powerupY = clusterY + (Math.random() - 0.5) * 150;
          
          const maxPowerupX = this.levelWidth - 200;
          
          powerupX = Math.max(50, Math.min(maxPowerupX, powerupX));
          powerupY = Math.max(50, Math.min(this.canvasHeight - 50, powerupY));
          
          this.powerups.push({
            x: powerupX,
            y: powerupY,
            width: 25,
            height: 25,
            color: powerupType === 'magnet' ? '#FF6B6B' : '#4ECDC4',
            type: 'powerup',
            powerupType: powerupType
          });
        }
      }
    }

    // Generate TNT bombs that patrol around coin clusters (distributed evenly)
    const tntPerCluster = 1; // Keep it simple - one TNT per cluster to avoid clumping
    for (let clusterIndex = 0; clusterIndex < numClusters; clusterIndex++) {
      const clusterX = this.coinClusters[clusterIndex].x;
      const clusterY = this.coinClusters[clusterIndex].y;
      
      // Create circular patrol around the cluster with better spacing
      const patrolRadius = 90 + (clusterIndex % 3) * 20; // Vary radius to prevent overlap
      const startAngle = (clusterIndex * Math.PI * 2 / numClusters) + Math.random() * 0.5; // Space them out evenly
      
      // Ensure TNT starts far enough from the player start position (x=50)
      const tntStartX = clusterX + Math.cos(startAngle) * patrolRadius;
      const tntStartY = clusterY + Math.sin(startAngle) * patrolRadius;
      
      // Allow TNT anywhere in the level, removing safe zone
      if (true) { // TNT can spawn anywhere now
        this.obstacles.push({
          x: tntStartX,
          y: tntStartY,
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: (8 + Math.random() * 4) * (1 + this.level * 0.08), // Speed scales with level
          vy: (8 + Math.random() * 4) * (1 + this.level * 0.08), // Speed scales with level
          patrolStartX: clusterX, // center X of circular patrol
          patrolStartY: clusterY, // center Y of circular patrol
          patrolEndX: patrolRadius, // using this as radius
          patrolEndY: startAngle // using this as current angle
        });
      }
    }
    
    // Add progressive difficulty scaling for additional TNT
    if (this.level > 1) {
      // Progressive increase: more TNT every 2 levels, with scaling multiplier
      const levelMultiplier = Math.min(1 + (this.level - 1) * 0.2, 4); // Cap at 4x
      const additionalTnt = Math.floor(this.level * levelMultiplier / 2);
      for (let i = 0; i < additionalTnt; i++) {
        const clusterIndex = i % numClusters; // Cycle through clusters
        const clusterX = this.coinClusters[clusterIndex].x;
        const clusterY = this.coinClusters[clusterIndex].y;
        
        // Create a second TNT with different radius and offset angle
        const patrolRadius = 60 + Math.random() * 40;
        const startAngle = (Math.PI + i * Math.PI / 2) % (Math.PI * 2); // Different starting positions
        
        const tntX = clusterX + Math.cos(startAngle) * patrolRadius;
        
        // Allow TNT anywhere in the level, removing safe zone
        const minStartXForAdditional = 50; // Allow TNT anywhere
        
        if (tntX > minStartXForAdditional) {
          this.obstacles.push({
            x: tntX,
            y: clusterY + Math.sin(startAngle) * patrolRadius,
            width: 35,
            height: 35,
            color: '#8B4513',
            type: 'obstacle',
            vx: (8 + Math.random() * 4) * (1 + this.level * 0.1), // Speed increases with level
            vy: (8 + Math.random() * 4) * (1 + this.level * 0.1), // Speed increases with level
            patrolStartX: clusterX,
            patrolStartY: clusterY,
            patrolEndX: patrolRadius,
            patrolEndY: startAngle
          });
        }
      }
    }

    // Add some linear patrolling TNT bombs between clusters (reduced to prevent overcrowding)
    const linearTnt = Math.min(2, this.level); // Cap linear TNT to prevent overcrowding
    for (let i = 0; i < linearTnt; i++) {
      let x: number, y: number;
      let attempts = 0;
      
      // Find positions that are away from coin clusters and control panel
      const isMobileForLinear = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const controlPanelWidthForLinear = isMobileForLinear ? 128 : 0;
      const maxLinearX = this.levelWidth - 300 - controlPanelWidthForLinear; // Keep away from right edge and control panel
      
      // iPad-specific: Allow TNT closer to start for better distribution
      const isIPadForLinear = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const minLinearStartX = isIPadForLinear ? 200 : 500; // Allow TNT closer to start on iPad
      
      do {
        x = minLinearStartX + Math.random() * (maxLinearX - minLinearStartX);
        y = 80 + Math.random() * (this.canvasHeight - 160);
        attempts++;
      } while (attempts < 20 && clusterPositions.some(pos => 
        Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2) < 250 // Increase minimum distance from clusters
      ));
      
      const patrolType = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      
      if (patrolType === 'horizontal') {
        const patrolRange = 120 + Math.random() * 150; // Smaller patrol ranges
        const patrolStartX = Math.max(50, x - patrolRange / 2);
        const patrolEndX = Math.min(maxLinearX, x + patrolRange / 2);
        
        this.obstacles.push({
          x: patrolStartX,
          y,
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: (8 + Math.random() * 4) * (1 + this.level * 0.1), // Much faster movement
          vy: 0,
          patrolStartX,
          patrolEndX,
          patrolStartY: y,
          patrolEndY: y
        });
      } else {
        const patrolRange = 80 + Math.random() * 120;
        const patrolStartY = Math.max(50, y - patrolRange / 2);
        const patrolEndY = Math.min(this.canvasHeight - 50, y + patrolRange / 2);
        
        this.obstacles.push({
          x,
          y: patrolStartY,
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: 0,
          vy: (8 + Math.random() * 4) * (1 + this.level * 0.1), // Much faster movement
          patrolStartX: x,
          patrolEndX: x,
          patrolStartY,
          patrolEndY
        });
      }
    }

    // Add TNT patrols along all outside walls - progressive scaling
    const wallPatrols = 2 + Math.floor(this.level * (1 + this.level * 0.1) / 3); // Exponential growth
    
    // Removed wall patrols - now handled by barrier patrols

    // Add multiple rows of TNT barrier patrols to prevent edge-hugging strategies
    // But keep them away from the portal area (right side)
    const levelDifficultyMultiplier = Math.min(1 + (this.level - 1) * 0.15, 3); // Progressive scaling
    const numBarriers = Math.floor((18 + Math.floor(this.level / 2)) * levelDifficultyMultiplier); // Scaled barriers
    const barrierRows = 2; // Multiple rows of barriers (back to 2)
    // Calculate safe zone based on control panel width - make sure it accounts for the new portal position
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const controlPanelWidth = isMobile ? 128 : 0; // 128px control panel on mobile/iPad
    const portalSafeZone = 250 + controlPanelWidth; // Keep TNT away from portal area and control panel (increased for new portal position)
    
    // Top edge barrier patrols (multiple rows moving horizontally, but not near portal)
    for (let row = 0; row < barrierRows; row++) {
      for (let i = 0; i < numBarriers; i++) {
        const x = 80 + (i * (this.levelWidth - portalSafeZone - 80) / numBarriers); // Start from the left edge
        // Only add if not in portal area
        if (x < this.levelWidth - portalSafeZone) {
          this.obstacles.push({
            x: x,
            y: 20 + (row * 40), // Multiple rows
            width: 35,
            height: 35,
            color: '#8B4513',
            type: 'obstacle',
            vx: (1.0 + Math.random() * 1.0) * (row % 2 === 0 ? 1 : -1) * (1 + this.level * 0.05), // Speed scales with level
            vy: 0,
            patrolStartX: 50, // Start patrol from the left edge
            patrolEndX: this.levelWidth - portalSafeZone,
            patrolStartY: 20 + (row * 40),
            patrolEndY: 20 + (row * 40)
          });
        }
      }
    }
    
    // Bottom edge barrier patrols (multiple rows moving horizontally, but not near portal)
    for (let row = 0; row < barrierRows; row++) {
      for (let i = 0; i < numBarriers; i++) {
        const x = 80 + (i * (this.levelWidth - portalSafeZone - 160) / numBarriers);
        // Only add if not in portal area
        if (x < this.levelWidth - portalSafeZone) {
          this.obstacles.push({
            x: x,
            y: this.canvasHeight - 55 - (row * 40), // Multiple rows from bottom
            width: 35,
            height: 35,
            color: '#8B4513',
            type: 'obstacle',
            vx: (1.0 + Math.random() * 1.0) * (row % 2 === 0 ? -1 : 1), // Alternate directions
            vy: 0,
            patrolStartX: 50,
            patrolEndX: this.levelWidth - portalSafeZone,
            patrolStartY: this.canvasHeight - 55 - (row * 40),
            patrolEndY: this.canvasHeight - 55 - (row * 40)
          });
        }
      }
    }
    
    // Left edge barrier patrols (multiple columns moving vertically)
    const sideBarriers = Math.ceil(numBarriers / 2);
    for (let col = 0; col < barrierRows; col++) {
      for (let i = 0; i < sideBarriers; i++) {
        this.obstacles.push({
          x: 20 + (col * 40), // Multiple columns
          y: 120 + (i * (this.canvasHeight - 240) / sideBarriers),
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: 0,
          vy: (1.0 + Math.random() * 1.0) * (col % 2 === 0 ? 1 : -1), // Alternate directions
          patrolStartX: 20 + (col * 40),
          patrolEndX: 20 + (col * 40),
          patrolStartY: 100,
          patrolEndY: this.canvasHeight - 100
        });
      }
    }
    
    // Right edge barrier patrols removed to keep portal area clear

    // Add additional dense TNT guards on top and bottom edges for increased difficulty
    const additionalTopBottomGuards = 10 + Math.floor(this.level / 3); // More guards in higher levels (increased from 6)
    
    // Additional top edge guards (closer spacing, different patrol patterns)
    for (let i = 0; i < additionalTopBottomGuards; i++) {
      const x = 120 + (i * (this.levelWidth - portalSafeZone - 240) / additionalTopBottomGuards);
      if (x < this.levelWidth - portalSafeZone) {
        this.obstacles.push({
          x: x,
          y: 60, // Between the existing rows
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: (1.2 + Math.random() * 0.8) * (i % 2 === 0 ? 1 : -1), // Varied speed
          vy: 0,
          patrolStartX: 60,
          patrolEndX: this.levelWidth - portalSafeZone,
          patrolStartY: 60,
          patrolEndY: 60
        });
      }
    }
    
    // Additional bottom edge guards (closer spacing, different patrol patterns)
    for (let i = 0; i < additionalTopBottomGuards; i++) {
      const x = 120 + (i * (this.levelWidth - portalSafeZone - 240) / additionalTopBottomGuards);
      if (x < this.levelWidth - portalSafeZone) {
        this.obstacles.push({
          x: x,
          y: this.canvasHeight - 95, // Between the existing rows
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: (1.2 + Math.random() * 0.8) * (i % 2 === 0 ? -1 : 1), // Varied speed, opposite direction
          vy: 0,
          patrolStartX: 60,
          patrolEndX: this.levelWidth - portalSafeZone,
          patrolStartY: this.canvasHeight - 95,
          patrolEndY: this.canvasHeight - 95
        });
      }
    }

    // Add staggered TNT guards on top and bottom for varied movement patterns
    const staggeredGuards = 8 + Math.floor(this.level / 4); // More staggered guards in higher levels (increased from 4)
    
    // Staggered top guards with different Y positions
    for (let i = 0; i < staggeredGuards; i++) {
      const x = 200 + (i * (this.levelWidth - portalSafeZone - 400) / staggeredGuards);
      const yOffset = (i % 2) * 25; // Alternate between two Y positions
      if (x < this.levelWidth - portalSafeZone) {
        this.obstacles.push({
          x: x,
          y: 35 + yOffset, // Staggered Y positions
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: (0.8 + Math.random() * 0.6) * (i % 3 === 0 ? 1 : -1), // Slower, varied direction
          vy: 0,
          patrolStartX: 80,
          patrolEndX: this.levelWidth - portalSafeZone,
          patrolStartY: 35 + yOffset,
          patrolEndY: 35 + yOffset
        });
      }
    }
    
    // Staggered bottom guards with different Y positions
    for (let i = 0; i < staggeredGuards; i++) {
      const x = 200 + (i * (this.levelWidth - portalSafeZone - 400) / staggeredGuards);
      const yOffset = (i % 2) * 25; // Alternate between two Y positions
      if (x < this.levelWidth - portalSafeZone) {
        this.obstacles.push({
          x: x,
          y: this.canvasHeight - 70 - yOffset, // Staggered Y positions from bottom
          width: 35,
          height: 35,
          color: '#8B4513',
          type: 'obstacle',
          vx: (0.8 + Math.random() * 0.6) * (i % 3 === 0 ? -1 : 1), // Slower, varied direction
          vy: 0,
          patrolStartX: 80,
          patrolEndX: this.levelWidth - portalSafeZone,
          patrolStartY: this.canvasHeight - 70 - yOffset,
          patrolEndY: this.canvasHeight - 70 - yOffset
        });
      }
    }

    // Only ensure obstacles don't overlap with portal area
    this.obstacles = this.obstacles.filter(obs => 
      obs.x <= 60 || // Allow left wall patrols and barriers
      obs.y <= 60 || // Allow top wall patrols and barriers
      obs.y >= this.canvasHeight - 60 || // Allow bottom wall patrols and barriers
      obs.x < this.levelWidth - 200 // Only filter out obstacles too close to portal
    );
    
    // Validate coin accessibility - ensure no coins are completely surrounded by obstacles
    this.coins = this.coins.filter(coin => {
      // Check if coin has at least one path (basic accessibility check)
      const nearbyObstacles = this.obstacles.filter(obs => {
        const dx = Math.abs(obs.x + obs.width/2 - coin.x - coin.width/2);
        const dy = Math.abs(obs.y + obs.height/2 - coin.y - coin.height/2);
        return dx < 60 && dy < 60; // Within close proximity
      });
      
      // Check if coin is too close to patrol paths
      const tooCloseToPatrol = this.obstacles.some(obs => {
        if (obs.patrolStartX !== undefined && obs.patrolEndX !== undefined) {
          // For horizontal patrol
          if (obs.patrolStartY === obs.patrolEndY) {
            const patrolY = obs.patrolStartY;
            const patrolStartX = Math.min(obs.patrolStartX, obs.patrolEndX);
            const patrolEndX = Math.max(obs.patrolStartX, obs.patrolEndX);
            
            return coin.y > (patrolY || 0) - 40 && coin.y < (patrolY || 0) + 40 &&
                   coin.x > patrolStartX - 40 && coin.x < patrolEndX + 40;
          }
          // For vertical patrol
          if (obs.patrolStartX === obs.patrolEndX) {
            const patrolX = obs.patrolStartX;
            const patrolStartY = Math.min(obs.patrolStartY!, obs.patrolEndY!);
            const patrolEndY = Math.max(obs.patrolStartY!, obs.patrolEndY!);
            
            return coin.x > patrolX - 40 && coin.x < patrolX + 40 &&
                   coin.y > patrolStartY - 40 && coin.y < patrolEndY + 40;
          }
        }
        return false;
      });
      
      // If there are too many obstacles very close to the coin, or it's in a patrol path, it might be unreachable
      return nearbyObstacles.length < 4 && !tooCloseToPatrol; // Allow some challenge but not complete blockade
    });
    
    // Ensure we have at least some coins left after filtering
    if (this.coins.length < 3) {
      // Add safe coins if too many were filtered out
      const safeCoinCount = 3 - this.coins.length;
      for (let i = 0; i < safeCoinCount; i++) {
        this.coins.push({
          x: 150 + i * 100, // Safe positions near start
          y: this.canvasHeight / 2 + (i - 1) * 40,
          width: 20,
          height: 20,
          color: '#F59E0B',
          type: 'coin'
        });
      }
    }
    
    // Validate that portal is reachable after generation
    this.validateLevelReachability();
  }

  private validateLevelReachability(): boolean {
    // Since obstacles are moving, we only need to check if there are any permanent barriers
    // For moving obstacles, the player can time their movement to pass through
    const gridSize = 30; // Larger grid for more generous pathfinding
    const gridWidth = Math.ceil(this.levelWidth / gridSize);
    const gridHeight = Math.ceil(this.canvasHeight / gridSize);
    
    // Create a grid where true = passable, false = permanently blocked
    const grid: boolean[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(true));
    
    // Only mark areas as blocked if they have high obstacle density
    // This prevents marking single moving obstacles as permanent barriers
    const obstacleInfluence: number[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0));
    
    // Calculate obstacle influence rather than hard blocking
    this.obstacles.forEach(obstacle => {
      const centerX = Math.floor((obstacle.x + obstacle.width / 2) / gridSize);
      const centerY = Math.floor((obstacle.y + obstacle.height / 2) / gridSize);
      
      // Add influence around obstacle center (since they move, they don't permanently block)
      for (let y = Math.max(0, centerY - 1); y < Math.min(gridHeight, centerY + 2); y++) {
        for (let x = Math.max(0, centerX - 1); x < Math.min(gridWidth, centerX + 2); x++) {
          obstacleInfluence[y][x] += 1;
        }
      }
    });
    
    // Only block areas with very high obstacle density (3+ obstacles in same area)
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (obstacleInfluence[y][x] >= 3) {
          grid[y][x] = false;
        }
      }
    }
    
    // Simple BFS pathfinding from player to goal
    const playerGridX = Math.floor(this.player.x / gridSize);
    const playerGridY = Math.floor(this.player.y / gridSize);
    const goalGridX = Math.floor(this.goal.x / gridSize);
    const goalGridY = Math.floor(this.goal.y / gridSize);
    
    const queue = [[playerGridX, playerGridY]];
    const visited = new Set<string>();
    visited.add(`${playerGridX},${playerGridY}`);
    
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]; // Include diagonal movement
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      
      // Check if we reached the goal area (more generous)
      if (Math.abs(x - goalGridX) <= 3 && Math.abs(y - goalGridY) <= 3) {
        console.log(`Level ${this.level}: Portal is reachable! (Moving obstacles allow passage)`);
        return true;
      }
      
      // Explore neighbors
      for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;
        const key = `${newX},${newY}`;
        
        if (newX >= 0 && newX < gridWidth && 
            newY >= 0 && newY < gridHeight && 
            grid[newY][newX] && 
            !visited.has(key)) {
          visited.add(key);
          queue.push([newX, newY]);
        }
      }
    }
    
    // If we get here, check if it's due to too many obstacles clustered together
    const totalObstacles = this.obstacles.length;
    const levelArea = (this.levelWidth * this.canvasHeight) / (gridSize * gridSize);
    const obstacleDensity = totalObstacles / levelArea;
    
    if (obstacleDensity > 0.3) { // If obstacle density is too high
      console.warn(`Level ${this.level}: Too many obstacles clustered, regenerating...`);
      this.generateLevel();
      return this.validateLevelReachability();
    }
    
    // Otherwise, assume it's reachable since obstacles are moving
    console.log(`Level ${this.level}: Portal assumed reachable (obstacles are moving)`);
    return true;
  }

  public handleTouchStart(x: number, y: number) {
    this.isTouching = true;
    this.touchPosition = { x, y };
  }

  public handleTouchMove(x: number, y: number) {
    if (this.isTouching) {
      this.touchPosition = { x, y };
    }
  }

  public handleTouchEnd() {
    this.isTouching = false;
    this.touchPosition = null;
  }

  public handleKeyDown(key: string) {
    // Handle pause key
    if (key === 'Space' || key === 'Escape') {
      this.togglePause();
      return;
    }
    
    // Handle speed adjustment keys (no logging for mobile performance)
    if (key === 'Equal' || key === 'NumpadAdd') { // Plus key (= key without shift, or numpad +)
      this.gameSpeed = Math.min(this.gameSpeed + 0.25, 3); // Max speed of 3x
    } else if (key === 'Minus' || key === 'NumpadSubtract') { // Minus key (- key or numpad -)
      this.gameSpeed = Math.max(this.gameSpeed - 0.25, 0.25); // Min speed of 0.25x
    }
    
    this.keys[key] = true;
  }

  public handleKeyUp(key: string) {
    this.keys[key] = false;
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
  }

  public setAvatar(avatar: AvatarInfo) {
    this.currentAvatar = avatar;
    
    // Load avatar image if it has one
    if (avatar.image && !this.avatarImages[avatar.id]) {
      const img = new Image();
      img.src = avatar.image;
      img.onload = () => {
        this.avatarImages[avatar.id] = img;
      };
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public update() {
    // Don't update game state if not initialized or paused
    if (!this.isInitialized || this.isPaused) {
      return;
    }
    
    const baseSpeed = 5;
    const acceleration = 0.8; // How quickly player accelerates
    const deceleration = 0.85; // How quickly player decelerates (higher = faster stop)
    
    // Target velocity based on input
    let targetVelX = 0;
    let targetVelY = 0;
    
    // Handle keyboard input
    if (this.keys['ArrowUp'] || this.keys['KeyW']) {
      targetVelY = -baseSpeed * this.gameSpeed;
    }
    if (this.keys['ArrowDown'] || this.keys['KeyS']) {
      targetVelY = baseSpeed * this.gameSpeed;
    }
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      targetVelX = -baseSpeed * this.gameSpeed;
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      targetVelX = baseSpeed * this.gameSpeed;
    }
    
    // Handle touch input (if no keyboard input)
    const hasKeyboardInput = this.keys['ArrowUp'] || this.keys['ArrowDown'] || 
                           this.keys['ArrowLeft'] || this.keys['ArrowRight'] ||
                           this.keys['KeyW'] || this.keys['KeyA'] || 
                           this.keys['KeyS'] || this.keys['KeyD'];
    
    if (!hasKeyboardInput && this.isTouching && this.touchPosition) {
      const worldTouchX = this.touchPosition.x + this.cameraX;
      const worldTouchY = this.touchPosition.y;
      
      const dx = worldTouchX - (this.player.x + this.player.width / 2);
      const dy = worldTouchY - (this.player.y + this.player.height / 2);
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        const touchSpeed = 3 * this.gameSpeed;
        targetVelX = (dx / distance) * touchSpeed;
        targetVelY = (dy / distance) * touchSpeed;
      }
    }
    
    // Smoother velocity interpolation for better movement feel
    this.playerVelocity.x = this.lerp(this.playerVelocity.x, targetVelX, 
                                      targetVelX === 0 ? 0.9 : 0.85); // Improved smoothness
    this.playerVelocity.y = this.lerp(this.playerVelocity.y, targetVelY, 
                                      targetVelY === 0 ? 0.9 : 0.85); // Improved smoothness
    
    // Apply velocity to player position
    this.player.x += this.playerVelocity.x;
    this.player.y += this.playerVelocity.y;
    
    // Track movement for animation
    const moveX = this.playerVelocity.x;
    const moveY = this.playerVelocity.y;
    
    // Check if player is moving and update animation
    const movementThreshold = 0.1; // Small threshold to prevent jittery animation
    this.isMoving = Math.abs(moveX) > movementThreshold || Math.abs(moveY) > movementThreshold;
    if (this.isMoving) {
      this.animationFrame += 0.5 * this.gameSpeed; // Smoother animation speed
      // Update facing direction based on horizontal movement
      if (moveX > 0) {
        this.facingDirection = 1; // Moving right
      } else if (moveX < 0) {
        this.facingDirection = -1; // Moving left
      }
    }

    // Update camera position
    this.updateCameraPosition();

    // Keep player in bounds - account for control panel on mobile
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const controlPanelWidth = isMobile ? 128 : 0; // 128px control panel on mobile/iPad
    
    // The player should be able to move through the level but stop when they would go under the control panel
    // This means the rightmost position should be relative to the current camera position + canvas width - control panel width
    const rightBoundary = this.cameraX + this.canvasWidth - controlPanelWidth;
    const maxPlayerX = Math.min(this.levelWidth - this.player.width, rightBoundary - this.player.width);
    
    // Minimal boundary logging for mobile performance
    if (this.player.x > maxPlayerX - 50 && Math.random() < 0.001) { // Only log 0.1% when very close to boundary
      console.log(`Player boundary: cameraX=${this.cameraX}, canvasWidth=${this.canvasWidth}, controlPanelWidth=${controlPanelWidth}, rightBoundary=${rightBoundary}, maxPlayerX=${maxPlayerX}, playerX=${this.player.x}`);
    }
    
    this.player.x = Math.max(0, Math.min(maxPlayerX, this.player.x));
    this.player.y = Math.max(0, Math.min(this.canvasHeight - this.player.height, this.player.y));

    // Update moving obstacles
    this.obstacles.forEach(obstacle => {
      if (obstacle.vx !== undefined && obstacle.vy !== undefined) {
        // Check if this is a circular patrol (around coins)
        if (obstacle.patrolEndX !== undefined && obstacle.patrolEndY !== undefined && 
            obstacle.patrolStartX !== undefined && obstacle.patrolStartY !== undefined &&
            obstacle.patrolEndX < 200) { // radius is stored in patrolEndX for circular patrol
          
          // Circular movement around coin clusters
          const centerX = obstacle.patrolStartX;
          const centerY = obstacle.patrolStartY;
          const radius = obstacle.patrolEndX;
          let angle = obstacle.patrolEndY; // current angle stored in patrolEndY
          
          // iPad-specific: Use more stable circular movement
          const isIPadForMovement = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          
          // Apply level-based speed scaling to circular TNT movement
          const levelSpeedMultiplier = 1 + (this.level - 1) * 0.08; // 8% increase per level
          
          if (isIPadForMovement) {
            // Faster, more stable movement for iPad with level scaling
            angle += 0.04 * levelSpeedMultiplier;
          } else {
            // Faster complex movement for other devices with level scaling
            angle += (0.035 + (Math.sin(Date.now() * 0.001 + radius) * 0.01)) * levelSpeedMultiplier;
          }
          obstacle.patrolEndY = angle;
          
          // Calculate new position
          obstacle.x = centerX + Math.cos(angle) * radius - obstacle.width / 2;
          obstacle.y = centerY + Math.sin(angle) * radius - obstacle.height / 2;
          
          // iPad-specific: Don't constrain circular TNT movement as aggressively
          const isIPadForCircular = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          
          // Allow circular TNT to move freely - no constraints
          
          // Update velocity for movement indicators
          obstacle.vx = Math.cos(angle + Math.PI / 2) * 2;
          obstacle.vy = Math.sin(angle + Math.PI / 2) * 2;
          
        } else {
          // Linear movement (existing code) without speed multiplier
          obstacle.x += obstacle.vx;
          obstacle.y += obstacle.vy;
          
          // Check boundaries and reverse direction if needed
          if (obstacle.patrolStartX !== undefined && obstacle.patrolEndX !== undefined) {
            if (obstacle.x <= obstacle.patrolStartX || obstacle.x + obstacle.width >= obstacle.patrolEndX) {
              obstacle.vx = -obstacle.vx;
            }
          }
          
          if (obstacle.patrolStartY !== undefined && obstacle.patrolEndY !== undefined) {
            if (obstacle.y <= obstacle.patrolStartY || obstacle.y + obstacle.height >= obstacle.patrolEndY) {
              obstacle.vy = -obstacle.vy;
            }
          }
          
          // iPad-specific: Don't restrict linear TNT to tight patrol bounds on iPad
          const isIPadForPatrolBounds = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          
          // Allow obstacles to move freely within the level bounds
          obstacle.x = Math.max(0, Math.min(this.levelWidth - obstacle.width, obstacle.x));
          obstacle.y = Math.max(0, Math.min(this.canvasHeight - obstacle.height, obstacle.y));
          
          // iPad-specific: Don't constrain linear TNT movement as aggressively
          const isIPadForLinearObstacles = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          
          // Allow linear obstacles to move freely - no control panel constraints
        }
      }
    });

    // Camera position already updated above

    // Notify callback of player movement
    this.callbacks.onPlayerMove(this.player.x, this.player.y);

    // Check coin collisions and track cluster completion
    this.coins = this.coins.filter(coin => {
      // Apply magnet attraction if active - desktop only for performance
      const magnetActive = (window as any).magnetActive;
      if (magnetActive) {
        // Check if mobile - completely skip magnet calculations on mobile to prevent freezing
        const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile) {
          // Desktop-only magnet attraction with strong pull
          const playerCenterX = this.player.x + this.player.width / 2;
          const playerCenterY = this.player.y + this.player.height / 2;
          const coinCenterX = coin.x + coin.width / 2;
          const coinCenterY = coin.y + coin.height / 2;
          
          const dx = playerCenterX - coinCenterX;
          const dy = playerCenterY - coinCenterY;
          const distance = Math.abs(dx) + Math.abs(dy);
          
          if (distance < 500 && distance > 25) {
            // Strong desktop attraction
            const moveX = dx > 0 ? 4 : -4;
            const moveY = dy > 0 ? 4 : -4;
            
            coin.x += moveX;
            coin.y += moveY;
            coin.color = '#FFD700';
          }
        }
      }
      
      if (checkCollision(this.player, coin)) {
        // Find which cluster this coin belongs to
        for (let i = 0; i < this.coinClusters.length; i++) {
          const cluster = this.coinClusters[i];
          const distance = Math.sqrt(
            Math.pow(coin.x - cluster.x, 2) + Math.pow(coin.y - cluster.y, 2)
          );
          if (distance < 100) {
            cluster.coinsCollected++;
            if (cluster.coinsCollected === cluster.totalCoins) {
              this.clustersCompleted++;
            }
            break;
          }
        }
        
        this.score += 100;
        this.coinsCollected++;
        this.callbacks.onCoinCollected(100);
        return false;
      }
      return true;
    });

    // Check power-up collisions
    this.powerups = this.powerups.filter(powerup => {
      if (checkCollision(this.player, powerup)) {
        this.callbacks.onPowerupCollected(powerup.powerupType!);
        return false;
      }
      return true;
    });

    // Check obstacle collisions (with invulnerability and shield protection)
    for (const obstacle of this.obstacles) {
      if (checkCollision(this.player, obstacle)) {
        // Check if player is invulnerable first
        const invulnerable = (window as any).invulnerable;
        const shieldActive = (window as any).shieldActive;
        const extraLives = (window as any).extraLives || 0;
        
        console.log('TNT hit detected! Invulnerable:', invulnerable, 'Shield active:', shieldActive, 'Extra lives:', extraLives);
        
        if (invulnerable) {
          // Player is invulnerable - ignore hit completely
          console.log('INVULNERABLE - TNT hit ignored!');
          
          // Still move player away to prevent visual overlap
          if (obstacle.x < this.player.x) {
            this.player.x += 40; // Push right
          } else {
            this.player.x -= 40; // Push left
          }
          this.player.x = Math.max(0, Math.min(this.levelWidth - this.player.width, this.player.x));
          
          return; // Skip the hit completely
        } else if (shieldActive && extraLives > 0) {
          // Shield blocks the hit - consume one shield and activate invulnerability
          console.log('Shield BLOCKED TNT hit! Lives remaining:', extraLives - 1, '- Activating 2s invulnerability');
          this.callbacks.onShieldUsed();
          this.callbacks.onInvulnerabilityActivated(); // Activate 2 seconds of invulnerability
          
          // Move player away from obstacle to prevent multiple hits
          if (obstacle.x < this.player.x) {
            this.player.x += 40; // Push right
          } else {
            this.player.x -= 40; // Push left
          }
          this.player.x = Math.max(0, Math.min(this.levelWidth - this.player.width, this.player.x));
          
          return; // Skip the hit completely
        } else {
          console.log('No shield protection - game over');
          this.callbacks.onObstacleHit();
          return;
        }
      }
    }

    // Check goal collision (only if 5 coins are collected)
    if (checkCollision(this.player, this.goal)) {
      if (this.coinsCollected >= this.coinsNeededForPortal) {
        this.callbacks.onLevelComplete();
        return;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Only prevent rendering during the initial startup period
    if (!this.isInitialized || this.renderFrameCount < 5) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.renderFrameCount++;
      return;
    }
    
    // Clear canvas with black background first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw control panel area on mobile BEFORE anything else to prevent green overflow
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      this.drawControlPanelBackground(ctx);
    }

    // Save context for camera transform
    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw background pattern only in the game area (limit to game area, not control panel)
    this.drawBackground(ctx);

    // Draw goal
    this.drawGoal(ctx);

    // Draw coins
    this.coins.forEach(coin => this.drawCoin(ctx, coin));

    // Draw power-ups
    this.powerups.forEach(powerup => this.drawPowerup(ctx, powerup));

    // Draw obstacles
    this.obstacles.forEach(obstacle => this.drawObstacle(ctx, obstacle));

    // Draw player
    this.drawPlayer(ctx);

    // Restore context
    ctx.restore();

    // Draw UI elements (not affected by camera)
    this.drawUI(ctx);
    
    // Draw pause overlay background if paused (UI will handle the rest)
    if (this.isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    // Calculate the actual game area (exclude control panel on mobile)
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const controlPanelWidth = isMobile ? 128 : 0;
    const gameAreaWidth = this.canvasWidth - controlPanelWidth;
    
    // Only draw background within the visible game area and up to level width
    const backgroundWidth = Math.min(this.levelWidth, gameAreaWidth + this.cameraX);
    
    // Draw grass background only in the playable area
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 0, backgroundWidth, this.canvasHeight);

    // Draw grid pattern only in the playable area
    ctx.strokeStyle = '#16A34A';
    ctx.lineWidth = 1;
    for (let x = 0; x < backgroundWidth; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvasHeight; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(backgroundWidth, y);
      ctx.stroke();
    }
  }

  private drawControlPanelBackground(ctx: CanvasRenderingContext2D) {
    // Draw control panel background area
    const controlPanelWidth = 128;
    const panelX = this.canvasWidth - controlPanelWidth;
    
    // Draw panel background with slight transparency
    ctx.fillStyle = 'rgba(45, 45, 45, 0.95)';
    ctx.fillRect(panelX, 0, controlPanelWidth, this.canvasHeight);
    
    // Draw panel border
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelX, 0);
    ctx.lineTo(panelX, this.canvasHeight);
    ctx.stroke();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const x = this.player.x;
    const y = this.player.y;
    const w = this.player.width;
    const h = this.player.height;
    const centerX = x + w / 2;
    
    // Enable anti-aliasing for smoother curves
    ctx.imageSmoothingEnabled = true;
    
    // Save the current transformation matrix
    ctx.save();
    
    // Apply horizontal flip if facing left
    if (this.facingDirection === -1) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }

    // Check which avatar to draw
    if (this.currentAvatar.id === 'count-olaf') {
      this.drawCountOlafAvatar(ctx, x, y, w, h, centerX);
    } else if (this.currentAvatar.id === 'tom-nook') {
      this.drawTomNookAvatar(ctx, x, y, w, h, centerX);
    } else if (this.currentAvatar.id === 'ebenezer-scrooge') {
      this.drawEbenezerScroogeAvatar(ctx, x, y, w, h, centerX);
    } else if (this.currentAvatar.id === 'wario') {
      this.drawWarioAvatar(ctx, x, y, w, h, centerX);
    } else {
      // Draw default leprechaun avatar
      this.drawLeprechaunAvatar(ctx, x, y, w, h, centerX);
    }
    
    // Restore the transformation matrix
    ctx.restore();
    
    // Draw power-up effects AFTER the avatar (so they appear on top)
    this.drawPowerupEffects(ctx, x, y, w, h, centerX);
    
    // Reset text alignment
    ctx.textAlign = 'left';
  }

  private drawPowerupEffects(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, centerX: number) {
    const time = Date.now() * 0.005;
    
    // Get power-up states from window (temporary solution)
    const magnetActive = (window as any).magnetActive;
    const shieldActive = (window as any).shieldActive;
    const extraLives = (window as any).extraLives || 0;
    
    // Draw shield effect with blue force field
    if (shieldActive && extraLives > 0) {
      const forceFieldRadius = Math.max(w, h) / 2 + 15 + Math.sin(time * 2) * 3;
      const playerCenterX = centerX;
      const playerCenterY = y + h / 2;
      
      // Create blue force field background circle with transparency
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#4A90E2'; // Blue force field
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, forceFieldRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0; // Reset transparency
      
      // Draw pulsing blue force field border
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = time * 15;
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, forceFieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      
      // Add secondary inner force field ring
      ctx.strokeStyle = '#87CEEB'; // Light blue
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.lineDashOffset = -time * 10;
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, forceFieldRadius - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      
      // Draw proper shield icon held in left hand
      const shieldX = centerX - w / 2 - 12; // Left side of player
      const shieldY = y + h / 2;
      const shieldSize = 12;
      
      // Draw traditional medieval shield shape
      ctx.fillStyle = '#2C5AA0'; // Deep blue shield
      ctx.beginPath();
      ctx.moveTo(shieldX, shieldY - shieldSize/2); // Top center
      ctx.lineTo(shieldX - shieldSize/3, shieldY - shieldSize/2); // Top left
      ctx.lineTo(shieldX - shieldSize/2, shieldY - shieldSize/4); // Left curve
      ctx.lineTo(shieldX - shieldSize/2, shieldY + shieldSize/4); // Left bottom curve
      ctx.lineTo(shieldX, shieldY + shieldSize/2); // Bottom point
      ctx.lineTo(shieldX + shieldSize/2, shieldY + shieldSize/4); // Right bottom curve
      ctx.lineTo(shieldX + shieldSize/2, shieldY - shieldSize/4); // Right curve
      ctx.lineTo(shieldX + shieldSize/3, shieldY - shieldSize/2); // Top right
      ctx.closePath();
      ctx.fill();
      
      // Add shield rim
      ctx.strokeStyle = '#1A365D'; // Darker blue rim
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw shield emblem (plus/cross)
      ctx.fillStyle = '#E2E8F0'; // Light silver emblem
      ctx.fillRect(shieldX - 1, shieldY - shieldSize/3, 2, shieldSize*2/3);
      ctx.fillRect(shieldX - shieldSize/4, shieldY - 1, shieldSize/2, 2);
      
      // Draw force field energy particles
      for (let i = 0; i < 8; i++) {
        const angle = (time * 1.5 + i * Math.PI / 4) % (Math.PI * 2);
        const particleRadius = forceFieldRadius - 5 + Math.sin(time * 3 + i) * 3;
        const particleX = playerCenterX + Math.cos(angle) * particleRadius;
        const particleY = playerCenterY + Math.sin(angle) * particleRadius;
        
        ctx.fillStyle = '#87CEEB';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
    
    // Draw magnet effect
    if (magnetActive) {
      // Draw magnetic field lines around player
      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.lineDashOffset = time * 8;
      
      for (let i = 0; i < 4; i++) {
        const radius = 30 + i * 15 + Math.sin(time * 2 + i) * 5;
        ctx.beginPath();
        ctx.arc(centerX, y + h / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset dash
      
      // Draw U-shaped magnet held in right hand
      const handX = centerX + w / 2 + 8; // Right side of player
      const handY = y + h / 2;
      const magnetSize = 8;
      
      // Draw U-shaped magnet body (proper U shape)
      ctx.fillStyle = '#C0C0C0'; // Silver magnet body
      
      // Draw left arm of U
      ctx.fillRect(handX - magnetSize/2, handY - magnetSize, 2, magnetSize);
      
      // Draw right arm of U  
      ctx.fillRect(handX + magnetSize/2 - 2, handY - magnetSize, 2, magnetSize);
      
      // Draw bottom of U (connecting the arms)
      ctx.fillRect(handX - magnetSize/2, handY, magnetSize, 2);
      
      // Draw red pole (N) on left arm
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(handX - magnetSize/2, handY - magnetSize, 2, 3);
      
      // Draw blue pole (S) on right arm
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(handX + magnetSize/2 - 2, handY - magnetSize, 2, 3);
      
      // Draw N and S labels
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 4px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('N', handX - magnetSize/2 + 1, handY - magnetSize + 2);
      ctx.fillText('S', handX + magnetSize/2 - 1, handY - magnetSize + 2);
    }
  }

  private drawTomNookAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, centerX: number) {
    // Draw Tom Nook in correct order: EARS FIRST, then BODY, then HEAD
    
    // 1. EARS FIRST - with brown rim and bright pink interior
    ctx.fillStyle = '#8B5A3C'; // Brown outer ears
    ctx.beginPath();
    ctx.ellipse(centerX - 9, y + 10, 4, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 9, y + 10, 4, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Bright pink inner ears
    ctx.fillStyle = '#F5A6C8'; // Pink from reference
    ctx.beginPath();
    ctx.ellipse(centerX - 9, y + 10, 2.8, 4.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 9, y + 10, 2.8, 4.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // 2. BODY SECOND - medium-sized purple business suit
    ctx.fillStyle = '#6B5B95'; // Purple from reference
    ctx.beginPath();
    // Create medium-sized suit shape
    ctx.roundRect(x + 3, y + 25, w - 6, 14, 5);
    ctx.fill();
    
    // 3. HEAD LAST - draw all head components after body
    // Draw the medium-sized tan/brown base head - moved down to connect with body
    ctx.fillStyle = '#C4965A'; // Tan-brown color from reference
    ctx.beginPath();
    ctx.ellipse(centerX, y + 18, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw dark brown mask to match thumbnail - moved down
    ctx.fillStyle = '#2D1B14'; // Dark brown mask like thumbnail
    ctx.beginPath();
    ctx.ellipse(centerX, y + 15, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw tan patches around eyes like thumbnail - moved down
    ctx.fillStyle = '#D2B48C'; // Tan patches matching thumbnail
    ctx.beginPath();
    ctx.ellipse(centerX - 3.5, y + 14, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 3.5, y + 14, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw lower face/muzzle - moved down to connect with body
    ctx.fillStyle = '#C4965A';
    ctx.beginPath();
    ctx.ellipse(centerX, y + 21, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add subtle muzzle shading - moved down
    ctx.fillStyle = '#BC9A6A';
    ctx.beginPath();
    ctx.ellipse(centerX + 1.5, y + 21, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw small round black nose - moved down
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX, y + 21, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw medium-sized white eyes - moved down with head
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(centerX - 3, y + 16, 2.8, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 3, y + 16, 2.8, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw blue pupils - moved down with eyes
    ctx.fillStyle = '#4169E1'; // Blue from reference
    ctx.beginPath();
    ctx.arc(centerX - 3, y + 16.3, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 3, y + 16.3, 1.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw suit lapels exactly as in reference - prominent triangular shapes
    ctx.fillStyle = '#5A4A85'; // Darker purple for lapels
    // Left lapel
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 26);
    ctx.lineTo(centerX - 2, y + 30);
    ctx.lineTo(x + 5, y + 34);
    ctx.lineTo(x + 5, y + 26);
    ctx.fill();
    // Right lapel
    ctx.beginPath();
    ctx.moveTo(x + w - 5, y + 26);
    ctx.lineTo(centerX + 2, y + 30);
    ctx.lineTo(x + w - 5, y + 34);
    ctx.lineTo(x + w - 5, y + 26);
    ctx.fill();
    
    // White shirt collar exactly as shown in reference
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(centerX - 2, y + 26);
    ctx.lineTo(centerX + 2, y + 26);
    ctx.lineTo(centerX + 1.5, y + 34);
    ctx.lineTo(centerX - 1.5, y + 34);
    ctx.closePath();
    ctx.fill();
    
    // Brown tie with orange center exactly matching reference
    ctx.fillStyle = '#8B4513'; // Brown tie base
    ctx.beginPath();
    ctx.ellipse(centerX, y + 29, 1.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Orange tie center/pattern
    ctx.fillStyle = '#CD853F';
    ctx.beginPath();
    ctx.ellipse(centerX, y + 29, 1, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add longer arms moved downward - extended arm shapes
    ctx.fillStyle = '#C4965A';
    // Left arm - longer and moved down
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 33, 2.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right arm - longer and moved down
    ctx.beginPath();
    ctx.ellipse(x + w - 1, y + 33, 2.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bigger legs positioned farther apart BELOW the suit
    ctx.fillStyle = '#C4965A';
    if (this.isMoving) {
      const legCycle = Math.sin(Date.now() * 0.015) * 1.5;
      const forwardOffset = 1;
      
      // Left leg - bigger and farther to the left
      const leftLegX = centerX - 7 + (legCycle > 0 ? forwardOffset : -forwardOffset);
      const leftLegY = y + 38 + Math.abs(legCycle) * 0.05; // Below suit
      ctx.fillRect(leftLegX, leftLegY, 5, 8);
      
      // Right leg - bigger and farther to the right
      const rightLegX = centerX + 3 + (legCycle < 0 ? forwardOffset : -forwardOffset);
      const rightLegY = y + 38 + Math.abs(legCycle) * 0.05; // Below suit
      ctx.fillRect(rightLegX, rightLegY, 5, 8);
    } else {
      // Bigger legs farther apart when standing
      ctx.fillRect(centerX - 7, y + 38, 5, 8); // Left leg bigger and farther left
      ctx.fillRect(centerX + 3, y + 38, 5, 8); // Right leg bigger and farther right
    }
  }

  private drawEbenezerScroogeAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, centerX: number) {
    // Enable antialiasing for smoother rendering
    ctx.imageSmoothingEnabled = true;
    
    // Adjust width to make avatar better proportioned
    const avatarWidth = w * 0.8;
    const leftEdge = centerX - avatarWidth / 2;
    const rightEdge = centerX + avatarWidth / 2;
    
    // Animation for legs like other avatars - use this.isMoving like Tom Nook
    const legCycle = Math.sin(Date.now() * 0.015) * 1.5;
    const forwardOffset = 1;
    
    // 1. WHITE SIDE HAIR - draw FIRST (before hat)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(leftEdge + 3, y + 1, 1.8, 4, 0, 0, Math.PI * 2); // Left hair
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rightEdge - 3, y + 1, 1.8, 4, 0, 0, Math.PI * 2); // Right hair
    ctx.fill();
    
    // 2. BLACK TOP HAT - draw AFTER hair
    ctx.fillStyle = '#000000';
    ctx.fillRect(leftEdge + 2, y - 12, avatarWidth - 4, 10); // Hat body
    ctx.fillRect(leftEdge, y - 3, avatarWidth, 2); // Hat brim
    
    // 3. TAN FACE - narrower proportions
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(leftEdge + 4, y, avatarWidth - 8, 11); // Face
    
    // 4. GRAY EYEBROWS 
    ctx.fillStyle = '#A0A0A0';
    ctx.fillRect(leftEdge + 5, y + 2, 2.5, 1.5); // Left eyebrow
    ctx.fillRect(rightEdge - 7.5, y + 2, 2.5, 1.5); // Right eyebrow
    
    // 5. BLACK EYES 
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(leftEdge + 6, y + 5, 1.2, 0, Math.PI * 2); // Left eye
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEdge - 6, y + 5, 1.2, 0, Math.PI * 2); // Right eye
    ctx.fill();
    
    // 6. NOSE - centered
    ctx.fillStyle = '#C8A882';
    ctx.fillRect(centerX - 0.5, y + 6, 1, 3); // Nose
    
    // 7. WHITE BEARD 
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(centerX, y + 12, 3.5, 3.5, 0, 0, Math.PI * 2); // Beard
    ctx.fill();
    
    // 8. DARK NAVY COAT 
    ctx.fillStyle = '#1B2951';
    ctx.fillRect(leftEdge + 2, y + 15, avatarWidth - 4, 14); // Coat
    
    // 9. WHITE COLLAR 
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(centerX - 2, y + 15);
    ctx.lineTo(centerX + 2, y + 15);
    ctx.lineTo(centerX, y + 19);
    ctx.closePath();
    ctx.fill();
    
    // 10. BLACK BUTTONS 
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX, y + 22, 1, 0, Math.PI * 2); // Upper button
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, y + 25, 1, 0, Math.PI * 2); // Lower button
    ctx.fill();
    
    // 11. PROPER ARMS - rectangular like other avatars
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(leftEdge, y + 18, 2.5, 8); // Left arm
    ctx.fillRect(rightEdge - 2.5, y + 18, 2.5, 8); // Right arm
    
    // Add small hands at end of arms
    ctx.beginPath();
    ctx.ellipse(leftEdge + 1.25, y + 26, 1.2, 1.2, 0, 0, Math.PI * 2); // Left hand
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rightEdge - 1.25, y + 26, 1.2, 1.2, 0, 0, Math.PI * 2); // Right hand
    ctx.fill();
    
    // 12. GRAY LEGS - wider spacing than Tom Nook for better proportions
    ctx.fillStyle = '#808080';
    if (this.isMoving) {
      // Animated legs during movement - wider apart
      const leftLegX = centerX - 5 + (legCycle > 0 ? forwardOffset : -forwardOffset);
      const leftLegY = y + 29 + Math.abs(legCycle) * 0.05; 
      ctx.fillRect(leftLegX, leftLegY, 3, 8); // Left leg farther left
      
      const rightLegX = centerX + 2 + (legCycle < 0 ? forwardOffset : -forwardOffset);
      const rightLegY = y + 29 + Math.abs(legCycle) * 0.05; 
      ctx.fillRect(rightLegX, rightLegY, 3, 8); // Right leg farther right
      
      // 13. BLACK SHOES - matching animated legs
      ctx.fillStyle = '#000000';
      ctx.fillRect(leftLegX - 0.5, leftLegY + 8, 4, 3); // Left shoe follows leg
      ctx.fillRect(rightLegX - 0.5, rightLegY + 8, 4, 3); // Right shoe follows leg
    } else {
      // Static legs when not moving - wider spacing for better stance
      ctx.fillRect(centerX - 5, y + 29, 3, 8); // Static left leg farther left
      ctx.fillRect(centerX + 2, y + 29, 3, 8); // Static right leg farther right
      
      // 13. BLACK SHOES - static positioning with wider spacing
      ctx.fillStyle = '#000000';  
      ctx.fillRect(centerX - 5.5, y + 37, 4, 3); // Static left shoe farther left
      ctx.fillRect(centerX + 1.5, y + 37, 4, 3); // Static right shoe farther right
    }
  }

  private drawWarioAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, centerX: number) {
    // Draw Wario's cap
    ctx.fillStyle = '#FFD700'; // Gold/yellow cap
    ctx.beginPath();
    ctx.ellipse(centerX, y + 2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw W emblem on cap
    ctx.fillStyle = '#800080'; // Purple W
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('W', centerX, y + 5);
    
    // Draw face (round and chubby)
    ctx.fillStyle = '#FFDBAC'; // Peach skin
    ctx.beginPath();
    ctx.ellipse(centerX, y + 12, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw large nose
    ctx.fillStyle = '#FFB6C1'; // Light pink
    ctx.beginPath();
    ctx.ellipse(centerX, y + 12, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 4, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 4, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw handlebar mustache
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(centerX - 4, y + 15, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 4, y + 15, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw static satisfied smirk (smallest smile form)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, y + 17, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Draw yellow shirt
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 21, w - 8, h - 23, 2);
    ctx.fill();
    
    // Draw purple overalls
    ctx.fillStyle = '#800080';
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 25, w - 12, h - 27, 2);
    ctx.fill();
    
    // Draw overalls straps
    ctx.fillStyle = '#800080';
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 21, 2, 6, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + w - 10, y + 21, 2, 6, 1);
    ctx.fill();
    
    // Draw chunky legs with reduced movement range that syncs with game speed
    ctx.fillStyle = '#800080';
    if (this.isMoving) {
      const speedMultiplier = this.gameSpeed || 1; // Use current game speed
      const legCycle = Math.sin(Date.now() * 0.016 * speedMultiplier) * 1.5; // Animation speed matches game speed
      const forwardOffset = 1.2; // Reduced from 2.5 to 1.2 - less extreme movement
      
      const leftLegX = centerX - 6 + (legCycle > 0 ? forwardOffset : -forwardOffset);
      const leftLegY = y + h - 4 + Math.abs(legCycle) * 0.1; // Reduced bounce from 0.15 to 0.1
      ctx.fillRect(leftLegX, leftLegY, 5, 8);
      
      const rightLegX = centerX + 1 + (legCycle < 0 ? forwardOffset : -forwardOffset);
      const rightLegY = y + h - 4 + Math.abs(legCycle) * 0.1; // Reduced bounce from 0.15 to 0.1
      ctx.fillRect(rightLegX, rightLegY, 5, 8);
    } else {
      ctx.fillRect(centerX - 6, y + h - 4, 5, 8);
      ctx.fillRect(centerX + 1, y + h - 4, 5, 8);
    }
  }

  private drawCountOlafAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, centerX: number) {
    // No hat - removed completely
    
    // Draw triangular grey hair with very obtuse bottom corners
    ctx.fillStyle = '#808080'; // Grey hair
    ctx.beginPath();
    // Left side hair triangle - tip moved much further left for very obtuse bottom left corner
    ctx.moveTo(centerX - 12, y + 8); // Start at temple edge (very obtuse angle here)
    ctx.lineTo(centerX - 14, y + 2); // Tip moved much further left
    ctx.lineTo(centerX, y + 4); // Right edge touches top corner of head
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    // Right side hair triangle - tip moved much further right for very obtuse bottom right corner
    ctx.moveTo(centerX, y + 4); // Left edge touches top corner of head
    ctx.lineTo(centerX + 14, y + 2); // Tip moved much further right
    ctx.lineTo(centerX + 12, y + 8); // Start at temple edge (very obtuse angle here)
    ctx.closePath();
    ctx.fill();
    
    // Draw angular head with flat top that connects to body
    ctx.fillStyle = '#F5DEB3'; // Pale skin color
    ctx.beginPath();
    // Create head shape with flat top
    ctx.moveTo(centerX - 8, y + 4); // Flat top left
    ctx.lineTo(centerX + 8, y + 4); // Flat top right
    ctx.lineTo(centerX + 11, y + 8); // Right temple
    ctx.lineTo(centerX + 8, y + 15); // Right jaw (shorter)
    ctx.lineTo(centerX + 5, y + 20); // Connect to right shoulder
    ctx.lineTo(centerX - 5, y + 20); // Connect to left shoulder
    ctx.lineTo(centerX - 8, y + 15); // Left jaw (shorter)
    ctx.lineTo(centerX - 11, y + 8); // Left temple
    ctx.closePath();
    ctx.fill();
    
    // Draw one continuous thick unibrow (shortened more)
    ctx.fillStyle = '#808080'; // Grey color
    ctx.beginPath();
    // Top edge of unibrow (left to right)
    ctx.moveTo(centerX - 8, y + 5); // Left tip top (shortened from 10 to 8)
    ctx.lineTo(centerX - 4, y + 7); // Left slope down
    ctx.lineTo(centerX, y + 8); // Center top
    ctx.lineTo(centerX + 4, y + 7); // Right slope down
    ctx.lineTo(centerX + 8, y + 5); // Right tip top (shortened from 10 to 8)
    // Bottom edge of unibrow (right to left for continuous path)
    ctx.lineTo(centerX + 8, y + 7.5); // Right tip bottom (thick)
    ctx.lineTo(centerX + 4, y + 9.5); // Right slope bottom
    ctx.lineTo(centerX, y + 10.5); // Center bottom (deep dip)
    ctx.lineTo(centerX - 4, y + 9.5); // Left slope bottom
    ctx.lineTo(centerX - 8, y + 7.5); // Left tip bottom (thick)
    ctx.closePath();
    ctx.fill();
    
    // Draw narrow, menacing eyes (adjusted for higher unibrow)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(centerX - 4, y + 11, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 4, y + 11, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // No nose - completely clean middle face
    
    // Goatee will be drawn after the coat to ensure it's visible
    
    // Draw thinner evil smile above goatee
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1; // Reduced from 2 to 1 for thinner smile
    ctx.beginPath();
    ctx.moveTo(centerX - 5, y + 16);
    ctx.quadraticCurveTo(centerX, y + 18, centerX + 5, y + 16);
    ctx.stroke();
    
    // Draw black tailcoat (adjusted for shorter head)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    // Main coat body - starts higher due to shorter head
    ctx.moveTo(x + 5, y + 20); // Higher start for shorter head
    ctx.lineTo(x + w - 5, y + 20); // Higher start for shorter head
    ctx.lineTo(x + w - 5, y + 27); // Straighter sides
    ctx.lineTo(x + w - 7, y + 34); // Slightly tapered
    ctx.lineTo(x + 7, y + 34); // Slightly tapered
    ctx.lineTo(x + 5, y + 27); // Straighter sides
    ctx.closePath();
    ctx.fill();
    
    // Draw coat tails (adjusted for shorter head)
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 34);
    ctx.lineTo(x + 4, y + 41);
    ctx.lineTo(x + 8, y + 41);
    ctx.lineTo(x + 10, y + 34);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + w - 7, y + 34);
    ctx.lineTo(x + w - 10, y + 34);
    ctx.lineTo(x + w - 8, y + 41);
    ctx.lineTo(x + w - 4, y + 41);
    ctx.closePath();
    ctx.fill();
    
    // No arms - removed completely as requested
    
    // Draw friendly legs (like Mr. MoneyBags movement)
    ctx.fillStyle = '#000000';
    if (this.isMoving) {
      const legCycle = Math.sin(Date.now() * 0.014) * 2; // Gentle movement like Mr. MoneyBags
      const forwardOffset = 1.5; // Moderate movement
      
      const leftLegX = centerX - 5 + (legCycle > 0 ? forwardOffset : -forwardOffset);
      const leftLegY = y + h - 2 + Math.abs(legCycle) * 0.08; // Significantly longer legs
      ctx.fillRect(leftLegX, leftLegY, 3, 16); // Shortened legs slightly more (16 instead of 18)
      
      const rightLegX = centerX + 2 + (legCycle < 0 ? forwardOffset : -forwardOffset);
      const rightLegY = y + h - 2 + Math.abs(legCycle) * 0.08; // Legs 
      ctx.fillRect(rightLegX, rightLegY, 3, 16); // Shortened legs slightly more (16 instead of 18)
      
      // Draw black shoes at the bottom of legs
      ctx.fillStyle = '#000000'; // Black shoes
      ctx.beginPath();
      ctx.ellipse(leftLegX + 1.5, leftLegY + 16, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rightLegX + 1.5, rightLegY + 16, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(centerX - 5, y + h - 2, 3, 16); // Shortened legs slightly more (16 instead of 18)
      ctx.fillRect(centerX + 2, y + h - 2, 3, 16); // Shortened legs slightly more (16 instead of 18)
      
      // Draw static black shoes at the bottom of legs
      ctx.fillStyle = '#000000'; // Black shoes
      ctx.beginPath();
      ctx.ellipse(centerX - 3.5, y + h + 14, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + 3.5, y + h + 14, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw grey goatee AFTER coat so it's visible
    ctx.fillStyle = '#808080'; // Grey color matching unibrow
    ctx.beginPath();
    ctx.moveTo(centerX - 3, y + 19); // Left edge of goatee
    ctx.lineTo(centerX + 3, y + 19); // Right edge of goatee
    ctx.lineTo(centerX + 2, y + 21); // Right point at chin
    ctx.lineTo(centerX, y + 23); // Bottom point extending over coat
    ctx.lineTo(centerX - 2, y + 21); // Left point at chin
    ctx.closePath();
    ctx.fill();
  }

  private drawLeprechaunAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, centerX: number) {
    // Draw top hat with rounded edges
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.roundRect(x + 6, y - 8, w - 12, 6, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 8, y - 16, w - 16, 8, 1);
    ctx.fill();
    
    // Draw head as circle
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.arc(centerX, y + 8, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw mustache with curves (white color)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(centerX - 4, y + 12, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 4, y + 12, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes as circles
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 3, y + 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 3, y + 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw body (suit) with rounded corners
    ctx.fillStyle = '#2F4F4F';
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 18, w - 12, h - 20, 2);
    ctx.fill();
    
    // Draw vest
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 20, w - 16, h - 24, 1);
    ctx.fill();
    
    // Draw bow tie with curves
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.ellipse(centerX - 4, y + 18, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 4, y + 18, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(centerX - 1, y + 17, 2, 3);
    
    // Add suit buttons
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(centerX, y + 22, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, y + 26, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw animated legs with directional movement
    ctx.fillStyle = '#2F4F4F'; // Same color as suit
    
    if (this.isMoving) {
      // Create running animation with leg alternation
      const legCycle = Math.sin(this.animationFrame) * 4; // Increased movement range
      const forwardOffset = Math.sin(this.animationFrame + Math.PI / 2) * 2; // Forward/back movement
      
      // Left leg - alternating with enhanced movement
      const leftLegX = centerX - 6 + (legCycle > 0 ? forwardOffset : -forwardOffset);
      const leftLegY = y + h - 4 + Math.abs(legCycle) * 0.2; // Slight vertical bounce
      ctx.fillRect(leftLegX, leftLegY, 4, 8);
      
      // Right leg - opposite phase
      const rightLegX = centerX + 2 + (legCycle < 0 ? forwardOffset : -forwardOffset);
      const rightLegY = y + h - 4 + Math.abs(legCycle) * 0.2; // Slight vertical bounce
      ctx.fillRect(rightLegX, rightLegY, 4, 8);
      
      // Draw animated black shoes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(leftLegX - 2, leftLegY + 7, 8, 3, 1); // Left shoe
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(rightLegX - 2, rightLegY + 7, 8, 3, 1); // Right shoe
      ctx.fill();
    } else {
      // Static legs when not moving
      ctx.fillRect(centerX - 6, y + h - 4, 4, 8); // Left leg
      ctx.fillRect(centerX + 2, y + h - 4, 4, 8); // Right leg
      
      // Draw static black shoes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(centerX - 8, y + h + 3, 8, 3, 1); // Left shoe
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(centerX + 0, y + h + 3, 8, 3, 1); // Right shoe
      ctx.fill();
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, coin: GameObject) {
    ctx.fillStyle = coin.color;
    ctx.beginPath();
    ctx.arc(
      coin.x + coin.width / 2, 
      coin.y + coin.height / 2, 
      coin.width / 2, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    
    // Add coin details
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(
      coin.x + coin.width / 2, 
      coin.y + coin.height / 2, 
      coin.width / 3, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obstacle: GameObject) {
    // iPad-specific fix: Skip the startup area rendering restriction on iPad
    const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Render all TNT obstacles everywhere - no safe zone restrictions
    
    // iPad debugging: Check if TNT is going off-screen
    if (isIPad) {
      const screenX = obstacle.x - this.cameraX;
      const screenY = obstacle.y;
      
      // If TNT is way off screen, log for debugging
      if (screenX < -200 || screenX > this.canvasWidth + 200 || screenY < -200 || screenY > this.canvasHeight + 200) {
        // TNT is off-screen, but still render it in case it comes back
      }
    }
    
    // Draw TNT barrel body
    ctx.fillStyle = obstacle.color; // Brown color
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // Add TNT bands
    ctx.fillStyle = '#654321';
    ctx.fillRect(obstacle.x, obstacle.y + 8, obstacle.width, 4);
    ctx.fillRect(obstacle.x, obstacle.y + 16, obstacle.width, 4);
    ctx.fillRect(obstacle.x, obstacle.y + 24, obstacle.width, 4);
    
    // Add TNT text
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TNT', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 3);
    
    // Add fuse (small line on top)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width / 2 - 3, obstacle.y - 8);
    ctx.stroke();
    
    // Add spark at fuse tip
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(obstacle.x + obstacle.width / 2 - 3, obstacle.y - 8, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Add movement indicator (arrow showing direction)
    if (obstacle.vx !== undefined && obstacle.vy !== undefined) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      
      if (obstacle.vx > 0) {
        ctx.fillText('→', obstacle.x + obstacle.width / 2, obstacle.y - 2);
      } else if (obstacle.vx < 0) {
        ctx.fillText('←', obstacle.x + obstacle.width / 2, obstacle.y - 2);
      } else if (obstacle.vy > 0) {
        ctx.fillText('↓', obstacle.x + obstacle.width / 2, obstacle.y - 2);
      } else if (obstacle.vy < 0) {
        ctx.fillText('↑', obstacle.x + obstacle.width / 2, obstacle.y - 2);
      }
    }
  }

  private drawPowerup(ctx: CanvasRenderingContext2D, powerup: GameObject) {
    const centerX = powerup.x + powerup.width / 2;
    const centerY = powerup.y + powerup.height / 2;
    const time = Date.now() * 0.004; // For animation
    
    // Add pulsing glow effect
    const pulseRadius = powerup.width / 2 + Math.sin(time * 3) * 3;
    
    if (powerup.powerupType === 'magnet') {
      // Draw magnet power-up glow
      ctx.fillStyle = 'rgba(255, 107, 107, 0.3)'; // Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw U-shaped horseshoe magnet
      const magnetSize = Math.min(powerup.width - 4, powerup.height - 4);
      const armWidth = magnetSize * 0.25;
      const armHeight = magnetSize * 0.8;
      const baseHeight = magnetSize * 0.2;
      
      // Draw magnet body (silver/gray)
      ctx.fillStyle = '#C0C0C0';
      
      // Draw left arm of U
      ctx.fillRect(centerX - magnetSize/2, centerY - armHeight/2, armWidth, armHeight);
      
      // Draw right arm of U  
      ctx.fillRect(centerX + magnetSize/2 - armWidth, centerY - armHeight/2, armWidth, armHeight);
      
      // Draw bottom of U (connecting the arms)
      ctx.fillRect(centerX - magnetSize/2, centerY + armHeight/2 - baseHeight, magnetSize, baseHeight);
      
      // Draw red pole (N) on left arm
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(centerX - magnetSize/2, centerY - armHeight/2, armWidth, armWidth);
      
      // Draw blue pole (S) on right arm
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(centerX + magnetSize/2 - armWidth, centerY - armHeight/2, armWidth, armWidth);
      
      // Draw N and S labels
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 6px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('N', centerX - magnetSize/2 + armWidth/2, centerY - armHeight/2 + armWidth/2 + 2);
      ctx.fillText('S', centerX + magnetSize/2 - armWidth/2, centerY - armHeight/2 + armWidth/2 + 2);
      
    } else if (powerup.powerupType === 'extralife') {
      // Draw shield power-up
      ctx.fillStyle = 'rgba(78, 205, 196, 0.3)'; // Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw shield shape
      ctx.fillStyle = '#4ECDC4';
      ctx.beginPath();
      ctx.moveTo(centerX, powerup.y + 2);
      ctx.lineTo(powerup.x + powerup.width - 3, powerup.y + 6);
      ctx.lineTo(powerup.x + powerup.width - 3, powerup.y + powerup.height - 8);
      ctx.lineTo(centerX, powerup.y + powerup.height - 2);
      ctx.lineTo(powerup.x + 3, powerup.y + powerup.height - 8);
      ctx.lineTo(powerup.x + 3, powerup.y + 6);
      ctx.closePath();
      ctx.fill();
      
      // Draw shield cross
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(centerX - 1, powerup.y + 6, 2, powerup.height - 12);
      ctx.fillRect(powerup.x + 6, centerY - 1, powerup.width - 12, 2);
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D) {
    const centerX = this.goal.x + this.goal.width / 2;
    const centerY = this.goal.y + this.goal.height / 2;
    const canEnter = this.coinsCollected >= this.coinsNeededForPortal;
    const time = Date.now() * 0.003; // for animation
    
    // Always draw the gray outer ring (portal machine housing)
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 10, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Only draw the colorful portal circles if 5 coins have been collected
    if (this.coinsCollected >= this.coinsNeededForPortal) {
      // Draw concentric colorful circles (rainbow portal effect)
      const colors = [
        '#4B0082', // Indigo (outermost)
        '#8A2BE2', // Blue Violet
        '#00CED1', // Dark Turquoise
        '#32CD32', // Lime Green
        '#FFD700', // Gold
        '#FF4500', // Orange Red
        '#FF1493'  // Deep Pink (innermost)
      ];
      
      for (let i = 0; i < colors.length; i++) {
        const radius = 45 - (i * 6);
        const animationOffset = Math.sin(time * 1.5 + i * 0.8) * 3; // Smoother, more fluid animation
        
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(centerX, centerY - 10, radius + animationOffset, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw central light blue core with smoother pulsing
      ctx.fillStyle = '#87CEEB';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 10, 8 + Math.sin(time * 3) * 3, 0, Math.PI * 2); // Faster, smoother pulse
      ctx.fill();
    } else {
      // Draw inactive portal center (dark gray)
      ctx.fillStyle = '#555555';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 10, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Always draw coin collection panel below the portal
    const panelY = centerY + 35;
    const panelWidth = 80;
    const panelHeight = 25;
    
    // Draw panel background
    ctx.fillStyle = '#D3D3D3';
    ctx.fillRect(centerX - panelWidth/2, panelY, panelWidth, panelHeight);
    
    // Draw panel border
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - panelWidth/2, panelY, panelWidth, panelHeight);
    
    // Draw "COINS COLLECTED" text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COINS COLLECTED', centerX, panelY + 8);
    
    // Draw coin collection indicators (5 circles)
    const indicatorY = panelY + 18;
    const indicatorSpacing = 12;
    const startX = centerX - (4 * indicatorSpacing) / 2;
    
    for (let i = 0; i < 5; i++) {
      const x = startX + (i * indicatorSpacing);
      
      // Draw circle background
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, indicatorY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Fill with gold if coin is collected
      if (i < this.coinsCollected) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x, indicatorY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw circle border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, indicatorY, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw activation indicator bar
    const barX = centerX + 35;
    const barY = panelY + 10;
    const barWidth = 8;
    const barHeight = 12;
    
    ctx.fillStyle = canEnter ? '#00FF00' : '#FF0000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Always draw "PORTAL MACHINE" text below the machine
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PORTAL MACHINE', centerX, panelY + 35);
    
    // Draw status text above portal
    ctx.fillStyle = canEnter ? '#00FF00' : '#FF6B6B';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    if (canEnter) {
      ctx.fillText('PORTAL ACTIVE', centerX, this.goal.y - 10);
    } else {
      ctx.fillText(`COLLECT ${this.coinsNeededForPortal - this.coinsCollected} MORE COINS`, centerX, this.goal.y - 10);
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Draw UI elements like level, score, coins collected, etc.
    ctx.fillStyle = "#333";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    
    // Level display
    ctx.fillText(`Level: ${this.level}`, 20, 40);
    
    // Score
    ctx.fillText(`Score: ${this.score}`, 20, 70);
    
    // Coins collected vs total coins in level
    const totalCoins = this.coins.length + this.coinsCollected;
    ctx.fillText(`Coins: ${this.coinsCollected}/${totalCoins}`, 20, 100);
    
    // Game speed indicator
    ctx.fillText(`Speed: ${this.gameSpeed}x`, 20, 130);
    
    // Progress indicator removed - clusters monitor not needed
    
    // Progress text removed - clusters monitor not needed
    
    // Draw level progress bar  
    const levelProgress = Math.min(1, this.player.x / (this.levelWidth - 100));
    const barWidth = this.canvasWidth - 40;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(20, 140, barWidth, 10);
    
    ctx.fillStyle = '#8B5CF6';
    ctx.fillRect(20, 140, barWidth * levelProgress, 10);
    
    // Draw mini-map (centered at top)
    const miniMapWidth = 150;
    const miniMapHeight = 30;
    const miniMapX = (this.canvasWidth - miniMapWidth) / 2;
    const miniMapY = 20;
    
    // Dark background with border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(miniMapX, miniMapY, miniMapWidth, miniMapHeight);
    
    // Add border for better definition
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(miniMapX, miniMapY, miniMapWidth, miniMapHeight);
    
    // Player position on mini-map (bigger and more vibrant)
    const playerMiniX = miniMapX + (this.player.x / this.levelWidth) * miniMapWidth;
    ctx.fillStyle = '#3B82F6'; // Brighter blue
    ctx.fillRect(playerMiniX - 4, miniMapY + miniMapHeight / 2 - 4, 8, 8);
    
    // Add white outline for better visibility
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(playerMiniX - 4, miniMapY + miniMapHeight / 2 - 4, 8, 8);
    
    // Goal position on mini-map (bigger and more vibrant)
    const goalMiniX = miniMapX + (this.goal.x / this.levelWidth) * miniMapWidth;
    const canEnter = this.clustersCompleted > 0;
    ctx.fillStyle = canEnter ? '#A855F7' : '#9CA3AF'; // Brighter purple or gray
    ctx.fillRect(goalMiniX - 4, miniMapY + miniMapHeight / 2 - 4, 8, 8);
    
    // Add white outline for goal too
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(goalMiniX - 4, miniMapY + miniMapHeight / 2 - 4, 8, 8);
    
    // Speed controls hint removed - moved to main instructions
  }
  
  // Linear interpolation helper for smooth movement
  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  private updateCameraPosition() {
    // Calculate target camera position to follow player
    const isMobileForCamera = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const controlPanelWidthForCamera = isMobileForCamera ? 128 : 0; // 128px control panel on mobile/iPad
    const effectiveCanvasWidthForCamera = this.canvasWidth - controlPanelWidthForCamera;
    const maxCameraX = this.levelWidth - this.canvasWidth + controlPanelWidthForCamera;
    
    const targetCameraX = Math.max(0, Math.min(
      maxCameraX,
      this.player.x - effectiveCanvasWidthForCamera / 2
    ));
    
    // Smooth camera interpolation for fluid following
    this.cameraX = this.lerp(this.cameraX, targetCameraX, 0.88); // Smooth camera following
  }


}
