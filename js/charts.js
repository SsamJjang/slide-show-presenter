/* ============================================================
   Charts — hand-rolled SVG. No chart library.

   Presentation charts have different rules than dashboard charts:
   fewer gridlines, bigger type, no chartjunk, and the numbers on
   the marks instead of on an axis the back row can't read.
   ============================================================ */

const Charts = (() => {

  const PALETTE = ['var(--fill-accent)', 'var(--fill-accent2)', 'var(--fill-muted)', 'var(--fill-ink)'];
  const VB_W = 1000, VB_H = 560;

  const niceMax = (v) => {
    if (v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil(v / mag * 2) / 2 * mag;
  };

  function frame(el, inner, { xLabels = [], max = 0, pad = {} } = {}) {
    const p = Object.assign({ l: 60, r: 30, t: 30, b: 70 }, pad);
    const gw = VB_W - p.l - p.r, gh = VB_H - p.t - p.b;

    let grid = '';
    if (el.showGrid && max) {
      for (let i = 0; i <= 4; i++) {
        const y = p.t + gh - (gh * i / 4);
        grid += `<line class="ch-grid" x1="${p.l}" y1="${y}" x2="${p.l + gw}" y2="${y}"/>`;
        grid += `<text class="ch-axis" x="${p.l - 14}" y="${y + 8}" text-anchor="end">${
          Math.round(max * i / 4)}</text>`;
      }
    }
    const ticks = xLabels.map((lb, i) => {
      const x = p.l + (gw / xLabels.length) * (i + .5);
      return `<text class="ch-axis" x="${x}" y="${p.t + gh + 42}" text-anchor="middle">${Render.esc(lb)}</text>`;
    }).join('');

    return `<svg class="e-chart" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet">
      ${grid}${inner}${ticks}</svg>`;
  }

  function bar(el) {
    const p = { l: 60, r: 30, t: 30, b: 70 };
    const gw = VB_W - p.l - p.r, gh = VB_H - p.t - p.b;
    const series = el.series;
    const max = niceMax(Math.max(...series.flatMap(s => s.data)));
    const slot = gw / el.labels.length;
    const bw = Math.min(slot * .62 / series.length, 90);

    let out = '';
    el.labels.forEach((_, i) => {
      series.forEach((s, si) => {
        const v = s.data[i] ?? 0;
        const h = (v / max) * gh;
        const x = p.l + slot * i + slot / 2 - (bw * series.length) / 2 + bw * si;
        const y = p.t + gh - h;
        out += `<rect class="ch-bar" x="${x}" y="${y}" width="${bw - 6}" height="${Math.max(h, 2)}"
          rx="6" fill="${PALETTE[si % PALETTE.length]}"/>`;
        if (el.showValues) {
          out += `<text class="ch-val" x="${x + (bw - 6) / 2}" y="${y - 14}" text-anchor="middle">${v}</text>`;
        }
      });
    });
    return frame(el, out, { xLabels: el.labels, max, pad: p });
  }

  function lineish(el, filled) {
    const p = { l: 60, r: 30, t: 30, b: 70 };
    const gw = VB_W - p.l - p.r, gh = VB_H - p.t - p.b;
    const max = niceMax(Math.max(...el.series.flatMap(s => s.data)));
    const step = gw / Math.max(el.labels.length - 1, 1);

    let out = '';
    el.series.forEach((s, si) => {
      const pts = s.data.map((v, i) => [p.l + step * i, p.t + gh - (v / max) * gh]);
      const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0]} ${pt[1]}`).join(' ');
      const color = PALETTE[si % PALETTE.length];

      if (filled) {
        out += `<path d="${d} L${pts.at(-1)[0]} ${p.t + gh} L${pts[0][0]} ${p.t + gh} Z"
          fill="${color}" opacity=".16"/>`;
      }
      out += `<path class="ch-line" d="${d}" stroke="${color}"/>`;
      pts.forEach((pt, i) => {
        out += `<circle class="ch-dot" cx="${pt[0]}" cy="${pt[1]}" r="9" fill="${color}"/>`;
        if (el.showValues) {
          out += `<text class="ch-val" x="${pt[0]}" y="${pt[1] - 22}" text-anchor="middle">${s.data[i]}</text>`;
        }
      });
    });
    return frame(el, out, { xLabels: el.labels, max, pad: p });
  }

  function donut(el) {
    const data = el.series[0].data;
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const cx = VB_W / 2, cy = VB_H / 2, r = 190, thick = 62;
    let angle = -Math.PI / 2, out = '';

    data.forEach((v, i) => {
      const sweep = (v / total) * Math.PI * 2;
      const end = angle + sweep;
      const large = sweep > Math.PI ? 1 : 0;
      const pt = (a, rad) => `${cx + Math.cos(a) * rad} ${cy + Math.sin(a) * rad}`;
      out += `<path d="M${pt(angle, r)} A${r} ${r} 0 ${large} 1 ${pt(end, r)}
        L${pt(end, r - thick)} A${r - thick} ${r - thick} 0 ${large} 0 ${pt(angle, r - thick)} Z"
        fill="${PALETTE[i % PALETTE.length]}"/>`;

      if (el.showValues) {
        const mid = angle + sweep / 2;
        out += `<text class="ch-val" x="${cx + Math.cos(mid) * (r + 46)}"
          y="${cy + Math.sin(mid) * (r + 46) + 10}" text-anchor="middle">${
          Math.round(v / total * 100)}%</text>`;
      }
      angle = end;
    });

    return `<svg class="e-chart" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet">${out}</svg>`;
  }

  function render(el) {
    try {
      switch (el.kind) {
        case 'line':  return lineish(el, false);
        case 'area':  return lineish(el, true);
        case 'donut': return donut(el);
        default:      return bar(el);
      }
    } catch (err) {
      return `<div class="e-chart error">Chart data is malformed</div>`;
    }
  }

  return { render, PALETTE };
})();
