/* swissmodern — main.js
   1. Page transitions (fade to/from #111)
   1b. Eased chapter scroll (anchors on the current page)
   2. Scroll-triggered section reveals (Intersection Observer)
   3. Hamburger panel (open/close, ≡ ↔ ×)
   4. Language toggle (localStorage + redirect)
*/
'use strict';

// Durations live in style.css :root — read them so CSS stays the single source of truth.
const cssMs = (name, fallback) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  return raw.endsWith('ms') ? n : n * 1000;
};
const FADE_PAGE_MS   = cssMs('--fade-page', 800);
const SCROLL_BASE_MS = cssMs('--scroll-duration', 1400);
const reduceMotion   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── 1. Page Transitions ──────────────────────────────────────────────────────

const transition = document.querySelector('.page-transition');

window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.remove('is-loading');
  if (transition) transition.classList.remove('is-visible');
});

// ─── 1b. Eased chapter scroll ─────────────────────────────────────────────────
// Native scroll-behavior: smooth has no easing control and stops abruptly. This runs the
// document scroll with an ease-out falloff (quintic), duration scaled by distance, and
// hands control back the moment the visitor scrolls on their own.

const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

const scrollToSection = (el) => {
  const start    = window.scrollY;
  const target   = Math.round(el.getBoundingClientRect().top + start);
  const distance = target - start;
  if (reduceMotion || Math.abs(distance) < 2) { window.scrollTo(0, target); return; }

  const viewports = Math.abs(distance) / window.innerHeight;
  const duration  = SCROLL_BASE_MS * Math.min(1.75, Math.max(0.75, viewports));
  let cancelled = false;
  const cancel = () => { cancelled = true; };
  window.addEventListener('wheel', cancel, { once: true, passive: true });
  window.addEventListener('touchstart', cancel, { once: true, passive: true });

  const t0 = performance.now();
  const step = (now) => {
    if (cancelled) return;
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, start + distance * easeOutQuint(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;
  const url = new URL(link.href, window.location.href);
  // Chapter anchor on the current page ("#raeume", or "/#raeume" on the homepage): ease
  // the scroll in place. No page fade — nothing new loads, the overlay would stay up.
  if (url.pathname === window.location.pathname && url.hash) {
    const section = document.getElementById(url.hash.slice(1));
    if (!section) return;
    e.preventDefault();
    scrollToSection(section);
    history.pushState(null, '', url.hash);
    return;
  }
  if (href.startsWith('#')) return;
  e.preventDefault();
  if (transition) transition.classList.add('is-visible');
  setTimeout(() => { window.location.href = href; }, FADE_PAGE_MS);
});

// Mockup switch for the meeting with Martin (session 10): /?wordmark shows the wordmark
// as the opener title. Demo only — remove together with the CSS variant once decided.
if (new URLSearchParams(window.location.search).has('wordmark')) {
  document.body.classList.add('variant-wordmark-title');
}

// ─── 2. Scroll Reveals ────────────────────────────────────────────────────────

const revealEls = document.querySelectorAll('.hero-content');

if (revealEls.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  revealEls.forEach((el) => observer.observe(el));
}

// ─── 3. Hamburger Panel ───────────────────────────────────────────────────────

const menuToggle = document.querySelector('.menu-toggle');
const menuPanel  = document.querySelector('.menu-panel');
const siteHeader = document.querySelector('.site-header');

if (menuToggle && menuPanel) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuPanel.classList.contains('is-open');
    if (isOpen) {
      menuPanel.classList.remove('is-open');
      siteHeader.classList.remove('menu-is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    } else {
      menuPanel.classList.add('is-open');
      siteHeader.classList.add('menu-is-open');
      menuToggle.setAttribute('aria-expanded', 'true');
    }
  });

  document.addEventListener('click', (e) => {
    if (!menuPanel.classList.contains('is-open')) return;
    const outside = !menuPanel.contains(e.target) && !menuToggle.contains(e.target);
    // A chapter link inside the panel scrolls in place, so the panel must close itself.
    const panelLink = e.target.closest('.menu-panel a');
    if (outside || panelLink) {
      menuPanel.classList.remove('is-open');
      siteHeader.classList.remove('menu-is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ─── 4. Language Toggle ───────────────────────────────────────────────────────

const getLangAlternate = (path, targetLang) => {
  if (targetLang === 'en') {
    if (path.startsWith('/en/')) return path;
    return '/en' + (path === '/' ? '/' : path);
  } else {
    if (!path.startsWith('/en/')) return path;
    return path.replace(/^\/en/, '') || '/';
  }
};

// Query string and hash survive the language switch: "/?wordmark" and "/#zuhause" must
// land on "/en/?wordmark" and "/en/#zuhause", not on the top of "/en/".
const keepQueryAndHash = (path) => path + window.location.search + window.location.hash;

const langToggle = document.querySelector('.lang-toggle');
if (langToggle) {
  langToggle.addEventListener('click', () => {
    const currentLang = document.documentElement.lang || 'de';
    const targetLang  = currentLang === 'de' ? 'en' : 'de';
    const targetPath  = getLangAlternate(window.location.pathname, targetLang);
    localStorage.setItem('preferred-lang', targetLang);
    window.location.href = keepQueryAndHash(targetPath);
  });
}

const preferredLang = localStorage.getItem('preferred-lang');
if (preferredLang) {
  const currentLang = document.documentElement.lang || 'de';
  if (preferredLang !== currentLang) {
    const targetPath = getLangAlternate(window.location.pathname, preferredLang);
    if (targetPath !== window.location.pathname) {
      window.location.replace(keepQueryAndHash(targetPath));
    }
  }
}
