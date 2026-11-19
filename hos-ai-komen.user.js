// ==UserScript==
// @name         Hos AI - Komen TikTok
// @namespace    https://github.com/zarouqs-rgb/jambatan
// @version      1.3
// @description  Baca komen LIVE TikTok (baca sahaja) dan hantar ke app Hos AI Live dalam Gemini Canvas.
// @match        https://www.tiktok.com/*
// @match        https://gemini.google.com/*
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

  /* ===== Sebelah Gemini: terima dan hantar ke semua bingkai (termasuk Canvas) ===== */
  if (location.host === 'gemini.google.com') {
    if (window.top !== window) return;
    var gbadge = null, got = 0, linked = false;
    var setG = function (t) {
      if (!gbadge) {
        gbadge = document.createElement('div');
        gbadge.style.cssText =
          'position:fixed;right:8px;bottom:8px;z-index:2147483647;background:#111c;color:#9fe;' +
          'font:11px/1.3 sans-serif;padding:3px 7px;border-radius:6px;pointer-events:none';
        document.documentElement.appendChild(gbadge);
      }
      gbadge.textContent = t;
    };
    var bc = function (w, msg, depth) {
      try { w.postMessage(msg, '*'); } catch (e) {}
      if (depth > 4) return;
      var n = 0;
      try { n = w.frames.length; } catch (e) {}
      for (var i = 0; i < n; i++) {
        try { bc(w.frames[i], msg, depth + 1); } catch (e) {}
      }
    };
    GM_addValueChangeListener(KEY_BATCH, function (n, o, v, remote) {
      if (!remote) return;
      try {
        var d = JSON.parse(v);
        got += (d.items || []).length;
        setG('Hos AI: ' + got + ' komen diterima');
        bc(window, { hosAiSrc: 'tm', hosAiBatch: d.items || [] }, 0);
      } catch (e) {}
    });
    GM_addValueChangeListener(KEY_PING, function (n, o, v, remote) {
      if (!remote) return;
      if (!linked) { linked = true; setG('Hos AI: tersambung dengan TikTok'); }
      bc(window, { hosAiSrc: 'tm', hosAiPing: true }, 0);
    });

    /* --- Tangkap panel komen dari skrin (contoh LIVE Studio), potong kawasan sendiri --- */
    var btn = document.createElement('button');
    btn.textContent = '📷 Tangkap komen';
    btn.style.cssText = 'position:fixed;right:8px;bottom:34px;z-index:2147483647;background:#111c;color:#9fe;' +
      'font:11px sans-serif;padding:4px 8px;border:1px solid #9fe6;border-radius:6px;cursor:pointer';
    document.documentElement.appendChild(btn);
    var capTimer = null, capStream = null;
    var stopCap = function () {
      if (capTimer) clearInterval(capTimer); capTimer = null;
      if (capStream) capStream.getTracks().forEach(function (t) { t.stop(); }); capStream = null;
      btn.textContent = '📷 Tangkap komen';
    };
    btn.onclick = async function () {
      if (capStream) { stopCap(); return; }
      try {
        capStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      } catch (e) { setG('Hos AI: tangkap skrin dibatalkan'); return; }
      var v = document.createElement('video');
      v.muted = true; v.srcObject = capStream; await v.play();
      capStream.getVideoTracks()[0].onended = stopCap;
      /* pilih kawasan: seret kotak di atas pratonton */
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#000d;display:flex;flex-direction:column;align-items:center;justify-content:center;font:14px sans-serif;color:#fff';
      var msg = document.createElement('div');
      msg.textContent = 'Seret kotak di atas bahagian KOMEN sahaja, kemudian tekan Mula';
      msg.style.margin = '8px';
      var wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;cursor:crosshair';
      v.style.cssText = 'max-width:88vw;max-height:72vh;display:block';
      var box = document.createElement('div');
      box.style.cssText = 'position:absolute;border:2px solid #0f0;background:#0f02;display:none;pointer-events:none';
      wrap.appendChild(v); wrap.appendChild(box);
      var go = document.createElement('button'); go.textContent = 'Mula'; go.style.cssText = 'margin:10px;padding:6px 18px;font-size:14px';
      var cancel = document.createElement('button'); cancel.textContent = 'Batal'; cancel.style.cssText = 'padding:6px 14px';
      var row = document.createElement('div'); row.appendChild(go); row.appendChild(cancel);
      ov.appendChild(msg); ov.appendChild(wrap); ov.appendChild(row); document.documentElement.appendChild(ov);
      var r = null, sx = 0, sy = 0, drag = false;
      var pos = function (e) { var b = v.getBoundingClientRect(); return [Math.max(0, Math.min(b.width, e.clientX - b.left)), Math.max(0, Math.min(b.height, e.clientY - b.top))]; };
      wrap.onmousedown = function (e) { var q = pos(e); sx = q[0]; sy = q[1]; drag = true; };
      wrap.onmousemove = function (e) {
        if (!drag) return; var q = pos(e);
        var x = Math.min(sx, q[0]), y = Math.min(sy, q[1]), w = Math.abs(q[0] - sx), h = Math.abs(q[1] - sy);
        r = { x: x, y: y, w: w, h: h }; box.style.display = 'block';
        box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
      };
      wrap.onmouseup = function () { drag = false; };
      cancel.onclick = function () { ov.remove(); stopCap(); };
      go.onclick = function () {
        if (!r || r.w < 20 || r.h < 20) { msg.textContent = 'Seret kotak dahulu (kotak hijau)'; return; }
        var b = v.getBoundingClientRect(), kx = v.videoWidth / b.width, ky = v.videoHeight / b.height;
        var cx = r.x * kx, cy = r.y * ky, cw = r.w * kx, ch = r.h * ky;
        ov.remove();
        var cvs = document.createElement('canvas'), sc = Math.min(1, 700 / cw);
        cvs.width = Math.round(cw * sc); cvs.height = Math.round(ch * sc);
        var c2 = cvs.getContext('2d', { willReadFrequently: true });
        var tiny = document.createElement('canvas'); tiny.width = 48; tiny.height = 48;
        var tc = tiny.getContext('2d', { willReadFrequently: true });
        var prev = null, sent = null, same = 0;
        btn.textContent = '⏹ Berhenti tangkap';
        setG('Hos AI: menangkap panel komen');
        capTimer = setInterval(function () {
          if (v.readyState < 2) return;
          c2.drawImage(v, cx, cy, cw, ch, 0, 0, cvs.width, cvs.height);
          tc.drawImage(cvs, 0, 0, 48, 48);
          var d = tc.getImageData(0, 0, 48, 48).data, h = [];
          for (var i = 0; i < d.length; i += 16) h.push(d[i] >> 4);
          var cur = h.join('');
          var diff = 0;
          if (prev) for (var k = 0; k < cur.length; k++) if (cur[k] !== prev[k]) diff++;
          prev = cur;
          if (diff > 8) { same = 0; return; }       /* masih bergerak */
          same++;
          if (same < 2 || cur === sent) return;     /* tunggu berhenti 2 kali, jangan hantar sama */
          sent = cur;
          bc(window, { hosAiSrc: 'tm', hosAiImg: cvs.toDataURL('image/jpeg', 0.7) }, 0);
          setG('Hos AI: gambar komen dihantar');
        }, 1500);
      };
    };
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

  var GIFT_RX = /\b(sent|menghantar|hantar|dihantar|gift|hadiah)\b/i;
  function readGift(el) {
    var o = el.querySelector('[data-e2e="message-owner-name"]');
    var name = o ? o.textContent.trim() : '';
    var full = (el.textContent || '').trim();
    var i = name ? full.indexOf(name) : -1;
    var text = (i >= 0 ? full.slice(i + name.length) : full).trim();
    if (!name) name = 'Penonton';
    return { user: name, text: text.slice(0, 60), gift: true };
  }
  function poll() {
    if (!isLivePage()) { first = true; return; }
    var rows = document.querySelectorAll('[data-e2e="chat-message"],[data-e2e*="gift"],[data-e2e="social-message"]');
    var items = [];
    rows.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      if (first) return; /* abaikan komen lama sebelum skrip mula */
      var tag = el.getAttribute('data-e2e') || '';
      var it = null;
      if (/gift/i.test(tag)) it = readGift(el);
      else if (tag === 'social-message' && GIFT_RX.test(el.textContent || '') && !/\bjoined\b|menyertai/i.test(el.textContent || '')) it = readGift(el);
      else if (tag === 'chat-message') it = read(el);
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
