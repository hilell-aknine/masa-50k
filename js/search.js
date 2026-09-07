/* ============================================================
   "המורה שלי" · חיפוש בתוכן הקורס
   בקשת אוריאן [פגישה 07.09, 04:56]: "יכול לחפש שם מילות מפתח
   שקשורות לאיזשהו סרטון שהוא רוצה ללמוד".

   מחפש בשמות הפרקים, בנושאי המשנה ובשמות השיעורים.
   הכל מקומי מתוך data/content.js — אפס קריאות שרת, אפס עלות.

   ⚠️ לא לבלבל עם js/ai-tutor.js שאוריאן הוסיפה — "המורה הדיגיטלי",
   צ'אט צף עם תשובות מוכנות מראש (דמו, לא מחובר ל-AI אמיתי).
   שניהם כפתורים צפים: שלה מימין, זה משמאל, כדי שלא יתנגשו.
   ============================================================ */
(function () {
  'use strict';

  var CSS = [
    '.mt-fab{position:fixed;inset-inline-start:16px;bottom:16px;z-index:300;display:flex;align-items:center;',
    '  gap:8px;background:#fcc1cb;color:#2a1018;border:0;border-radius:30px;padding:13px 18px;',
    '  font-family:Heebo,sans-serif;font-size:14px;font-weight:800;cursor:pointer;min-height:48px;',
    '  box-shadow:0 6px 22px rgba(0,0,0,.35)}',
    '.mt-ov{position:fixed;inset:0;z-index:320;background:rgba(2,12,26,.82);display:none;',
    '  padding:64px 16px 16px;overflow-y:auto}',
    '.mt-ov.on{display:block}',
    '.mt-box{max-width:620px;margin:0 auto;background:#0b2038;border:1px solid rgba(252,193,203,.18);',
    '  border-radius:18px;padding:18px}',
    '.mt-top{display:flex;align-items:center;gap:10px;margin-bottom:6px}',
    '.mt-top h3{font-family:Heebo,sans-serif;font-size:17px;color:#fcc1cb;font-weight:800;margin-inline-end:auto}',
    '.mt-x{background:transparent;border:1px solid rgba(252,193,203,.25);color:#93a6c4;border-radius:30px;',
    '  width:34px;height:34px;cursor:pointer;font-size:15px}',
    '.mt-hint{font-family:Heebo,sans-serif;font-size:12.5px;color:#93a6c4;margin-bottom:12px;line-height:1.6}',
    '.mt-in{width:100%;padding:14px 16px;font-size:16px;font-family:Heebo,sans-serif;background:#061a33;',
    '  color:#eaf1fb;border:1px solid rgba(252,193,203,.2);border-radius:12px;min-height:50px}',
    '.mt-in:focus{outline:none;border-color:#fcc1cb}',
    '.mt-res{margin-top:14px;display:flex;flex-direction:column;gap:9px}',
    '.mt-r{display:block;background:#061a33;border:1px solid rgba(252,193,203,.14);border-radius:12px;',
    '  padding:13px 15px;text-decoration:none;transition:.15s}',
    '.mt-r:hover{border-color:#fcc1cb}',
    '.mt-r .k{font-family:Heebo,sans-serif;font-size:11px;color:#fcc1cb;font-weight:700}',
    '.mt-r .t{font-family:Heebo,sans-serif;font-size:15px;color:#eaf1fb;font-weight:700;margin-top:3px}',
    '.mt-r .d{font-family:Heebo,sans-serif;font-size:12px;color:#93a6c4;margin-top:4px;line-height:1.5}',
    '.mt-empty{font-family:Heebo,sans-serif;color:#93a6c4;font-size:14px;text-align:center;padding:22px;line-height:1.7}'
  ].join('');

  document.addEventListener('oriane:ready', function () {
    var C = window.COURSE;
    if (!C || !C.chapters) return;

    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    // אינדקס שטוח: פרק, ותחתיו כל שיעור בנפרד
    var idx = [];
    C.chapters.forEach(function (ch) {
      ch.stations.forEach(function (s) {
        idx.push({ kind: 'פרק ' + s.id, title: s.name, desc: s.desc || '',
                   href: 'station.html?id=' + s.id,
                   hay: (s.name + ' ' + (s.desc || '') + ' ' + ch.title + ' ' + ch.tier).toLowerCase() });
        (s.lessons || []).forEach(function (l, i) {
          idx.push({ kind: s.name, title: l.n, desc: l.min + ' דקות',
                     href: 'station.html?id=' + s.id + '&l=' + (i + 1),
                     hay: (l.n + ' ' + s.name).toLowerCase() });
        });
      });
    });

    document.body.insertAdjacentHTML('beforeend',
      '<button class="mt-fab" id="mtFab" type="button">🎓 המורה שלי</button>' +
      '<div class="mt-ov" id="mtOv"><div class="mt-box">' +
        '<div class="mt-top"><h3>המורה שלי</h3><button class="mt-x" id="mtX" type="button">✕</button></div>' +
        '<p class="mt-hint">כתבי מילה או נושא, ואני אראה לך איפה בקורס זה נמצא.</p>' +
        '<input class="mt-in" id="mtIn" type="search" placeholder="למשל: תמחור, הוק, קהל יעד, קרם">' +
        '<div class="mt-res" id="mtRes"></div>' +
      '</div></div>');

    var ov = document.getElementById('mtOv'), inp = document.getElementById('mtIn');
    function open()  { ov.classList.add('on'); inp.focus(); render(); }
    function close() { ov.classList.remove('on'); }
    document.getElementById('mtFab').addEventListener('click', open);
    document.getElementById('mtX').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    function esc(t){ var d=document.createElement('div'); d.textContent=t==null?'':t; return d.innerHTML; }

    function render() {
      var q = (inp.value || '').trim().toLowerCase();
      var box = document.getElementById('mtRes');
      if (!q) {
        box.innerHTML = '<div class="mt-empty">כל הקורס פתוח לחיפוש.<br>נסי לכתוב נושא שמעניין אותך.</div>';
        return;
      }
      var words = q.split(/\s+/).filter(Boolean);
      var hits = idx.filter(function (r) {
        return words.every(function (w) { return r.hay.indexOf(w) !== -1; });
      }).slice(0, 12);

      box.innerHTML = hits.length
        ? hits.map(function (r) {
            return '<a class="mt-r" href="' + r.href + '">' +
                     '<span class="k">' + esc(r.kind) + '</span>' +
                     '<span class="t">' + esc(r.title) + '</span>' +
                     (r.desc ? '<span class="d">' + esc(r.desc).slice(0, 150) + '</span>' : '') +
                   '</a>';
          }).join('')
        : '<div class="mt-empty">לא מצאתי כלום על "' + esc(q) + '".<br>' +
          'אם זה נושא שחסר לך, אפשר לשאול את אוריאן ישירות ב<a href="ask.html" style="color:#fcc1cb">שאלות לאוריאן</a>.</div>';
    }

    inp.addEventListener('input', render);
  });
})();
