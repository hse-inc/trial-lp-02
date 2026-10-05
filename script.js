(() => {
  const slider = document.getElementById('slider');
  const column = document.querySelector('.column');
  const pages = [...slider.querySelectorAll('.page')];
  const total = pages.length - 1; // 動画ページを除いた枚数
  const pad = (n) => String(n).padStart(2, '0');

  const pagerNow = document.querySelector('.pager__now');
  const pagerBar = document.querySelector('.pager__bar i');
  const railNow = document.querySelector('.rail-side__now');
  const railName = document.querySelector('.rail-side__name');
  document.querySelector('.pager__all').textContent = pad(total);

  // 出現アニメーションの順番
  pages.forEach((page) => {
    page.querySelectorAll('.rv').forEach((el, i) => el.style.setProperty('--i', i));
  });

  let current = 0;
  const activate = (index) => {
    current = index;
    const page = pages[index];
    pages.forEach((p) => p.classList.toggle('is-active', p === page));
    column.dataset.tone = page.dataset.tone;
    pagerNow.textContent = pad(index);
    pagerBar.style.setProperty('--p', total ? index / total : 0);
    railNow.textContent = pad(index);
    railName.textContent = page.dataset.label;
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) activate(pages.indexOf(e.target));
    });
  }, { root: slider, threshold: 0.6 });
  pages.forEach((p) => io.observe(p));
  activate(0);

  // 読み込み直後や素早い操作で表示がずれないよう、スクロール位置からも現在ページを合わせる
  // 高さが0と測られる瞬間（読み込み直後・画面サイズの切替中）は合わせない
  const indexFromScroll = () => {
    if (!slider.clientHeight) return null;
    return Math.max(0, Math.min(pages.length - 1, Math.round(slider.scrollTop / slider.clientHeight)));
  };
  let syncing = false;
  slider.addEventListener('scroll', () => {
    if (syncing) return;
    syncing = true;
    requestAnimationFrame(() => {
      syncing = false;
      const i = indexFromScroll();
      if (i !== null && i !== current) activate(i);
    });
  }, { passive: true });
  window.addEventListener('load', () => {
    const i = indexFromScroll();
    if (i !== null && i !== current) activate(i);
  });

  const go = (index) => {
    const i = Math.max(0, Math.min(pages.length - 1, index));
    pages[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ホイール・トラックパッドは1回の操作で1ページだけ送る（通常スクロールにしない）
  let locked = false, acc = 0, accTimer = null;
  const canScrollInside = (target, dy) => {
    const box = target.closest && target.closest('.page--scroll');
    if (!box) return false;
    return dy > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 1 : box.scrollTop > 0;
  };
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    if (canScrollInside(e.target, e.deltaY)) return;
    // 横スクロールのカード上での横方向の操作はそのまま通す
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.target.closest && e.target.closest('.route__track')) return;
    e.preventDefault();
    if (locked) return;
    // 小さな動きは足し合わせ、一定量を超えたら1ページ送る
    acc += e.deltaY;
    clearTimeout(accTimer);
    accTimer = setTimeout(() => { acc = 0; }, 220);
    if (Math.abs(acc) < 12) return;
    locked = true;
    go(current + (acc > 0 ? 1 : -1));
    acc = 0;
    setTimeout(() => { locked = false; }, 950);
  }, { passive: false });

  // キーボード操作
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); go(current + 1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current - 1); }
  });

  // ページ内リンク（ロゴ・募集要項・エントリー）
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // チェックリスト
  document.querySelectorAll('.check').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });
})();
