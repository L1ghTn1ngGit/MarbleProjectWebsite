export function setupBudgetSlideshow() {
  const slides     = document.querySelectorAll('.slide');
  const indicators = document.querySelectorAll('.indicator');
  const prevBtn    = document.querySelector('.slide-nav.prev');
  const nextBtn    = document.querySelector('.slide-nav.next');
  const video      = document.getElementById('codeNextVideo');
  if (!slides.length) return;

  let current = 1;
  let timer;
  let userTouched = false;

  const show = (n) => {
    slides.forEach(s => s.classList.remove('active'));
    indicators.forEach(i => i.classList.remove('active'));
    document.querySelector(`.slide[data-slide="${n}"]`)?.classList.add('active');
    document.querySelector(`.indicator[data-slide="${n}"]`)?.classList.add('active');
    current = n;
    if (video) n === 5 ? video.play().catch(() => {}) : video.pause();
  };

  const next = () => show(current >= slides.length ? 1 : current + 1);
  const prev = () => show(current <= 1 ? slides.length : current - 1);

  const startAuto = () => { if (!userTouched) timer = setInterval(next, 12000); };
  const stopAuto  = () => clearInterval(timer);

  nextBtn?.addEventListener('click', () => { next(); userTouched = true; stopAuto(); });
  prevBtn?.addEventListener('click', () => { prev(); userTouched = true; stopAuto(); });

  indicators.forEach(btn => {
    btn.addEventListener('click', () => {
      show(parseInt(btn.dataset.slide, 10));
      userTouched = true;
      stopAuto();
    });
  });

  startAuto();
}

export function setupVideoControls() {
  const video  = document.getElementById('codeNextVideo');
  const toggle = document.getElementById('codeNextVideoToggle');
  if (!video || !toggle) return;

  let hideTimer;

  const setState = s => (toggle.dataset.state = s);
  const showBtn  = () => {
    toggle.classList.add('show');
    clearTimeout(hideTimer);
    if (!video.paused) hideTimer = setTimeout(() => toggle.classList.remove('show'), 900);
  };

  const play  = () => { video.muted = true; video.loop = true; video.play().then(() => setState('pause')).catch(() => setState('play')); };
  const pause = () => { video.pause(); setState('play'); };

  toggle.addEventListener('click', e => { e.stopPropagation(); video.paused ? play() : pause(); showBtn(); });
  video.addEventListener('click',  () => { video.paused ? play() : pause(); showBtn(); });
  video.addEventListener('play',   () => setState('pause'));
  video.addEventListener('pause',  () => setState('play'));

  play();
}
