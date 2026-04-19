/**
 * 生火链共用：30° 等距（π/6）。与 CampSelectScene 的 2:1 近似不同，生火链内统一用此配置。
 * 依赖全局 Phaser（由 index 先于模块加载）。
 */
export const FireIso = {
  createConfig(gw, gh) {
    return {
      isoAnchorX: gw / 2,
      isoAnchorY: gh / 4,
      isoScale: 26,
      isoCos: Math.cos(Math.PI / 6),
      isoSin: Math.sin(Math.PI / 6),
    };
  },
  cartesianToIso(c, gx, gy) {
    let ggx = Number(gx);
    let ggy = Number(gy);
    if (!Number.isFinite(ggx)) ggx = 0;
    if (!Number.isFinite(ggy)) ggy = 0;
    const k = c.isoScale * c.isoCos;
    const m = c.isoScale * c.isoSin;
    const x = c.isoAnchorX + (ggx - ggy) * k;
    const y = c.isoAnchorY + (ggx + ggy) * m;
    return {
      x: Number.isFinite(x) ? x : c.isoAnchorX,
      y: Number.isFinite(y) ? y : c.isoAnchorY,
    };
  },
  isoToCartesian(c, sx, sy) {
    let sx_ = Number(sx);
    let sy_ = Number(sy);
    if (!Number.isFinite(sx_)) sx_ = c.isoAnchorX;
    if (!Number.isFinite(sy_)) sy_ = c.isoAnchorY;
    const k = c.isoScale * c.isoCos;
    const m = c.isoScale * c.isoSin;
    const rx = (sx_ - c.isoAnchorX) / k;
    const ry = (sy_ - c.isoAnchorY) / m;
    const outX = (rx + ry) / 2;
    const outY = (ry - rx) / 2;
    return {
      x: Number.isFinite(outX) ? outX : 0,
      y: Number.isFinite(outY) ? outY : 0,
    };
  },
  setDepthFromY(go) {
    if (go && typeof go.setDepth === 'function') {
      go.setDepth(go.y);
    }
  },
  drawGround(scene, c) {
    const g = scene.add.graphics().setDepth(-100);
    const ox = c.isoAnchorX;
    const oy = c.isoAnchorY + 85;
    const poly = new Phaser.Geom.Polygon([
      ox,
      oy - 200,
      ox + 340,
      oy + 20,
      ox,
      oy + 240,
      ox - 340,
      oy + 20,
    ]);
    const pts = poly.points;
    g.fillStyle(0x1e4a28, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x0f2a16, 0.55);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.closePath();
    g.strokePath();

    g.lineStyle(1, 0x2a6a38, 0.28);
    for (let i = -9; i <= 9; i++) {
      const a = FireIso.cartesianToIso(c, i, -9);
      const b = FireIso.cartesianToIso(c, i, 9);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
    for (let j = -9; j <= 9; j++) {
      const a = FireIso.cartesianToIso(c, -9, j);
      const b = FireIso.cartesianToIso(c, 9, j);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
  },
};
