import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-mobile-unsupported',
  templateUrl: './mobile-unsupported.component.html',
  styleUrls: ['./mobile-unsupported.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MobileUnsupportedComponent {
  /** canvas ref for particles */
  @ViewChild('particleCanvas', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  /** close handler is no-op → page is strictly blocking */
  readonly noop = () => {};

  /* --------------  particle animation (identical to your welcome modal) -------------- */
  private particles: any[] = [];
  private frame!: number;
  private particlesStarted = false;

  ngAfterViewChecked(): void {
    if (this.isMobile && this.canvasRef && this.canvasRef.nativeElement && !this.particlesStarted) {
      this.startParticles();
      this.particlesStarted = true;
    }
  }

  private startParticles() {
    if (!this.canvasRef || !this.canvasRef.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    // Use the actual rendered size of the container
    const container = canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const W = Math.round(rect.width * dpr);
    const H = Math.round(rect.height * dpr);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // Elegant, tiny dots and lines
    const count = Math.max(24, Math.min(48, Math.round((W * H) / 4800)));
    const center = { x: W / 2, y: H / 2 };
    const minR = 1.1 * dpr,
      maxR = 1.7 * dpr,
      connectDist = 0.18 * Math.min(W, H);

    const targets = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: minR + Math.random() * (maxR - minR),
      dx: (Math.random() - 0.5) * 0.7,
      dy: (Math.random() - 0.5) * 0.7,
      seed: Math.random() * 360,
    }));
    this.particles = targets.map(() => ({ ...center, r: minR, seed: Math.random() * 360, dx: 0, dy: 0 }));

    const burstMs = 400;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / burstMs);
      ctx.clearRect(0, 0, W, H);

      this.particles.forEach((p, i) => {
        /* lerp to target */
        p.x = center.x + (targets[i].x - center.x) * t;
        p.y = center.y + (targets[i].y - center.y) * t;
        const hue = (p.seed + now / 12) % 360;
        ctx.save();
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue},100%,65%)`;
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.restore();
      });

      // Elegant lines between close particles
      ctx.save();
      ctx.lineWidth = 1.1 * dpr;
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < this.particles.length; ++i) {
        for (let j = i + 1; j < this.particles.length; ++j) {
          const a = this.particles[i],
            b = this.particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < connectDist) {
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `hsl(${a.seed},100%,65%)`);
            grad.addColorStop(1, `hsl(${b.seed},100%,65%)`);
            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      /* after burst – enable float */
      if (t === 1) {
        this.particles.forEach((p, i) => Object.assign(p, targets[i]));
        this.frame = requestAnimationFrame(this.float.bind(this));
      } else {
        this.frame = requestAnimationFrame(animate);
      }
    };
    this.frame = requestAnimationFrame(animate);
  }

  private float(now: number) {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const connectDist = 0.18 * Math.min(W, H);

    ctx.clearRect(0, 0, W, H);
    this.particles.forEach((p) => {
      const hue = (p.seed + now / 12) % 360;
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue},100%,65%)`;
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.restore();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;
    });

    // Elegant lines between close particles
    ctx.save();
    ctx.lineWidth = 1.1 * (window.devicePixelRatio || 1);
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < this.particles.length; ++i) {
      for (let j = i + 1; j < this.particles.length; ++j) {
        const a = this.particles[i],
          b = this.particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < connectDist) {
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `hsl(${a.seed},100%,65%)`);
          grad.addColorStop(1, `hsl(${b.seed},100%,65%)`);
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    this.frame = requestAnimationFrame(this.float.bind(this));
  }

  /* stop anim when component destroyed */
  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    this.particlesStarted = false;
  }

  /* ---------- utility: re-evaluate on resize --------- */
  isMobile = false;

  @HostListener('window:resize')
  check() {
    this.isMobile = window.matchMedia('(max-width: 767px)').matches;
  }

  constructor() {
    this.check();
  }
}
