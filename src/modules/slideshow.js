export function setupBudgetSlideshow() {
  const slides = document.querySelectorAll(".slide");
  const indicators = document.querySelectorAll(".indicator");
  const prevBtn = document.querySelector(".slide-nav.prev");
  const nextBtn = document.querySelector(".slide-nav.next");
  const video = document.getElementById("codeNextVideo");
  if (!slides.length) return;

  let current = 1;
  let timer;

  let paused = true;
  const pauseBtn = document.getElementById("slidePause");
  const container = document.querySelector(".slideshow-container");

  const show = (n) => {
    slides.forEach((s, idx) => {
      const slideIndex = parseInt(s.dataset.slide, 10);
      const active = slideIndex === n;
      s.classList.toggle("active", active);
      s.setAttribute("aria-hidden", String(!active));
    });
    indicators.forEach((i) =>
      i.classList.toggle("active", parseInt(i.dataset.slide, 10) === n),
    );
    current = n;
    video?.pause();
  };

  const next = () => show(current >= slides.length ? 1 : current + 1);
  const prev = () => show(current <= 1 ? slides.length : current - 1);

  const stopAuto = () => clearInterval(timer);
  const startAuto = () => {
    stopAuto();
    if (!paused) timer = setInterval(next, 12000);
  };
  const setPaused = (value) => {
    paused = value;
    if (pauseBtn) {
      pauseBtn.dataset.state = paused ? "paused" : "playing";
      pauseBtn.setAttribute(
        "aria-label",
        paused ? "Play slideshow" : "Pause slideshow",
      );
    }
    paused ? stopAuto() : startAuto();
  };
  const userNavigated = () => setPaused(true);

  pauseBtn?.addEventListener("click", () => setPaused(!paused));
  nextBtn?.addEventListener("click", () => {
    next();
    userNavigated();
  });
  prevBtn?.addEventListener("click", () => {
    prev();
    userNavigated();
  });

  indicators.forEach((btn) => {
    btn.addEventListener("click", () => {
      show(parseInt(btn.dataset.slide, 10));
      userNavigated();
    });
  });

  if (container) {
    container.addEventListener("mouseenter", () => {
      stopAuto();
    });
    container.addEventListener("mouseleave", () => {
      startAuto();
    });
    container.addEventListener("focusin", () => {
      stopAuto();
    });
    container.addEventListener("focusout", () => {
      startAuto();
    });
  }
  document.addEventListener("keydown", (e) => {

    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (
      e.target.closest?.(
        "input, select, textarea, [contenteditable], .export-modal",
      )
    )
      return;
    const rect = container?.getBoundingClientRect();
    if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    if (e.key === "ArrowRight") {
      next();
      userNavigated();
    }
    if (e.key === "ArrowLeft") {
      prev();
      userNavigated();
    }
  });

  setPaused(paused);
}

export function setupVideoControls() {
  const video = document.getElementById("codeNextVideo");
  const toggle = document.getElementById("codeNextVideoToggle");
  if (!video || !toggle) return;

  let hideTimer;

  const setState = (s) => (toggle.dataset.state = s);
  const showBtn = () => {
    toggle.classList.add("show");
    clearTimeout(hideTimer);
    if (!video.paused)
      hideTimer = setTimeout(() => toggle.classList.remove("show"), 900);
  };

  const play = () => {
    video.muted = true;
    video.loop = true;
    video
      .play()
      .then(() => setState("pause"))
      .catch(() => setState("play"));
  };
  const pause = () => {
    video.pause();
    setState("play");
  };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    video.paused ? play() : pause();
    showBtn();
  });
  video.addEventListener("click", () => {
    video.paused ? play() : pause();
    showBtn();
  });
  video.addEventListener("play", () => setState("pause"));
  video.addEventListener("pause", () => setState("play"));

  pause();
  showBtn();
}
