import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css'],
  standalone: false,
})
export class LoaderComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() text: string = 'Loading...';
  @Input() minDisplayTime: number = 0; // ms
  @Input() visible: boolean = false;
  @ViewChild('particleCanvas', { static: true })
  particleCanvasRef!: ElementRef<HTMLCanvasElement>;

  private animationFrame: any;
  private particles: any[] = [];
  private startTime: number = 0;
  private viewInitialized: boolean = false;
  private pendingStart: boolean = false;
  private mathEquations: string[] = [
    'E=mc²',
    'π ≈ 3.1416',
    '∑_{n=1}^∞ 1/n² = π²/6',
    'a² + b² = c²',
    'f(x) = sin(x)',
    '∫ e^x dx = e^x + C',
    'λ = h/p',
    'F = ma',
    'Δx · Δp ≥ ħ/2',
    'i² = -1',
  ];
  private equationTimer: number = 0;
  private currentEquation: string[] = [];
  private delaunayPoints: any[] = [];
  private delaunayPhases: number[] = [];
  private delaunayBase: { x: number; y: number }[] = [];
  private delaunayTriangles: number[][] = [];
  private delaunayInit: boolean = false;

  ngOnInit() {
    console.log('LoaderComponent ngOnInit');
    window.addEventListener('resize', this.handleResize);
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    console.log('LoaderComponent ngAfterViewInit', this.visible, !!this.particleCanvasRef?.nativeElement);
    if (this.visible && this.particleCanvasRef?.nativeElement) {
      this.startTime = Date.now();
      console.log('Calling startAnimation from ngAfterViewInit');
      this.startAnimation();
    }
    if (this.pendingStart && this.particleCanvasRef?.nativeElement) {
      this.startTime = Date.now();
      console.log('Calling startAnimation from ngAfterViewInit (pendingStart)');
      this.startAnimation();
      this.pendingStart = false;
    }
  }

  ngOnDestroy() {
    console.log('LoaderComponent ngOnDestroy');
    window.removeEventListener('resize', this.handleResize);
    this.stopAnimation();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('LoaderComponent ngOnChanges', changes);
    if (changes['visible']) {
      if (this.visible) {
        this.startTime = Date.now();
        if (this.viewInitialized && this.particleCanvasRef?.nativeElement) {
          console.log('Calling startAnimation from ngOnChanges');
          this.startAnimation();
        } else {
          console.log('ngOnChanges: Canvas not ready yet, setting pendingStart');
          this.pendingStart = true;
        }
      } else {
        this.stopAnimation();
        this.pendingStart = false;
      }
    }
  }

  private handleResize = () => {
    this.particles = [];
    if (this.viewInitialized && this.particleCanvasRef?.nativeElement) {
      this.startAnimation();
    }
  };

  private startAnimation() {
    const canvas = this.particleCanvasRef?.nativeElement;
    if (!canvas) {
      console.log('startAnimation: canvas not available');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('startAnimation: ctx not available');
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth * dpr;
    const height = window.innerHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';

    // --- Delaunay mesh setup ---
    const N = 50;
    if (!this.delaunayInit || this.delaunayPoints.length !== N) {
      this.delaunayPoints = [];
      this.delaunayPhases = [];
      this.delaunayBase = [];
      for (let i = 0; i < N; i++) {
        const x = Math.random() * width * 0.85 + width * 0.075;
        const y = Math.random() * height * 0.7 + height * 0.15;
        this.delaunayBase.push({ x, y });
        this.delaunayPhases.push(Math.random() * Math.PI * 2);
        this.delaunayPoints.push({ x, y, r: 2.2 + Math.random() * 1.2 });
      }
      this.delaunayInit = true;
    }
    // Animate points
    const time = Date.now() * 0.001;
    for (let i = 0; i < N; i++) {
      const base = this.delaunayBase[i];
      const phase = this.delaunayPhases[i];
      this.delaunayPoints[i].x = base.x + Math.sin(time * 1.2 + phase) * 18;
      this.delaunayPoints[i].y = base.y + Math.cos(time * 1.1 + phase) * 18;
    }
    // --- Delaunay triangulation (brute force, for small N) ---
    // Find all triangles (i, j, k) such that no other point is inside the circumcircle
    // (for small N, this is fast enough)
    this.delaunayTriangles = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        for (let k = j + 1; k < N; k++) {
          const a = this.delaunayPoints[i];
          const b = this.delaunayPoints[j];
          const c = this.delaunayPoints[k];
          // Circumcircle
          const A = b.x - a.x,
            B = b.y - a.y;
          const C = c.x - a.x,
            D = c.y - a.y;
          const E = A * (a.x + b.x) + B * (a.y + b.y);
          const F = C * (a.x + c.x) + D * (a.y + c.y);
          const G = 2 * (A * (c.y - b.y) - B * (c.x - b.x));
          if (Math.abs(G) < 1e-12) continue; // Collinear
          const cx = (D * E - B * F) / G;
          const cy = (A * F - C * E) / G;
          const r2 = (a.x - cx) ** 2 + (a.y - cy) ** 2;
          let valid = true;
          for (let m = 0; m < N; m++) {
            if (m === i || m === j || m === k) continue;
            const p = this.delaunayPoints[m];
            if ((p.x - cx) ** 2 + (p.y - cy) ** 2 < r2 - 1e-6) {
              valid = false;
              break;
            }
          }
          if (valid) {
            this.delaunayTriangles.push([i, j, k]);
          }
        }
      }
    }
    // --- Draw ---
    ctx.clearRect(0, 0, width, height);
    // Draw triangles
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#2a2a6a'; // dark blue/purple lines
    for (const tri of this.delaunayTriangles) {
      ctx.beginPath();
      ctx.moveTo(this.delaunayPoints[tri[0]].x, this.delaunayPoints[tri[0]].y);
      ctx.lineTo(this.delaunayPoints[tri[1]].x, this.delaunayPoints[tri[1]].y);
      ctx.lineTo(this.delaunayPoints[tri[2]].x, this.delaunayPoints[tri[2]].y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    // Draw points
    for (const p of this.delaunayPoints) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fillStyle = '#2a2a6a'; // dark blue/purple points
      ctx.shadowColor = '#6a4cff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }
    this.animationFrame = requestAnimationFrame(() => this.startAnimation());
  }

  private stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.particles = [];
  }
}
