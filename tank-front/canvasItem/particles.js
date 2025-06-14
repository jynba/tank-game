class Particle {
  constructor(x, y, vx, vy, color, size, life, type = 'normal') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    this.gravity = 0.1;
    this.friction = 0.98;
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.life -= deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;

    // 根据粒子类型更新
    switch (this.type) {
      case 'hit':
        this.size *= 0.95;
        this.vx *= 0.95;
        this.vy *= 0.95;
        break;
      case 'invincibility':
        this.size = this.maxLife * 0.2 * (this.life / this.maxLife);
        this.rotation += 0.1 * deltaTime;
        break;
      case 'exhaust':
        this.size *= 0.95;
        this.vx *= 0.98;
        this.vy *= 0.98;
        break;
      case 'bulletTrail':
        this.size *= 0.9;
        this.life *= 0.95;
        break;
      default:
        this.size *= 0.95;
        break;
    }

    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    switch (this.type) {
      case 'hit':
        // 绘制星形爆炸效果
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const x1 = Math.cos(angle) * this.size;
          const y1 = Math.sin(angle) * this.size;
          const x2 = Math.cos(angle + Math.PI / 5) * (this.size * 0.5);
          const y2 = Math.sin(angle + Math.PI / 5) * (this.size * 0.5);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'invincibility':
        // 绘制光环效果
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'exhaust':
        // 绘制尾焰效果
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bulletTrail':
        // 绘制子弹轨迹
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        // 默认圆形粒子
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // 创建爆炸效果
  createExplosion(x, y, color = '#ff4444') {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 3;
      const life = 0.5 + Math.random() * 0.5;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 'hit'));
    }
  }

  // 创建尾焰效果
  createExhaust(x, y, direction, color = '#ffaa00') {
    const angle = direction + Math.PI + (Math.random() - 0.5) * 0.2;
    const speed = 1 + Math.random();
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 1 + Math.random() * 2;
    const life = 0.2 + Math.random() * 0.2;
    this.particles.push(new Particle(x, y, vx, vy, color, size, life, 'exhaust'));
  }

  // 创建子弹轨迹
  createBulletTrail(x, y, direction, color = '#ffff00') {
    const angle = direction + (Math.random() - 0.5) * 0.1;
    const speed = 0.5 + Math.random() * 0.5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 1 + Math.random();
    const life = 0.1 + Math.random() * 0.1;
    this.particles.push(new Particle(x, y, vx, vy, color, size, life, 'bulletTrail'));
  }

  // 更新所有粒子
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(deltaTime)) {
        this.particles.splice(i, 1);
      }
    }
  }

  // 绘制所有粒子
  draw(ctx) {
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }

  createHitEffect(x, y, color) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 100 + Math.random() * 50;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 2;
      const life = 0.3 + Math.random() * 0.2;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 'hit'));
    }
  }

  createInvincibilityEffect(x, y, color) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 15 + Math.random() * 5;
      const vx = Math.cos(angle) * distance;
      const vy = Math.sin(angle) * distance;
      const size = 8 + Math.random() * 4;
      const life = 0.5 + Math.random() * 0.3;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 'invincibility'));
    }
  }

  createExhaust(x, y, direction) {
    const speed = 20 + Math.random() * 10;
    const vx = -Math.cos(direction) * speed + (Math.random() - 0.5) * 10;
    const vy = -Math.sin(direction) * speed + (Math.random() - 0.5) * 10;
    const size = 3 + Math.random() * 2;
    const life = 0.2 + Math.random() * 0.1;
    this.particles.push(new Particle(x, y, vx, vy, '#ff6400', size, life, 'exhaust'));
  }

  createBulletTrail(x, y, direction) {
    const speed = 50 + Math.random() * 20;
    const vx = -Math.cos(direction) * speed * 0.1;
    const vy = -Math.sin(direction) * speed * 0.1;
    const size = 2 + Math.random();
    const life = 0.1 + Math.random() * 0.1;
    this.particles.push(new Particle(x, y, vx, vy, '#ffff00', size, life, 'bulletTrail'));
  }
}

// 导出粒子系统
window.particleSystem = new ParticleSystem(); 