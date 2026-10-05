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

  // 路線図：停留所＝ページ。表示中のページへバスが進む
  const route = document.createElement('div');
  route.className = 'route';
  route.setAttribute('aria-hidden', 'true');
  route.innerHTML = '<i class="route__line"></i>';
  const stops = content.map((pg, k) => {
    const s = document.createElement('i');
    s.className = 'route__stop';
    s.style.left = (content.length > 1 ? (k / (content.length - 1)) * 100 : 0) + '%';
    route.appendChild(s);
    return s;
  });
  const bus = document.createElement('b');
  bus.className = 'route__bus';
  bus.innerHTML = '<svg viewBox="0 0 100 70"><use href="#buschar"/></svg>';
  route.appendChild(bus);
  column.appendChild(route);

  const onActive = () => {
    const pg = pages.find((p) => p.classList.contains('is-active')) || pages[0];
    column.dataset.page = pg.id;
    const k = content.indexOf(pg);
    if (k < 0) return;
    bus.style.left = stops[k].style.left;
    stops.forEach((s, j) => s.classList.toggle('is-past', j <= k));
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
