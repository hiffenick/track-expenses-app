/* ============================================================
   home.js — Expenso Landing Page
   ============================================================ */

(function () {
  'use strict';

  /* ── Intersection observer: reveal [data-anim] elements ── */
  const animEls = document.querySelectorAll('[data-anim]');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  animEls.forEach(el => revealObserver.observe(el));

  /* ── Feature cards scroll-in ────────────────────────────── */
  const featCards = document.querySelectorAll('.lp-feat-card');
  const stepEls   = document.querySelectorAll('.lp-step, .lp-step-arrow');

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = (entry.target.dataset.delay || 0) + 'ms';
        entry.target.style.animation = 'fadeSlideUp 0.5s ease both';
        entry.target.style.opacity   = '1';
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  featCards.forEach((card, i) => {
    card.style.opacity = '0';
    card.dataset.delay  = i * 70;
    cardObserver.observe(card);
  });

  stepEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.dataset.delay  = i * 100;
    cardObserver.observe(el);
  });

  /* ── Navbar: add scrolled class for stronger backdrop ───── */
  const nav = document.querySelector('.lp-nav');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      nav?.classList.add('lp-nav--scrolled');
    } else {
      nav?.classList.remove('lp-nav--scrolled');
    }
  }, { passive: true });

  /* extra nav style for scrolled state */
  const navStyle = document.createElement('style');
  navStyle.textContent = `
    .lp-nav--scrolled {
      background: rgba(10,10,12,0.92) !important;
      box-shadow: 0 1px 0 rgba(255,255,255,0.05);
    }
  `;
  document.head.appendChild(navStyle);

  /* ── Smooth anchor scroll ───────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Trigger hero anims immediately on load ─────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lp-hero [data-anim]').forEach(el => {
      el.classList.add('visible');
    });
  });

})();