// Adegan video: eskalator sisi, gelung sempurna setiap 8 saat.
// Kontrak: window.VIDEO = { width, height, fps, duration, draw(ctx, t, w, h) }
window.VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  duration: 8,
  draw(ctx, t, w, h) {
    const TW = 84, RH = 50, SL = RH / TW;      // lebar tapak, tinggi riser, cerun
    const Y0 = 1450;                            // y permukaan pada x = 0
    const ys = x => Y0 - SL * x;                // garis permukaan anak tangga
    const f = t % 1;                            // 1 langkah sesaat, gelung 8 saat

    // latar
    let g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1220');
    g.addColorStop(0.55, '#152238');
    g.addColorStop(1, '#0a0f1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // cahaya lembut berdenyut
    const pulse = 0.5 + 0.5 * Math.sin((t / 8) * Math.PI * 2);
    let rg = ctx.createRadialGradient(820, 520, 20, 820, 520, 700);
    rg.addColorStop(0, `rgba(120,170,255,${0.22 + 0.12 * pulse})`);
    rg.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    // lampu siling
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * 210, y = 170 + (i % 2) * 40;
      let lg = ctx.createRadialGradient(x, y, 4, x, y, 150);
      lg.addColorStop(0, 'rgba(255,240,200,0.55)');
      lg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - 160, y - 160, 320, 320);
      ctx.fillStyle = '#fff6dc';
      ctx.fillRect(x - 38, y - 5, 76, 10);
    }

    // kekuda (truss) di bawah anak tangga
    const xa = -200, xb = 1300;
    ctx.beginPath();
    ctx.moveTo(xa, ys(xa) + RH);
    ctx.lineTo(xb, ys(xb) + RH);
    ctx.lineTo(xb, ys(xb) + 430);
    ctx.lineTo(xa, ys(xa) + 430);
    ctx.closePath();
    g = ctx.createLinearGradient(0, 900, 0, 1900);
    g.addColorStop(0, '#3a4658');
    g.addColorStop(1, '#171d29');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 3;
    for (let k = -4; k < 22; k++) {
      const x1 = k * 120, x2 = x1 + 120;
      ctx.beginPath();
      ctx.moveTo(x1, ys(x1) + RH + 20);
      ctx.lineTo(x2, ys(x2) + 400);
      ctx.moveTo(x2, ys(x2) + RH + 20);
      ctx.lineTo(x1, ys(x1) + 400);
      ctx.stroke();
    }

    // anak tangga bergerak
    for (let i = -3; i < 16; i++) {
      const x = (i + f) * TW, y = ys(x);
      // riser
      ctx.fillStyle = '#2a313d';
      ctx.fillRect(x, y, 10, RH);
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(x, y, 10, 5);
      // tapak
      g = ctx.createLinearGradient(0, y, 0, y + 14);
      g.addColorStop(0, '#cfd6df');
      g.addColorStop(1, '#8d97a4');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TW, 14);
      // alur tapak
      ctx.fillStyle = 'rgba(40,48,60,0.55)';
      for (let k = 1; k < 7; k++) ctx.fillRect(x + k * 12, y + 2, 3, 10);
      // garis kuning tepi
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(x + TW - 6, y, 6, 14);
    }

    // panel kaca
    const gx1 = 0, gx2 = 1080, rail = 330;
    ctx.beginPath();
    ctx.moveTo(gx1, ys(gx1) - 18);
    ctx.lineTo(gx2, ys(gx2) - 18);
    ctx.lineTo(gx2, ys(gx2) - rail + 14);
    ctx.lineTo(gx1, ys(gx1) - rail + 14);
    ctx.closePath();
    g = ctx.createLinearGradient(0, 600, 1080, 1500);
    g.addColorStop(0, 'rgba(170,215,255,0.20)');
    g.addColorStop(0.5, 'rgba(170,215,255,0.07)');
    g.addColorStop(1, 'rgba(170,215,255,0.18)');
    ctx.fillStyle = g;
    ctx.fill();

    // pemegang tangan (rel)
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#10141b';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(gx1 - 40, ys(gx1 - 40) - rail);
    ctx.lineTo(gx2 + 40, ys(gx2 + 40) - rail);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx1 - 40, ys(gx1 - 40) - rail - 8);
    ctx.lineTo(gx2 + 40, ys(gx2 + 40) - rail - 8);
    ctx.stroke();
    // tanda alur bergerak pada rel
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'butt';
    for (let i = -2; i < 15; i++) {
      const x = (i + f) * TW, y = ys(x) - rail;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 11);
      ctx.lineTo(x + 4, y - 11);
      ctx.stroke();
    }

    // tiang sokong
    ctx.fillStyle = '#9aa5b3';
    for (let k = 0; k < 4; k++) {
      const x = 90 + k * 300;
      ctx.fillRect(x, ys(x) - rail + 12, 12, rail - 30);
    }

    // vinyet
    let vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
};
