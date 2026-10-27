import { t } from "../i18n/index.js";

const SLIDE_MS = 7000;
const VIDEO_SLIDE_MS = 14000;

export function setupDeck({ isStill }) {
  const deck = document.querySelector(".deck");
  const slides = [...deck.querySelectorAll(".slide")];
  const dots = deck.querySelector(".deck__dots");
  const playButton = document.querySelector('[data-deck="play"]');
  const video = document.getElementById("codenext");
  const videoToggle = deck.querySelector(".video-toggle");
  let index = 0;
  let playing = !isStill();
  let userPaused = false;
  let held = false;
  let visible = false;
  let timer = 0;
  let remaining = SLIDE_MS;
  let startedAt = 0;
  let videoChosen = null;

  const titleOf = (slide) => slide.querySelector("h2")?.textContent.trim() || "";
  const dotButtons = slides.map((slide, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", t("Slide {n} of {total}: {title}", { n: i + 1, total: slides.length, title: titleOf(slide) }));
    slide.setAttribute("aria-label", t("{n} of {total}: {title}", { n: i + 1, total: slides.length, title: titleOf(slide) }));
    button.append(document.createElement("i"));
    button.addEventListener("click", () => go(i));
    dots.append(button);
    return button;
  });

  const onVideo = () => slides[index].contains(video);
  const duration = () => (onVideo() ? VIDEO_SLIDE_MS : SLIDE_MS);
  const running = () => playing && !held && visible && !isStill() && videoChosen !== true;

  function stopTimer() {
    if (timer) remaining -= performance.now() - startedAt;
    clearTimeout(timer);
    timer = 0;
  }
  function sync() {
    const run = running();
    deck.classList.toggle("is-running", run);
    deck.classList.toggle("is-held", !run);
    if (run && !timer) {
      startedAt = performance.now();
      timer = setTimeout(() => go(index + 1), Math.max(300, remaining));
    } else if (!run) stopTimer();
    syncVideo();
  }

  function syncVideo() {
    const shouldPlay = onVideo() && visible && !isStill() && (videoChosen ?? playing);
    if (shouldPlay && video.paused) video.play().catch(() => {});
    if (!shouldPlay && !video.paused) video.pause();
  }


  const mapZoom = new URLSearchParams(location.search).has("mapzoom");
  function zoomOrigin(img) {

    const box = img.getBoundingClientRect();
    const scale = Math.min(box.width / 1000, box.height / 589);
    const x = (box.width - 1000 * scale) / 2 + 914 * scale;
    const y = (box.height - 589 * scale) / 2 + 181 * scale;
    img.style.transformOrigin = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
  }

  function go(next) {
    const target = (next + slides.length) % slides.length;
    const zooming = mapZoom && !isStill() && index === 0 && target === 1;
    deck.classList.toggle("is-zooming", zooming);
    if (zooming) {
      const img = slides[0].querySelector(".slide__visual--map img");
      if (img) zoomOrigin(img);
      setTimeout(() => deck.classList.remove("is-zooming"), 1500);
    }

    const forward = next > index;
    deck.style.setProperty("--from", forward ? "1" : "-1");
    slides.forEach((slide, i) => slide.classList.toggle("is-leaving", i === index && target !== index));

    if (slides[index].contains(document.activeElement)) dotButtons[target].focus();
    clearTimeout(timer);
    timer = 0;
    index = target;
    remaining = duration();
    if (!onVideo()) videoChosen = null;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.inert = !active;
      slide.setAttribute("aria-hidden", String(!active));
      dotButtons[i].toggleAttribute("aria-current", active);
      dotButtons[i].classList.remove("is-active");
    });
    deck.style.setProperty("--slide-ms", `${remaining}ms`);
    void dotButtons[index].offsetWidth;
    dotButtons[index].classList.add("is-active");
    sync();
  }

  function setPlaying(value, byUser = false) {
    playing = value;
    if (byUser) userPaused = !value;
    playButton.setAttribute("aria-pressed", String(playing));
    playButton.setAttribute("aria-label", t(playing ? "Pause slideshow" : "Play slideshow"));
    playButton.dataset.state = playing ? "playing" : "paused";
    sync();
  }

  document.querySelector('[data-deck="prev"]').addEventListener("click", () => go(index - 1));
  document.querySelector('[data-deck="next"]').addEventListener("click", () => go(index + 1));
  playButton.addEventListener("click", () => setPlaying(!playing, true));
  deck.addEventListener("keydown", (event) => {
    if (event.target.closest("input, select, textarea")) return;
    if (event.key === "ArrowRight") go(index + 1);
    if (event.key === "ArrowLeft") go(index - 1);
  });
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  deck.addEventListener("pointerenter", () => {
    if (!fine.matches) return;
    held = true;
    sync();
  });
  deck.addEventListener("pointerleave", () => {
    if (!fine.matches) return;
    held = false;
    sync();
  });

  deck.addEventListener("focusin", (event) => {
    if (!event.target.matches(":focus-visible")) return;
    held = true;
    sync();
  });
  deck.addEventListener("focusout", (event) => {
    if (deck.contains(event.relatedTarget)) return;
    held = false;
    sync();
  });
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.35 },
  ).observe(deck);


  let startX = null;
  let startY = null;
  deck.addEventListener(
    "touchstart",
    (event) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    },
    { passive: true },
  );
  deck.addEventListener("touchend", (event) => {
    if (startX === null) return;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  const setVideoState = () => {
    videoToggle.dataset.state = video.paused ? "paused" : "playing";
    videoToggle.setAttribute("aria-label", t(video.paused ? "Play video" : "Pause video"));
  };
  video.addEventListener("play", setVideoState);
  video.addEventListener("pause", setVideoState);
  const toggleVideo = () => {
    videoChosen = video.paused;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    sync();
  };
  videoToggle.addEventListener("click", toggleVideo);
  video.addEventListener("click", toggleVideo);

  go(0);
  setPlaying(playing);

  return {
    count: slides.length,
    show: (i) => go(i),
    setStill(still) {
      if (still) setPlaying(false);
      else if (!userPaused) setPlaying(true);
      sync();
    },
  };
}
