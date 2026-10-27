import { STRINGS } from "./strings.js";

export const LANGS = [
  { code: "en", name: "English", short: "EN" },
  { code: "es", name: "Español", short: "ES" },
  { code: "zh", name: "简体中文", short: "中文", html: "zh-Hans" },
  { code: "ru", name: "Русский", short: "RU" },
  { code: "ht", name: "Kreyòl ayisyen", short: "HT" },
  { code: "bn", name: "বাংলা", short: "বাং" },
];
const STORAGE_KEY = "marble-lang";

function readLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {}
  const code = fromUrl || saved || "en";
  return LANGS.some((lang) => lang.code === code) ? code : "en";
}
export const lang = readLang();
const meta = LANGS.find((item) => item.code === lang);
document.documentElement.lang = meta.html || meta.code;

const norm = (text) => text.replace(/\s+/g, " ").trim();

export function t(english, vars = {}) {
  const entry = STRINGS[english];
  const text = (lang !== "en" && entry?.[lang]) || english;
  return text.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? vars[key] : `{${key}}`,
  );
}

const TEXT_SELECTOR =
  "h1,h2,h3,h4,p,li,a,button,label,summary,th,option,figcaption,dt,dd,span,strong,em,div,legend,caption";
const ATTRS = ["aria-label", "placeholder", "title"];

const TEMPLATES = Object.keys(STRINGS)
  .filter((key) => key.includes("{"))
  .map((key) => {
    const names = [];
    const pattern = key
      .split(/(\{\w+\})/)
      .map((part) => {
        const name = part.match(/^\{(\w+)\}$/)?.[1];
        if (name) {
          names.push(name);
          return "(.+?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    return { key, names, regex: new RegExp(`^${pattern}$`) };
  });

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// values pulled out of the page text can be budget names from the data, so they
// are escaped whenever the result is going to be written as html
function lookup(text, html = false) {
  const entry = STRINGS[text];
  if (entry?.[lang]) return entry[lang];
  for (const template of TEMPLATES) {
    const match = text.match(template.regex);
    if (!match || !STRINGS[template.key][lang]) continue;
    const vars = Object.fromEntries(
      template.names.map((name, index) => [name, html ? escapeHtml(match[index + 1]) : match[index + 1]]),
    );
    return t(template.key, vars);
  }
  return null;
}

export function translateDom(root = document.body) {
  if (lang === "en") return;
  for (const el of root.querySelectorAll(TEXT_SELECTOR)) {
    if (el.closest("script,style,svg,tbody,[data-no-i18n],[translate='no']"))
      continue;
    if (el.querySelector("[data-fill],[data-count],[data-meter]")) continue;

    if (
      [...el.children].some(
        (child) =>
          !/^(STRONG|EM|B|I|BR|SPAN)$/.test(child.tagName) ||
          child.children.length,
      )
    )
      continue;
    const current = norm(el.textContent);
    if (current && current === el.dataset.i18nOut) continue;
    const translated = lookup(current, true);
    if (!translated) continue;
    if (/[<&]/.test(translated)) el.innerHTML = translated;
    else el.textContent = translated;
    el.dataset.i18nOut = norm(el.textContent);
  }
  for (const attr of ATTRS) {
    for (const el of root.querySelectorAll(`[${attr}]`)) {
      const value = el.getAttribute(attr);
      if (value === el.getAttribute(`data-i18n-${attr}`)) continue;
      const translated = lookup(value);
      if (!translated) continue;
      el.setAttribute(attr, translated);
      el.setAttribute(`data-i18n-${attr}`, translated);
    }
  }
}

export function setupLangMenu() {
  const wrap = document.querySelector(".lang");
  if (!wrap) return;
  const button = wrap.querySelector(".lang__button");
  const menu = wrap.querySelector(".lang__menu");
  button.querySelector(".lang__code").textContent = meta.short;
  button.setAttribute("aria-label", `${t("Language")}: ${meta.name}`);
  menu.replaceChildren(
    ...LANGS.map((item) => {
      const li = document.createElement("li");
      const option = document.createElement("button");
      option.type = "button";
      option.lang = item.html || item.code;
      option.textContent = item.name;
      option.setAttribute("aria-current", String(item.code === lang));
      option.addEventListener("click", () => {
        try {
          localStorage.setItem(STORAGE_KEY, item.code);
        } catch {}
        const url = new URL(location.href);
        url.searchParams.delete("lang");
        location.assign(url);
      });
      li.append(option);
      return li;
    }),
  );
  const close = () => {
    wrap.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  };
  button.addEventListener("click", () => {
    const open = !wrap.classList.contains("is-open");
    wrap.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector('[aria-current="true"]')?.focus();
  });
  wrap.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      button.focus();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const items = [...menu.querySelectorAll("button")];
      const at = items.indexOf(document.activeElement);
      if (at < 0) return;
      event.preventDefault();
      items[
        (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length
      ].focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) close();
  });
}
