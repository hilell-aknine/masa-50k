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

  /* כפתור התמיכה · יעד סופי טרם הוכרע (הלל, 08.09.2026).
     היעד נשלט ממסך הניהול (settings/site.supportUrl) ולא מהקוד, כדי שאפשר
     יהיה להחליף אותו בלי פריסה מחדש. עד שיוגדר יעד, הכפתור מוביל למסך
     "שאלות לאוריאן" שכבר קיים וחי, כדי שלא יהיה כפתור מת. */
  var SUPPORT_FALLBACK = 'ask.html';
  var SUPPORT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9"/>' +
    '<path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.3-2.7 2.3"/>' +
    '<path d="M12 17h.01"/></svg>';

  var CSS = [
    "@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');",
    '.onav{position:sticky;top:0;z-index:250;display:flex;align-items:center;gap:8px;flex-wrap:nowrap;',
    '  background:#0a1c38;border-bottom:1px solid rgba(252,193,203,.16);',
    '  padding:9px 16px;margin:0;min-height:58px;font-family:Heebo,sans-serif;',
    // בטלפון תוכן הסרגל רחב מהמסך. בלי זה כל הדף נגרר לצדדים ומקבל
    // פס גלילה אופקי. עכשיו הסרגל עצמו גולל בפנים והדף נשאר במקום.
    '  max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
    '.onav::-webkit-scrollbar{display:none}',
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
    '.onav .sup{display:inline-flex;align-items:center;gap:6px;background:transparent;',
    '  border:1px solid rgba(252,193,203,.22);color:#93a6c4;font-size:11.5px;font-weight:600;',
    '  padding:8px 12px;border-radius:30px;text-decoration:none;white-space:nowrap;flex:none;',
    '  margin-inline-end:6px}',
    '.onav .sup:hover{color:#eaf1fb;border-color:rgba(252,193,203,.45)}',
    '.onav .sup svg{width:14px;height:14px;flex:none}',
    '@media(max-width:760px){',
    '  .onav .menu a{padding:8px 10px;font-size:12.5px}',
    '  .onav .who .txt{display:none}',
    '  .onav .biz{padding:8px 12px;font-size:12px}',
    '  .onav .crmbtn{padding:8px 12px;font-size:12px}',
    // בטלפון כפתור התמיכה מצטמצם לאייקון בלבד, כדי לא להוסיף רוחב לסרגל.
    '  .onav .sup{padding:8px 10px}',
    '  .onav .sup .lbl{display:none}',
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

    // חוסם javascript: וכיוצא בו מהגדרה שנשמרה במסד. רק יעדים אמיתיים עוברים.
    function isSafeUrl(u) {
      return /^(https?:|mailto:|tel:|whatsapp:)/i.test(u) || /^[\w.\-]+\.html([?#].*)?$/i.test(u);
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
        '<a class="sup" id="onavSup" href="' + SUPPORT_FALLBACK + '" title="תמיכה">' +
          SUPPORT_ICON +
          '<span class="lbl">תמיכה</span>' +
        '</a>' +
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

    // ---------- הגדרות אתר (settings/site) ----------
    // קריאה אחת שמזינה גם את כפתור "השארת פרטים" וגם את כפתור התמיכה.
    if (db) {
      db.collection('settings').doc('site').get().then(function (snap) {
        var s = snap.exists ? snap.data() : {};

        // כפתור "השארת פרטים לתהליך עסקי" · מוצג רק אם הוגדר קישור.
        var url = (s.businessLinkUrl || '').trim();
        if (url && isSafeUrl(url)) {
          var label = (s.businessLinkLabel || '').trim() || 'השארת פרטים לתהליך עסקי';
          var slot = document.getElementById('onavBizSlot');
          if (slot) {
            slot.innerHTML = '<a class="biz" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
          }
        }

        // כפתור התמיכה · תמיד מוצג. כאן רק מחליפים את היעד אם הוגדר אחד.
        var sup = document.getElementById('onavSup');
        var supUrl = (s.supportUrl || '').trim();
        if (sup && supUrl && isSafeUrl(supUrl)) {
          sup.setAttribute('href', supUrl);
          if (/^https?:/i.test(supUrl)) {
            sup.setAttribute('target', '_blank');
            sup.setAttribute('rel', 'noopener');
          }
        }
        var supLabel = (s.supportLabel || '').trim();
        if (sup && supLabel) {
          var lbl = sup.querySelector('.lbl');
          if (lbl) lbl.textContent = supLabel;
          sup.setAttribute('title', supLabel);
        }
      }).catch(function (e) { console.error('[nav] settings/site', e); });
    }
  });
})();
