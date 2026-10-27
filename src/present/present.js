// presentation mode stuff, the pillar and the rolling scenes all live here
import "@fontsource/instrument-serif/400.css";
import "lenis/dist/lenis.css";
import "../site-chrome.css";
import "./present.css";
import Lenis from "lenis";
import { loadBudgetData } from "../data/source.js";
import { toDisplayName } from "../modules/labels.js";
import { formatCurrency, formatNumber } from "../utils.js";
import { setupDeck } from "./deck.js";
import { setupRecords } from "./records.js";
import { setupTour } from "./tour.js";
import { t } from "../i18n/index.js";
import { setResumeKey, setupSiteChrome, takeResume } from "../modules/site-chrome.js";
import { createLoader } from "../modules/loader.js";
import { tier } from "../modules/device.js";
document.documentElement.classList.add(`tier-${tier}`);


setupSiteChrome("presentation");

const root = document.documentElement;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const systemReduced = matchMedia("(prefers-reduced-motion: reduce)");
const compact = matchMedia("(max-width: 760px), (max-height: 400px), (pointer: coarse) and (max-width: 1100px)");
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p, start, end) => clamp((p - start) / (end - start));
const percent = (value, digits = 0) => (Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : "n/a");
const ratio = (a, b, max = Infinity) => (b > 0 ? Math.min(max, a / b) : 0);


export const isStill = () => systemReduced.matches;

let lenis = null;
let frame = 0;
let marble = null;
let pillars = null;


const lite = new URLSearchParams(location.search).has("lite") || tier === "low";
(lite ? Promise.reject(new Error("lite mode")) : import("../modules/fluid-marble.js"))
  .then(({ mountFluidMarble }) => {
    marble = mountFluidMarble(document.getElementById("marble-bg"), { reducedMotion: systemReduced.matches, maxRatio: tier === "mid" ? 1 : 1.25 });
    marble.setPaused(isStill());
    requestUpdate();
  })
  .catch((error) => {
    if (!lite) console.warn("Marble background unavailable", error);
  });


function startLenis() {
  if (lenis || isStill()) return;
  lenis = new Lenis({ lerp: 0.1, anchors: { offset: -8 }, autoRaf: true });
  lenis.on("scroll", () => {
    cancelAnimationFrame(frame);
    update();
    pillars?.renderNow();
    scheduleSettle();
  });
}

// stop scrolling halfway through a roll and it eases on to the closest
// finished section, forward or back
let settleTimer = 0;
let userInputAt = 0;
let settling = false;
for (const type of ["wheel", "touchmove", "keydown"]) addEventListener(type, () => (userInputAt = performance.now()), { passive: true });
function scheduleSettle() {
  if (settling) return;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settle, 220);
}
function settle() {
  if (!lenis || !root.classList.contains("stage-on") || root.classList.contains("is-rewinding") || root.classList.contains("table-open")) return;
  if (document.getElementById("tour")?.getAttribute("aria-pressed") === "true") return;
  if (performance.now() - userInputAt > 1500) return;
  const y = scrollY;
  const local = y - stageTop;
  const index = story.findIndex((scene) => local >= scene.start && local < scene.start + scene.length);
  if (index < 1) return;
  const scene = story[index];
  const p = (local - scene.start) / scene.length;
  if (p <= 0.01 || p >= rollShare(scene)) return;
  const back = scene.top - 2;
  const ahead = stageTarget(scene);
  const to = Math.abs(y - back) < Math.abs(ahead - y) ? back : ahead;
  settling = true;
  lenis.scrollTo(to, { duration: 0.9, easing: easeInOut, onComplete: () => (settling = false) });
  setTimeout(() => (settling = false), 1200);
}
function stopLenis() {
  lenis?.destroy();
  lenis = null;
}
export const getLenis = () => lenis;


const scenes = $$("[data-scene]").map((el) => ({ el, name: el.dataset.scene, pin: el.querySelector(".pin"), top: 0, length: 1, start: 0 }));
const story = scenes.filter((scene) => scene.el.dataset.dir);
const renderers = {};
const overTrack = $("#over-track");
const overScene = $('[data-scene="over"]');
const stageEl = $("#stage");
const frameEl = $(".stage__frame");
const navEl = $(".nav");
const subnavEl = $(".subnav");

const stage = $(".pillar-stage");
const unrollQuery = matchMedia("(min-width: 761px) and (min-height: 401px) and ((pointer: fine) or (min-width: 1101px))");
const unrolling = () => unrollQuery.matches && !isStill() && root.classList.contains("pillars-ready");
const ROLL = { over: 0.28 };
const rollShare = (scene) => ROLL[scene.name] ?? 0.5;
let stageTop = 0;


function measureChrome() {
  const strip = subnavEl && getComputedStyle(subnavEl).display !== "none" ? subnavEl.offsetHeight : 0;
  const chrome = (navEl?.offsetHeight || 60) + strip;
  root.style.setProperty("--chrome", `${chrome}px`);
  return chrome;
}

function measure() {
  wipeCache.clear();
  const chrome = measureChrome();
  const on = unrolling();
  root.classList.toggle("stage-on", on);

  const frameW = frameEl.clientWidth || innerWidth;
  const distance = on ? Math.max(0, overTrack.scrollWidth - frameW) : 0;
  overScene.dataset.distance = String(distance);
  if (!on) {
    stageEl.style.height = "";
    return;
  }
  const seg = innerHeight * 0.95;
  let total = 0;
  for (const scene of story) {
    scene.start = total;
    scene.length = scene.name === "over" ? seg + distance * 0.9 : seg;
    total += scene.length;
  }
  const frameH = innerHeight - chrome;
  stageEl.style.height = `${Math.round(total + frameH)}px`;
  stageTop = stageEl.getBoundingClientRect().top + scrollY - chrome;
  for (const scene of story) {

    scene.top = stageTop + scene.start;
  }
}

function sceneProgress(scene, y) {
  const top = scene.el.getBoundingClientRect().top + y;
  const stickyTop = parseFloat(getComputedStyle(scene.pin).top) || 0;
  const hold = scene.el.offsetHeight - scene.pin.offsetHeight;
  scene.top = top - stickyTop;
  scene.length = Math.max(1, hold);
  return hold > 4 ? clamp((y - scene.top) / scene.length) : 1;
}

function stageProgress(scene, y) {
  return clamp((y - stageTop - scene.start) / scene.length);
}


const wipeCache = new Map();
function wipeParts(scene) {
  if (wipeCache.has(scene)) return wipeCache.get(scene);
  const parts = [];
  const walk = (node) => {
    for (const child of node.children) {
      if (child.matches(".glass") || !child.querySelector(".glass")) parts.push(child);
      else walk(child);
    }
  };
  walk(scene.pin);
  wipeCache.set(scene, parts);
  return parts;
}

function firstArrival() {
  const chrome = parseFloat(getComputedStyle(root).getPropertyValue("--chrome")) || 60;
  return ease(clamp(1 - (frameEl.getBoundingClientRect().top - chrome) / (innerHeight * 0.55)));
}

function choreograph(progress, on) {
  if (!stage) return;
  const w = stage.offsetWidth;
  const gutter = parseFloat(getComputedStyle(stage).paddingLeft) || 24;
  const edgeL = gutter + w / 2;
  const edgeR = innerWidth - gutter - w / 2;

  let x = edgeR;
  const rolls = story.map((scene, index) => {
    const t = index === 0 ? 1 : easeInOut(span(progress.get(scene), 0, rollShare(scene)));
    const from = scene.el.dataset.dir === "ltr" ? edgeL : edgeR;
    const to = scene.el.dataset.dir === "ltr" ? edgeR : edgeL;
    const sceneX = from + (to - from) * t;
    if (index > 0 && progress.get(scene) > 0) x = sceneX;
    return { scene, t, x: index === 0 ? edgeR : sceneX };
  });
  rolls.forEach(({ scene, t, x: sceneX }, i) => {
    const next = rolls[i + 1];

    const keyboardFocus = scene.pin.contains(document.activeElement) && document.activeElement.matches(":focus-visible");

    let mode = "all";
    let px = 0;
    if (on && !keyboardFocus) {
      if ((next && next.t >= 1) || (!(next?.t > 0) && t <= 0)) mode = "none";
      else if (next && next.t > 0) {

        mode = next.scene.el.dataset.dir === "ltr" ? "show-right" : "show-left";
        px = next.x;
      } else if (t < 1) {
        mode = scene.el.dataset.dir === "ltr" ? "show-left" : "show-right";
        px = sceneX;
      }
    }

    let opacity = 1;
    if (on) {
      const leaving = next && next.t > 0 ? 1 - next.t : 1;
      const arriving = i === 0 ? firstArrival() : Math.min(1, 0.2 + t * 0.8);
      opacity = arriving * leaving;
    }

    for (const part of wipeParts(scene)) {
      let clip = "";
      if (mode === "none") clip = "inset(0 100% 0 0)";
      else if (mode !== "all") {
        const box = part.getBoundingClientRect();
        // only the moving edge is cut; the other sides leave room for the shadow
        const pad = -80;
        clip = mode === "show-left" ? `inset(${pad}px ${clamp(box.right - px, pad, box.width).toFixed(1)}px ${pad}px ${pad}px)` : `inset(${pad}px ${pad}px ${pad}px ${clamp(px - box.left, pad, box.width).toFixed(1)}px)`;
      }
      part.style.clipPath = clip;
      part.style.opacity = on && opacity < 1 ? opacity.toFixed(3) : "";
      part.style.visibility = on && (mode === "none" || opacity <= 0.001) ? "hidden" : "";
    }
  });

  const chrome = parseFloat(getComputedStyle(root).getPropertyValue("--chrome")) || 60;
  const anchor = on ? frameEl.getBoundingClientRect().top : getScene("roll").pin.getBoundingClientRect().top;
  const offset = Math.max(0, anchor - chrome);

  const end = getScene("end");
  const endCard = end?.pin.querySelector(".end");
  let fade = 1;
  if (on && end && endCard) {
    const settle = easeInOut(span(progress.get(end), rollShare(end) + 0.05, 0.85));
    fade = 1 - settle;
    const middle = frameEl.clientWidth / 2;
    const cardMiddle = endCard.offsetLeft + endCard.offsetWidth / 2 + (endCard.offsetParent?.getBoundingClientRect().left ?? 0) - frameEl.getBoundingClientRect().left;
    endCard.style.transform = settle ? `translate3d(${((middle - cardMiddle) * settle).toFixed(1)}px, 0, 0)` : "";
  } else if (endCard) endCard.style.transform = "";

  if (root.classList.contains("table-open")) {
    const rec = getScene("records");
    const p = rec ? progress.get(rec) : 0;
    if (on && (p <= 0.05 || p >= 0.999)) setTableOpen(false);
    else fade = 0;
  }

  if (!on) fade = 0;
  stage.style.opacity = fade < 1 ? fade.toFixed(3) : "";
  stage.style.left = `${(x - w / 2).toFixed(1)}px`;
  stage.style.transform = offset ? `translate3d(0, ${offset.toFixed(1)}px, 0)` : "";
}

function update() {
  frame = 0;
  const y = scrollY;
  const max = Math.max(1, root.scrollHeight - innerHeight);
  root.style.setProperty("--page", (y / max).toFixed(4));
  marble?.setProgress(y / max);
  updateHeadingFill();
  root.classList.toggle("is-scrolled", y > 24);
  const still = isStill();
  const on = root.classList.contains("stage-on");
  const progress = new Map();
  for (const scene of scenes) {
    const p = still ? 1 : on && story.includes(scene) ? stageProgress(scene, y) : sceneProgress(scene, y);
    progress.set(scene, p);
    scene.el.style.setProperty("--p", p.toFixed(4));
    renderers[scene.name]?.(p);
  }
  choreograph(progress, on);
  pillars?.refresh();

  let current = "";
  if (on) {
    const local = y - stageTop;
    const at = [...story].reverse().find((scene) => local >= scene.start);
    const map = { roll: "overview", years: "story", depts: "story", over: "overruns", records: "records", insights: "insights", about: "insights", end: "insights" };
    current = at && local >= 0 ? map[at.name] : "";
  } else {
    const marker = y + innerHeight * 0.35;
    for (const id of ["overview", "story", "overruns", "records", "insights", "about"]) {
      const node = document.getElementById(id);
      if (node && node.getBoundingClientRect().top + y <= marker) current = id;
    }
  }
  for (const link of $$(".nav__links a, .subnav a")) link.toggleAttribute("aria-current", link.hash === `#${current}`);
}
export function requestUpdate() {
  if (!frame) frame = requestAnimationFrame(update);
}
export function getScene(name) {
  return scenes.find((scene) => scene.name === name);
}


function stageTarget(scene) {
  return scene.top + scene.length * rollShare(scene) + 2;
}
document.addEventListener(
  "click",
  (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || link.matches(REWIND) || !root.classList.contains("stage-on")) return;
    const target = document.querySelector(link.hash);
    const scene = target && story.find((item) => item.el.contains(target) || target.contains(item.el));
    if (!scene) return;
    event.preventDefault();
    const top = stageTarget(scene);
    if (lenis) lenis.scrollTo(top, { duration: 1.4 });
    else window.scrollTo({ top });
  },
  true,
);
document.addEventListener("focusin", (event) => {
  if (!root.classList.contains("stage-on")) return;
  const scene = story.find((item) => item.el.contains(event.target));
  if (!scene) return;
  const p = stageProgress(scene, scrollY);
  if (p < rollShare(scene) || p >= 1) {
    const top = stageTarget(scene);
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top });
  }
});


const menuButton = $(".nav__menu");
const setMenu = (open) => {
  root.classList.toggle("menu-open", open);
  menuButton?.setAttribute("aria-expanded", String(open));
};
menuButton?.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
subnavEl?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && root.classList.contains("menu-open")) {
    setMenu(false);
    menuButton?.focus();
  }
});
document.addEventListener("click", (event) => {
  if (root.classList.contains("menu-open") && !event.target.closest(".nav__menu, .subnav")) setMenu(false);
});


const mapVisual = $(".slide__visual--map");
function aimMap() {
  const img = mapVisual?.querySelector("img");
  if (!img) return;

  const box = { width: img.offsetWidth, height: img.offsetHeight };
  const scale = Math.min(box.width / 1000, box.height / 589);
  const x = (box.width - 1000 * scale) / 2 + 914 * scale;
  const y = (box.height - 589 * scale) / 2 + 181 * scale;
  mapVisual.style.setProperty("--nyc-x", `${x.toFixed(1)}px`);
  mapVisual.style.setProperty("--nyc-y", `${y.toFixed(1)}px`);
}
addEventListener("resize", aimMap);
document.fonts?.ready.then(aimMap);
requestAnimationFrame(aimMap);


const expandButton = $(".records__expand");
function setTableOpen(open) {
  root.classList.toggle("table-open", open);
  expandButton?.setAttribute("aria-pressed", String(open));
  if (expandButton) expandButton.textContent = t(open ? "Close table" : "Expand table");
  requestUpdate();
}
expandButton?.addEventListener("click", () => setTableOpen(!root.classList.contains("table-open")));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && root.classList.contains("table-open")) setTableOpen(false);
});


setResumeKey(() => {
  const y = scrollY;
  if (root.classList.contains("stage-on")) {
    const local = y - stageTop;
    if (local < -innerHeight * 0.3) return y < innerHeight * 0.5 ? null : "highlights";
    const at = [...story].reverse().find((scene) => local >= scene.start - innerHeight * 0.2);
    return at?.name || "roll";
  }
  let key = y > innerHeight * 0.5 ? "highlights" : null;
  for (const scene of scenes) if (scene.el.getBoundingClientRect().top <= innerHeight * 0.35) key = scene.name;
  return key;
});

let pendingResume = takeResume();
function resumePlace() {
  const key = pendingResume;
  if (!key) return;
  const go = (top) => (lenis ? lenis.scrollTo(top, { immediate: true, force: true }) : window.scrollTo(0, top));
  if (key === "highlights") return go(Math.max(0, $("#highlights").getBoundingClientRect().top + scrollY - 90));
  const scene = getScene(key) || getScene(key === "story" ? "years" : "roll");
  if (!scene) return;
  if (root.classList.contains("stage-on") && story.includes(scene)) go(stageTarget(scene));
  else go(scene.el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(root).getPropertyValue("--chrome")) || 90));
}


function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function fill(name, value) {
  for (const node of $$(`[data-fill="${name}"]`)) node.textContent = value;
}

function buildStory(rows) {
  const total = rows.reduce((sum, row) => ({ spent: sum.spent + row.__cash, budget: sum.budget + row.__modified }), { spent: 0, budget: 0 });
  const group = (key) => {
    const map = new Map();
    for (const row of rows) {
      const item = map.get(row[key]) || { label: row[key], spent: 0, budget: 0 };
      item.spent += row.__cash;
      item.budget += row.__modified;
      map.set(row[key], item);
    }
    return [...map.values()];
  };
  const over = rows.filter((row) => row.__cash > row.__modified);
  return {
    total,
    lines: rows.length,
    years: group("__year").sort((a, b) => a.label.localeCompare(b.label)),
    departments: group("__departmentDisplay").sort((a, b) => b.spent - a.spent),
    overruns: [...over].sort((a, b) => b.__cash - b.__modified - (a.__cash - a.__modified)).slice(0, 5),
    overLines: over.length,

    over10: rows.filter((row) => row.__modified > 0 && row.__cash > row.__modified * 1.1).length,
    zeroBudget: rows.filter((row) => row.__modified === 0 && row.__cash > 0),
  };
}

function renderOverview(data) {
  const first = data.years[0].label;
  const last = data.years.at(-1).label;
  fill("lede", t("An analysis of Department of Education spending across {lines} budget lines, FY{first} to FY{last}.", { lines: formatNumber(data.lines), first, last }));
  fill("yearRange", t("FY{first} to FY{last}", { first, last }));
  fill("totalShort", formatCurrency(data.total.spent));
  fill("budget", formatCurrency(data.total.budget));
  fill("spentCaption", t("{pct} of the working budget spent", { pct: percent(data.total.spent / data.total.budget, 1) }));
  fill("over10", formatNumber(data.over10));
  fill("over10Caption", t("{pct} of {lines} lines", { pct: percent(data.over10 / data.lines, 1), lines: formatNumber(data.lines) }));
  $('[data-meter="spent"]').style.setProperty("--m", ratio(data.total.spent, data.total.budget, 1).toFixed(4));
  $('[data-meter="over10"]').style.setProperty("--m", ratio(data.over10 * 10, data.lines, 1).toFixed(4));

  const heroYears = $("#hero-years");
  const yearMax = Math.max(...data.years.map((year) => year.spent));
  data.years.forEach((year, index) => {
    const item = el("li");
    item.style.setProperty("--w", (year.spent / yearMax).toFixed(4));
    item.style.setProperty("--i", String(index));
    item.append(el("span", "", `FY${year.label}`), el("strong", "", formatCurrency(year.spent)));
    heroYears.append(item);
  });


}

function renderYears(data) {
  const chart = $("#years-chart");
  const max = Math.max(...data.years.map((year) => Math.max(year.spent, year.budget)));
  const min = Math.min(...data.years.map((year) => Math.min(year.spent, year.budget)));

  const step = (span) => {
    const raw = span / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  };
  const scales = {
    full: (() => {
      const s = step(max);
      return { lo: 0, hi: Math.ceil(max / s) * s, step: s };
    })(),
    zoom: (() => {
      const s = step((max - min) * 1.6);
      const lo = Math.max(0, Math.floor((min - (max - min) * 0.35) / s) * s);
      return { lo, hi: Math.ceil(max / s) * s, step: s };
    })(),
  };

  const axis = el("div", "years__axis");
  axis.setAttribute("aria-hidden", "true");
  const plot = el("div", "years__plot");
  const labels = el("div", "years__labels");
  const columns = data.years.map((year) => {
    const group = el("div", "col");
    const budget = el("div", "bar-v bar-v--budget");
    const spent = el("div", "bar-v bar-v--spent");
    const budgetValue = el("span", "bar-v__value", formatCurrency(year.budget));
    const value = el("span", "bar-v__value", formatCurrency(year.spent));
    budget.append(budgetValue);
    spent.append(value);
    group.append(budget, spent);
    plot.append(group);
    const label = el("div", "col__label-wrap");
    label.append(el("p", "col__label", `FY${year.label}`), el("p", "col__sub", t("Budget {amount}", { amount: formatCurrency(year.budget) })));
    labels.append(label);
    return { group, budget, spent, value, year };
  });

  const toggle = el("button", "chip years__zoom");
  toggle.type = "button";
  toggle.setAttribute("aria-pressed", "false");
  const zoomLabel = () => (toggle.getAttribute("aria-pressed") === "true" ? t("Show from zero") : t("Zoom in on the gap"));
  toggle.textContent = zoomLabel();

  function applyScale(name) {
    const { lo, hi, step: s } = scales[name];
    const at = (v) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    for (const { group, year } of columns) {
      group.style.setProperty("--budget", at(year.budget).toFixed(4));
      group.style.setProperty("--spent", at(year.spent).toFixed(4));
    }
    const ticks = [];
    for (let v = lo; v <= hi + s / 2; v += s) ticks.push(v);
    axis.replaceChildren(
      ...ticks.map((v) => {
        const tick = el("span", "years__tick", formatCurrency(v));
        tick.style.setProperty("--at", at(v).toFixed(4));
        return tick;
      }),
    );
    plot.style.setProperty("--grid", String(ticks.length - 1));
    chart.dataset.scale = name;
  }
  toggle.addEventListener("click", () => {
    const zoomed = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(zoomed));
    toggle.textContent = zoomLabel();
    applyScale(zoomed ? "zoom" : "full");
  });

  chart.replaceChildren(axis, plot, el("span", "years__corner"), labels);
  chart.before(toggle);
  applyScale("full");

  const first = data.years[0];
  const last = data.years.at(-1);
  const change = (last.spent - first.spent) / first.spent;
  fill("growth", `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%`);
  fill("growthLabel", t("change in cash spending, FY{first} to FY{last}", { first: first.label, last: last.label }));
  renderers.years = (p) => {
    columns.forEach(({ group, value, year }, index) => {
      const local = ease(span(p, index * 0.15, 0.45 + index * 0.15));
      group.style.setProperty("--grow", local.toFixed(4));
      value.textContent = formatCurrency(year.spent * local);
    });
  };
}

function renderDepartments(data) {
  const top = data.departments.slice(0, 5);
  const rest = data.departments.slice(5).reduce((sum, item) => sum + item.spent, 0);
  const parts = [...top.map((item) => ({ label: item.label, spent: item.spent })), { label: t("All other departments"), spent: rest, other: true }];
  const bar = $("#split-bar");
  const list = $("#split-list");
  parts.forEach((part, index) => {
    const share = part.spent / data.total.spent;
    const cls = `seg--${index}${part.other ? " seg--other" : ""}`;
    const segment = el("div", `seg ${cls}`);
    segment.style.flexGrow = String(share);
    segment.append(el("span", "seg__share", percent(share)));
    bar.append(segment);
    const item = el("li");
    item.style.setProperty("--i", String(index));
    item.append(el("i", `sw ${cls}`), el("span", "split__name", part.label), el("strong", "", formatCurrency(part.spent)), el("em", "", percent(share)));
    list.append(item);
  });
  bar.prepend(el("span", "split__total", t("{amount} total", { amount: formatCurrency(data.total.spent) })));
  $("#depts-lede").textContent = t("Five departments account for {top5} of recorded spending. The largest, {name}, is {share} on its own.", {
    top5: percent(top.reduce((sum, item) => sum + item.spent, 0) / data.total.spent),
    name: top[0].label,
    share: percent(top[0].spent / data.total.spent),
  });
}

function renderOverruns(data) {
  const max = Math.max(1, ...data.overruns.map((row) => row.__cash));
  data.overruns.forEach((row) => {
    const card = el("article", "ocard glass");
    const over = row.__cash - row.__modified;
    card.append(
      el("p", "ocard__amount", `+${formatCurrency(over)}`),
      el("h3", "", toDisplayName(row["Budget Name"]) || row["Budget Name"] || "Budget line"),
      el("p", "ocard__meta", `${row.__departmentDisplay}, FY${row.__year}`),
    );
    const bars = el("dl", "ocard__bars");
    for (const [label, value, cls] of [[t("Working budget"), row.__modified, "b"], [t("Cash spent"), row.__cash, "s"]]) {
      const line = el("div", `bar bar--${cls}`);
      line.style.setProperty("--w", (value / max).toFixed(4));
      line.append(el("dt", "", label), el("dd", "", formatCurrency(value)));
      bars.append(line);
    }
    const ratio = row.__modified > 0 ? t("{pct}% above its working budget", { pct: formatNumber(Math.round((over / row.__modified) * 100)) }) : t("Spent against a $0 working budget");
    card.append(bars, el("p", "ocard__ratio", ratio));
    overTrack.append(card);
  });
  renderers.over = (p) => {
    const distance = Number(overScene.dataset.distance || 0);
    const slide = span(p, ROLL.over + 0.04, 0.96);
    overTrack.style.transform = distance ? `translate3d(${(-slide * distance).toFixed(1)}px,0,0)` : "";
  };
}


function renderFindings(data) {
  const grid = $("#insights-grid");
  const first = data.years[0];
  const last = data.years.at(-1);
  const change = (last.spent - first.spent) / first.spent;
  const top = data.departments[0];
  const biggest = data.overruns[0] || null;
  const unspent = data.total.budget - data.total.spent;
  const zeroSum = data.zeroBudget.reduce((sum, row) => sum + row.__cash, 0);
  const findings = [
    {
      tone: "accent",
      value: percent(data.total.spent / data.total.budget, 1),
      title: t("of the working budget was spent"),
      body: t("{spent} recorded against {budget} budgeted, leaving {unspent} unspent across the three years.", { spent: formatCurrency(data.total.spent), budget: formatCurrency(data.total.budget), unspent: formatCurrency(unspent) }),
      wide: true,
    },
    {
      tone: "teal",
      value: `${change >= 0 ? "+" : ""}${percent(change, 1)}`,
      title: t("growth in yearly spending"),
      body: t("Cash spending rose from {first} in FY{firstYear} to {last} in FY{lastYear}.", { first: formatCurrency(first.spent), firstYear: first.label, last: formatCurrency(last.spent), lastYear: last.label }),
    },
    {
      tone: "gold",
      value: percent(top.spent / data.total.spent),
      title: t("goes to one department"),
      body: t("{name} is the largest single line of spending, at {amount}.", { name: top.label, amount: formatCurrency(top.spent) }),
    },
    {
      tone: "rose",
      value: formatNumber(data.overLines),
      title: t("lines spent more than budgeted"),
      body: t("{pct} of all lines. {over10} of them went more than 10% over.", { pct: percent(data.overLines / data.lines, 1), over10: formatNumber(data.over10) }),
    },
    biggest && {
      tone: "red",
      value: `+${formatCurrency(biggest.__cash - biggest.__modified)}`,
      title: t("largest single overrun"),
      body: `${toDisplayName(biggest["Budget Name"]) || biggest["Budget Name"]}, ${biggest.__departmentDisplay}, FY${biggest.__year}.`,
    },
    {
      tone: "ink",
      value: formatNumber(data.zeroBudget.length),
      title: t("lines spent money on a $0 budget"),
      body: t("Together they recorded {amount} in cash spending without a working budget on the line.", { amount: formatCurrency(zeroSum) }),
    },
  ];
  grid.replaceChildren(
    ...findings.filter(Boolean).map((finding, index) => {
      const card = el("article", `insight glass insight--${finding.tone}${finding.wide ? " insight--wide" : ""}`);
      card.style.setProperty("--i", String(index));
      card.append(el("p", "insight__value", finding.value), el("h3", "", finding.title), el("p", "", finding.body));
      return card;
    }),
  );
}


const revealer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      revealer.unobserve(entry.target);
    }
  },
  { rootMargin: "0px 0px -8% 0px" },
);


function setupTilt() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.addEventListener("pointermove", (event) => {
    const card = event.target.closest?.("[data-tilt]");
    if (!card || isStill()) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`);
    card.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  document.addEventListener(
    "pointerout",
    (event) => {
      const card = event.target.closest?.("[data-tilt]");
      if (card && !card.contains(event.relatedTarget)) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      }
    },
    true,
  );
}


const loader = createLoader();


document.addEventListener("marble:loader-hidden", ({ detail }) => {
  const brand = $(".nav__brand img");
  const from = detail?.from;
  if (!brand || !from || isStill()) return;
  detail.logo.style.visibility = "hidden";
  const box = brand.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (box.left + box.width / 2);
  const dy = from.top + from.height / 2 - (box.top + box.height / 2);
  const scale = from.width / box.width;
  brand.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: "none" }], {
    duration: 700,
    easing: "cubic-bezier(0.55, 0, 0.25, 1)",
  });
}, { once: true });


const fillHeadings = [];
function setupHeadingFill() {
  for (const heading of $$(".scene h2, .records h2, .insights h2, .about h2, .metrics__head h2")) {
    const text = heading.textContent.trim();
    const words = text.split(/\s+/);
    const sr = el("span", "sr-only", text);
    const visual = el("span", "fill");
    visual.setAttribute("aria-hidden", "true");
    visual.style.setProperty("--n", String(words.length));
    words.forEach((word, index) => {
      const span = el("span", "fill__w", word);
      span.style.setProperty("--i", String(index));
      visual.append(span, document.createTextNode(" "));
    });
    heading.replaceChildren(sr, visual);
    fillHeadings.push(heading);
  }
}
function updateHeadingFill() {
  const still = isStill();
  for (const heading of fillHeadings) {
    const top = heading.getBoundingClientRect().top;
    const fill = still ? 1 : clamp((innerHeight * 0.92 - top) / (innerHeight * 0.4));
    heading.style.setProperty("--fill", fill.toFixed(3));
  }
}


for (const link of $$(".nav__links a")) {
  const label = link.textContent.trim();
  const roll = el("span", "roll");
  const a = el("span", "", label);
  const b = el("span", "", label);
  b.setAttribute("aria-hidden", "true");
  roll.append(a, b);
  link.replaceChildren(roll);
}


async function load() {
  try {
    const { rows: source, meta } = await loadBudgetData(undefined, { onProgress: loader.progress, onStage: loader.stage });
    loader.step("fetch");
    const rows = source
      .filter((row) => Number(row.Modified) >= 0 && Number(row["Cash Expense"]) >= 0)
      .map((row) => ({
        ...row,
        __cash: Number(row["Cash Expense"]) || 0,
        __modified: Number(row.Modified) || 0,
        __year: String(row.Year),
        __departmentDisplay: toDisplayName(row.Department),
      }));
    loader.step("parse");
    const story = buildStory(rows);
    renderOverview(story);
    renderYears(story);
    renderDepartments(story);
    renderOverruns(story);
    renderFindings(story);
    setupRecords(rows, { meta, excluded: source.length - rows.length });
    for (const card of $$(".metric, .ocard, .insight")) card.dataset.tilt = "";
    for (const node of $$(".insight, .records, .about, .insights__head")) revealer.observe(node);
    mountPillarLayer();
    setupHeadingFill();
    showSourceNote(meta);
    loader.done();
    root.classList.add("is-ready");
    measure();
    update();
    resumePlace();
  } catch (error) {
    console.error(error);
    const alert = $("#load-error");
    alert.hidden = false;
    alert.querySelector("p").textContent = t("The budget data could not load. Check your connection, then retry.");
    alert.querySelector("[data-retry]").onclick = () => location.reload();
    loader.fail();
  }
}


function showSourceNote(meta) {
  const note = $("[data-source-note]");
  if (!note) return;
  const date = meta.fetchedAt ? new Date(meta.fetchedAt).toLocaleDateString(document.documentElement.lang || "en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
  const text = {
    api: t("Live from the Checkbook NYC API, retrieved {date}.", { date }),
    snapshot: t("Checkbook NYC snapshot, retrieved {date}.", { date }),
    csv: t("Saved Checkbook NYC dataset (FY2023 to FY2025)."),
  }[meta.source];
  note.textContent = text || "";
}


const deck = setupDeck({ isStill });
const tour = setupTour({ isStill, getLenis, getScene, measure, deck });

function applyStill() {
  const still = isStill();
  root.classList.toggle("motion-off", still);
  if (still) stopLenis();
  else startLenis();
  deck.setStill(still);
  marble?.setPaused(still);
  pillars?.refresh();
  measure();
  update();
}
systemReduced.addEventListener("change", applyStill);

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", () => {
  measure();
  update();
});
compact.addEventListener("change", () => {
  measure();
  update();
});
document.fonts?.ready.then(() => {
  measure();
  update();
});
new ResizeObserver(() => {
  measure();
  requestUpdate();
}).observe(overTrack);


function mountPillarLayer() {
  const lowEnd = tier === "low";
  if (lowEnd) {
    root.classList.add("no-pillars");
    return;
  }
  import("./pillar3d.js")
    .then(({ mountPillars }) => mountPillars({ isStill, lowDetail: compact.matches || tier === "mid", pixelBudget: tier === "mid" ? 2.4e6 : 4.2e6 }))
    .then((layer) => {
      pillars = layer;
      root.classList.add("pillars-ready");
      measure();
      update();
      resumePlace();
      pendingResume = null;
      layer.refresh();
    })
    .catch((error) => {
      pendingResume = null;
      console.warn("3D pillar unavailable", error);
      root.classList.add("no-pillars");
    });
}


const REWIND = '[data-rewind], a[href="#top"]';
function rewind() {
  tour.stop();
  document.activeElement?.blur?.();
  const done = () => {
    root.classList.remove("is-rewinding");

    $("#top")?.setAttribute("tabindex", "-1");
    $("#top")?.focus({ preventScroll: true });
  };
  const lenisNow = getLenis();
  if (!lenisNow || isStill()) {
    window.scrollTo({ top: 0, behavior: "auto" });
    done();
    return;
  }
  root.classList.add("is-rewinding");
  lenisNow.scrollTo(0, {
    duration: 2,
    easing: easeInOut,
    lock: true,
    force: true,
    onComplete: done,
  });
}
document.addEventListener(
  "click",
  (event) => {
    if (!event.target.closest?.(REWIND)) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    rewind();
  },
  true,
);

setupTilt();
requestAnimationFrame(() => root.classList.add("is-loaded"));
applyStill();
load();
