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

  headerContainer.innerHTML = `
    <nav class="navbar">
      <div class="container nav-container">
        <a href="/index.html" class="brand-logo">
          <div class="brand-icon"><i class="fas fa-shipping-fast"></i></div>
          SWIFT<span>EXPRESS</span>
        </a>

        <ul class="nav-menu" id="navMenu">
          <li><a href="/index.html" class="nav-link ${currentPath.includes('index.html') || currentPath === '/' ? 'active' : ''}">Home</a></li>
          <li><a href="/about.html" class="nav-link ${currentPath.includes('about.html') ? 'active' : ''}">About Us</a></li>
          <li><a href="/services.html" class="nav-link ${currentPath.includes('services.html') ? 'active' : ''}">Services</a></li>
          <li><a href="/pricing.html" class="nav-link ${currentPath.includes('pricing.html') ? 'active' : ''}">Pricing</a></li>
          <li><a href="/tracking.html" class="nav-link ${currentPath.includes('tracking.html') ? 'active' : ''}">Track Package</a></li>
          <li><a href="/quote.html" class="nav-link ${currentPath.includes('quote.html') ? 'active' : ''}">Get a Quote</a></li>
          <li><a href="/faq.html" class="nav-link ${currentPath.includes('faq.html') ? 'active' : ''}">FAQ</a></li>
          <li><a href="/blog.html" class="nav-link ${currentPath.includes('blog.html') ? 'active' : ''}">Blog</a></li>
          <li><a href="/contact.html" class="nav-link ${currentPath.includes('contact.html') ? 'active' : ''}">Contact</a></li>
        </ul>

        <div class="nav-actions">
          <button class="theme-toggle-btn" id="themeToggleBtn" title="Toggle Light/Dark Theme">
            <i class="fas fa-moon"></i>
          </button>

          ${currentUser ? `` : `
            <a href="/quote.html" class="btn btn-accent btn-sm">Book Shipment</a>
          `}

          <button class="mobile-menu-btn" id="mobileMenuBtn">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>
    </nav>
  `;

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
  mobileBtn.onclick = () => {
    navMenu.classList.toggle('open');
  };
}
