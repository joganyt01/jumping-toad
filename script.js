// ─────────────────────────────────────────────────────────────────────────────
console.log("Si un ave me da me vuelvo negro... y suena el Binomio de Oro");
// ─────────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ── RESIZE ───────────────────────────────────────────────────────────────────
let W, H;
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    if (game) game.onResize();
}
window.addEventListener('resize', resize);

// ── HELPERS ──────────────────────────────────────────────────────────────────
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ── COLOUR PALETTE ───────────────────────────────────────────────────────────
const C = {
    sky1: '#a8d8f0', sky2: '#d4eeff',
    hill1: '#7cc47c', hill2: '#5aab5a', hill3: '#9fd88f',
    water1: '#3a9fd5', water2: '#1a6fa8', waterDeep: '#0d4a78',
    lily: '#4ec94e', lilyRim: '#6ee86e', lilyVein: 'rgba(0,80,0,0.25)',
    dock1: '#c8945a', dock2: '#a8743a',
    frogBody: '#5cb85c', frogBelly: '#c8e6a0', frogDark: '#3a8a3a',
    bird: '#e8eef8', birdWing: '#ccd8ec', birdBeak: '#f4b942',
    cloud: 'rgba(255,255,255,0.9)',
    ui: '#ffffff', uiShadow: 'rgba(0,0,0,0.28)',
};

// ─────────────────────────────────────────────────────────────────────────────
// DRAW PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function drawCloud(x, y, w) {
    const h = w * 0.42;
    ctx.fillStyle = C.cloud;
    ctx.beginPath();
    ctx.ellipse(x + w * .5, y + h * .6, w * .5, h * .46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * .26, y + h * .74, w * .3, h * .38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * .74, y + h * .7, w * .27, h * .35, 0, 0, Math.PI * 2); ctx.fill();
}

function drawLily(x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    const rx = w / 2, ry = h * .8;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 4, rx, ry * .55, 0, 0, Math.PI * 2); ctx.fill();
    // pad
    ctx.fillStyle = C.lily;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    // notch
    ctx.fillStyle = C.water1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rx * .38, -.25, .25);
    ctx.closePath(); ctx.fill();
    // veins
    ctx.strokeStyle = C.lilyVein; ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 / 7) * i;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * rx * .9, cy + Math.sin(a) * ry * .85); ctx.stroke();
    }
    // rim highlight
    ctx.strokeStyle = 'rgba(160,255,160,.55)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(cx, cy - 1, rx * .82, ry * .55, 0, 0, Math.PI); ctx.stroke();
}

function drawDock(x, y, w, h) {
    const planks = Math.ceil(w / 16);
    for (let i = 0; i < planks; i++) {
        ctx.fillStyle = i % 2 === 0 ? C.dock1 : C.dock2;
        roundRect(x + i * 16, y, 15, h, 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x, y + h - 3, w, 3);
    // posts
    for (const ox of [-2, w - 4]) {
        ctx.fillStyle = '#8b6030'; ctx.fillRect(x + ox, y - 14, 7, h + 18);
        ctx.fillStyle = '#6a4820'; ctx.fillRect(x + ox, y - 14, 7, 4);
    }
}

function drawFrog(fx, fy, fw, fh, dead, frame, onGround, jumpT) {
    const cx = fx + fw / 2;
    const floorY = fy + fh;

    // squish
    let sx = 1, sy = 1;
    if (jumpT > 0) { sx = 1 - jumpT * .22; sy = 1 + jumpT * .32; }
    ctx.save();
    ctx.translate(cx, floorY);
    ctx.scale(sx, sy);
    ctx.translate(-cx, -floorY);

    const body = dead ? '#111' : C.frogBody;
    const belly = dead ? '#1a1a1a' : C.frogBelly;
    const dark = dead ? '#000' : C.frogDark;

    // ground shadow
    if (!dead) {
        ctx.fillStyle = 'rgba(0,0,0,.15)';
        ctx.beginPath(); ctx.ellipse(cx, floorY + 4, fw * .38, 5, 0, 0, Math.PI * 2); ctx.fill();
    }

    // back legs
    if (!dead) {
        const kick = onGround ? Math.sin(frame * .18) * 7 : -10;
        ctx.strokeStyle = dark; ctx.lineWidth = fw * .14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(fx + fw * .18, floorY - 4);
        ctx.quadraticCurveTo(fx - fw * .12, floorY + kick, fx - fw * .18, floorY + fh * .28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + fw * .82, floorY - 4);
        ctx.quadraticCurveTo(fx + fw * 1.12, floorY + kick, fx + fw * 1.18, floorY + fh * .28); ctx.stroke();
    }

    // body
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(cx, fy + fh * .58, fw * .46, fh * .46, 0, 0, Math.PI * 2); ctx.fill();
    // belly
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(cx + fw * .04, fy + fh * .65, fw * .28, fh * .28, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(cx, fy + fh * .26, fw * .4, fh * .3, 0, 0, Math.PI * 2); ctx.fill();

    // eyes
    [[fx + fw * .27, fy + fh * .1], [fx + fw * .73, fy + fh * .1]].forEach(([ex, ey]) => {
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(ex, ey, fw * .12, fh * .14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dead ? '#222' : '#fff';
        ctx.beginPath(); ctx.ellipse(ex, ey, fw * .09, fh * .11, 0, 0, Math.PI * 2); ctx.fill();
        if (dead) {
            ctx.strokeStyle = '#f00'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(ex - fw * .05, ey - fh * .06); ctx.lineTo(ex + fw * .05, ey + fh * .06); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex + fw * .05, ey - fh * .06); ctx.lineTo(ex - fw * .05, ey + fh * .06); ctx.stroke();
        } else {
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.ellipse(ex + fw * .01, ey + fh * .01, fw * .045, fh * .055, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(ex + fw * .03, ey - fh * .03, fw * .018, fh * .018, 0, 0, Math.PI * 2); ctx.fill();
        }
    });

    // mouth / smile
    if (!dead) {
        ctx.strokeStyle = '#2d6a2d'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, fy + fh * .34, fw * .13, .15, Math.PI - .15); ctx.stroke();
        if (onGround && Math.sin(frame * .06) > .82) {
            ctx.fillStyle = '#e07070';
            ctx.beginPath(); ctx.ellipse(cx, fy + fh * .45, fw * .07, fh * .08, 0, 0, Math.PI * 2); ctx.fill();
        }
    }

    // arms
    if (!dead) {
        ctx.strokeStyle = dark; ctx.lineWidth = fw * .11; ctx.lineCap = 'round';
        const armSwing = onGround ? Math.sin(frame * .18) * 4 : -6;
        ctx.beginPath(); ctx.moveTo(fx + fw * .18, fy + fh * .54);
        ctx.quadraticCurveTo(fx - fw * .08, fy + fh * .6 + armSwing, fx - fw * .1, fy + fh * .72); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + fw * .82, fy + fh * .54);
        ctx.quadraticCurveTo(fx + fw * 1.08, fy + fh * .6 + armSwing, fx + fw * 1.1, fy + fh * .72); ctx.stroke();
    }

    ctx.restore();
}

function drawBird(bx, by, bw, bh, wingPhase, col) {
    const wing = Math.sin(wingPhase) * bh * .55;
    ctx.save(); ctx.translate(bx, by);
    // body
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, bw * .44, bh * .34, .12, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(bw * .34, -bh * .14, bh * .26, bh * .24, .28, 0, Math.PI * 2); ctx.fill();
    // beak
    ctx.fillStyle = C.birdBeak;
    ctx.beginPath();
    ctx.moveTo(bw * .52, -bh * .1); ctx.lineTo(bw * .74, -bh * .04); ctx.lineTo(bw * .5, bh * .06);
    ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(bw * .41, -bh * .2, bh * .1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bw * .43, -bh * .22, bh * .04, 0, Math.PI * 2); ctx.fill();
    // top wing
    ctx.fillStyle = C.birdWing;
    ctx.beginPath(); ctx.moveTo(-bw * .08, 0);
    ctx.quadraticCurveTo(-bw * .04, -bh * .5 - wing, bw * .22, -bh * .08);
    ctx.quadraticCurveTo(0, 0, -bw * .08, 0); ctx.fill();
    // under wing
    ctx.beginPath(); ctx.moveTo(-bw * .08, 0);
    ctx.quadraticCurveTo(-bw * .04, bh * .38 + wing * .5, bw * .18, bh * .1);
    ctx.quadraticCurveTo(0, 0, -bw * .08, 0); ctx.fill();
    // tail
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-bw * .38, -bh * .04); ctx.lineTo(-bw * .64, -bh * .2);
    ctx.lineTo(-bw * .58, bh * .12); ctx.lineTo(-bw * .32, bh * .06); ctx.closePath(); ctx.fill();
    ctx.restore();
}

document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('mousedown', unlockAudio, { once: true });

function unlockAudio() {
  music.play().then(() => {
    music.pause();
    music.currentTime = 0;
  }).catch(() => {});
}

//imagen de cj
const cjImg = new Image();
cjImg.src = 'cj.jpg';
// ─────────────────────────────────────────────────────────────────────────────
// GAME OBJECT
// ─────────────────────────────────────────────────────────────────────────────
const music = new Audio('music.mp3');
music.loop = true;
music.volume = 0.5;
music.playbackRate = 1; // velocidad inicial
let musicStarted = false;

const game = {
    state: 'start',   // 'start' | 'playing' | 'dead'
    frame: 0,
    score: 0,
    best: 0,
    speed: 0,
    scroll: 0,
    bgScroll: 0,
    deathTimer: 0,
    deathDelay: 120,
    timeAlive: 0,
    deathSound: new Audio('deathSound.mp3'),
    paused: false,
    deadAlpha: 0,

    // bg
    clouds: [],
    pads: [],
    birds: [],
    birdTimer: 0,
    particles: [],
    popups: [],
    sparkles: [],
    waterWaves: [],

    // frog
    frog: {},
    lastScoredPad: -1,

    onResize() {
        this.initBg();
        // reanchor pads to new horizon
        const gy = this.groundY();
        this.pads.forEach(p => { p.y = gy - p.h - rnd(-15, 15); });
        if (this.pads.length) this.pads[0].y = gy - this.pads[0].h;
        if (this.frog && this.frog.onGround) { this.frog.y = this.pads[0]?.y - this.frogH() || gy - this.frogH(); }
    },

    groundY() { return H * .76; },
    frogW() { return Math.min(W, H) * .075; },
    frogH() { return this.frogW() * .9; },
    padW() { return W * .13; },
    padH() { return Math.max(10, H * .016); },
    gravity() { return H * .00040; },
    jumpVY() { return -H * .020; },

    initBg() {
        this.clouds = [];
        for (let i = 0; i < 7; i++) {
            this.clouds.push({ baseX: rnd(0, W * 1.8), y: H * rnd(.03, .2), w: rnd(W * .08, W * .18), speed: rnd(.25, .55) });
        }
    },

    initFrog() {
        const fw = this.frogW(), fh = this.frogH();
        const startPad = this.pads[0];
        this.frog = {
            x: startPad ? startPad.x - this.scroll + fw * .5 : W * .12,
            y: startPad ? startPad.y - fh : this.groundY() - fh,
            vy: 0, onGround: true, dead: false, jumpT: 0
        };
    },

    generatePads() {
        this.pads = [];
        const gy = this.groundY();
        const ph = this.padH();
        const pw = this.padW();
        // start dock
        this.pads.push({ x: W * .04, y: gy - ph * 1.5, w: W * .2, h: ph * 1.8, type: 'dock' });
        let x = W * .32;
        while (x < W * 5) {
            const gap = W * rnd(.12, .2);
            const yo = rnd(-H * .04, H * .04);
            this.pads.push({ x, y: gy - ph + yo, w: pw, h: ph, type: 'lily' });
            x += gap + pw;
        }
    },

    extendPads() {
        const last = this.pads[this.pads.length - 1];
        const gy = this.groundY();
        const ph = this.padH();
        const pw = this.padW();
        let x = last.x + last.w + W * rnd(.12, .2);
        while (x < this.scroll + W * 2) {
            this.pads.push({ x, y: gy - ph + rnd(-H * .04, H * .04), w: pw, h: ph, type: 'lily' });
            x += pw + W * rnd(.12, .2);
        }
    },

    spawnBird() {
        const bw = Math.min(W, H) * .12, bh = bw * .5;
        const yRange = [H * .1, H * .2, H * .32, H * .46, H * .58];
        const y = yRange[Math.floor(Math.random() * yRange.length)];
        const spd = (W * .004) + (W * .0003) * this.score;
        this.birds.push({
            x: W + bw, y, w: bw, h: bh,
            speed: Math.min(spd, W * .01),
            phase: rnd(0, Math.PI * 2),
            col: rnd(0, 1) > .4 ? C.bird : '#d5dde8'
        });
    },

    jump() {
        if (this.state === 'dead') { this.restart(); return; }
        if (this.state === 'start') { this.state = 'playing'; music.play().catch(() => { }); return; }
        if (this.frog.onGround || this.frog.vy > this.jumpVY() * .3) {
            this.frog.vy = this.jumpVY();
            this.frog.onGround = false;
            this.frog.jumpT = 1;
        }
    },

    die() {
        if (this.state !== 'playing') return;
        this.state = 'dying'; // 👈 nuevo estado
        this.deathTimer = 0;


        this.frog.dead = true;
        this.frog.vy = 0;          // 👈 congelado
        this.frog.onGround = true; // 👈 evita caída

        music.pause();

        // 🎵 sonido (ejemplo)
        if (this.deathSound) {
            this.deathSound.currentTime = 0;
            this.deathSound.play();
        }

        this.deadAlpha = 0;
        if (this.score > this.best) this.best = this.score;
        for (let i = 0; i < 22; i++) {
            const a = (Math.PI * 2 / 22) * i;
            const spd = rnd(H * .004, H * .01);
            this.particles.push({
                x: this.frog.x + this.frogW() / 2, y: this.frog.y + this.frogH() / 2,
                vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, alpha: 1,
                col: ['#ff6b6b', '#ffd93d', '#6ee86e', '#60aaff'][Math.floor(rnd(0, 4))],
                r: rnd(H * .003, H * .007)
            });
        }

    },

    restart() {
        this.score = 0; this.speed = 0; this.scroll = 0; this.bgScroll = 0;
        this.frame = 0; this.birdTimer = 0; this.lastScoredPad = -1;
        this.birds = []; this.particles = []; this.popups = []; this.sparkles = [];
        this.generatePads();
        this.initFrog();
        this.state = 'playing';
        this.timeAlive = 0;
        music.currentTime = 0;
        this.deathSound.pause();
        this.deathSound.currentTime = 0;
        music.playbackRate = 1;
        music.play().catch(() => { });
        document.getElementById('game-over-text').style.display = 'none';

    },

    update() {

        if (this.paused) return; // 🔴 clave: congela TODO
        this.frame++;

        if (this.state === 'playing') {
            this.timeAlive++;
            const t = this.timeAlive / 60;

            this.speed = Math.min(
                W * .023,
                W * .003 + this.score * W * .00008 + (t * t) * W * .000030
            );
            // velocidad dinámica de la música
            const speedRatio = this.speed / (W * 0.012); // 0 a 1

            music.playbackRate = 1 + speedRatio * 0.5;
            // empieza normal (1.0) y puede subir hasta 1.5
            this.scroll += this.speed;
            this.bgScroll += this.speed * .3;

            // frog
            const f = this.frog;
            const fw = this.frogW(), fh = this.frogH();
            f.vy += this.gravity();
            f.y += f.vy;
            f.onGround = false;
            if (f.jumpT > 0) f.jumpT = Math.max(0, f.jumpT - .07);

            // pad collision
            this.pads.forEach((p, i) => {
                const px = p.x - this.scroll;
                if (f.vy >= 0 && !f.dead) {
                    const hitX = f.x + fw * .25 < px + p.w + fw * .1 && f.x + fw * .75 > px - fw * .1;
                    const hitY = f.y + fh >= p.y && f.y + fh <= p.y + p.h + f.vy + 2;
                    if (hitX && hitY) {
                        f.y = p.y - fh;
                        f.vy = 0;
                        f.onGround = true;

                        if (!p.scored && p.type !== 'dock') {
                            this.score++;
                            this.lastScoredPad = i;
                            this.popups.push({ x: px + p.w / 2, y: p.y - H * .04, vy: -H * .003, alpha: 1 });


                            p.scored = true;
                        }
                    }
                }
            });

            // fell in water
            if (f.y > H + 20) this.die();

            // bird spawn
            this.birdTimer++;
            const interval = Math.max(60, 200 - this.score * 3);
            if (this.birdTimer > interval) { this.spawnBird(); this.birdTimer = 0; }
            this.birds.forEach(b => { b.x -= b.speed; b.phase += .18; });
            this.birds = this.birds.filter(b => b.x > -200);

            // bird collision
            const hm = Math.min(W, H) * .01;
            this.birds.forEach(b => {
                if (!f.dead && f.x + hm < b.x + b.w * .4 && f.x + fw - hm > b.x - b.w * .4 &&
                    f.y + hm < b.y + b.h * .4 && f.y + fh - hm > b.y - b.h * .4) this.die();
            });

            // extend pads
            this.extendPads();
            this.pads = this.pads.filter(p => p.x - this.scroll > -W * .5);

            // popups
            this.popups.forEach(p => { p.y += p.vy; p.alpha -= .02; });
            this.popups = this.popups.filter(p => p.alpha > 0);

            // sparkles
            if (Math.random() < .07) {
                this.sparkles.push({ x: rnd(0, W), y: this.groundY() + rnd(5, H * .3), alpha: 1, r: rnd(1, 3) });
            }
        }

        if (this.state === 'dying') {
            this.deathTimer++;


            // NO mover nada (todo congelado)
            if (this.deathTimer > this.deathDelay) {
                this.state = 'dead'; // ahora sí muestra el letrero
                document.getElementById('game-over-text').style.display = 'block';
            }
        }

        if (this.state === 'dead') {
            this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += H * .0003; p.alpha -= .016; });
            this.particles = this.particles.filter(p => p.alpha > 0);
            this.birds.forEach(b => { b.x -= b.speed * .5; b.phase += .1; });
            // frog still falls
            if (!this.frog.onGround) {
                this.frog.vy += H * this.gravity();
                this.frog.y += this.frog.vy;
                if (this.frog.y > H + 50) this.frog.y = H + 50;
            }
            this.deadAlpha = Math.min(3, this.deadAlpha + 0.02);
        }

        this.sparkles.forEach(s => { s.alpha -= .025; });
        this.sparkles = this.sparkles.filter(s => s.alpha > 0);
    },

    // ── DRAW ──────────────────────────────────────────────────────────────────
    draw() {
        ctx.clearRect(0, 0, W, H);
        this.drawSky();
        this.drawHills();
        this.drawClouds();
        this.drawWater();
        this.pads.forEach(p => this.drawPad(p));
        this.birds.forEach(b => drawBird(b.x, b.y, b.w, b.h, b.phase, b.col));
        if (this.state !== 'start') this.drawFrog();
        this.drawParticles();
        this.drawPopups();
        this.drawHUD();
        if (this.state === 'start') this.drawStartScreen();
        if (this.state === 'dead') this.drawDeadScreen();
    },

    drawSky() {
        const g = ctx.createLinearGradient(0, 0, 0, this.groundY());
        g.addColorStop(0, '#6ec6f0'); g.addColorStop(1, '#d0eeff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },

    drawHills() {
        const gy = this.groundY();
        // far hill
        ctx.fillStyle = '#a8d8a8';
        ctx.beginPath(); ctx.moveTo(0, gy);
        ctx.bezierCurveTo(W * .1, gy - H * .22, W * .3, gy - H * .34, W * .52, gy);
        ctx.lineTo(0, gy); ctx.fill();
        // mid hill
        ctx.fillStyle = '#88c878';
        ctx.beginPath(); ctx.moveTo(W * .35, gy);
        ctx.bezierCurveTo(W * .5, gy - H * .28, W * .72, gy - H * .36, W, gy);
        ctx.lineTo(W * .35, gy); ctx.fill();
        // near bank strips
        ctx.fillStyle = '#6ab85a';
        ctx.fillRect(0, gy - H * .012, W * .38, H * .012);
        ctx.fillRect(W * .62, gy - H * .012, W * .38, H * .012);
        // tiny trees
        const treeDefs = [[W * .08, gy - H * .04, H * .07], [W * .18, gy - H * .05, H * .06], [W * .28, gy - H * .04, H * .075],
        [W * .72, gy - H * .04, H * .065], [W * .82, gy - H * .05, H * .072], [W * .92, gy - H * .04, H * .06]];
        treeDefs.forEach(([tx, ty, tr]) => this.drawTree(tx - this.bgScroll * .2 % W, ty, tr));
    },

    drawTree(tx, ty, tr) {
        ctx.fillStyle = '#7a5c3a';
        ctx.fillRect(tx - tr * .12, ty, tr * .24, tr * .6);
        ctx.fillStyle = 'rgba(0,0,0,.1)';
        ctx.beginPath(); ctx.ellipse(tx + tr * .1, ty, tr, tr * .85, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a9d23';
        ctx.beginPath(); ctx.ellipse(tx, ty, tr, tr * .88, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.beginPath(); ctx.ellipse(tx - tr * .18, ty - tr * .22, tr * .34, tr * .24, -.3, 0, Math.PI * 2); ctx.fill();
    },

    drawClouds() {
        this.clouds.forEach(c => {
            drawCloud((c.baseX - this.bgScroll * c.speed * .8 + W * 4) % (W * 2) - W * .2, c.y, c.w);
        });
    },

    drawWater() {
        const gy = this.groundY();
        const g = ctx.createLinearGradient(0, gy, 0, H);
        g.addColorStop(0, C.water1); g.addColorStop(.45, C.water2); g.addColorStop(1, C.waterDeep);
        ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
        // animated wave lines
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const wy = gy + H * .02 + i * (H * .055);
            const alpha = .18 - .02 * i;
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let x = 0; x < W + 30; x += 30) {
                const y2 = wy + Math.sin((x + this.scroll * .8 + i * 40) * .025) * H * .008;
                x === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
            }
            ctx.stroke();
        }
        ctx.restore();
        // sparkles
        this.sparkles.forEach(s => {
            ctx.globalAlpha = s.alpha; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    },

    drawPad(p) {
        const px = p.x - this.scroll;
        if (px > W + 80 || px + p.w < -80) return;
        if (p.type === 'dock') drawDock(px, p.y, p.w, p.h);
        else drawLily(px, p.y, p.w, p.h);
    },

    drawFrog() {
        const f = this.frog;
        drawFrog(f.x, f.y, this.frogW(), this.frogH(), f.dead, this.frame, f.onGround, f.jumpT);
    },

    drawParticles() {
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    },

    drawPopups() {
        const fs = Math.round(Math.min(W, H) * .055);
        ctx.font = `bold ${fs}px Georgia,serif`;
        ctx.textAlign = 'center';
        this.popups.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3;
            ctx.strokeText('+1 🍃', p.x, p.y);
            ctx.fillText('+1 🍃', p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
    },

    drawHUD() {
        if (this.state === 'start') return;
        const fs = Math.round(Math.min(W, H) * .06);
        ctx.font = `bold ${fs}px Georgia,serif`;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillText(`🍃 ${this.score}`, W * .04 + 2, H * .07 + 2);
        ctx.fillStyle = '#fff';
        ctx.fillText(`🍃 ${this.score}`, W * .04, H * .07);
        const fs2 = Math.round(fs * .62);
        ctx.font = `${fs2}px Georgia,serif`;
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.fillText(`Récord: ${this.best}`, W * .04, H * .07 + fs2 * 1.2);
    },

    drawStartScreen() {
        ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H * .4;
        const cw = W * .82, ch = H * .36;
        // card
        ctx.fillStyle = 'rgba(255,255,255,.96)';
        roundRect(cx - cw / 2, cy - ch / 2, cw, ch, cw * .04); ctx.fill();
        ctx.strokeStyle = '#5cb85c'; ctx.lineWidth = 3;
        roundRect(cx - cw / 2, cy - ch / 2, cw, ch, cw * .04); ctx.stroke();

        const fs = Math.round(Math.min(W, H) * .072);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2d6a2d';
        ctx.font = `bold ${fs}px Georgia,serif`;
        ctx.fillText('🐸 Si pierdes', cx, cy - ch * .12);
        ctx.fillText('Te vuelves negro🐵', cx, cy + ch * .1);
        ctx.font = `${Math.round(fs * .48)}px 'Segoe UI',sans-serif`;
        ctx.fillStyle = '#555';
        ctx.fillText('Toca · Espacio para saltar', cx, cy + ch * .32);

        // bounce arrow
        const pulse = Math.sin(this.frame * .08) * 5;
        ctx.font = `${Math.round(Math.min(W, H) * .08)}px sans-serif`;
        ctx.fillStyle = '#4caf50';
        ctx.fillText('▼ Toca para comenzar ▼', cx, H * .82 + pulse);
        ctx.textAlign = 'left';
    },

    drawDeadScreen() {
        ctx.save();
        ctx.globalAlpha = this.deadAlpha;

        ctx.fillStyle = 'rgba(0,0,0,.52)'; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H * .38;
        const cw = W * .88, ch = H * .46;


        // animated rainbow title
        const txt = '';
        const isMobile = W < 600;

        // tamaño
        const imgW = isMobile ? Math.min(W, H) * 0.6 : cw * 0.3;
        const imgH = imgW;

        // posición X (siempre centrado)
        const imgX = cx - imgW / 2;

        // posición Y (diferente para móvil vs PC)
        const imgY = isMobile
            ? H * 0.22   // 📱 debajo del texto HTML
            : cy + ch * -0.65; // 🖥️ tu posición actual

        // pequeña animación flotante
        const float = Math.sin(this.frame * 0.05) * 8;

        if (cjImg.complete) {
            ctx.drawImage(cjImg, imgX, imgY, imgW, imgH);
        }
        const fs = Math.round(Math.min(W, H) * .088);
        ctx.font = `bold ${fs}px Georgia,serif`;
        ctx.textAlign = 'center';
        // glow layers
        const glowCols = ['#ff6b6b', '#ffd93d', '#6ee86e', '#60aaff', '#ff80cc'];
        for (let g = 6; g > 0; g--) {
            ctx.globalAlpha = .06;
            ctx.fillStyle = glowCols[(this.frame + g) % glowCols.length];
            ctx.fillText(txt, cx, cy - ch * .05);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
        ctx.strokeText(txt, cx, cy - ch * .05);
        // gradient fill
        const gr = ctx.createLinearGradient(cx - cw * .4, 0, cx + cw * .4, 0);
        gr.addColorStop(0, '#ff6b6b'); gr.addColorStop(.25, '#ffd93d');
        gr.addColorStop(.5, '#6ee86e'); gr.addColorStop(.75, '#60aaff'); gr.addColorStop(1, '#ff80cc');
        ctx.fillStyle = gr; ctx.fillText(txt, cx, cy - ch * .06);

        const fs2 = Math.round(fs * .5);
        ctx.font = `${fs2}px 'Segoe UI',sans-serif`;
        ctx.fillStyle = '#eee';
        ctx.fillText(`Hojas saltadas: ${this.score}`, cx, cy + ch * .76);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Récord: ${this.best}`, cx, cy + ch * .88);

        // restart btn
        const bw = cw * .68, bh = H * .072;
        const bx = cx - bw / 2, by = cy + ch * .95;
        const pulse = Math.sin(this.frame * .08) * .04 + 1;
        ctx.save(); ctx.translate(cx, by + bh / 2); ctx.scale(pulse, pulse); ctx.translate(-cx, -by - bh / 2);
        ctx.fillStyle = '#4caf50'; roundRect(bx, by, bw, bh, bh * .4); ctx.fill();
        ctx.strokeStyle = '#2d8a2d'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(fs * .5)}px 'Segoe UI',sans-serif`;
        ctx.fillText('¡Otra vez! 🐸', cx, by + bh * .68);
        ctx.restore();
        ctx.textAlign = 'left';
        ctx.restore();
    }

};

console.log("johanytsi ");
// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); game.jump(); }
});
canvas.addEventListener('touchstart', e => {startMusicOnce(); game.jump(); }, { passive: false });
canvas.addEventListener('mousedown', () => game.jump());
canvas.addEventListener('click',()=>startMusicOnce());

// ─────────────────────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────────────────────
function loop() {
    game.update();
    game.draw();
    requestAnimationFrame(loop);
}
const btnPause = document.getElementById('btnPause');
const btnRestart = document.getElementById('btnRestart');

btnPause.addEventListener('click', () => {
    if (game.state !== 'playing') return;

    game.paused = !game.paused;

    // cambiar icono
    btnPause.textContent = game.paused ? '▶' : '⏸';

    // pausar música
    if (game.paused) {
        music.pause();
    } else {
        music.play().catch(() => { });
    }
});

btnRestart.addEventListener('click', () => {
    game.restart();

    // reset botón pause
    game.paused = false;
    btnPause.textContent = '⏸';

    // reiniciar música
    music.currentTime = 0;
    music.playbackRate = 1;
    music.play().catch(() => { });
});

function startMusicOnce() {
    if (!musicStarted) {
        music.play().catch(() => { });
        musicStarted = true;
        console.log("musica reproduciendo");
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────────────────
resize();
game.initBg();
game.generatePads();
game.initFrog();
loop();