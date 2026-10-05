(() => {
  const column = document.querySelector('.column');
  const slider = document.getElementById('slider');
  const pages = [...slider.querySelectorAll('.page')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 見出し：語ごとに色を変え、1語ずつ跳ねて現れる（文字そのものは変えない）
  document.querySelectorAll('[data-words]').forEach((el) => {
    const text = el.textContent;
    const words = el.dataset.words.split('|');
    if (words.join('') !== text) return; // 区切りが文言と一致しないときは何もしない
    el.setAttribute('aria-label', text);
    el.textContent = '';
    words.forEach((w, k) => {
      const s = document.createElement('span');
      s.className = 'w w--' + (k % 3);
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--c', k);
      s.textContent = w;
      el.appendChild(s);
    });
  });

  // 本文：行ごとに順番に現れる
  pages.forEach((pg) => pg.querySelectorAll('.ln').forEach((el, i) => el.style.setProperty('--i', i)));

  // 次のページへ：手描きの枠のボタン（英字の飾り＋次のページ名）
  const content = pages.filter((p) => p.id !== 'top');
  content.forEach((pg) => {
    const next = pages[pages.indexOf(pg) + 1];
    if (!next) return;
    const a = document.createElement('a');
    a.className = 'nextbtn';
    a.href = '#' + next.id;
    a.setAttribute('aria-label', '次のページへ進む');
    a.innerHTML = '<span aria-hidden="true"><small>Next</small>' + next.dataset.stop + '</span><i aria-hidden="true">→</i>';
    a.addEventListener('click', (e) => { e.preventDefault(); next.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    pg.querySelector('.page__inner').appendChild(a);
  });

  const onActive = () => {
    const pg = pages.find((p) => p.classList.contains('is-active')) || pages[0];
    column.dataset.page = pg.id;
  };

  // ロード画面：バスが海沿いの道を走り、到着したら開く（最短1.4秒・最長6秒）
  const loader = document.querySelector('.loader');
  if (loader) {
    const lbus = loader.querySelector('.loader__bus');
    const t0 = performance.now();
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
