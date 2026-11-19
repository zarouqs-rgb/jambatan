// ==UserScript==
// @name         Hos AI - Komen TikTok
// @namespace    https://github.com/zarouqs-rgb/jambatan
// @version      1.0
// @description  Baca komen LIVE TikTok (baca sahaja) dan hantar ke app Hos AI Live dalam Gemini Canvas.
// @match        https://www.tiktok.com/*
// @match        https://*.scf.usercontent.goog/*
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/zarouqs-rgb/jambatan/main/hos-ai-komen.user.js
// @downloadURL  https://raw.githubusercontent.com/zarouqs-rgb/jambatan/main/hos-ai-komen.user.js
// ==/UserScript==

(function () {
  'use strict';
  var KEY_BATCH = 'hosai_batch';
  var KEY_PING = 'hosai_ping';

  /* ===== Sebelah Canvas: terima dan hantar ke app ===== */
  if (location.host.indexOf('usercontent.goog') !== -1) {
    GM_addValueChangeListener(KEY_BATCH, function (n, o, v, remote) {
      if (!remote) return;
      try {
        var d = JSON.parse(v);
        window.postMessage({ hosAiBatch: d.items || [] }, '*');
      } catch (e) {}
    });
    GM_addValueChangeListener(KEY_PING, function (n, o, v, remote) {
      if (!remote) return;
      window.postMessage({ hosAiPing: true }, '*');
    });
    return;
  }

  /* ===== Sebelah TikTok: baca komen (baca sahaja) ===== */
  if (window.top !== window) return;
  var seen = new WeakSet();
  var first = true;
  var sent = 0;
  var badge = null;

  function isLivePage() {
    return /^\/@[^/]+\/live\/?$/.test(location.pathname);
  }

  function showBadge() {
    if (!badge) {
      badge = document.createElement('div');
      badge.style.cssText =
        'position:fixed;left:8px;bottom:8px;z-index:2147483647;background:#111c;color:#9fe;' +
        'font:11px/1.3 sans-serif;padding:3px 7px;border-radius:6px;pointer-events:none';
      document.documentElement.appendChild(badge);
    }
    badge.textContent = 'Hos AI: ' + sent + ' komen dihantar';
  }

  function read(el) {
    if (el.querySelector('[data-e2e="enter-message"]')) return null;
    var o = el.querySelector('[data-e2e="message-owner-name"]');
    var name = o ? o.textContent.trim() : '';
    var full = el.textContent || '';
    var i = name ? full.indexOf(name) : -1;
    var text = (i >= 0 ? full.slice(i + name.length) : full).trim();
    if (!name || !text) return null;
    if (/joined$/i.test(text) && text.length < 12) return null;
    return { user: name, text: text.slice(0, 300) };
  }

  function poll() {
    if (!isLivePage()) { first = true; return; }
    var rows = document.querySelectorAll('[data-e2e="chat-message"]');
    var items = [];
    rows.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      if (first) return; /* abaikan komen lama sebelum skrip mula */
      var it = read(el);
      if (it) items.push(it);
    });
    if (rows.length) first = false;
    if (items.length) {
      items = items.slice(-5);
      GM_setValue(KEY_BATCH, JSON.stringify({ t: Date.now(), r: Math.random(), items: items }));
      sent += items.length;
      showBadge();
    }
  }

  setInterval(poll, 1500);
  setInterval(function () {
    if (isLivePage()) { GM_setValue(KEY_PING, Date.now()); showBadge(); }
  }, 5000);
})();
