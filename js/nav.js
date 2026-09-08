/* ============================================================
   סרגל עליון · המסע ל-50K
   מוזרק אוטומטית בכל דף מוגן אחרי שהשער אישר את המשתמש.
   מקשיב ל-oriane:ready, ולכן לעולם לא מוצג למי שאין לו גישה.

   עיצוב עצמאי (נייבי + ורוד), לא תלוי בטוקנים של הדף שבו הוא יושב,
   כך שהוא נראה זהה בכל מסך מוגן באתר.
   תוויות התפריט: "מסע הבית" ו"האזור שלי" בלבד (+ "ניהול" למנהלים).
   מצד ה"סוף" (בכניסה RTL זה קצה שמאל חזותית): כפתור "השארת פרטים
   לתהליך עסקי" (מוצג רק אם הוגדר קישור ב-admin.html), ולידו שם
   המשתמש + אווטאר שמובילים לעדכון פרטים אישיים (me.html).
   ============================================================ */
(function () {
  'use strict';

  var CSS = [
    "@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');",
    '.onav{position:sticky;top:0;z-index:250;display:flex;align-items:center;gap:8px;flex-wrap:nowrap;',
    '  background:#0a1c38;border-bottom:1px solid rgba(252,193,203,.16);',
    '  padding:9px 16px;margin:0;min-height:58px;font-family:Heebo,sans-serif}',
    '.onav .brand{font-family:"Caveat",cursive;font-size:23px;font-weight:700;color:#fcc1cb;',
    '  text-decoration:none;white-space:nowrap;margin-inline-end:6px}',
    '.onav .menu{display:flex;align-items:center;gap:2px;margin-inline-end:auto}',
    '.onav .menu a{font-size:13.5px;font-weight:600;color:#93a6c4;text-decoration:none;',
    '  padding:8px 13px;border-radius:30px;transition:.15s;white-space:nowrap}',
    '.onav .menu a:hover{color:#eaf1fb;background:rgba(255,255,255,.05)}',
    '.onav .menu a.on{color:#2a1018;background:#fcc1cb}',
    '.onav .biz{font-size:12.5px;font-weight:700;color:#2a1018;background:#fcc1cb;',
    '  padding:9px 15px;border-radius:30px;text-decoration:none;white-space:nowrap;',
    '  box-shadow:0 0 14px rgba(252,193,203,.35);flex:none}',
    '.onav .biz:hover{filter:brightness(1.05)}',
    '.onav .crmbtn{font-size:12.5px;font-weight:700;color:#2a1018;background:#fcc1cb;',
    '  padding:9px 15px;border-radius:30px;text-decoration:none;white-space:nowrap;',
    '  box-shadow:0 0 14px rgba(252,193,203,.35);flex:none;margin-inline-end:6px}',
    '.onav .crmbtn:hover{filter:brightness(1.05)}',
    '.onav .who{display:flex;align-items:center;gap:8px;cursor:pointer;background:transparent;',
    '  border:0;padding:5px 6px 5px 4px;border-radius:30px;flex:none;font-family:inherit}',
    '.onav .who:hover{background:rgba(255,255,255,.05)}',
    '.onav .who .avatar{width:30px;height:30px;border-radius:50%;background:#0d2242;',
    '  border:1px solid rgba(252,193,203,.3);display:grid;place-items:center;color:#fcc1cb;',
    '  font-weight:700;font-size:13px;flex:none}',
    '.onav .who .txt{font-size:11px;line-height:1.3;color:#93a6c4;text-align:start;direction:ltr;',
    '  max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.onav .who .txt b{display:block;color:#eaf1fb;font-size:12.5px;font-weight:700;direction:rtl;',
    '  text-align:start;max-width:150px;overflow:hidden;text-overflow:ellipsis}',
    '.onav .out{background:transparent;border:1px solid rgba(252,193,203,.22);color:#93a6c4;',
    '  font-size:11.5px;font-weight:600;padding:8px 12px;border-radius:30px;cursor:pointer;',
    '  font-family:inherit;flex:none}',
    '.onav .out:hover{color:#eaf1fb;border-color:rgba(252,193,203,.45)}',
    '@media(max-width:760px){',
    '  .onav .menu a{padding:8px 10px;font-size:12.5px}',
    '  .onav .who .txt{display:none}',
    '  .onav .biz{padding:8px 12px;font-size:12px}',
    '  .onav .crmbtn{padding:8px 12px;font-size:12px}',
    '}',
    '@media(max-width:460px){ .onav .out{display:none} }'
  ].join('');

  document.addEventListener('oriane:ready', function (ev) {
    var me = ev.detail || {};
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var db = window.ORIANE_DB;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function link(href, label, active) {
      return '<a class="' + (active ? 'on' : '') + '" href="' + href + '">' + label + '</a>';
    }

    var initial = (me.name || me.email || '?').trim().charAt(0).toUpperCase();

    var html =
      '<nav class="onav" dir="rtl">' +
        '<a class="brand" href="index.html">המסע ל-50K</a>' +
        '<a class="crmbtn" href="https://crmorian.web.app/" target="_blank" rel="noopener">לניהול העסק שלי</a>' +
        '<div class="menu">' +
          link('index.html', 'מסע הבית', here === 'index.html') +
          link('ask.html', 'שאלות', here === 'ask.html') +
          (me.isAdmin ? link('admin.html', 'ניהול', here === 'admin.html' || here === 'dashboard.html') : '') +
        '</div>' +
        '<span id="onavBizSlot"></span>' +
        '<button class="who" id="onavWho" type="button" title="עדכון פרטים אישיים">' +
          '<span class="txt"><b>' + esc(me.name || 'המשתמש') + '</b>' + esc(me.email || '') + '</span>' +
          '<span class="avatar">' + esc(initial || '🙂') + '</span>' +
        '</button>' +
        '<button class="out" id="onav-out" type="button">יציאה</button>' +
      '</nav>';

    document.body.insertAdjacentHTML('afterbegin', html);

    document.getElementById('onavWho').addEventListener('click', function () {
      location.href = 'me.html';
    });

    document.getElementById('onav-out').addEventListener('click', function () {
      var auth = window.ORIANE_AUTH || (window.firebase && firebase.auth && firebase.auth());
      if (!auth) return location.replace('login.html');
      auth.signOut().then(function () {
        location.replace('login.html');
      }).catch(function () {
        location.replace('login.html');
      });
    });

    // ---------- כפתור "השארת פרטים לתהליך עסקי" ----------
    // מוצג רק אם המנהל הגדיר קישור במסך הניהול (settings/site).
    if (db) {
      db.collection('settings').doc('site').get().then(function (snap) {
        var s = snap.exists ? snap.data() : {};
        var url = (s.businessLinkUrl || '').trim();
        if (!url) return;
        var label = (s.businessLinkLabel || '').trim() || 'השארת פרטים לתהליך עסקי';
        var slot = document.getElementById('onavBizSlot');
        if (slot) {
          slot.innerHTML = '<a class="biz" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
        }
      }).catch(function (e) { console.error('[nav] settings/site', e); });
    }
  });
})();
