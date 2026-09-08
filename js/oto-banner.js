/* ============================================================
   באנר הזדמנות חד פעמית · פגישה אישית עם אוריאן
   מוזרק אחרי שהשער אישר את המשתמשת (מאזין ל-oriane:ready), ולכן
   לעולם לא מוצג למי שאין לו גישה.

   ורוד עם כיתוב לבן (החלטת הלל, 08.09.2026).
   הגוון: #C2456A. זה הוורוד של אוריאן (#D4607E) מעומק אחד למטה,
   כי לבן על #D4607E נותן יחס ניגודיות 3.6:1 והטקסט הקטן לא נקרא.
   על #C2456A היחס 4.5:1 ולבן עובר תקן. אותה משפחת צבע, טקסט קריא.

   הקופי והיעד נשלטים ממסך הניהול (settings/site) ולא מהקוד, כדי
   שאוריאן תוכל להחליף אותם בלי פריסה מחדש.
   כל עוד הבאנר כבוי — תלמידה לא רואה אותו כלל, ומנהלת רואה תצוגה
   מקדימה מסומנת כדי לבדוק איך זה נראה.
   ============================================================ */
(function () {
  'use strict';

  var PINK = '#C2456A';
  var DISMISS_KEY = 'oriane_oto_dismissed';

  var CSS = [
    // box-sizing מפורש: הבאנר מוזרק לדפים שונים ואסור שיישבר אם דף
    // מארח לא מגדיר border-box בעצמו.
    '.oto,.oto *{box-sizing:border-box}',
    '.oto{position:relative;display:flex;align-items:center;gap:16px;flex-wrap:wrap;',
    '  background:' + PINK + ';color:#fff;border-radius:16px;padding:18px 22px;',
    '  margin:0 0 22px;font-family:Heebo,sans-serif;',
    '  box-shadow:0 10px 30px rgba(194,69,106,.28)}',
    '.oto .tx{flex:1 1 260px;min-width:0}',
    '.oto .kick{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;',
    '  color:' + PINK + ';background:#fff;padding:4px 11px;border-radius:30px;',
    '  margin-bottom:9px}',
    '.oto .ttl{font-size:19px;font-weight:700;color:#fff;line-height:1.35;margin-bottom:4px}',
    '.oto .txt{font-size:14px;line-height:1.65;color:#fff;opacity:.94}',
    '.oto .go{flex:none;background:#fff;color:' + PINK + ';font-size:14px;font-weight:700;',
    '  padding:12px 24px;border-radius:30px;text-decoration:none;white-space:nowrap;',
    '  min-height:44px;display:inline-flex;align-items:center}',
    '.oto .go:hover{filter:brightness(.97)}',
    // ה-X הוא פריט רגיל בשורה ולא ממוקם מוחלט, כדי שלא יידרס על הכפתור
    // ולא על התווית בשום רוחב מסך.
    '.oto .x{flex:none;width:32px;height:32px;border:0;border-radius:50%;',
    '  background:rgba(255,255,255,.18);color:#fff;cursor:pointer;',
    '  font-size:17px;line-height:1;font-family:inherit}',
    '.oto .x:hover{background:rgba(255,255,255,.32)}',
    '.oto .prev{position:absolute;inset-inline-end:14px;bottom:-10px;font-size:10.5px;',
    '  font-weight:700;color:#2a1018;background:#ffd9a3;padding:3px 10px;border-radius:30px}',
    '@media(max-width:620px){',
    '  .oto{padding:18px 16px 20px;gap:12px}',
    '  .oto .go{width:100%;justify-content:center}',
    '  .oto .ttl{font-size:17px}',
    // בטלפון ה-X חוזר לפינה העליונה, בצד ההפוך מהתווית, כדי לא לתפוס שורה.
    '  .oto .x{position:absolute;top:14px;inset-inline-end:14px;width:28px;height:28px;font-size:15px}',
    '}'
  ].join('');

  document.addEventListener('oriane:ready', function (ev) {
    var me = ev.detail || {};
    var db = window.ORIANE_DB;
    if (!db) return;

    db.collection('settings').doc('site').get().then(function (snap) {
      var s = snap.exists ? snap.data() : {};

      var on = s.otoOn === true;
      // כבוי: תלמידה לא רואה כלום. מנהלת רואה תצוגה מקדימה מסומנת.
      if (!on && !me.isAdmin) return;

      var title = (s.otoTitle || '').trim() || 'פגישה אישית עם אוריאן';
      var kick  = (s.otoKicker || '').trim() || 'הזדמנות חד פעמית';
      var text  = (s.otoText || '').trim();
      var cta   = (s.otoCta || '').trim() || 'לתיאום הפגישה';
      var url   = (s.otoUrl || '').trim();

      // סימון גרסה: קופי חדש מחזיר את הבאנר גם למי שסגרה אותו פעם.
      var stamp = title + '|' + text + '|' + url;
      try {
        if (on && localStorage.getItem(DISMISS_KEY) === stamp) return;
      } catch (e) { /* localStorage חסום · פשוט מציגים */ }

      var style = document.createElement('style');
      style.textContent = CSS;
      document.head.appendChild(style);

      var el = document.createElement('div');
      el.className = 'oto';
      el.setAttribute('dir', 'rtl');
      el.innerHTML =
        '<div class="tx">' +
          '<span class="kick">' + esc(kick) + '</span>' +
          '<div class="ttl">' + esc(title) + '</div>' +
          (text ? '<div class="txt">' + esc(text) + '</div>' : '') +
        '</div>' +
        (isSafeUrl(url)
          ? '<a class="go" href="' + esc(url) + '"' +
            (/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(cta) + '</a>'
          : '') +
        '<button class="x" type="button" aria-label="סגירה">&times;</button>' +
        (on ? '' : '<span class="prev">תצוגה מקדימה · התלמידות לא רואות</span>');

      el.querySelector('.x').addEventListener('click', function () {
        try { localStorage.setItem(DISMISS_KEY, stamp); } catch (e) {}
        el.remove();
      });

      mount(el);
    }).catch(function (e) { console.error('[oto] settings/site', e); });
  });

  // מקום ההזרקה: קודם עוגן ייעודי, אחרת מתחת ל-hero, אחרת ראש התוכן.
  function mount(el) {
    var slot = document.getElementById('otoSlot');
    if (slot) return slot.appendChild(el);
    var hero = document.querySelector('.hero');
    if (hero && hero.parentNode) return hero.parentNode.insertBefore(el, hero.nextSibling);
    var wrap = document.querySelector('.wrap') || document.body;
    wrap.insertBefore(el, wrap.firstChild);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isSafeUrl(u) {
    return !!u && (/^(https?:|mailto:|tel:|whatsapp:)/i.test(u) || /^[\w.\-]+\.html([?#].*)?$/i.test(u));
  }
})();
