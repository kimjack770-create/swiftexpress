// ========================================================
// SWIFT EXPRESS LOGISTICS - HEADER COMPONENT
// Dynamic navigation bar, active tab tracking, mobile drawer & theme switcher
// ========================================================

import { authService } from '../services/authService.js';

export function renderHeader() {
  const headerContainer = document.getElementById('header-container');
  if (!headerContainer) return;

  const currentUser = authService.getCurrentUser();
  const currentPath = window.location.pathname;
  const siteRootUrl = new URL('../../', import.meta.url);
  const buildSiteHref = (path) => new URL(path, siteRootUrl).pathname;

  headerContainer.innerHTML = `
    <nav class="navbar">
      <div class="container nav-container">
        <a href="${buildSiteHref('index.html')}" class="brand-logo">
          <div class="brand-icon"><i class="fas fa-shipping-fast"></i></div>
          SWIFT<span>EXPRESS</span>
        </a>

        <ul class="nav-menu" id="navMenu">
          <li><a href="${buildSiteHref('index.html')}" class="nav-link ${currentPath.includes('index.html') || currentPath === '/' ? 'active' : ''}">Home</a></li>
          <li><a href="${buildSiteHref('about.html')}" class="nav-link ${currentPath.includes('about.html') ? 'active' : ''}">About Us</a></li>
          <li><a href="${buildSiteHref('services.html')}" class="nav-link ${currentPath.includes('services.html') ? 'active' : ''}">Services</a></li>
          <li><a href="${buildSiteHref('pricing.html')}" class="nav-link ${currentPath.includes('pricing.html') ? 'active' : ''}">Pricing</a></li>
          <li><a href="${buildSiteHref('tracking.html')}" class="nav-link ${currentPath.includes('tracking.html') ? 'active' : ''}">Track Package</a></li>
          <li><a href="${buildSiteHref('quote.html')}" class="nav-link ${currentPath.includes('quote.html') ? 'active' : ''}">Get a Quote</a></li>
          <li><a href="${buildSiteHref('faq.html')}" class="nav-link ${currentPath.includes('faq.html') ? 'active' : ''}">FAQ</a></li>
          <li><a href="${buildSiteHref('blog.html')}" class="nav-link ${currentPath.includes('blog.html') ? 'active' : ''}">Blog</a></li>
          <li><a href="${buildSiteHref('contact.html')}" class="nav-link ${currentPath.includes('contact.html') ? 'active' : ''}">Contact</a></li>
        </ul>

        <div class="nav-actions">
          <!-- Language Selector -->
          <div class="lang-selector-wrap" id="langSelectorWrap" style="position: relative; display: inline-flex; align-items: center;">
            <button class="theme-toggle-btn" id="langToggleBtn" title="Translate Page" style="gap:0.3rem;">
              <i class="fas fa-globe"></i>
            </button>
            <div id="google_translate_element" style="position: absolute; top: 110%; right: 0; min-width: 180px; z-index: 9999; opacity: 0; pointer-events: none; transition: opacity 0.2s;"></div>
          </div>

          <button class="theme-toggle-btn" id="themeToggleBtn" title="Toggle Light/Dark Theme">
            <i class="fas fa-moon"></i>
          </button>

          <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle navigation menu" aria-expanded="false">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>
    </nav>
  `;

  // Inject Google Translate script once
  if (!document.getElementById('google-translate-script')) {
    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE },
        'google_translate_element'
      );
    };
    const gScript = document.createElement('script');
    gScript.id = 'google-translate-script';
    gScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    gScript.async = true;
    document.head.appendChild(gScript);
  }

  // Language Toggle Listener
  const langBtn = document.getElementById('langToggleBtn');
  const translateEl = document.getElementById('google_translate_element');
  let langOpen = false;
  if (langBtn && translateEl) {
    langBtn.onclick = (e) => {
      e.stopPropagation();
      langOpen = !langOpen;
      translateEl.style.opacity = langOpen ? '1' : '0';
      translateEl.style.pointerEvents = langOpen ? 'all' : 'none';
    };
    document.addEventListener('click', () => {
      langOpen = false;
      translateEl.style.opacity = '0';
      translateEl.style.pointerEvents = 'none';
    });
  }

  // Theme Toggle Listener
  const themeBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('sel_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeBtn.querySelector('i').className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

  themeBtn.onclick = () => {
    const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('sel_theme', nextTheme);
    themeBtn.querySelector('i').className = nextTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  };

  // Mobile Menu Drawer Listener
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navMenu = document.getElementById('navMenu');

  const closeMenu = () => {
    navMenu.classList.remove('open');
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.classList.remove('nav-open');
  };

  const openMenu = () => {
    navMenu.classList.add('open');
    mobileBtn.setAttribute('aria-expanded', 'true');
    mobileBtn.innerHTML = '<i class="fas fa-times"></i>';
    document.body.classList.add('nav-open');
  };

  mobileBtn.onclick = () => {
    if (navMenu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  navMenu.querySelectorAll('a').forEach(link => {
    link.onclick = () => closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (!navMenu.contains(event.target) && !mobileBtn.contains(event.target)) {
      closeMenu();
    }
  });
}
