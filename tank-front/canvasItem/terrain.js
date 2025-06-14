class Terrain {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.walls = [];
    this.generateTerrain();
  }

  // 生成固定地形
  generateTerrain() {
    // 定义固定墙体位置
    const fixedWalls = [
      // 左上区域
      { x1: 100, y1: 200, x2: 300, y2: 200, width: 200, height: 20 },  // 水平墙
      { x1: 200, y1: 100, x2: 200, y2: 300, width: 20, height: 200 },  // 垂直墙

      // 右上区域
      { x1: 700, y1: 200, x2: 900, y2: 200, width: 200, height: 20 },  // 水平墙
      { x1: 800, y1: 100, x2: 800, y2: 300, width: 20, height: 200 },  // 垂直墙

      // 左下区域
      { x1: 100, y1: 500, x2: 300, y2: 500, width: 200, height: 20 },  // 水平墙
      { x1: 200, y1: 500, x2: 200, y2: 700, width: 20, height: 200 },  // 垂直墙

      // 右下区域
      { x1: 700, y1: 500, x2: 900, y2: 500, width: 200, height: 20 },  // 水平墙
      { x1: 800, y1: 500, x2: 800, y2: 700, width: 20, height: 200 },  // 垂直墙

      // 中央区域
      { x1: 400, y1: 300, x2: 600, y2: 300, width: 200, height: 20 },  // 水平墙
      { x1: 500, y1: 300, x2: 500, y2: 500, width: 20, height: 200 },  // 垂直墙

      // 两侧掩护
      { x1: 150, y1: 350, x2: 250, y2: 350, width: 100, height: 20 },  // 左侧掩护
      { x1: 750, y1: 350, x2: 850, y2: 350, width: 100, height: 20 },  // 右侧掩护
    ];

    // 添加所有固定墙体
    this.walls = fixedWalls;
  }

  // 检查子弹是否与墙体碰撞
  checkBulletCollision(bullet) {
    for (const wall of this.walls) {
      if (physics.checkLineRectCollision(
        bullet.x,
        bullet.y,
        bullet.x + Math.cos(bullet.direction) * bullet.radius * 2,
        bullet.y + Math.sin(bullet.direction) * bullet.radius * 2,
        wall.x1, wall.y1, wall.width, wall.height
      )) {
        // 创建击中特效
        particleSystem.createHitEffect(bullet.x, bullet.y);
        return true;
      }
    }
    return false;
  }

  // 检查玩家是否与墙体碰撞
  checkPlayerCollision(player) {
    const nextX = player.x + player.velocity.x;
    const nextY = player.y + player.velocity.y;
    const playerRadius = 20; // 玩家碰撞半径

    for (const wall of this.walls) {
      // 计算玩家与墙壁的距离
      const closestX = Math.max(wall.x1, Math.min(nextX, wall.x2));
      const closestY = Math.max(wall.y1, Math.min(nextY, wall.y2));
      const distanceX = nextX - closestX;
      const distanceY = nextY - closestY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      if (distance < playerRadius) {
        return true;
      }
    }
    return false;
  }

  // 绘制地形
  draw(ctx) {
    ctx.save();
    for (const wall of this.walls) {
      // 绘制墙壁主体
      ctx.fillStyle = '#666666';
      ctx.fillRect(wall.x1, wall.y1, wall.width, wall.height);

      // 添加高光效果
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(wall.x1, wall.y1, wall.width, 2);
      ctx.fillRect(wall.x1, wall.y1, 2, wall.height);

      // 添加阴影效果
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(wall.x1 + wall.width - 2, wall.y1, 2, wall.height);
      ctx.fillRect(wall.x1, wall.y1 + wall.height - 2, wall.width, 2);
    }
    ctx.restore();
  }
}

// 创建全局地形实例
const terrain = new Terrain(1000, 800); 