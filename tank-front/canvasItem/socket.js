// 确保socketManager在全局范围内可用
let socketManager;

class SocketManager {
  constructor() {
    // 使用原生WebSocket
    this.socket = new WebSocket("ws://192.168.30.20:8098");
    this.game = null;
    this.playerNo = 0;
    this.enemyOnline = false;
    this.enemyKeys = {
      KeyA: false,
      KeyD: false,
      KeyS: false,
      KeyW: false,
      KeyQ: false,
      KeyE: false,
      Space: false
    };
    this.enemyState = {
      health: 100,
      deaths: 0,
      isAlive: true,
      isInvincible: false,
      x: 0,
      y: 0,
      direction: 0
    };
    this.setupEventListeners();
  }

  // 设置事件监听器
  setupEventListeners() {
    this.socket.onopen = () => {
      console.log("WebSocket连接已建立");
      if (this.game) {
        this.game.onConnect();
      }
    };

    this.socket.onclose = () => {
      console.log("WebSocket连接已关闭");
      if (this.game) {
        this.game.onDisconnect();
      }
      // 尝试重新连接
      setTimeout(() => this.reconnect(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket错误:", error);
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (error) {
        console.error("解析消息失败:", error);
      }
    };
  }

  // 重新连接
  reconnect() {
    console.log("尝试重新连接...");
    try {
      this.socket = new WebSocket("ws://192.168.30.20:8098");
      this.setupEventListeners();
    } catch (error) {
      console.error("重新连接失败:", error);
      // 继续尝试重连
      setTimeout(() => this.reconnect(), 3000);
    }
  }

  // 处理接收到的消息
  handleMessage(msg) {
    switch (msg.type) {
      case 0: // 玩家编号分配
        this.playerNo = msg.playerNo;
        if (this.playerNo !== 1) {
          this.enemyOnline = true;
        }
        break;

      case 1: // 对手上线通知
        this.enemyOnline = true;
        if (this.game) {
          this.game.onEnemyConnect();
        }
        break;

      case 2: // 对手动作和状态
        // 更新按键状态
        if (msg.key) {
          this.enemyKeys = { ...this.enemyKeys, ...msg.key };
        }

        // 更新游戏状态
        if (msg.health !== undefined) {
          this.enemyState.health = msg.health;
        }
        if (msg.deaths !== undefined) {
          this.enemyState.deaths = msg.deaths;
        }
        if (msg.x !== undefined) {
          this.enemyState.x = msg.x;
        }
        if (msg.y !== undefined) {
          this.enemyState.y = msg.y;
        }
        if (msg.direction !== undefined) {
          this.enemyState.direction = msg.direction;
        }
        if (msg.isAlive !== undefined) {
          this.enemyState.isAlive = msg.isAlive;
        }
        if (msg.isInvincible !== undefined) {
          this.enemyState.isInvincible = msg.isInvincible;
        }

        // 处理特殊事件
        if (msg.shoot) {
          if (this.game && this.game.remotePlayer) {
            this.game.remotePlayer.shoot();
          }
        }
        if (msg.die) {
          if (this.game && this.game.remotePlayer) {
            this.game.remotePlayer.die();
          }
        }
        if (msg.respawn) {
          if (this.game && this.game.remotePlayer) {
            this.game.remotePlayer.respawn(msg.x, msg.y);
          }
        }
        if (msg.takeDamage) {
          if (this.game && this.game.remotePlayer) {
            this.game.remotePlayer.takeDamage(20);
          }
        }

        // 更新远程玩家状态
        if (this.game && this.game.remotePlayer) {
          this.updateRemotePlayerState();
        }
        break;
    }
  }

  // 更新远程玩家状态
  updateRemotePlayerState() {
    const remotePlayer = this.game.remotePlayer;
    if (!remotePlayer) return;

    // 更新按键状态
    this.updateRemotePlayerKeys();

    // 更新其他状态
    remotePlayer.health = this.enemyState.health;
    remotePlayer.deaths = this.enemyState.deaths;
    remotePlayer.isAlive = this.enemyState.isAlive;
    remotePlayer.isInvincible = this.enemyState.isInvincible;
    remotePlayer.x = this.enemyState.x;
    remotePlayer.y = this.enemyState.y;
    remotePlayer.direction = this.enemyState.direction;
  }

  // 更新远程玩家的按键状态
  updateRemotePlayerKeys() {
    const remotePlayer = this.game.remotePlayer;
    if (!remotePlayer) return;

    // 转换按键映射
    const keyMap = {
      'KeyW': 'forward',
      'KeyS': 'backward',
      'KeyA': 'left',
      'KeyD': 'right',
      'KeyQ': 'turnLeft',
      'KeyE': 'turnRight',
      'Space': 'shoot'
    };

    // 更新远程玩家的按键状态
    for (const [wsKey, gameKey] of Object.entries(keyMap)) {
      remotePlayer.keys[gameKey] = this.enemyKeys[wsKey] || false;
    }
  }

  // 发送键盘事件和游戏状态
  sendKeyEvent(state) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        // 提取按键状态
        const keys = {
          KeyW: state.forward || false,
          KeyS: state.backward || false,
          KeyA: state.left || false,
          KeyD: state.right || false,
          KeyQ: state.turnLeft || false,
          KeyE: state.turnRight || false,
          Space: state.shoot || false
        };

        // 构建完整状态对象
        const fullState = {
          type: 2,
          key: keys,
          health: state.health,
          deaths: state.deaths,
          x: state.x,
          y: state.y,
          direction: state.direction,
          isAlive: state.isAlive,
          isInvincible: state.isInvincible,
          shoot: state.shoot,
          die: state.die,
          respawn: state.respawn,
          takeDamage: state.takeDamage
        };

        this.socket.send(JSON.stringify(fullState));
      } catch (error) {
        console.error("发送消息失败:", error);
      }
    }
  }

  // 设置游戏实例
  setGame(game) {
    this.game = game;
  }

  // 获取玩家编号
  getPlayerNo() {
    return this.playerNo;
  }

  // 检查对手是否在线
  isEnemyOnline() {
    return this.enemyOnline;
  }

  // 检查连接状态
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// 创建全局socketManager实例
window.addEventListener('load', () => {
  try {
    socketManager = new SocketManager();
    console.log('Socket manager initialized');
  } catch (error) {
    console.error('Failed to initialize socket manager:', error);
  }
});
