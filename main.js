(() => {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const video = hero.querySelector('.logo-video');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Logo: play once, freeze on the last frame ---------- */

  let revealed = false;
  let ended = false;

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    hero.classList.add('is-revealed');
  };

  const usePoster = () => {
    hero.classList.add('use-poster');
    video.pause();
    reveal();
  };

  if (reduceMotion) {
    video.removeAttribute('autoplay');
    video.preload = 'none';
    usePoster();
  } else {
    // Copy fades in once the logo animation is ~70% done.
    video.addEventListener('timeupdate', () => {
      if (video.duration && video.currentTime >= video.duration * 0.7) reveal();
    });
    video.addEventListener('ended', () => {
      ended = true;
      // The element keeps showing its final frame once playback ends; pin it there.
      video.pause();
      reveal();
    });
    const lastSource = video.querySelector('source:last-of-type');
    lastSource.addEventListener('error', usePoster);

    const attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(usePoster);

    // Safety net if playback stalls on a slow connection.
    setTimeout(reveal, 4500);
  }

  /* ---------- Pause the hero when it's off-screen ---------- */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting;
      hero.classList.toggle('is-offscreen', !visible);
      if (hero.classList.contains('use-poster') || ended) return;
      if (visible) video.play().catch(() => {});
      else video.pause();
    }).observe(hero);
  }

  /* ---------- Fallback when scroll-driven animations aren't supported ---------- */

  const supportsTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');

  if (!supportsTimeline && !reduceMotion) {
    root.classList.add('no-sda');

    const targets = document.querySelectorAll('.rise, .card, .band-inner');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      }, { rootMargin: '0px 0px -12% 0px' });
      targets.forEach((el) => io.observe(el));
    } else {
      targets.forEach((el) => el.classList.add('in-view'));
    }

    const bar = document.querySelector('.progress');
    let ticking = false;
    const update = () => {
      const max = root.scrollHeight - innerHeight;
      bar.style.scale = `${max > 0 ? scrollY / max : 0} 1`;
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Service sheets: pricing on demand ---------- */

  const closeSheet = (dialog) => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (reduceMotion) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    dialog.addEventListener('animationend', () => {
      dialog.classList.remove('is-closing');
      dialog.close();
    }, { once: true });
  };

  document.querySelectorAll('dialog.sheet').forEach((dialog) => {
    const cta = dialog.querySelector('[data-cta]');
    const ctaLabel = dialog.querySelector('[data-cta-label]');

    dialog.addEventListener('change', (e) => {
      const input = e.target;
      if (input.type !== 'radio') return;
      cta.href = input.dataset.wa;
      if (input.dataset.label) ctaLabel.textContent = input.dataset.label;
      dialog.querySelectorAll('[data-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== input.value;
      });
    });

    dialog.querySelector('[data-close]').addEventListener('click', () => closeSheet(dialog));
    // Click on the backdrop (the dialog box itself, outside its content) closes it.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) closeSheet(dialog); });
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(dialog); });
    dialog.addEventListener('close', () => root.classList.remove('sheet-open'));
  });

  document.querySelectorAll('[data-sheet]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.dataset.sheet);
    if (!dialog || typeof dialog.showModal !== 'function') return; // falls back to the WhatsApp link
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      dialog.showModal();
      root.classList.add('sheet-open');
      dialog.querySelector('.sheet-scroll').scrollTop = 0;
    });
  });

  /* ---------- A small tap on WhatsApp links ---------- */

  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="https://wa.me/"]')) navigator.vibrate?.(12);
  });
})();
