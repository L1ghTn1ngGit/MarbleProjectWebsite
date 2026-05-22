import { state } from '../state.js';
import { createDepartmentChart } from './charts.js';

export function setupDarkMode() {}

let navTogglePressTimer = null;

export function setupNavToggle() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('primaryNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    toggle.classList.add('is-clicked');
    clearTimeout(navTogglePressTimer);
    navTogglePressTimer = window.setTimeout(() => {
      toggle.classList.remove('is-clicked');
    }, 150);

    const open = nav.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

export function setupNavLinks() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

export function updateActiveNav() {
  const sections = ['overview', 'spending', 'offenders', 'data-table', 'insights'];
  let active = '';
  for (const id of sections) {
    const rect = document.getElementById(id)?.getBoundingClientRect();
    if (rect && rect.top <= 150 && rect.bottom >= 150) { active = id; break; }
  }
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href').slice(1) === active);
  });
}
