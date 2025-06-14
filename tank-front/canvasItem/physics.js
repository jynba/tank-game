class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
  }

  sub(vec) {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
  }

  mul(factor) {
    this.x *= factor;
    this.y *= factor;
    return this;
  }

  len() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  setLength(length) {
    const l = this.len();
    if (l) this.mul(length / l);
    else this.x = this.y = length;
    return this;
  }

  rotate(angle) {
    const x = this.x;
    const y = this.y;
    this.x = x * Math.cos(angle) - Math.sin(angle) * y;
    this.y = x * Math.sin(angle) + Math.cos(angle) * y;
    return this;
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }
}

class Physics {
  constructor() {
    // 物理参数
    this.acceleration = 300;  // 加速度
    this.maxSpeed = 400;      // 最大速度
    this.rotationSpeed = 360; // 旋转速度(度/秒)
    this.friction = 0.96;     // 摩擦系数
    this.bulletSpeed = 700;   // 子弹速度
  }

  // 更新玩家位置和速度
  updatePlayer(player, deltaTime) {
    // 计算加速度
    if (player.keys.forward) {
      player.velocity.add(new Vector(
        Math.cos(player.direction) * this.acceleration * deltaTime,
        Math.sin(player.direction) * this.acceleration * deltaTime
      ));
    }

    // 应用摩擦力
    player.velocity.mul(this.friction);

    // 限制最大速度
    if (player.velocity.len() > this.maxSpeed) {
      player.velocity.setLength(this.maxSpeed);
    }

    // 更新位置
    player.x += player.velocity.x * deltaTime;
    player.y += player.velocity.y * deltaTime;

    // 边界检查
    this.checkBounds(player);
  }

  // 更新子弹位置
  updateBullet(bullet, deltaTime) {
    // 使用固定的子弹速度，不受玩家速度影响
    const bulletVelocity = new Vector(
      Math.cos(bullet.direction) * this.bulletSpeed,
      Math.sin(bullet.direction) * this.bulletSpeed
    );

    bullet.x += bulletVelocity.x * deltaTime;
    bullet.y += bulletVelocity.y * deltaTime;

    // 检查子弹是否超出边界
    return this.checkBulletBounds(bullet);
  }

  // 检查玩家边界
  checkBounds(player) {
    const margin = player.radius;
    if (player.x < margin) player.x = margin;
    if (player.x > 1000 - margin) player.x = 1000 - margin;
    if (player.y < margin) player.y = margin;
    if (player.y > 800 - margin) player.y = 800 - margin;
  }

  // 检查子弹边界
  checkBulletBounds(bullet) {
    return bullet.x < 0 || bullet.x > 1000 ||
      bullet.y < 0 || bullet.y > 800;
  }

  // 检查玩家之间的碰撞
  checkPlayerCollision(player1, player2) {
    if (!player1.isAlive || !player2.isAlive) return false;

    const dx = player1.x - player2.x;
    const dy = player1.y - player2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (player1.radius + player2.radius);
  }

  // 检查子弹与玩家的碰撞
  checkBulletPlayerCollision(bullet, player) {
    if (!player.isAlive) return false;

    const dx = bullet.x - player.x;
    const dy = bullet.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (bullet.radius + player.radius);
  }

  // 处理碰撞响应
  handleCollision(player1, player2) {
    // 计算碰撞方向
    const dx = player2.x - player1.x;
    const dy = player2.y - player1.y;
    const angle = Math.atan2(dy, dx);

    // 计算相对速度
    const vx = player1.velocity.x - player2.velocity.x;
    const vy = player1.velocity.y - player2.velocity.y;

    // 计算冲量
    const impulse = (vx * Math.cos(angle) + vy * Math.sin(angle)) * 0.5;

    // 应用冲量
    player1.velocity.x -= Math.cos(angle) * impulse;
    player1.velocity.y -= Math.sin(angle) * impulse;
    player2.velocity.x += Math.cos(angle) * impulse;
    player2.velocity.y += Math.sin(angle) * impulse;
  }

  // 检查线段与矩形是否相交
  checkLineRectCollision(x1, y1, x2, y2, rx, ry, rw, rh) {
    // 检查线段是否与矩形的四条边相交
    const left = rx;
    const right = rx + rw;
    const top = ry;
    const bottom = ry + rh;

    // 检查线段是否与矩形的四条边相交
    return this.lineLineIntersection(x1, y1, x2, y2, left, top, right, top) ||
      this.lineLineIntersection(x1, y1, x2, y2, right, top, right, bottom) ||
      this.lineLineIntersection(x1, y1, x2, y2, right, bottom, left, bottom) ||
      this.lineLineIntersection(x1, y1, x2, y2, left, bottom, left, top);
  }

  // 检查两条线段是否相交
  lineLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
    if (denominator === 0) return false;

    const ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denominator;
    const ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}

// 创建全局物理系统实例
const physics = new Physics(); 