// 玩家实例类
class playerInstance {
  constructor(x, y, direction, color, isLocal) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.color = color;
    this.isLocal = isLocal;
    this.radius = 10;
    this.isAlive = true;
    this.score = 0;
    this.deaths = 0; // 添加死亡计数

    // 添加生命值相关属性
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.healthBarWidth = 30;
    this.healthBarHeight = 4;
    this.healthBarOffset = 15; // 血条距离坦克中心的距离

    // 无敌状态相关属性
    this.isInvincible = false;
    this.invincibleTime = 3; // 复活无敌时间增加到3秒
    this.invincibleTimer = 0;

    this.velocity = new Vector(0, 0);
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      turnLeft: false,
      turnRight: false,
      shoot: false
    };
    this.lastShootTime = 0;
    this.shootCooldown = 0.2; // 射击冷却时间（秒）
    this.bullets = [];
  }

  // 更新玩家状态
  update(deltaTime) {
    if (!this.isAlive) return;

    // 更新无敌状态
    this.updateInvincibility(deltaTime);

    // 更新方向
    if (this.keys.left) {
      this.direction -= physics.rotationSpeed * (Math.PI / 180) * deltaTime;
    }
    if (this.keys.right) {
      this.direction += physics.rotationSpeed * (Math.PI / 180) * deltaTime;
    }
    if (this.keys.turnLeft) {
      this.direction -= physics.rotationSpeed * (Math.PI / 180) * deltaTime;
    }
    if (this.keys.turnRight) {
      this.direction += physics.rotationSpeed * (Math.PI / 180) * deltaTime;
    }

    // 更新位置和速度
    physics.updatePlayer(this, deltaTime);

    // 处理射击
    if (this.keys.shoot && this.isLocal) {
      const currentTime = performance.now() / 1000;
      if (currentTime - this.lastShootTime >= this.shootCooldown) {
        this.shoot();
        this.lastShootTime = currentTime;
      }
    }

    // 更新子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (physics.updateBullet(bullet, deltaTime)) {
        this.bullets.splice(i, 1);
        continue;
      }
      particleSystem.createBulletTrail(bullet.x, bullet.y, bullet.direction);
    }

    // 创建尾焰效果
    if (this.keys.forward) {
      const exhaustX = this.x - Math.cos(this.direction) * this.radius;
      const exhaustY = this.y - Math.sin(this.direction) * this.radius;
      particleSystem.createExhaust(exhaustX, exhaustY, this.direction);
    }

    // 同步状态
    if (this.isLocal && socketManager && socketManager.isConnected()) {
      this.syncState();
    }
  }

  // 同步状态
  syncState() {
    socketManager.sendKeyEvent({
      ...this.keys,
      health: this.health,
      deaths: this.deaths,
      x: this.x,
      y: this.y,
      direction: this.direction,
      isAlive: this.isAlive,
      isInvincible: this.isInvincible
    });
  }

  // 射击
  shoot() {
    const bullet = {
      x: this.x + Math.cos(this.direction) * this.radius,
      y: this.y + Math.sin(this.direction) * this.radius,
      direction: this.direction,
      radius: 3,
      owner: this
    };
    this.bullets.push(bullet);
    if (this.isLocal && socketManager && socketManager.isConnected()) {
      socketManager.sendKeyEvent({
        ...this.keys,
        shoot: true,
        x: this.x,
        y: this.y,
        direction: this.direction
      });
    }
  }

  // 处理受伤
  isHurt(bullet) {
    if (!this.isAlive || bullet.owner === this || this.isInvincible) return false;

    if (physics.checkBulletPlayerCollision(bullet, this)) {
      this.takeDamage(20);
      particleSystem.createHitEffect(this.x, this.y, this.color);

      if (this.health <= 0) {
        this.die();
        bullet.owner.score++;
        particleSystem.createExplosion(this.x, this.y, this.color);
      }
      return true; // 返回true表示子弹击中并应该被移除
    }
    return false;
  }

  // 受到伤害
  takeDamage(damage) {
    if (this.isInvincible) return;

    this.health = Math.max(0, this.health - damage);

    // 创建受伤特效
    particleSystem.createHitEffect(this.x, this.y, this.color);

    if (this.isLocal && socketManager && socketManager.isConnected()) {
      socketManager.sendKeyEvent({
        ...this.keys,
        health: this.health,
        takeDamage: true,
        x: this.x,
        y: this.y
      });
    }
  }

  // 激活无敌状态
  activateInvincibility() {
    this.isInvincible = true;
    this.invincibleTimer = this.invincibleTime;
    particleSystem.createInvincibilityEffect(this.x, this.y, this.color);
  }

  // 更新无敌状态
  updateInvincibility(deltaTime) {
    if (this.isInvincible) {
      this.invincibleTimer -= deltaTime;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
      }
    }
  }

  // 死亡处理
  die() {
    this.isAlive = false;
    this.health = 0;
    this.velocity = new Vector(0, 0);
    this.bullets = [];
    this.isInvincible = false;
    this.deaths++; // 增加死亡计数
    if (this.isLocal && socketManager && socketManager.isConnected()) {
      socketManager.sendKeyEvent({
        ...this.keys,
        die: true,
        deaths: this.deaths,
        x: this.x,
        y: this.y
      });
    }
  }

  // 重生
  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.direction = Math.random() * Math.PI * 2;
    this.isAlive = true;
    this.health = this.maxHealth;
    this.velocity = new Vector(0, 0);
    this.bullets = [];
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.activateInvincibility();
    if (this.isLocal && socketManager && socketManager.isConnected()) {
      socketManager.sendKeyEvent({
        ...this.keys,
        respawn: true,
        health: this.health,
        deaths: this.deaths,
        x: this.x,
        y: this.y,
        direction: this.direction,
        isAlive: true,
        isInvincible: true
      });
    }
  }

  // 绘制玩家
  draw(ctx) {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.direction);

    // 绘制无敌状态特效
    if (this.isInvincible) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 绘制坦克主体
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // 绘制炮管
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(this.radius + 5, -2);
    ctx.lineTo(this.radius + 5, 2);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 绘制血条
    this.drawHealthBar(ctx);

    // 绘制子弹
    ctx.fillStyle = '#ffff00';
    for (const bullet of this.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制死亡计数
    this.drawDeathCount(ctx);
  }

  // 绘制血条
  drawHealthBar(ctx) {
    const healthPercentage = this.health / this.maxHealth;
    const barX = this.x - this.healthBarWidth / 2;
    const barY = this.y - this.radius - this.healthBarOffset;

    // 绘制血条背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);

    // 根据生命值百分比设置颜色
    let healthColor;
    if (healthPercentage > 0.6) {
      healthColor = '#2ecc71'; // 绿色
    } else if (healthPercentage > 0.3) {
      healthColor = '#f1c40f'; // 黄色
    } else {
      healthColor = '#e74c3c'; // 红色
    }

    // 绘制当前生命值
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, this.healthBarWidth * healthPercentage, this.healthBarHeight);

    // 如果处于无敌状态，添加闪烁效果
    if (this.isInvincible) {
      const alpha = (Math.sin(Date.now() / 100) + 1) / 2;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      ctx.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);
    }
  }

  // 绘制死亡计数
  drawDeathCount(ctx) {
    const textX = this.x;
    const textY = this.y - this.radius - this.healthBarOffset - 15;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Deaths: ${this.deaths}`, textX, textY);
    ctx.restore();
  }
}

// 导出玩家类
window.playerInstance = playerInstance;

// 炮弹小球类
class ball {
  constructor(x, y, color, direction) {
    this.time = 120; // 存在时间，如超过时间就会消失
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = 2;
    this.direction = direction;
  }
  /**
   * 绘制飞行中的小球
   * @param {*} ctx
   * @param {*} step 速度，以后可以设置一些道具获得子弹加速
   */
  biu = (ctx, step = 10) => {
    this.x = this.x + Math.cos(this.direction) * step;
    this.y = this.y + Math.sin(this.direction) * step;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.closePath();
    ctx.fill();
    // 120帧消失
    this.time--;
  };
  // 小球是否应该消失
  isEmpty = () => {
    return this.time <= 0;
  };
}

function getDistance(Ax, Ay, Bx, By) {
  return Math.sqrt(Math.pow(Ax - Bx, 2) + Math.pow(Ay - By, 2))
}

