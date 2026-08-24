(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];
  const finePointer = matchMedia('(pointer:fine)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // Header + progress + scroll velocity
  const header = $('.site-header');
  const progress = $('.scroll-progress span');
  const onScroll = () => {
    header?.classList.toggle('scrolled', scrollY > 25);
    if(progress){
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progress.style.transform = `scaleX(${clamp(scrollY / max, 0, 1)})`;
    }
  };
  onScroll();
  addEventListener('scroll', onScroll, {passive:true});

  // Mobile menu
  const toggle = $('.mobile-toggle');
  const panel = $('.mobile-panel');
  toggle?.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('.mobile-panel a').forEach(a => a.addEventListener('click', () => {
    panel?.classList.remove('open');
    document.body.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));


  // Client cards on touch devices: first tap reveals the back, second tap opens the client link.
  // Desktop hover behavior is intentionally left unchanged.
  const touchClientCards = $$('.collab-card[href]');
  const touchClientMode = matchMedia('(hover:none), (pointer:coarse)').matches;
  if(touchClientMode && touchClientCards.length){
    const closeClientCards = except => {
      touchClientCards.forEach(card => {
        if(card !== except){
          card.classList.remove('touch-open');
          card.setAttribute('aria-expanded', 'false');
        }
      });
    };

    touchClientCards.forEach(card => {
      card.setAttribute('aria-expanded', 'false');
      card.addEventListener('click', event => {
        if(!card.classList.contains('touch-open')){
          event.preventDefault();
          closeClientCards(card);
          card.classList.add('touch-open');
          card.setAttribute('aria-expanded', 'true');
        }
        // If already open, do not preventDefault: the second tap follows the href normally.
      });
    });

    document.addEventListener('click', event => {
      if(!event.target.closest('.collab-card')) closeClientCards();
    });

    document.addEventListener('keydown', event => {
      if(event.key === 'Escape') closeClientCards();
    });
  }

  // Reveals
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold:.1, rootMargin:'0px 0px -4% 0px'});
  $$('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 45}ms`;
    observer.observe(el);
  });

  // Counters
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target;
      const end = Number(el.dataset.count || 0);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1150;
      const start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(end * eased).toLocaleString('fr-FR') + suffix;
        if(p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObs.unobserve(el);
    });
  }, {threshold:.55});
  $$('[data-count]').forEach(el => counterObs.observe(el));

  // Mouse spotlight in dark / signal sections
  if(finePointer && !reducedMotion){
    $$('[data-spotlight]').forEach(section => {
      const glow = $('.mouse-glow', section);
      if(!glow) return;
      section.addEventListener('pointermove', e => {
        const r = section.getBoundingClientRect();
        section.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        section.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      });
    });
  }

  // Hero depth follows pointer
  if(finePointer && !reducedMotion){
    const hero = $('.hero');
    const heroCards = $$('.hero-card');
    hero?.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) - .5;
      const ny = ((e.clientY - r.top) / r.height) - .5;
      heroCards.forEach(card => {
        const depth = Number(card.dataset.depth || 20);
        card.style.setProperty('--px', `${nx * depth}px`);
        card.style.setProperty('--py', `${ny * depth}px`);
      });
    });
    hero?.addEventListener('pointerleave', () => heroCards.forEach(card => {
      card.style.setProperty('--px','0px');
      card.style.setProperty('--py','0px');
    }));
  }



  // Hero cards hover prominence
  if(finePointer){
    const heroCards = $$('.hero-card');
    heroCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        heroCards.forEach(c => c.classList.remove('is-hovered'));
        card.classList.add('is-hovered');
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('is-hovered');
      });
    });
  }

  // 3D tilt cards
  if(finePointer && !reducedMotion){
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const ry = (px - .5) * 7;
        const rx = (.5 - py) * 6;
        card.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  // Interactive media tilt for web / DA / photo cards
  if(finePointer && !reducedMotion){
    $$('.tilt-media-card').forEach(card => {
      const media = card.querySelector('.beyond-media');
      if(!media) return;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const ry = (px - .5) * 10;
        const rx = (.5 - py) * 8;
        media.style.setProperty('--tilt-rx', `${rx.toFixed(2)}deg`);
        media.style.setProperty('--tilt-ry', `${ry.toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        media.style.setProperty('--tilt-rx', '0deg');
        media.style.setProperty('--tilt-ry', '0deg');
      });
    });
  }

  // Magnetic links/buttons
  if(finePointer && !reducedMotion){
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const strength = Number(el.dataset.magneticStrength || 8);
        const x = ((e.clientX - r.left) / r.width - .5) * strength;
        const y = ((e.clientY - r.top) / r.height - .5) * strength;
        el.style.transform = `translate3d(${x}px,${y}px,0)`;
      });
      el.addEventListener('pointerleave', () => el.style.transform = 'translate3d(0,0,0)');
    });
  }

  // Hover video for merch card
  if(finePointer){
    $$('.hover-video-card').forEach(card => {
      const video = $('video.hover-video', card);
      if(!video) return;
      const start = () => {
        card.classList.add('is-playing');
        const playPromise = video.play();
        if(playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
      };
      const stop = () => {
        card.classList.remove('is-playing');
        video.pause();
      };
      card.addEventListener('mouseenter', start);
      card.addEventListener('mouseleave', stop);
    });
  }

  // Website card: keep the static mockup by default, then reveal a smooth scrolling site loop on hover
  if(finePointer && !reducedMotion){
    $$('.web-loop-card').forEach(card => {
      const frame = $('.web-loop-frame', card);
      const stage = $('.web-loop-stage', card);
      const screens = $$('.web-loop-screen', card);
      if(!frame || !stage || !screens.length) return;
      let index = 0;
      let timer = null;
      let playing = false;

      const resetImage = (img) => {
        img.style.transition = 'none';
        img.style.transform = 'translateX(-50%) translateY(0px) scale(1.08)';
      };

      const animateImage = (img) => {
        resetImage(img);
        requestAnimationFrame(() => {
          const maxOffset = Math.max(0, img.scrollHeight - frame.clientHeight);
          const scale = maxOffset > 0 ? 1.03 : 1.1;
          void img.offsetHeight;
          img.style.transition = `transform ${maxOffset > 0 ? 4.9 : 5.2}s cubic-bezier(.22,.61,.36,1)`;
          img.style.transform = `translateX(-50%) translateY(-${maxOffset}px) scale(${scale})`;
        });
      };

      const showSlide = (targetIndex) => {
        index = targetIndex;
        screens.forEach((screen, screenIndex) => {
          const img = $('img', screen);
          const active = screenIndex === targetIndex;
          screen.classList.toggle('active', active);
          if(img && !active) resetImage(img);
        });
        const activeImg = $('img', screens[targetIndex]);
        if(activeImg) animateImage(activeImg);
      };

      const queueNext = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          index = (index + 1) % screens.length;
          if(playing) {
            showSlide(index);
            queueNext();
          }
        }, 5300);
      };

      const startLoop = () => {
        if(playing) return;
        playing = true;
        card.classList.add('is-playing');
        showSlide(index);
        queueNext();
      };

      const stopLoop = () => {
        playing = false;
        clearTimeout(timer);
        timer = null;
        card.classList.remove('is-playing');
        screens.forEach(screen => {
          const img = $('img', screen);
          screen.classList.remove('active');
          if(img) resetImage(img);
        });
        screens[0].classList.add('active');
        index = 0;
      };

      card.addEventListener('mouseenter', startLoop);
      card.addEventListener('mouseleave', stopLoop);
    });
  }

  // Home cards that route directly to the matching portfolio view
  $$('[data-portfolio-href]').forEach(el => {
    const go = e => {
      if(e && e.type === 'click' && e.target.closest('button,a,input,select,textarea,video[controls]')) return;
      const href = el.dataset.portfolioHref;
      if(href) location.href = href;
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); }
    });
  });

  // Services floating preview
  const preview = $('.service-preview');
  const previewImg = preview?.querySelector('img');
  $$('.service-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      if(previewImg && finePointer){
        previewImg.src = row.dataset.image;
        preview?.classList.add('show');
      }
    });
    row.addEventListener('mouseleave', () => preview?.classList.remove('show'));
    row.addEventListener('mousemove', e => {
      if(!preview || !finePointer) return;
      const x = Math.min(innerWidth - 300, e.clientX + 28);
      const y = Math.min(innerHeight - 210, e.clientY - 80);
      preview.style.left = `${Math.max(12,x)}px`;
      preview.style.top = `${Math.max(80,y)}px`;
    });
  });

  // Smooth cursor + contextual labels
  const cursor = $('.cursor');
  const cursorText = cursor?.querySelector('span');
  if(cursor && finePointer){
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    const loop = () => {
      cx += (tx - cx) * .18;
      cy += (ty - cy) * .18;
      cursor.style.left = `${cx}px`;
      cursor.style.top = `${cy}px`;
      requestAnimationFrame(loop);
    };
    loop();

    $$('a,button,.project-card,.service-row,[data-tilt]').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('big'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
    });
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        if(cursorText) cursorText.textContent = el.dataset.cursor || '';
        cursor.classList.add('label');
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('label');
        if(cursorText) cursorText.textContent = '';
      });
    });
    addEventListener('mouseleave', () => cursor.classList.add('hidden'));
    addEventListener('mouseenter', () => cursor.classList.remove('hidden'));
  }

  // Scroll parallax: card crops, photography rail, giant type
  const parallaxImages = $$('img[data-parallax-img]');
  const photoStory = $('.photo-story');
  const photoRail = $('.photo-rail');
  const photoPanels = $$('[data-parallax-card]');
  const beyond = $('.beyond-section');
  const beyondGiant = $('.beyond-giant');
  let raf = 0;
  const updateParallax = () => {
    raf = 0;
    if(reducedMotion) return;
    const vh = innerHeight;
    parallaxImages.forEach(img => {
      const r = img.closest('.work-card,.beyond-card,.proof-image')?.getBoundingClientRect();
      if(!r || r.bottom < -100 || r.top > vh + 100) return;
      const center = r.top + r.height / 2;
      const delta = (center - vh / 2) / vh;
      img.style.setProperty('--img-y', `${clamp(-delta * 28, -22, 22)}px`);
    });

    if(photoStory && photoRail && innerWidth > 720){
      const r = photoStory.getBoundingClientRect();
      const progress = clamp((vh - r.top) / (r.height + vh), 0, 1);
      photoRail.style.setProperty('--rail-x', `${(0.5 - progress) * 170}px`);
      photoPanels.forEach((panel,i) => {
        const amp = 22 + i * 7;
        panel.style.setProperty('--photo-y', `${(0.5 - progress) * amp}px`);
      });
    }
    if(beyond && beyondGiant){
      const r = beyond.getBoundingClientRect();
      const progress = clamp((vh - r.top) / (r.height + vh), 0, 1);
      beyondGiant.style.setProperty('--giant-x', `${(progress - .5) * -110}px`);
    }
  };
  const requestParallax = () => {
    if(raf) return;
    raf = requestAnimationFrame(updateParallax);
  };
  updateParallax();
  addEventListener('scroll', requestParallax, {passive:true});
  addEventListener('resize', requestParallax, {passive:true});

  // Photo card carousel
  const photoCarousel = $('[data-photo-carousel]');
  if(photoCarousel){
    const slides = $$('.photo-slide', photoCarousel);
    const prevBtn = $('.photo-carousel-btn.prev', photoCarousel);
    const nextBtn = $('.photo-carousel-btn.next', photoCarousel);
    const count = $('.photo-carousel-count', photoCarousel);
    let current = slides.findIndex(slide => slide.classList.contains('active'));
    if(current < 0) current = 0;

    const updatePhotoCarousel = index => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
      if(count) count.textContent = `${String(current + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    };

    prevBtn?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      updatePhotoCarousel(current - 1);
    });
    nextBtn?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      updatePhotoCarousel(current + 1);
    });

    photoCarousel.addEventListener('keydown', e => {
      if(e.key === 'ArrowLeft') updatePhotoCarousel(current - 1);
      if(e.key === 'ArrowRight') updatePhotoCarousel(current + 1);
    });

    updatePhotoCarousel(current);
  }

  // Portfolio filters
  const filterButtons = $$('.filter-btn');
  const projects = $$('.project-card[data-category]');
  filterButtons.forEach(btn => btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    projects.forEach(card => {
      const show = filter === 'all' || card.dataset.category.split(' ').includes(filter);
      card.classList.toggle('hidden', !show);
    });
  }));

  // If the homepage links directly to photography, show it immediately
  if(location.hash === '#photographie'){
    const photoFilter = $('.filter-btn[data-filter="photo"]');
    if(photoFilter) setTimeout(() => photoFilter.click(), 80);
  }

  // Portfolio modal
  const modal = $('.project-modal');
  const modalImage = $('.modal-media img');
  const modalTitle = $('.modal-side h2');
  const modalText = $('.modal-side p');
  const modalLink = $('.modal-link');
  const closeModal = () => {
    modal?.classList.remove('open');
    document.body.style.overflow = '';
  };
  projects.forEach(card => card.addEventListener('click', e => {
    if(e.target.closest('a')) return;
    if(!modal) return;
    modalImage.src = card.dataset.image || card.querySelector('img').src;
    modalImage.alt = card.dataset.title || '';
    modalTitle.textContent = card.dataset.title || card.querySelector('h3')?.textContent || 'Projet';
    modalText.textContent = card.dataset.description || '';
    if(card.dataset.link){
      modalLink.href = card.dataset.link;
      modalLink.style.display = 'inline-flex';
    } else {
      modalLink.style.display = 'none';
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }));
  $('.modal-close')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if(e.target === modal) closeModal(); });
  addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  // About journey — vertical line fills as the timeline enters the viewport
  const journey = $('[data-journey]');
  const journeyBoard = journey?.querySelector('.journey-board');
  if(journey && journeyBoard){
    let journeyRaf = 0;
    const updateJourney = () => {
      journeyRaf = 0;
      const r = journeyBoard.getBoundingClientRect();
      const start = innerHeight * .72;
      const end = innerHeight * .24;
      const distance = Math.max(1, r.height + start - end);
      const progress = clamp((start - r.top) / distance, 0, 1);
      journeyBoard.style.setProperty('--journey-progress', progress.toFixed(4));
    };
    const requestJourney = () => {
      if(journeyRaf) return;
      journeyRaf = requestAnimationFrame(updateJourney);
    };
    updateJourney();
    addEventListener('scroll', requestJourney, {passive:true});
    addEventListener('resize', requestJourney, {passive:true});
  }

  // Contact form -> Gmail web compose by default, with mailto fallback
  const form = $('#contact-form');
  const status = $('.form-status');
  const mailClientSubmit = $('#mail-client-submit');
  if(form){
    const getMailData = () => {
      if(!form.reportValidity()) return null;
      const fd = new FormData(form);
      const email = window.KAISSA_CONFIG?.email || '';
      if(!email || email.includes('example.com')){
        if(status) status.textContent = "Ajoute ton e-mail dans assets/js/config.js pour activer l’envoi.";
        return null;
      }
      const subject = `Demande de projet - ${fd.get('name') || 'Nouveau client'}`;
      const body = `Nom / entreprise : ${fd.get('name')}\nE-mail : ${fd.get('email')}\nProjet : ${fd.get('type')}\nBudget : ${fd.get('budget')}\n\nBrief :\n${fd.get('message')}`;
      return { email, subject, body };
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = getMailData();
      if(!data) return;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.email)}&su=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
      const gmailWindow = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      if(gmailWindow) gmailWindow.opener = null;
      if(status) status.textContent = 'Gmail s’ouvre dans un nouvel onglet avec le message déjà préparé.';
    });

    mailClientSubmit?.addEventListener('click', () => {
      const data = getMailData();
      if(!data) return;
      location.href = `mailto:${data.email}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
      if(status) status.textContent = 'Ouverture de la messagerie configurée sur ton appareil…';
    });
  }

  // Discord handle: copy on click (Discord usernames do not have a stable public DM URL without a user ID)
  $$('[data-copy-discord]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const handle = btn.dataset.copyDiscord || '@kaissa_psd';
      const label = $('.copy-label', btn);
      try {
        await navigator.clipboard.writeText(handle);
        if(label) label.textContent = 'Copié ✓';
      } catch(err) {
        const input = document.createElement('input');
        input.value = handle;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        if(label) label.textContent = 'Copié ✓';
      }
      setTimeout(() => { if(label) label.textContent = 'Copier'; }, 1800);
    });
  });

  // Dynamic config links
  $$('[data-config-link]').forEach(el => {
    const key = el.dataset.configLink;
    const val = window.KAISSA_CONFIG?.[key];
    if(val) el.href = val;
  });
})();
