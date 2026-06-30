/* ============================================================
   מתג בהיר/כהה גלובלי · מוזרק אוטומטית לכל עמוד שטוען אותו
   שומר העדפה ב-localStorage ('oriane_theme'). ברירת מחדל: dark (המיתוג).
   שימוש: <script src="js/theme.js"></script> בכל עמוד.
   ============================================================ */
(function () {
  var KEY = 'oriane_theme';
  var saved = 'light';
  try { saved = localStorage.getItem(KEY) || 'light'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved);

  function icon(t) { return t === 'dark' ? '☀' : '☾'; }

  function inject() {
    if (document.querySelector('.theme-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'החלף מצב תצוגה בהיר/כהה');
    btn.textContent = icon(document.documentElement.getAttribute('data-theme'));
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      btn.textContent = icon(next);
    });
    document.body.appendChild(btn);
  }

  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);
})();
