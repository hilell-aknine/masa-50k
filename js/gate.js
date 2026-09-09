/* ============================================================
   שער הכניסה · המסע ל-50K · Firebase Auth
   נטען בכל דף מוגן, אחרי firebase-config.js.

   נכשל-סגור: כל מצב שאינו "מחובר עם access פעיל" מוציא החוצה.
   אין דגל שמדלג על השער, בכוונה.
   ============================================================ */
(function () {
  'use strict';

  var LOGIN = 'login.html';
  var OPEN = ['login.html', 'landing.html', 'checkout.html'];
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (OPEN.indexOf(here) !== -1) return;

  // מסתיר את הדף עד שהבדיקה נגמרת, כדי שתוכן לא יהבהב למי שאין לו גישה
  var hide = document.createElement('style');
  hide.id = 'gate-hide';
  hide.textContent = 'body{visibility:hidden}';
  document.head.appendChild(hide);

  // ============================================================
  // שני קהלים, שתי חוויות · החלטת הלל 09.09.2026
  //
  // premium   = היזמים שאוריאן מלווה אישית. תוכן בלבד.
  //             אפס שיווק, אפס הצעות, אפס מחירים, אפס דד-ליין.
  // subscriber = מי שקנה או יקנה מנוי. רואה את השכבה המסחרית.
  //
  // כל אלמנט מסחרי בכל דף מסומן data-commercial, וה-CSS כאן מסתיר
  // אותו לפרימיום. ההסתרה נכנסת *לפני* reveal(), ולכן פרימיום לא
  // רואה הבזק של מחיר או הצעה גם לא לחלקיק שנייה.
  //
  // ברירת מחדל = subscriber. בכוונה: פרופיל בלי שדה מקבל את החוויה
  // המסחרית, כי הסתרת מחירים ממנוי משלם שוברת את המודל העסקי, בעוד
  // שהכיוון ההפוך רק מציג הצעה למי שכבר קיבלה גישה חינם.
  // ============================================================
  var quiet = document.createElement('style');
  quiet.id = 'gate-audience';
  quiet.textContent =
    'html[data-audience="premium"] [data-commercial]{display:none!important}' +
    'html:not([data-audience="premium"]) [data-premium]{display:none!important}';
  document.head.appendChild(quiet);

  function reveal() {
    var s = document.getElementById('gate-hide');
    if (s) s.remove();
  }

  function out(reason) {
    // חשוב: לשמור גם את ה-query. בלעדיו קישור ל-?id=8 היה מחזיר
    // את המשתמש אחרי ההתחברות לתחנה ריקה במקום לתחנה שביקש.
    var target = here + location.search;
    location.replace(LOGIN + '?next=' + encodeURIComponent(target) + '&why=' + encodeURIComponent(reason));
  }

  var CFG = window.ORIANE_FB;
  if (!CFG || !window.firebase) {
    console.error('[gate] חסרה תצורת Firebase');
    return out('no-config');
  }

  if (!firebase.apps.length) firebase.initializeApp(CFG);
  var auth = firebase.auth();
  var db = firebase.firestore();
  window.ORIANE_AUTH = auth;
  window.ORIANE_DB = db;

  auth.onAuthStateChanged(function (user) {
    if (!user) return out('no-session');

    db.collection('profiles').doc(user.uid).get().then(function (snap) {
      if (!snap.exists) return out('no-profile');
      var p = snap.data();

      if (p.access !== 'active') return out('access-' + (p.access || 'unknown'));

      // גישה מוגבלת בזמן · בקשת אוריאן 08.09.
      // היזמים שהיא מלווה מקבלים גישה חינם עד תאריך. אדמין לא מוגבל.
      // אותה בדיקה נאכפת גם בכללי השרת, כך שזה לא רק ויזואלי.
      if (p.role !== 'admin' && p.access_until && typeof p.access_until.toDate === 'function') {
        if (p.access_until.toDate().getTime() <= Date.now()) return out('access-expired');
      }

      // רק 'premium' מפורש נחשב פרימיום. כל שאר הערכים, כולל שדה חסר
      // בפרופילים ישנים, נופלים ל-subscriber.
      var audience = p.audience === 'premium' ? 'premium' : 'subscriber';

      window.ORIANE_USER = {
        uid: user.uid,
        email: user.email,
        name: p.full_name || '',
        role: p.role || 'student',
        isAdmin: p.role === 'admin',
        audience: audience,
        isPremium: audience === 'premium'
      };

      document.documentElement.setAttribute('data-audience', audience);

      // מסכי ניהול דורשים תפקיד אדמין
      if ((here === 'admin.html' || here === 'dashboard.html') && !window.ORIANE_USER.isAdmin) {
        return out('not-admin');
      }

      // חותם נוכחות. שקט, לא חוסם, ולא מפיל את הדף אם נכשל.
      db.collection('profiles').doc(user.uid)
        .update({ last_seen_at: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(function () {});

      reveal();
      document.dispatchEvent(new CustomEvent('oriane:ready', { detail: window.ORIANE_USER }));
    }).catch(function (e) {
      console.error('[gate]', e);
      out('error');
    });
  });
})();
