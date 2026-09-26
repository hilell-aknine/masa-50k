/* ============================================================
   התקדמות במסע · מקור יחיד
   בקשת אוריאן 08.09: "0/3 שיעורים" בכל קובייה במסך הבית,
   מסונכרן עם הצפייה בפועל.

   ── 26.09.2026 · ההתקדמות עברה לשרת ──────────────────────────
   עד היום הכל ישב ב-localStorage בלבד, ולכן ההתקדמות הייתה
   פר-מכשיר: תלמידה שעברה מהמחשב לטלפון ראתה אפס, ואוריאן לא
   יכלה לראות מי צפה במה. שתי בעיות, אחת במוצר ואחת בדאטה.

   המבנה החדש: `progress/{uid}/stations/{stationId}`, מסמך לכל
   תחנה. הכללים ב-firestore.rules כבר ציפו בדיוק לצורה הזאת —
   בעלים קורא וכותב, אדמין קורא בלבד.

   ⚠️ שתי מגבלות שהכתיבו את העיצוב:
   1. כל הקוראים סינכרוניים. `watchedCount()` נקרא בתוך לולאת
      ציור של מפת המסע, ואי אפשר להחזיר לו Promise בלי לשכתב
      את שני הדפים. לכן localStorage נשאר **מטמון מקומי מיידי**
      והשרת הוא מקור האמת שמגיע אחריו.
   2. הסנכרון **מאחד ולא דורס**. התקדמות רק גדלה: איחוד של
      השיעורים שנצפו ו-OR על "התחנה הושלמה". דריסה הייתה
      מוחקת התקדמות אמיתית ממכשיר שני, וזה נזק שאין ממנו חזרה.

   אחרי שהמיזוג חוזר מהשרת נורה האירוע `oriane:progress-synced`,
   והדפים מציירים מחדש. בלעדיו המשתמשת הייתה רואה אפס לרגע
   ואז המספר היה קופץ בלי הסבר.
   ============================================================ */
(function (w) {
  'use strict';

  var KEY = 'oriane_lessons_watched';
  var STATION_KEY = 'oriane_journey_progress';  // השם הישן נשמר, כדי שהתקדמות קיימת לא תאבד

  var uid = null;
  var db = null;
  var synced = false;

  /* ---------- מטמון מקומי ---------- */
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

  function readStationDone() {
    var n = parseInt(localStorage.getItem(STATION_KEY), 10);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  function writeStationDone(n) {
    try { localStorage.setItem(STATION_KEY, String(n)); } catch (e) {}
  }

  /* ---------- שרת ---------- */
  function col() {
    return db.collection('progress').doc(uid).collection('stations');
  }

  /* כתיבה ברקע. אף פעם לא חוסמת את הממשק ולעולם לא מפילה אותו:
     כשל כאן משאיר את המטמון המקומי נכון, והמיזוג בטעינה הבאה
     ידחוף את מה שלא הספיק לעלות. */
  function push(stationId, patch) {
    if (!db || !uid) return;
    try {
      col().doc(String(stationId)).set(Object.assign({
        station_id: Number(stationId),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, patch), { merge: true })
        .catch(function (e) { console.warn('[progress] push', e && e.code); });
    } catch (e) { console.warn('[progress] push', e); }
  }

  /* משיכה ומיזוג. רץ פעם אחת, אחרי שידוע מי המשתמשת. */
  function pullAndMerge() {
    if (!db || !uid || synced) return;
    synced = true;

    col().get().then(function (snap) {
      var local = readAll();
      var localDone = readStationDone();
      var remoteDone = 0;
      var changedLocal = false;

      snap.docs.forEach(function (d) {
        var r = d.data() || {};
        var sid = String(r.station_id != null ? r.station_id : d.id);
        var remoteLessons = Array.isArray(r.lessons) ? r.lessons : [];
        var localLessons = Array.isArray(local[sid]) ? local[sid] : [];

        // איחוד לשני הכיוונים
        var merged = localLessons.slice();
        remoteLessons.forEach(function (i) {
          if (merged.indexOf(i) === -1) { merged.push(i); changedLocal = true; }
        });
        if (merged.length) local[sid] = merged;

        // מה שקיים מקומית ולא בשרת נדחף חזרה
        var missingOnServer = localLessons.filter(function (i) {
          return remoteLessons.indexOf(i) === -1;
        });
        if (missingOnServer.length) push(sid, { lessons: merged });

        if (r.done) remoteDone = Math.max(remoteDone, Number(sid) || 0);
      });

      // תחנות שסומנו מקומית ומעולם לא הגיעו לשרת
      Object.keys(local).forEach(function (sid) {
        var seen = snap.docs.some(function (d) { return d.id === sid; });
        if (!seen && local[sid] && local[sid].length) push(sid, { lessons: local[sid] });
      });

      if (changedLocal) writeAll(local);

      var finalDone = Math.max(localDone, remoteDone);
      if (finalDone !== localDone) writeStationDone(finalDone);

      /* ⚠️ מסומנת רק התחנה הגבוהה עצמה, לא כל מה שמתחתיה.
         המודל הישן שמר מספר יחיד, והקוראים מתייחסים לכל תחנה
         עד אליו כהושלמה. אם היינו כותבים `done:true` לכל אחת
         מהן בנפרד, היינו ממציאים לאוריאן רשומות של סיום שמעולם
         לא קרו — ודאטה מומצא גרוע מדאטה חסר. */
      if (localDone > remoteDone) push(localDone, { done: true });

      document.dispatchEvent(new CustomEvent('oriane:progress-synced', {
        detail: { stationDone: finalDone }
      }));
    }).catch(function (e) {
      /* נכשל-שקט בכוונה. בלי רשת ההתקדמות המקומית עדיין עובדת,
         והמסך לא צריך להציג שגיאה על משהו שהמשתמשת לא ביקשה. */
      console.warn('[progress] pull', e && e.code);
    });
  }

  function init(user) {
    if (!user || !user.uid) return;
    if (!w.firebase || !firebase.firestore) return;
    uid = user.uid;
    try { db = firebase.firestore(); } catch (e) { return; }
    pullAndMerge();
  }

  /* gate.js יורה את האירוע אחרי שהאימות והפרופיל נטענו.
     אם הוא כבר נורה לפני שהקובץ הזה נטען, ORIANE_USER כבר קיים. */
  document.addEventListener('oriane:ready', function (e) { init(e.detail || w.ORIANE_USER); });
  if (w.ORIANE_USER) init(w.ORIANE_USER);

  w.OrianeLessons = {
    // מסמן שיעור בודד כנצפה. אידמפוטנטי, מקומי מיידי ונדחף לשרת ברקע.
    markWatched: function (stationId, lessonIdx) {
      if (stationId == null || lessonIdx == null) return;
      var all = readAll();
      var k = String(stationId);
      var list = Array.isArray(all[k]) ? all[k] : [];
      if (list.indexOf(lessonIdx) === -1) {
        list.push(lessonIdx);
        all[k] = list;
        writeAll(all);
        /* ⚠️ הביטוי arrayUnion נבנה רק כשיש firebase. אם הוא מחושב
           בשורת הקריאה, דף בלי firebase זורק ReferenceError והסימון
           המקומי נשבר יחד איתו — כלומר תקלת רשת הייתה הופכת לתקלת
           ממשק. השמירה המקומית למעלה כבר קרתה בכל מקרה. */
        if (db && uid && w.firebase && firebase.firestore) {
          push(k, { lessons: firebase.firestore.FieldValue.arrayUnion(lessonIdx) });
        }
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
    },

    // מספר התחנה הגבוהה ביותר שסומנה כהושלמה
    stationDone: function () { return readStationDone(); },

    // סימון "סיימתי את התחנה". רק קדימה, לעולם לא אחורה.
    markStationDone: function (stationId) {
      var n = Number(stationId) || 0;
      if (!n) return;
      var cur = readStationDone();
      if (n > cur) writeStationDone(n);
      push(n, { done: true });
    }
  };
})(window);
