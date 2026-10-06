(() => {
  const slider = document.getElementById('slider');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);

  // ---- 7P 一日の流れ：ページが開くと、バスが停留所を順に進む ----
  const day = document.getElementById('p7');
  if (day) {
    const route = $('.route', day), bus = $('.route__bus', day), stops = [...day.querySelectorAll('.stop')];
    let timers = [];
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const yOf = (li) => {
      const em = parseFloat(getComputedStyle(route).fontSize);
      return $('.stops', route).offsetTop + li.offsetTop + 0.8 * em + 0.45 * em;
    };
    const place = (i) => { bus.style.top = yOf(stops[i]).toFixed(1) + 'px'; };
    const reset = () => {
      clear();
      stops.forEach((s) => s.classList.remove('is-reached'));
      route.classList.remove('is-run');
    };
    const run = () => {
      reset();
      if (reduce) {
        stops.forEach((s) => s.classList.add('is-reached'));
        place(stops.length - 1);
        route.classList.add('is-run');
        return;
      }
      bus.style.transition = 'none';
      place(0);
      void bus.offsetWidth;
      bus.style.transition = '';
      const t0 = 950, move = 440, dwell = 230;
      later(() => { route.classList.add('is-run'); stops[0].classList.add('is-reached'); }, t0);
      for (let i = 1; i < stops.length; i++) {
        const at = t0 + i * (move + dwell);
        later(() => place(i), at - move);
        later(() => stops[i].classList.add('is-reached'), at);
      }
    };
    new MutationObserver(() => {
      if (day.classList.contains('is-active')) run(); else reset();
    }).observe(day, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', () => { if (route.classList.contains('is-run')) { const n = stops.filter((s) => s.classList.contains('is-reached')).length; if (n) { bus.style.transition = 'none'; place(n - 1); void bus.offsetWidth; bus.style.transition = ''; } } });
    if (day.classList.contains('is-active')) run();
  }

  // ---- 10P 募集要項：内側のスクロールは、ページを離れたら先頭へ戻す ----
  document.querySelectorAll('.page--scroll').forEach((pg) => {
    new MutationObserver(() => { if (!pg.classList.contains('is-active')) pg.scrollTop = 0; })
      .observe(pg, { attributes: true, attributeFilter: ['class'] });
  });

  // ---- 11P エントリー：入力中の欄の見出しに色を付ける。送信先は未定のため送らない ----
  const page = document.getElementById('entry');
  const form = page && $('.entry', page);
  if (form) {
    const fields = [...form.querySelectorAll('.entry__f')];
    form.addEventListener('focusin', (e) => {
      const f = e.target.closest && e.target.closest('.entry__f');
      if (!f) return;
      fields.forEach((x) => x.classList.toggle('is-focus', x === f));
    });
    form.addEventListener('focusout', (e) => {
      const f = e.target.closest && e.target.closest('.entry__f');
      if (f && !f.contains(e.relatedTarget)) f.classList.remove('is-focus');
    });

    // 送信先が決まるまでは送らない（押すと案内を出すだけ）
    const msg = $('.entry__msg', form);
    $('.entry__send', form).addEventListener('click', () => {
      const miss = [...form.querySelectorAll('[required]')].filter((el) => !el.value.trim());
      fields.forEach((f) => f.classList.remove('is-miss'));
      miss.forEach((el) => el.closest('.entry__f').classList.add('is-miss'));
      msg.textContent = miss.length ? '必須の項目を入力してください。' : '送信先は準備中です。';
      if (miss.length) miss[0].focus();
    });
    form.addEventListener('submit', (e) => e.preventDefault());
  }
})();
