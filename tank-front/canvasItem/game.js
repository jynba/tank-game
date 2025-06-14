class Game {
  constructor(canvas) {
    if (typeof socketManager === 'undefined') {
      throw new Error('Socket manager not initialized');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scoreBoard = document.getElementById('scoreBoard');

    this.lastTime = 0;
    this.localPlayer = null;
    this.remotePlayer = null;

    // 定义安全区域边界
    this.spawnMargin = 100; // 距离边界的最小距离
    this.minSpawnDistance = 300; // 两个玩家之间的最小距离

    // 设置socket管理器
    socketManager.setGame(this);

    // 等待连接建立后再初始化游戏
    if (socketManager.socket && socketManager.socket.readyState === WebSocket.OPEN) {
      this.init();
    } else {
      console.log('Waiting for WebSocket connection...');
      // 监听连接状态
      const checkConnection = setInterval(() => {
        if (socketManager.socket && socketManager.socket.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection);
          this.init();
        }
      }, 100);
    }
  }

  // 生成随机复活点
  generateSpawnPoint(existingPoint = null) {
    const maxAttempts = 50;
    let attempts = 0;
    let spawnPoint;

    while (attempts < maxAttempts) {
      // 在安全区域内随机生成坐标
      const x = this.spawnMargin + Math.random() * (this.canvas.width - 2 * this.spawnMargin);
      const y = this.spawnMargin + Math.random() * (this.canvas.height - 2 * this.spawnMargin);

      // 如果有现有复活点，检查距离
      if (existingPoint) {
        const dx = x - existingPoint.x;
        const dy = y - existingPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.minSpawnDistance) {
          attempts++;
          continue;
        }
      }

      spawnPoint = { x, y };
      break;
    }

    // 如果无法找到合适的点，使用默认位置
    if (!spawnPoint) {
      spawnPoint = {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2
      };
    }

    return spawnPoint;
  }

  // 初始化游戏
  init() {
    const playerNo = socketManager.getPlayerNo();

    // 使用固定位置初始化玩家
    if (playerNo === 1) {
      this.localPlayer = new playerInstance(200, 400, 0, '#ff4444', true);
      this.remotePlayer = new playerInstance(800, 400, Math.PI, '#4444ff', false);
    } else {
      this.localPlayer = new playerInstance(800, 400, Math.PI, '#4444ff', true);
      this.remotePlayer = new playerInstance(200, 400, 0, '#ff4444', false);
    }

    // 设置键盘控制
    this.setupKeyboardControls();

    // 开始游戏循环
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // 设置键盘控制
  setupKeyboardControls() {
    const keys = {
      'KeyW': false,
      'KeyS': false,
      'KeyA': false,
      'KeyD': false,
      'KeyQ': false,
      'KeyE': false,
      'Space': false
    };

    window.addEventListener('keydown', (e) => {
      if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        if (this.localPlayer) {
          this.updateLocalPlayerKeys(keys);
        }
        socketManager.sendKeyEvent(keys);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
        if (this.localPlayer) {
          this.updateLocalPlayerKeys(keys);
        }
        socketManager.sendKeyEvent(keys);
      }
    });
  }

  // 更新本地玩家的按键状态
  updateLocalPlayerKeys(keys) {
    const keyMap = {
      'KeyW': 'forward',
      'KeyS': 'backward',
      'KeyA': 'left',
      'KeyD': 'right',
      'KeyQ': 'turnLeft',
      'KeyE': 'turnRight',
      'Space': 'shoot'
    };

    for (const [wsKey, gameKey] of Object.entries(keyMap)) {
      this.localPlayer.keys[gameKey] = keys[wsKey];
    }
  }

  // 游戏主循环
  gameLoop(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 更新和绘制玩家
    if (this.localPlayer) {
      this.updatePlayer(this.localPlayer, deltaTime);
      this.localPlayer.draw(this.ctx);
    }

    if (this.remotePlayer && socketManager.isEnemyOnline()) {
      this.updatePlayer(this.remotePlayer, deltaTime);
      this.remotePlayer.draw(this.ctx);
    }

    // 更新和绘制粒子
    particleSystem.update(deltaTime);
    particleSystem.draw(this.ctx);

    // 检查重生
    this.checkRespawn();

    // 更新分数板
    this.updateScoreBoard();

    // 如果对手未连接，显示等待信息
    if (!socketManager.isEnemyOnline()) {
      this.drawWaitingMessage();
    }

    // 继续游戏循环
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // 更新玩家状态
  updatePlayer(player, deltaTime) {
    if (!player.isAlive) {
      return;
    }

    // 保存当前位置
    const oldX = player.x;
    const oldY = player.y;

    // 更新玩家状态
    player.update(deltaTime);

    // 检查子弹碰撞
    for (let i = player.bullets.length - 1; i >= 0; i--) {
      const bullet = player.bullets[i];

      // 检查子弹是否超出边界
      if (bullet.x < 0 || bullet.x > this.canvas.width ||
        bullet.y < 0 || bullet.y > this.canvas.height) {
        player.bullets.splice(i, 1);
        continue;
      }

      // 检查子弹与玩家的碰撞
      const targetPlayer = player === this.localPlayer ? this.remotePlayer : this.localPlayer;
      if (targetPlayer && targetPlayer.isHurt(bullet)) {
        player.bullets.splice(i, 1);
      }
    }
  }

  // 绘制游戏元素
  draw() {
    // 绘制玩家
    if (this.localPlayer) this.localPlayer.draw(this.ctx);
    if (this.remotePlayer && socketManager.isEnemyOnline()) {
      this.remotePlayer.draw(this.ctx);
    }

    // 绘制粒子
    particleSystem.draw(this.ctx);

    // 如果对手未连接，显示等待信息
    if (!socketManager.isEnemyOnline()) {
      this.drawWaitingMessage();
    }
  }

  // 绘制等待信息
  drawWaitingMessage() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'white';
    this.ctx.font = '30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('等待对手加入...', this.canvas.width / 2, this.canvas.height / 2);
  }

  // 更新分数板
  updateScoreBoard() {
    if (this.localPlayer && this.remotePlayer && socketManager.isEnemyOnline()) {
      this.scoreBoard.textContent =
        `本地玩家: ${this.localPlayer.score} | 远程玩家: ${this.remotePlayer.score}`;
    }
  }

  // 检查重生
  checkRespawn() {
    if (!this.localPlayer || !this.remotePlayer) return;

    // 检查本地玩家是否需要重生
    if (!this.localPlayer.isAlive && !this.localPlayer.isRespawning) {
      const spawnPoint = this.generateSpawnPoint({
        x: this.remotePlayer.x,
        y: this.remotePlayer.y
      });
      this.localPlayer.respawn(spawnPoint.x, spawnPoint.y);
    }

    // 检查远程玩家是否需要重生
    if (!this.remotePlayer.isAlive && !this.remotePlayer.isRespawning) {
      const spawnPoint = this.generateSpawnPoint({
        x: this.localPlayer.x,
        y: this.localPlayer.y
      });
      this.remotePlayer.respawn(spawnPoint.x, spawnPoint.y);
    }
  }

  // Socket事件处理
  onConnect() {
    console.log('Game connected to server');
  }

  onDisconnect() {
    console.log('Game disconnected from server');
    // 可以在这里添加断开连接的处理逻辑
  }

  onEnemyConnect() {
    console.log('Enemy connected');
    // 对手连接时的处理逻辑
  }
}

// 导出游戏类
window.Game = Game; 