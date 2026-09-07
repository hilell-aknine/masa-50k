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

  function reveal() {
    var s = document.getElementById('gate-hide');
    if (s) s.remove();
  }

  function out(reason) {
    location.replace(LOGIN + '?next=' + encodeURIComponent(here) + '&why=' + encodeURIComponent(reason));
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

      window.ORIANE_USER = {
        uid: user.uid,
        email: user.email,
        name: p.full_name || '',
        role: p.role || 'student',
        isAdmin: p.role === 'admin'
      };

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
