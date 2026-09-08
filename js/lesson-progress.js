/* ============================================================
   מעקב שיעורים שנצפו · מקור יחיד
   בקשת אוריאן 08.09: "0/3 שיעורים" בכל קובייה במסך הבית,
   מסונכרן עם הצפייה בפועל.

   ⚠️ נשמר ב-localStorage, כמו כל שאר ההתקדמות במערכת כרגע
   (PROGRESS_KEY וההערות). כלומר ההתקדמות היא **פר-מכשיר**:
   תלמידה שתעבור מהמחשב לטלפון תראה אפס.
   כשתהיה תשתית שרת ונעביר את ההתקדמות ל-Firestore, מחליפים כאן
   את שתי הפונקציות ושום דף אחר לא צריך להשתנות.
   ============================================================ */
(function (w) {
  'use strict';

  var KEY = 'oriane_lessons_watched';

  function readAll() {
    try {
      var raw = localStorage.getItem(KEY);
      var o = raw ? JSON.parse(raw) : {};
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }

  function writeAll(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }

  w.OrianeLessons = {
    // מסמן שיעור בודד כנצפה. אידמפוטנטי.
    markWatched: function (stationId, lessonIdx) {
      if (stationId == null || lessonIdx == null) return;
      var all = readAll();
      var k = String(stationId);
      var list = Array.isArray(all[k]) ? all[k] : [];
      if (list.indexOf(lessonIdx) === -1) {
        list.push(lessonIdx);
        all[k] = list;
        writeAll(all);
      }
    },

    // כמה שיעורים נצפו בתחנה
    watchedCount: function (stationId) {
      var list = readAll()[String(stationId)];
      return Array.isArray(list) ? list.length : 0;
    },

    // האם שיעור מסוים נצפה
    isWatched: function (stationId, lessonIdx) {
      var list = readAll()[String(stationId)];
      return Array.isArray(list) && list.indexOf(lessonIdx) !== -1;
    }
  };
})(window);
