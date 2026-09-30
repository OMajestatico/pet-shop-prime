(() => {
  const menuButton = document.getElementById('menuButton');
  const menuClose = document.getElementById('menuClose');
  const menuOverlay = document.getElementById('menuOverlay');
  const topbar = document.getElementById('topbar');
  let savedScrollY = 0;

  const openMenu = () => {
    savedScrollY = window.scrollY;
    menuOverlay.classList.add('active');
    menuOverlay.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  };

  const closeMenu = () => {
    if (!menuOverlay.classList.contains('active')) return;
    menuOverlay.classList.remove('active');
    menuOverlay.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    // Alguns browsers mobile adoram "ajudar" mexendo no scroll. A gente desfaz isso sem animação.
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo({ top: savedScrollY, left: 0, behavior: 'auto' });
    requestAnimationFrame(() => { html.style.scrollBehavior = previous; });
  };

  menuButton.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menuOverlay.addEventListener('click', (e) => { if (e.target === menuOverlay) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  menuOverlay.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + savedScrollY - 78;
      menuOverlay.classList.remove('active');
      menuOverlay.setAttribute('aria-hidden', 'true');
      menuButton.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'smooth' }));
    });
  });

  window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 30), { passive: true });

  if (window.lucide) lucide.createIcons();

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -30px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  const setupCarousel = track => {
    const id = track.id;
    const slides = [...track.children];
    if (!slides.length) return;
    const dotsWrap = document.querySelector(`[data-dots-for="${id}"]`);

    const targetLeft = slide => slide.offsetLeft - track.offsetLeft;
    const goTo = i => {
      const slide = slides[Math.max(0, Math.min(slides.length - 1, i))];
      if (!slide) return;
      track.scrollTo({ left: targetLeft(slide), behavior: 'smooth' });
    };

    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('i');
        if (i === 0) dot.classList.add('active');
        dotsWrap.appendChild(dot);
      });
    }

    const dots = dotsWrap ? [...dotsWrap.children] : [];
    let active = 0;
    let raf = 0;

    const nearest = () => {
      const left = track.scrollLeft;
      let best = 0;
      let dist = Infinity;
      slides.forEach((slide, i) => {
        const d = Math.abs(targetLeft(slide) - left);
        if (d < dist) { dist = d; best = i; }
      });
      if (best !== active) {
        dots[active]?.classList.remove('active');
        active = best;
        dots[active]?.classList.add('active');
      }
    };

    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(nearest);
    }, { passive: true });

    document.querySelector(`[data-carousel-prev="${id}"]`)?.addEventListener('click', () => goTo(active - 1));
    document.querySelector(`[data-carousel-next="${id}"]`)?.addEventListener('click', () => goTo(active + 1));

    // No touch handlers here: mobile browser owns the gesture, so vertical scroll stays natural.
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId = null;

    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add('dragging');
      track.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });

    track.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId) return;
      track.scrollLeft = startScroll - (e.clientX - startX);
    });

    const stopDrag = e => {
      if (!dragging) return;
      if (e?.pointerId != null && pointerId != null && e.pointerId !== pointerId) return;
      dragging = false;
      track.classList.remove('dragging');
      if (pointerId != null && track.hasPointerCapture?.(pointerId)) track.releasePointerCapture(pointerId);
      pointerId = null;
      nearest();
      goTo(active);
    };

    track.addEventListener('pointerup', stopDrag);
    track.addEventListener('pointercancel', stopDrag);
    track.addEventListener('dragstart', e => e.preventDefault());
  };

  document.querySelectorAll('.snap-track').forEach(setupCarousel);

  const enableMouseDrag = track => {
    let dragging = false, startX = 0, startScroll = 0, pointerId = null;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; pointerId = e.pointerId; startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add('dragging'); track.setPointerCapture?.(e.pointerId); e.preventDefault();
    });
    track.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId) return;
      track.scrollLeft = startScroll - (e.clientX - startX);
    });
    const stop = e => {
      if (!dragging) return;
      dragging = false; track.classList.remove('dragging');
      if (pointerId != null && track.hasPointerCapture?.(pointerId)) track.releasePointerCapture(pointerId);
      pointerId = null;
    };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
    track.addEventListener('dragstart', e => e.preventDefault());
  };

  const reviewTrack = document.getElementById('reviewTrack');
  enableMouseDrag(reviewTrack);
  const reviewCards = [...reviewTrack.children];
  const reviewDots = document.getElementById('reviewDots');
  reviewCards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ir para avaliação ${i + 1}`);
    dot.addEventListener('click', () => reviewCards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }));
    reviewDots.appendChild(dot);
  });
  const dots = [...reviewDots.children];
  const updateDots = () => {
    const centers = reviewCards.map(c => Math.abs(c.offsetLeft - reviewTrack.scrollLeft));
    const active = centers.indexOf(Math.min(...centers));
    dots.forEach((d, i) => d.classList.toggle('active', i === active));
  };
  reviewTrack.addEventListener('scroll', updateDots, { passive: true });
  updateDots();

  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => card.style.transform = '');
    });
  }
})();
