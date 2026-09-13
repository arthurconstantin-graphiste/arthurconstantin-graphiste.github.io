(() => {
  const data = window.PORTFOLIO_DATA;
  const projectData = window.PORTFOLIO_PROJECTS || {projects:[],counts:{}};
  const photoData = window.PHOTO_DATA || {types:[],places:[],albums:[],counts:{}};
  if (!data) return;

  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];
  const content = $('#pf-content');
  const filterButtons = $$('.pf-filter-btn');
  const clientWrap = $('.pf-client-wrap');
  const clientRail = $('.pf-client-rail');
  const viewTitle = $('.pf-view-title');
  const viewCount = $('.pf-view-count');
  const moreWrap = $('.pf-more-wrap');
  const moreBtn = $('.pf-more');
  const shuffleBtn = $('.pf-shuffle');
  const finePointer = matchMedia('(pointer:fine)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);
  const cursor = $('.cursor');
  const cursorText = cursor?.querySelector('span');

  const initialParams = new URLSearchParams(location.search);
  const requestedFilter = initialParams.get('filter') || ({'#photographie':'photo','#photo':'photo','#youtube':'youtube','#lol':'lol','#poster':'poster','#planning':'planning','#stream':'stream','#merch':'merch','#da':'da'}[location.hash] || 'all');
  const allowedFilters = new Set(['all','youtube','lol','poster','planning','stream','merch','da','photo']);
  let mode = allowedFilters.has(requestedFilter) ? requestedFilter : 'all';
  let client = 'all';
  let allExpanded = false;
  let renderItems = [];
  let lightboxIndex = 0;
  let shuffleSalt = 0;
  let activeProject = null;
  let activePhotoType = 'all';
  let activePhotoPlace = null;
  let activePhotoAlbum = null;

  const labels = {
    all: 'Sélection libre',
    youtube: 'Miniatures YouTube',
    lol: 'Miniatures League of Legends',
    poster: 'Posters esport',
    planning: 'Planning / Social',
    stream: 'Streampack / Assets Twitch',
    merch: 'Merch / Apparel',
    da: 'Direction artistique',
    photo: 'Photographie'
  };
  const projectModes = new Set(['stream','merch','da']);
  const escapeHTML = str => String(str).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));

  function itemCard(item, index, eager=false){
    const note = item.note ? `<span class="pf-card-note">${escapeHTML(item.note)}</span>` : '';
    return `<article class="pf-card" tabindex="0" role="button" data-pf-id="${item.id}" data-cursor="VOIR" aria-label="Ouvrir ${escapeHTML(item.categoryLabel)} - ${escapeHTML(item.client)}${item.note?' - '+escapeHTML(item.note):''}">
      <div class="pf-card-media"><img src="${item.src}" alt="${escapeHTML(item.alt)}" width="${item.width}" height="${item.height}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"></div>
      ${note}
      <span class="pf-card-index">${String(index+1).padStart(2,'0')}</span>
      <div class="pf-card-meta"><div class="pf-card-copy"><span>${escapeHTML(item.categoryLabel)}</span><strong>${escapeHTML(item.client)}</strong></div><span class="pf-card-open">↗</span></div>
    </article>`;
  }

  function deterministicShuffle(arr, salt=0){
    const copy = [...arr]; let seed = 4407 + salt * 7919;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for(let i=copy.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
    return copy;
  }

  function primeNearbyImages(scope=content){
    const imgs = $$('img[loading="lazy"]', scope);
    if(!('IntersectionObserver' in window)){ imgs.forEach(img => img.decode?.().catch(()=>{})); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        const img = entry.target; img.loading = 'eager';
        const settle = () => img.decode?.().catch(()=>{});
        if(img.complete) settle(); else img.addEventListener('load', settle, {once:true});
        io.unobserve(img);
      });
    }, {rootMargin:'1400px 0px'});
    imgs.forEach(img => io.observe(img));
  }

  function bindCardInteractions(scope=content){
    $$('.pf-card', scope).forEach(card => {
      const id = card.dataset.pfId;
      const item = data.items.find(x => x.id === id);
      if(!item) return;
      const open = () => { const idx = renderItems.findIndex(x => x.id === id); openLightbox(Math.max(0, idx)); };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); } });
      if(cursor && finePointer){
        card.addEventListener('mouseenter', () => { cursor.classList.add('big','label'); if(cursorText) cursorText.textContent='VOIR'; });
        card.addEventListener('mouseleave', () => { cursor.classList.remove('big','label'); if(cursorText) cursorText.textContent=''; });
      }
    });
  }

  function animateIn(scope=content){
    if(reducedMotion || isSafari) return;
    const cards = $$('.pf-card, .pf-project-card', scope);
    cards.slice(0,60).forEach((card,i) => {
      const anim = card.animate([{opacity:0, transform:'translateY(22px) scale(.988)'},{opacity:1, transform:'translateY(0) scale(1)'}], {duration:600, delay:Math.min(i*48,360), easing:'cubic-bezier(.22,1,.36,1)', fill:'both'});
      anim.addEventListener('finish', () => anim.cancel(), {once:true});
    });
  }

  function renderClientRail(){
    if(!['youtube','lol','poster','planning'].includes(mode)){
      clientWrap.hidden = true; clientRail.innerHTML=''; return;
    }
    clientWrap.hidden = false;
    const entries = data.clients[mode] || [];
    const total = entries.reduce((s,x)=>s+x[1],0);
    clientRail.innerHTML = `<button class="pf-client-btn ${client==='all'?'active':''}" data-client="all">Tous <small>${total}</small></button>` +
      entries.map(([name,count]) => `<button class="pf-client-btn ${client===name?'active':''}" data-client="${escapeHTML(name)}">${escapeHTML(name)} <small>${count}</small></button>`).join('');
    $$('.pf-client-btn',clientRail).forEach(btn => btn.addEventListener('click', () => {
      client = btn.dataset.client;
      $$('.pf-client-btn',clientRail).forEach(b=>b.classList.toggle('active', b===btn));
      render();
      const y = content.getBoundingClientRect().top + scrollY - 160;
      scrollTo({top:y,behavior:'smooth'});
    }));
  }

  function renderAll(){
    let items = [...data.items].sort((a,b)=>a.mixRank-b.mixRank);
    if(shuffleSalt) items = deterministicShuffle(items, shuffleSalt);
    const shown = allExpanded ? items : items.slice(0,60);
    renderItems = shown;
    content.innerHTML = `<div class="pf-grid">${shown.map((item,i)=>itemCard(item,i,!allExpanded || i < 60)).join('')}</div>`;
    viewTitle.textContent = allExpanded ? 'Archive complète' : 'Sélection libre';
    viewCount.textContent = `${shown.length} visuels${allExpanded?'':' / '+data.total}`;
    moreWrap.hidden = allExpanded; shuffleBtn.style.display = '';
    primeNearbyImages(); bindCardInteractions(); animateIn();
  }

  function renderGrouped(cat){
    const all = data.items.filter(x=>x.category===cat);
    const filtered = client==='all' ? all : all.filter(x=>x.client===client);
    renderItems = filtered;
    const groups = new Map();
    filtered.forEach(item => { if(!groups.has(item.client)) groups.set(item.client,[]); groups.get(item.client).push(item); });
    const order = data.clients[cat]?.map(x=>x[0]) || [];
    const orderedGroups = [...groups.entries()].sort((a,b)=>{
      const ai=order.indexOf(a[0]), bi=order.indexOf(b[0]); return (ai<0?999:ai)-(bi<0?999:bi);
    });
    content.innerHTML = orderedGroups.map(([name,items]) => `<section class="pf-client-section" id="client-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}">
      <div class="pf-client-section-head"><h3>${escapeHTML(name)}</h3><span>${items.length} visuel${items.length>1?'s':''}</span></div>
      <div class="pf-grid">${items.map((item,i)=>itemCard(item,i,i < 60)).join('')}</div>
    </section>`).join('') || `<div class="pf-empty">Aucun visuel dans cette sélection.</div>`;
    viewTitle.textContent = client==='all' ? labels[cat] : client;
    viewCount.textContent = `${filtered.length} visuel${filtered.length>1?'s':''}`;
    moreWrap.hidden = true; shuffleBtn.style.display = 'none';
    primeNearbyImages(); bindCardInteractions(); animateIn();
  }

  function projectCard(project, index){
    const f = project.featured || [];
    const longTitle = (project.title || '').length >= 16 ? ' is-long-title' : '';
    const tags = (project.deliverables || []).slice(0,3).map(x=>`<span>${escapeHTML(x)}</span>`).join('');
    const imgs = [0,1,2].map((n,i)=> f[n] ? `<figure class="pf-project-shot pf-project-shot-${i+1}"><img src="${f[n]}" alt="${escapeHTML(project.title)} - ${escapeHTML(project.client)}" loading="lazy" decoding="async"></figure>` : '').join('');
    const motion = project.previewVideo ? `<video class="pf-project-preview-video" src="${project.previewVideo}" muted loop playsinline preload="metadata" poster="${f[0]||''}"></video>` : '';
    const behanceAction = project.behanceUrl ? `<a class="pf-project-action pf-project-action-behance" href="${escapeHTML(project.behanceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Voir ${escapeHTML(project.title)} sur Behance"><span>Voir sur Behance</span><b>↗</b></a>` : '';
    return `<article class="pf-project-card ${index%2?'is-reversed':''} ${project.previewVideo?'has-motion':''}${longTitle}" tabindex="0" role="button" data-project-key="${project.key}" style="--project-accent:${project.accent}" aria-label="Ouvrir le projet ${escapeHTML(project.title)}">
      <div class="pf-project-number">${String(index+1).padStart(2,'0')}</div>
      <div class="pf-project-copy">
        <div class="pf-project-kicker"><span>${escapeHTML(project.categoryLabel)}</span><i></i><span>${escapeHTML(project.year)}</span></div>
        <div><p class="pf-project-client">${escapeHTML(project.client)}</p><h3>${escapeHTML(project.title)}</h3></div>
        <p class="pf-project-summary">${escapeHTML(project.summary)}</p>
        <div class="pf-project-tags">${tags}</div>
        <div class="pf-project-actions">
          <button class="pf-project-action pf-project-action-detail" type="button" aria-label="Voir ${escapeHTML(project.title)} en détail"><span>Voir en détail</span><b>↘</b></button>
          ${behanceAction}
        </div>
      </div>
      <div class="pf-project-media" aria-hidden="true">${imgs}${motion}<span class="pf-project-media-mark">PROJECT / ${String(index+1).padStart(2,'0')}</span></div>
    </article>`;
  }

  function bindProjectCards(){
    $$('.pf-project-card', content).forEach(card => {
      const key = card.dataset.projectKey;
      const preview = $('.pf-project-preview-video', card);
      const open = () => openProject(key);
      const detailAction = $('.pf-project-action-detail', card);
      const behanceAction = $('.pf-project-action-behance', card);
      detailAction?.addEventListener('click', e=>{e.stopPropagation();open();});
      behanceAction?.addEventListener('click', e=>e.stopPropagation());
      card.addEventListener('click', open);
      card.addEventListener('keydown', e=>{if(e.target===card && (e.key==='Enter'||e.key===' ')){e.preventDefault();open();}});
      if(preview && finePointer){
        card.addEventListener('mouseenter',()=>preview.play().catch(()=>{}));
        card.addEventListener('mouseleave',()=>preview.pause());
      }
      if(cursor && finePointer){
        card.addEventListener('mouseenter',()=>{cursor.classList.add('big','label');if(cursorText)cursorText.textContent='PROJET';});
        card.addEventListener('mouseleave',()=>{cursor.classList.remove('big','label');if(cursorText)cursorText.textContent='';});
      }
      if(finePointer && !reducedMotion){
        card.addEventListener('pointermove', e=>{
          const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
          card.style.setProperty('--mx',x.toFixed(3)); card.style.setProperty('--my',y.toFixed(3));
        });
        card.addEventListener('pointerleave',()=>{card.style.setProperty('--mx',0);card.style.setProperty('--my',0);});
      }
    });
  }

  function renderProjects(cat){
    const projects = projectData.projects.filter(p=>p.category===cat);
    const copy = {
      stream:{title:'Des packs pensés pour le live.',text:'Écrans, overlays, transitions, alertes et panneaux : chaque projet est conçu comme un ensemble cohérent, avec une vraie logique d’usage et une identité claire à l’écran.'},
      merch:{title:'Du merch qui a une vraie direction.',text:'Ici, chaque dossier va plus loin qu’un simple visuel : concept, déclinaisons, mises en situation et détails de fabrication racontent le projet dans son ensemble.'},
      da:{title:'Plus qu’une série de visuels.',text:'Logo, langage visuel, templates et applications : chaque projet est pensé comme une direction complète, pas comme une suite de posts séparés.'}
    }[cat] || {title:'Projet complet.',text:'Une sélection pensée comme une étude de cas.'};
    renderItems = [];
    content.innerHTML = `<div class="pf-project-mode-intro">
      <span>Études de cas / ${String(projects.length).padStart(2,'0')}</span>
      <h3>${copy.title}</h3>
      <p>${copy.text}</p>
    </div><div class="pf-project-index">${projects.map(projectCard).join('')}</div>`;
    viewTitle.textContent = labels[cat]; viewCount.textContent = `${projects.length} projets`;
    moreWrap.hidden = true; shuffleBtn.style.display = 'none';
    primeNearbyImages(); bindProjectCards(); animateIn();
  }


  const getPlace = id => photoData.places.find(p => p.id === id);
  const getAlbum = id => photoData.albums.find(a => a.id === id);
  const getType = key => photoData.types.find(t => t.key === key);
  const getPlacesForType = key => photoData.places.filter(p => p.type === key);
  const getAlbumsForType = key => photoData.albums.filter(a => a.type === key);
  const getAlbumsForPlace = (placeId, key = activePhotoType) => photoData.albums.filter(a => a.place === placeId && a.type === key);

  function stableRandomizePhotoItems(items){
    const hash = str => String(str || '').split('').reduce((acc, ch) => ((acc * 33) + ch.charCodeAt(0)) >>> 0, 5381);
    return [...items].sort((a, b) => hash(`${a.src}-${a.id}`) - hash(`${b.src}-${b.id}`));
  }

  function photoItemCard(item, index){
    return `<article class="pf-photo-item" tabindex="0" role="button" data-photo-index="${index}" aria-label="Ouvrir une photo de ${escapeHTML(item.client)}">
      <img src="${item.src}" alt="${escapeHTML(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">
      <div class="pf-photo-item-meta"><strong>${escapeHTML(item.client)}</strong><span>${escapeHTML(item.note || '')}</span></div>
    </article>`;
  }

  function bindPhotoCards(scope=content){
    $$('.pf-photo-item', scope).forEach(card => {
      const index = Number(card.dataset.photoIndex || 0);
      const open = () => openLightbox(index);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); } });
      if(cursor && finePointer){
        card.addEventListener('mouseenter', () => { cursor.classList.add('big','label'); if(cursorText) cursorText.textContent='PHOTO'; });
        card.addEventListener('mouseleave', () => { cursor.classList.remove('big','label'); if(cursorText) cursorText.textContent=''; });
      }
    });
  }

  function bindPhotoMode(){
    $$('[data-photo-type]', content).forEach(btn => btn.addEventListener('click', () => {
      activePhotoType = btn.dataset.photoType || 'all';
      activePhotoAlbum = null;
      activePhotoPlace = null;
      renderPhoto();
    }));
    $$('[data-photo-album]', content).forEach(btn => btn.addEventListener('click', () => {
      const nextAlbum = btn.dataset.photoAlbum || null;
      activePhotoAlbum = activePhotoAlbum === nextAlbum ? null : nextAlbum;
      activePhotoPlace = null;
      renderPhoto();
    }));
    $$('[data-photo-reset]', content).forEach(btn => btn.addEventListener('click', () => {
      activePhotoType = 'all';
      activePhotoAlbum = null;
      activePhotoPlace = null;
      renderPhoto();
    }));
  }

  function renderPhoto(){
    if(!photoData.albums.length){
      renderItems = [];
      content.innerHTML = `<div class="pf-empty">La partie photographie arrive bientôt.</div>`;
      viewTitle.textContent = labels.photo;
      viewCount.textContent = 'Tri par univers / événement';
      moreWrap.hidden = true; shuffleBtn.style.display = 'none';
      clientWrap.hidden = true; clientRail.innerHTML = '';
      return;
    }

    const typeOptions = [{ key: 'all', label: 'Tout' }, ...photoData.types.filter(t => t.available)];
    if(activePhotoType !== 'all' && !getType(activePhotoType)?.available) activePhotoType = 'all';

    const albumsForType = photoData.albums.filter(album => activePhotoType === 'all' || album.type === activePhotoType);
    if(activePhotoAlbum && !albumsForType.some(album => album.id === activePhotoAlbum)) activePhotoAlbum = null;

    const eventButtons = albumsForType.map(album => ({
      id: album.id,
      title: album.title,
      meta: [album.city || '', album.team || album.event || '', album.year || ''].filter(Boolean).join(' · ')
    }));

    const selectedAlbums = activePhotoAlbum ? albumsForType.filter(album => album.id === activePhotoAlbum) : albumsForType;

    const allItems = selectedAlbums.flatMap(album => {
      const place = album.place ? getPlace(album.place) : null;
      const typeLabel = getType(album.type)?.label || 'Photographie';
      const secondary = [typeLabel, place?.title || album.city || album.country || '', album.team || album.event || '', album.year || ''].filter(Boolean).join(' · ');
      return (album.photos || []).map(photo => ({
        ...photo,
        client: album.title,
        note: secondary,
        categoryLabel: `Photographie / ${typeLabel}`
      }));
    });

    renderItems = stableRandomizePhotoItems(allItems);

    const heroTitle = activePhotoAlbum
      ? (getAlbum(activePhotoAlbum)?.title || 'Sélection photo')
      : (activePhotoType === 'all' ? 'Toutes les photos, mélangées.' : `${getType(activePhotoType)?.label || 'Photo'} — sélection mélangée`);

    const heroText = activePhotoAlbum
      ? (getAlbum(activePhotoAlbum)?.description || 'Toutes les images de cette série sont regroupées ici dans une galerie simple à parcourir.')
      : `Ici, tout est affiché dans une seule galerie, en mode mélangé. Ensuite, tu peux filtrer rapidement par univers ou par événement comme pour les autres catégories du portfolio.`;

    const typeButtonsMarkup = typeOptions.map(type => `<button class="pf-photo-filter-chip ${type.key===activePhotoType?'active':''}" type="button" data-photo-type="${type.key}">${escapeHTML(type.label)}</button>`).join('');
    const eventButtonsMarkup = `<button class="pf-photo-filter-chip ${!activePhotoAlbum?'active':''}" type="button" data-photo-album="">Tout voir</button>` + eventButtons.map(event => `<button class="pf-photo-filter-chip pf-photo-filter-chip-event ${event.id===activePhotoAlbum?'active':''}" type="button" data-photo-album="${event.id}"><span>${escapeHTML(event.title)}</span>${event.meta ? `<small>${escapeHTML(event.meta)}</small>` : ''}</button>`).join('');

    const activePills = [
      activePhotoType !== 'all' ? `<span class="pf-photo-active-pill">${escapeHTML(getType(activePhotoType)?.label || activePhotoType)}</span>` : '',
      activePhotoAlbum ? `<span class="pf-photo-active-pill">${escapeHTML(getAlbum(activePhotoAlbum)?.title || '')}</span>` : ''
    ].filter(Boolean).join('');

    content.innerHTML = `<section class="pf-photo-stream">
      <div class="pf-photo-stream-head">
        <div class="pf-photo-stream-copy">
          <span class="pf-photo-kicker">Photographie / Portfolio</span>
          <h3>${escapeHTML(heroTitle)}</h3>
          <p>${escapeHTML(heroText)}</p>
        </div>
      </div>

      <div class="pf-photo-filters-wrap">
        <div class="pf-photo-filter-group">
          <span class="pf-photo-filter-label">Univers</span>
          <div class="pf-photo-filter-row">${typeButtonsMarkup}</div>
        </div>
        <div class="pf-photo-filter-group">
          <span class="pf-photo-filter-label">Événements / séries</span>
          <div class="pf-photo-filter-row pf-photo-filter-row-events">${eventButtonsMarkup}</div>
        </div>
        <div class="pf-photo-toolbar">
          <div class="pf-photo-active-filters">${activePills || '<span class="pf-photo-toolbar-note">Affichage global de toute la sélection photo.</span>'}</div>
          ${(activePhotoType !== 'all' || activePhotoAlbum) ? '<button class="pf-photo-toolbar-reset" type="button" data-photo-reset>Réinitialiser</button>' : ''}
        </div>
      </div>

      <div class="pf-photo-stream-grid pf-photo-grid">${renderItems.map(photoItemCard).join('')}</div>
    </section>`;

    viewTitle.textContent = labels.photo;
    viewCount.textContent = 'Tri par univers / événement';
    moreWrap.hidden = true; shuffleBtn.style.display = 'none';
    clientWrap.hidden = true; clientRail.innerHTML = '';
    primeNearbyImages(); bindPhotoMode(); bindPhotoCards(); animateIn();
  }

  function render(){
    renderClientRail();
    if(mode==='all') renderAll();
    else if(mode==='photo') renderPhoto();
    else if(projectModes.has(mode)) renderProjects(mode);
    else renderGrouped(mode);
  }

  filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.pfFilter === mode));

  function syncFilterURL(nextMode){
    const url = new URL(location.href);
    if(nextMode === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', nextMode);
    url.hash = '';
    history.replaceState({}, '', url);
  }

  filterButtons.forEach(btn => btn.addEventListener('click', () => {
    const next = btn.dataset.pfFilter; if(next === mode) return;
    mode = next; client='all'; allExpanded=false; shuffleSalt=0;
    syncFilterURL(mode);
    filterButtons.forEach(b=>b.classList.toggle('active',b===btn));
    content.animate?.([{opacity:.25,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
    render();
  }));

  moreBtn?.addEventListener('click', () => { allExpanded=true; renderAll(); });
  shuffleBtn?.addEventListener('click', () => { shuffleSalt++; renderAll(); });

  // Legacy visual lightbox
  const lb = $('.pf-lightbox');
  const lbImg = $('.pf-lb-stage img');
  const lbCat = $('.pf-lb-category');
  const lbClient = $('.pf-lb-client');
  const lbIndex = $('.pf-lb-index');
  let touchX=0;
  function updateLightbox(){
    const item=renderItems[lightboxIndex]; if(!item) return;
    lbImg.classList.remove('loaded'); lbImg.src=item.src; lbImg.alt=item.alt;
    lbImg.onload=()=>lbImg.classList.add('loaded'); lbCat.textContent=item.note ? `${item.categoryLabel} · ${item.note}` : item.categoryLabel; lbClient.textContent=item.client;
    lbIndex.textContent=`${String(lightboxIndex+1).padStart(2,'0')} / ${String(renderItems.length).padStart(2,'0')}`;
  }
  function openLightbox(i){ if(!renderItems.length) return; lightboxIndex=(i+renderItems.length)%renderItems.length; updateLightbox(); lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeLightbox(){ lb.classList.remove('open');lb.setAttribute('aria-hidden','true');document.body.style.overflow=''; }
  function step(dir){ lightboxIndex=(lightboxIndex+dir+renderItems.length)%renderItems.length; updateLightbox(); }
  $('.pf-lb-close')?.addEventListener('click',closeLightbox);
  $('.pf-lb-prev')?.addEventListener('click',()=>step(-1)); $('.pf-lb-next')?.addEventListener('click',()=>step(1));
  lb?.addEventListener('click',e=>{if(e.target===lb)closeLightbox();});
  lb?.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});
  lb?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>55)step(dx>0?-1:1)},{passive:true});

  // Full project viewer / case study
  const projectViewer = $('.pf-project-viewer');
  const projectScroller = $('.pf-project-viewer-scroll');
  const projectBody = $('.pf-project-viewer-body');
  const projectProgress = $('.pf-project-progress span');
  const projectClose = $('.pf-project-close');
  const projectTopLabel = $('.pf-project-viewer-label');

  function mediaMarkup(media, index, project){
    if(media.type==='video') return `<figure class="pf-case-media pf-case-media-video reveal-project"><video src="${media.src}" poster="${media.poster||''}" muted loop playsinline controls preload="metadata"></video><figcaption>${escapeHTML(media.label||'Motion / animation')}</figcaption></figure>`;
    const cls = index%7===0 ? 'pf-case-media-wide' : (index%5===0 ? 'pf-case-media-tall' : '');
    return `<figure class="pf-case-media ${cls} reveal-project"><img src="${media.src}" alt="${escapeHTML(project.title)} - ${escapeHTML(project.client)}" loading="lazy" decoding="async"><figcaption>${String(index+1).padStart(2,'0')} / ${String(project.media.length).padStart(2,'0')}</figcaption></figure>`;
  }

  function buildProjectCase(project){
    const categoryProjects = projectData.projects.filter(p=>p.category===project.category);
    const idx = categoryProjects.findIndex(p=>p.key===project.key);
    const next = categoryProjects[(idx+1)%categoryProjects.length];
    const f=project.featured||[];
    const hero1=f[0]||project.media.find(m=>m.type==='image')?.src||'';
    const hero2=f[1]||hero1, hero3=f[2]||hero1;
    const deliverables=(project.deliverables||[]).map((x,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${escapeHTML(x)}</li>`).join('');
    return `<article class="pf-case ${(project.title||'').length>=16?'is-long-title':''}" style="--project-accent:${project.accent}">
      <header class="pf-case-hero">
        <div class="pf-case-hero-copy">
          <div class="pf-case-overline"><span>${escapeHTML(project.categoryLabel)}</span><i></i><span>${escapeHTML(project.year)}</span></div>
          <p>${escapeHTML(project.client)}</p>
          <h2>${escapeHTML(project.title)}</h2>
          <div class="pf-case-hero-note">Projet ${String(idx+1).padStart(2,'0')} / ${String(categoryProjects.length).padStart(2,'0')} <span>↓</span></div>
        </div>
        <div class="pf-case-hero-stack" aria-hidden="true">
          <figure class="pf-case-hero-main"><img src="${hero1}" alt=""></figure>
          <figure class="pf-case-hero-float pf-case-hero-float-a"><img src="${hero2}" alt=""></figure>
          <figure class="pf-case-hero-float pf-case-hero-float-b"><img src="${hero3}" alt=""></figure>
        </div>
      </header>

      <section class="pf-case-intro">
        <div class="pf-case-intro-label"><span>01</span> LE PROJET</div>
        <p class="pf-case-lede">${escapeHTML(project.summary)}</p>
        <div class="pf-case-details">
          <div><span>Brief / objectif</span><p>${escapeHTML(project.brief)}</p></div>
          <div><span>Approche</span><p>${escapeHTML(project.approach)}</p></div>
          <div><span>Livrables</span><ul>${deliverables}</ul></div>
        </div>
      </section>

      <section class="pf-case-statement"><span>ARTHUR CONSTANTIN / KAISSA</span><strong>${project.category==='stream'?'Un live avec une vraie identité.':project.category==='merch'?'Du merch qui raconte quelque chose.':'Une direction claire, pensée pour durer.'}</strong><em>${project.category==='stream'?'Chaque écran doit avoir sa place.':project.category==='merch'?'Pas juste un logo posé sur un textile.':'Pas juste une suite de posts.'}</em></section>

      <section class="pf-case-gallery-head"><div><span>02</span> EXÉCUTION</div><p>${project.mediaCount} médias sélectionnés du projet${project.media.some(m=>m.type==='video')?' - motion inclus':''}</p></section>
      <section class="pf-case-gallery">${project.media.map((m,i)=>mediaMarkup(m,i,project)).join('')}</section>

      ${categoryProjects.length>1 ? `<section class="pf-case-next" data-next-project="${next.key}" style="--project-accent:${next.accent}"><span>Projet suivant</span><div><p>${escapeHTML(next.client)}</p><h3>${escapeHTML(next.title)}</h3></div><b>↘</b></section>` : `<section class="pf-case-next pf-case-next-coming" style="--project-accent:${project.accent}"><span>Collection Streampack</span><div><p>Prochains projets</p><h3>À suivre.</h3></div><b>+</b></section>`}
    </article>`;
  }

  function bindCaseAnimations(){
    const reveals=$$('.reveal-project',projectBody);
    if(reducedMotion){reveals.forEach(x=>x.classList.add('in'));return;}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{root:projectScroller,rootMargin:'0px 0px -8%'});
    reveals.forEach(x=>io.observe(x));
    $$('video',projectBody).forEach(v=>{
      const vio=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)v.play().catch(()=>{});else v.pause();}),{root:projectScroller,threshold:.35});
      vio.observe(v);
    });
    $('.pf-case-next',projectBody)?.addEventListener('click',e=>openProject(e.currentTarget.dataset.nextProject,true));
  }

  function openProject(key, replace=false){
    const project=projectData.projects.find(p=>p.key===key); if(!project||!projectViewer) return;
    activeProject=project;
    projectBody.innerHTML=buildProjectCase(project);
    projectTopLabel.textContent=`${project.categoryLabel} / ${project.client}`;
    projectViewer.style.setProperty('--project-accent',project.accent);
    projectViewer.classList.add('open'); projectViewer.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden'; projectScroller.scrollTop=0; projectProgress.style.transform='scaleX(0)';
    requestAnimationFrame(()=>projectViewer.classList.add('ready'));
    primeNearbyImages(projectBody); bindCaseAnimations();
  }
  function closeProject(){
    if(!projectViewer?.classList.contains('open')) return;
    projectViewer.classList.remove('ready','open'); projectViewer.setAttribute('aria-hidden','true'); document.body.style.overflow=''; activeProject=null;
    setTimeout(()=>{if(!projectViewer.classList.contains('open'))projectBody.innerHTML='';},350);
  }
  projectClose?.addEventListener('click',closeProject);
  projectScroller?.addEventListener('scroll',()=>{
    const max=projectScroller.scrollHeight-projectScroller.clientHeight;
    projectProgress.style.transform=`scaleX(${max>0?projectScroller.scrollTop/max:0})`;
  },{passive:true});

  addEventListener('keydown',e=>{
    if(projectViewer?.classList.contains('open')){ if(e.key==='Escape')closeProject(); return; }
    if(!lb.classList.contains('open')) return; if(e.key==='Escape')closeLightbox(); if(e.key==='ArrowLeft')step(-1); if(e.key==='ArrowRight')step(1);
  });

  // Collage mouse depth
  const hero = $('.pf-hero'); const heroCards = $$('.pf-hero-card');
  if(hero && finePointer && !reducedMotion){
    hero.addEventListener('pointermove',e=>{
      const r=hero.getBoundingClientRect(); const nx=(e.clientX-r.left)/r.width-.5; const ny=(e.clientY-r.top)/r.height-.5;
      heroCards.forEach((card,i)=>{ const depth=(i%3+1)*5; card.style.translate=`${nx*depth}px ${ny*depth}px`; });
    });
    hero.addEventListener('pointerleave',()=>heroCards.forEach(c=>c.style.translate='0 0'));
  }

  render();
})();
