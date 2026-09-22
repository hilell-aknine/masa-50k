/* ============================================================
   הנוכחות הדיגיטלית של המשתמשת
   קישורים לרשתות, לאתר ולעסק. נשמר ב-profiles.links

   נטען גם ב-me.html (שם ממלאים) וגם ב-student-file.html
   (שם אוריאן צופה). קובץ משותף כדי ששני הצדדים יסכימו על
   אותה רשימת פלטפורמות ועל אותו סינון.

   🔴 הסינון כאן הוא הגנת אבטחה ולא נוחות.
   אוריאן פותחת את תיק המשתמשת בסשן האדמין שלה. קישור שמתחיל
   ב-javascript: או ב-data: שתלמידה תדביק היה הופך לקוד שרץ
   בדפדפן שלה עם ההרשאות שלה. לכן safeHref מתיר http ו-https
   בלבד, ומחזיר null לכל דבר אחר.
   ============================================================ */
(function () {
  'use strict';

  var S = {};

  /* prefix = מה שמוסיפים כשהמשתמשת כותבת שם משתמש ולא כתובת.
     אנשים מדביקים @username הרבה יותר מכתובת מלאה. */
  S.PLATFORMS = [
    { key: 'instagram', label: 'אינסטגרם', ph: '@השם_שלך או קישור', prefix: 'https://instagram.com/' },
    { key: 'facebook',  label: 'פייסבוק',  ph: 'קישור לעמוד או לפרופיל', prefix: 'https://facebook.com/' },
    { key: 'tiktok',    label: 'טיקטוק',   ph: '@השם_שלך או קישור', prefix: 'https://tiktok.com/@' },
    { key: 'youtube',   label: 'יוטיוב',   ph: 'קישור לערוץ', prefix: 'https://youtube.com/@' },
    { key: 'linkedin',  label: 'לינקדאין', ph: 'קישור לפרופיל', prefix: 'https://linkedin.com/in/' },
    { key: 'website',   label: 'אתר',      ph: 'www.example.co.il', prefix: 'https://' }
  ];

  S.FIELDS = [
    { key: 'business', label: 'במשפט, מה העסק שלך עושה?',
      help: 'זה מה שמאפשר ליועצת לענות לך על העסק שלך ולא בכללי.', max: 300 }
  ];

  /* ---------- נרמול קלט ---------- */

  /* מקבל מה שהמשתמשת הקלידה ומחזיר כתובת מלאה, או null.
     תומך בשלושה דפוסים שאנשים באמת מקלידים:
       @username        → prefix + username
       username         → prefix + username
       example.co.il    → https://example.co.il
       https://...      → כמו שהוא */
  S.normalize = function (platformKey, raw) {
    var v = String(raw || '').trim();
    if (!v) return '';

    var p = S.PLATFORMS.filter(function (x) { return x.key === platformKey; })[0];
    if (!p) return '';

    /* כתובת מלאה: מקבלים רק אחרי בדיקת סכימה */
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) {
      return S.safeHref(v) || '';
    }

    v = v.replace(/^@+/, '');           // @name → name
    if (!v) return '';

    /* נראה כמו דומיין (יש נקודה ואין רווח) → כתובת בפני עצמה */
    if (/^[^\s/]+\.[a-z]{2,}(\/|$)/i.test(v)) {
      return S.safeHref('https://' + v.replace(/^www\./i, 'www.')) || '';
    }

    /* אחרת זה שם משתמש */
    if (/[^A-Za-z0-9._\-\/]/.test(v)) return '';   // שם משתמש עם תווים מוזרים נפסל
    return p.prefix + v;
  };

  /* 🔴 שער האבטחה. http/https בלבד. */
  S.safeHref = function (url) {
    var v = String(url || '').trim();
    if (!v) return null;
    try {
      var u = new URL(v);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      if (!u.hostname) return null;
      return u.href;
    } catch (e) {
      return null;
    }
  };

  /* שם קצר להצגה במקום כתובת ארוכה */
  S.pretty = function (url) {
    try {
      var u = new URL(url);
      var p = u.pathname.replace(/\/+$/, '');
      return (u.hostname.replace(/^www\./, '') + p).slice(0, 48);
    } catch (e) { return url; }
  };

  /* מה שנשמר למסד. מסנן כל ערך לא תקין ומגביל אורך, כדי
     שמסמך הפרופיל לא יתנפח וכדי שלא יישמר זבל. */
  S.collect = function (getValue) {
    var out = {};
    S.PLATFORMS.forEach(function (p) {
      var url = S.normalize(p.key, getValue(p.key));
      if (url) out[p.key] = url.slice(0, 300);
    });
    S.FIELDS.forEach(function (f) {
      var v = String(getValue(f.key) || '').trim();
      if (v) out[f.key] = v.slice(0, f.max);
    });
    return out;
  };

  /* טקסט קריא ליועצת. אותו מבנה משמש גם בצד השרת. */
  S.toText = function (links) {
    if (!links) return '';
    var lines = [];
    if (links.business) lines.push('העסק שלה: ' + links.business);
    S.PLATFORMS.forEach(function (p) {
      if (links[p.key]) lines.push(p.label + ': ' + links[p.key]);
    });
    return lines.join('\n');
  };

  window.SocialLinks = S;
})();
