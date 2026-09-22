/* swissmodern — main.js
   1. Page transitions (fade to/from #111)
   2. Scroll-triggered section reveals (Intersection Observer)
   3. Hamburger panel (open/close, ≡ ↔ ×)
   4. Language toggle (localStorage + redirect)
*/
'use strict';

// ─── 1. Page Transitions ──────────────────────────────────────────────────────

const transition = document.querySelector('.page-transition');

window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.remove('is-loading');
  if (transition) transition.classList.remove('is-visible');
});

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('#') ||
      href.startsWith('mailto') || href.startsWith('tel')) return;
  // Chapter anchors on the current page ("/#raeume" on the homepage) scroll in place;
  // fading out would leave the overlay up, because no new page loads.
  const url = new URL(link.href, window.location.href);
  if (url.pathname === window.location.pathname && url.hash) return;
  e.preventDefault();
  if (transition) transition.classList.add('is-visible');
  setTimeout(() => { window.location.href = href; }, 400);
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

const langToggle = document.querySelector('.lang-toggle');
if (langToggle) {
  langToggle.addEventListener('click', () => {
    const currentLang = document.documentElement.lang || 'de';
    const targetLang  = currentLang === 'de' ? 'en' : 'de';
    const targetPath  = getLangAlternate(window.location.pathname, targetLang);
    localStorage.setItem('preferred-lang', targetLang);
    window.location.href = targetPath;
  });
}

const preferredLang = localStorage.getItem('preferred-lang');
if (preferredLang) {
  const currentLang = document.documentElement.lang || 'de';
  if (preferredLang !== currentLang) {
    const targetPath = getLangAlternate(window.location.pathname, preferredLang);
    if (targetPath !== window.location.pathname) {
      window.location.replace(targetPath);
    }
  }
}
