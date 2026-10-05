(() => {
  const column = document.querySelector('.column');
  const slider = document.getElementById('slider');
  const pages = [...slider.querySelectorAll('.page')];
  const NS = 'http://www.w3.org/2000/svg';
  const pad = (n) => String(n).padStart(2, '0');

  // 見出し：1文字ずつ跳ねて現れる（文字そのものは変えない）
  document.querySelectorAll('[data-chars]').forEach((el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    [...text].forEach((c, k) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--c', k);
      s.textContent = c;
      el.appendChild(s);
    });
  });

  // 本文：行ごとに順番に現れる
  pages.forEach((pg) => pg.querySelectorAll('.ln').forEach((el, i) => el.style.setProperty('--i', i)));

  // 消印（ページ番号）と「次の停留所」
  const content = pages.filter((p) => p.id !== 'top');
  content.forEach((pg, k) => {
    const no = pad(k + 1);
    const pm = document.createElementNS(NS, 'svg');
    pm.setAttribute('class', 'postmark');
    pm.setAttribute('viewBox', '0 0 64 64');
    pm.setAttribute('aria-hidden', 'true');
    pm.innerHTML = '<circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="22"/>'
      + '<text x="32" y="25" font-size="9">IRIOMOTE</text><text x="32" y="43" font-size="17">No.' + no + '</text>'
      + '<path d="M-14 26q6-4 12 0t12 0M-14 34q6-4 12 0t12 0M-14 42q6-4 12 0t12 0"/>';
    pg.appendChild(pm);

    const next = pages[pages.indexOf(pg) + 1];
    if (!next) return;
    const a = document.createElement('a');
    a.className = 'nextstop';
    a.href = '#' + next.id;
    a.setAttribute('aria-label', '次のページへ進む');
    a.innerHTML = '<svg class="nextstop__bus" viewBox="0 0 100 70" aria-hidden="true"><use href="#buschar"/></svg>'
      + '<span aria-hidden="true"><small>Next stop</small>' + next.dataset.stop + '</span>';
    a.addEventListener('click', (e) => { e.preventDefault(); next.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    pg.querySelector('.page__inner').appendChild(a);
  });

  // Z型の道：中身のかたまりのすき間を縫って、右へ左へ折り返す。ページの終点＝次のページの始点の側
  // ページが切り替わるたびに、バスがその道を下へ走る（スクロール量には連動しない）
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tracks = content.map((pg) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'track');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path class="track__road"/><path class="track__dash"/><path class="track__measure" fill="none" stroke="none"/>'
      + '<g class="track__bus"><g class="track__flip"><use href="#buschar" x="-25" y="-30" width="50" height="35"/></g></g>';
    pg.insertBefore(svg, pg.firstChild);
    return { pg, svg, road: svg.querySelector('.track__road'), dash: svg.querySelector('.track__dash'), bus: svg.querySelector('.track__bus'), flip: svg.querySelector('.track__flip'), measure: svg.querySelector('.track__measure'), len: 0, stop: 0, raf: 0 };
  });
  const LANE = 11, R = 18;
  const build = () => {
    let lane = 0;
    tracks.forEach((t) => {
      const inner = t.pg.querySelector('.page__inner');
      const W = t.pg.clientWidth, H = t.pg.clientHeight;
      if (!W || !H) return;
      const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 60;
      const blocks = [...inner.children].filter((el) => !el.classList.contains('nextstop') && el.offsetHeight > 0);
      const gaps = [];
      for (let i = 0; i < blocks.length - 1; i++) {
        const lo = blocks[i].offsetTop + blocks[i].offsetHeight, hi = blocks[i + 1].offsetTop;
        gaps.push(inner.offsetTop + (lo + hi) / 2);
      }
      const xs = [LANE, W - LANE];
      let x = xs[lane];
      let d = `M${x} ${head - 6}`;
      gaps.forEach((g) => {
        const nx = xs[1 - lane], dir = Math.sign(nx - x);
        d += ` V${g - R} Q${x} ${g} ${x + dir * R} ${g} H${nx - dir * R} Q${nx} ${g} ${nx} ${g + R}`;
        x = nx; lane = 1 - lane;
      });
      // 最後のかたまりの下を横切り、反対側から下へ抜ける。バスは横切る道の真ん中で止まる
      const last = blocks[blocks.length - 1];
      const lastBottom = inner.offsetTop + last.offsetTop + last.offsetHeight;
      const ns = inner.querySelector('.nextstop');
      // 札があれば札と同じ高さを横切り、バスは札の左側に止まる（かたまりに触れない）
      const yEnd = ns ? inner.offsetTop + ns.offsetTop + ns.offsetHeight / 2 + 10 : Math.min(lastBottom + 48, H - 30);
      const nx = xs[1 - lane], dir = Math.sign(nx - x);
      const mid = ns ? Math.min(inner.offsetLeft + ns.offsetLeft - 40, W * 0.32) : (x + nx) / 2;
      const dStop = d + ` V${yEnd - R} Q${x} ${yEnd} ${x + dir * R} ${yEnd} H${mid}`;
      d += ` V${yEnd - R} Q${x} ${yEnd} ${x + dir * R} ${yEnd} H${nx - dir * R} Q${nx} ${yEnd} ${nx} ${yEnd + R} V${H}`;
      lane = 1 - lane;
      t.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      t.road.setAttribute('d', d);
      t.dash.setAttribute('d', d);
      t.len = t.road.getTotalLength();
      t.measure.setAttribute('d', dStop);
      t.stop = t.measure.getTotalLength();
      place(t, t.pg.classList.contains('is-active') ? t.stop : 0);
    });
  };
  const place = (t, at) => {
    const p = t.road.getPointAtLength(at);
    const q = t.road.getPointAtLength(Math.min(t.len, at + 2));
    const p0 = t.road.getPointAtLength(Math.max(0, at - 2));
    const dx = q.x - p0.x;
    t.bus.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    if (Math.abs(dx) > 0.5) t.flip.setAttribute('transform', dx < 0 ? 'scale(-1 1)' : '');
  };
  const run = (t) => {
    cancelAnimationFrame(t.raf);
    const end = t.stop;
    if (reduceMotion || !t.len) { place(t, end); return; }
    const t0 = performance.now(), dur = 2600;
    const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const step = (now) => {
      const u = Math.min(1, (now - t0 - 250) / dur);
      place(t, u <= 0 ? 0 : end * ease(u));
      if (u < 1) t.raf = requestAnimationFrame(step);
    };
    t.raf = requestAnimationFrame(step);
  };
  build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  window.addEventListener('resize', build);
  window.addEventListener('load', build);

  let last = null;
  const onActive = () => {
    const pg = pages.find((p) => p.classList.contains('is-active')) || pages[0];
    column.dataset.page = pg.id;
    if (pg === last) return;
    last = pg;
    const t = tracks.find((x) => x.pg === pg);
    tracks.forEach((x) => { if (x !== t) { cancelAnimationFrame(x.raf); place(x, 0); } });
    if (t) run(t);
  };
  // ロード画面：バスが海沿いの道を走り、到着したら開く（最短1.4秒・最長6秒）
  const loader = document.querySelector('.loader');
  if (loader) {
    const lbus = loader.querySelector('.loader__bus');
    const t0 = performance.now();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let loaded = false, done = false, shown = 0;
    const finish = () => {
      if (done) return;
      done = true;
      lbus.style.left = '100%';
      setTimeout(() => { loader.classList.add('is-done'); setTimeout(() => loader.remove(), 700); }, reduce ? 0 : 650);
    };
    const tick = () => {
      if (done) return;
      const t = performance.now() - t0;
      // 読み込み中は9割手前までゆっくり進み、読み込みが終わったら残りを走りきる
      const target = loaded ? 100 : 88 * (1 - Math.exp(-t / 1600));
      shown += (target - shown) * 0.12;
      lbus.style.left = shown.toFixed(2) + '%';
      if ((loaded && t > 1400 && shown > 97) || t > 6000) { finish(); return; }
      requestAnimationFrame(tick);
    };
    window.addEventListener('load', () => { loaded = true; });
    if (document.readyState === 'complete') loaded = true;
    requestAnimationFrame(tick);
    setTimeout(finish, 6500); // 画面が裏に回って描画が止まっても必ず開く
  }

  const mo = new MutationObserver(onActive);
  pages.forEach((p) => mo.observe(p, { attributes: true, attributeFilter: ['class'] }));
  onActive();
})();
