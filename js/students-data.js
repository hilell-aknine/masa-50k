/* ============================================================
   כל התלמידות · חישובים טהורים · 28.09.2026
   מופרד מהמסך כדי שאפשר יהיה לבדוק אותו בלי דפדפן ובלי מסד.
   שום דבר כאן לא קורא לפיירבייס.

   ⚠️ מקור המבנה הוא data/content.js בלבד. מספר השיעורים בכל תחנה
   נגזר ממנו בזמן ריצה, בדיוק כמו בשאר הפורטל.
   ============================================================ */
(function (root) {
  'use strict';

  var S = {};
  var DAY = 86400000;

  /* ============================================================
     הכלל של "חמה" · כתוב כאן פעם אחת, ומוצג על המסך מאותו מקור.
     המטרה: למי כדאי להציע ליווי אישי. כלל פשוט ושקוף, לא ניחוש.

     חמה = פעילה (נכנסה ב-ACTIVE_DAYS הימים האחרונים)
            וגם לפחות אחד מהסימנים:
              · קצב: PACE_PER_WEEK שיעורים ומעלה לשבוע מאז שהצטרפה
                     (ולפחות PACE_MIN_LESSONS שיעורים, כדי ששיעור
                     אחד ביום הראשון לא ייחשב "קצב")
              · שאלות: QUESTIONS_MIN שאלות ומעלה ליועצת
              · עומק: HALF_PCT אחוז מהשיעורים ומעלה
     ============================================================ */
  S.RULE = {
    ACTIVE_DAYS: 14,
    PACE_PER_WEEK: 3,
    PACE_MIN_LESSONS: 3,
    QUESTIONS_MIN: 5,
    HALF_PCT: 50
  };

  S.ruleText = function () {
    var R = S.RULE;
    return 'חמה = נכנסה ב-' + R.ACTIVE_DAYS + ' הימים האחרונים, וגם לפחות אחד מאלה: ' +
      'צופה בקצב של ' + R.PACE_PER_WEEK + ' שיעורים ומעלה בשבוע · ' +
      'שאלה את היועצת ' + R.QUESTIONS_MIN + ' שאלות ומעלה · ' +
      'עברה ' + R.HALF_PCT + '% מהשיעורים.';
  };

  /* ---------- מבנה הקורס ---------- */
  function lessonsOf(s) {
    if (Array.isArray(s.lessons) && s.lessons.length) return s.lessons.length;
    return s.youtubeId ? 1 : 0;
  }

  S.courseShape = function (stations) {
    var per = {}, total = 0;
    (stations || []).forEach(function (s) {
      var n = lessonsOf(s);
      per[String(s.id)] = n;
      total += n;
    });
    return { per: per, total: total, ids: (stations || []).map(function (s) { return Number(s.id); }) };
  };

  function ms(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    return 0;
  }
  S.ms = ms;

  /* ---------- התקדמות של תלמידה אחת ----------
     progDocs = המסמכים מ-progress/{uid}/stations.
     שיעורים שנספרו בתחנה שכבר לא קיימת, או אינדקסים מעבר למספר
     השיעורים בתחנה, לא נספרים. אחרת האחוז היה עולה על 100 אחרי
     שאוריאן מקצרת תחנה. */
  S.progressOf = function (progDocs, shape) {
    var done = 0, highestDone = 0, highestTouched = 0, lastMs = 0, perStation = {};
    (progDocs || []).forEach(function (p) {
      var sid = String(p.station_id != null ? p.station_id : p.id);
      var cap = shape.per[sid];
      if (cap === undefined) return;
      var uniq = {};
      (Array.isArray(p.lessons) ? p.lessons : []).forEach(function (i) { uniq[i] = 1; });
      var n = Math.min(Object.keys(uniq).length, cap);
      perStation[sid] = n;
      done += n;
      var num = Number(sid) || 0;
      if (n > 0 && num > highestTouched) highestTouched = num;
      if (p.done && num > highestDone) highestDone = num;
      var t = ms(p.updated_at);
      if (t > lastMs) lastMs = t;
    });

    /* תחנה נוכחית: זו שאחרי האחרונה שסימנה "סיימתי", או הגבוהה
       ביותר שצפתה בה בפועל — מה שמתקדם יותר. אם שתיהן אפס, היא
       עוד לא התחילה, וזה מוצג כך ולא כ"תחנה 1". */
    var current = null;
    if (highestDone || highestTouched) {
      var afterDone = null;
      if (highestDone) {
        var idx = shape.ids.indexOf(highestDone);
        afterDone = idx >= 0 && idx < shape.ids.length - 1 ? shape.ids[idx + 1] : highestDone;
      }
      current = Math.max(afterDone || 0, highestTouched || 0);
    }
    var finished = !!highestDone && shape.ids.length && highestDone === shape.ids[shape.ids.length - 1];

    return {
      done: done,
      total: shape.total,
      pct: shape.total ? Math.round(done / shape.total * 100) : 0,
      current: current,
      finished: finished,
      lastProgressMs: lastMs,
      perStation: perStation
    };
  };

  /* ---------- הכלל של "חמה" ---------- */
  S.hotOf = function (row, nowMs) {
    var R = S.RULE;
    nowMs = nowMs || Date.now();
    var reasons = [];
    var lastSeen = row.lastSeenMs || 0;
    var active = lastSeen && (nowMs - lastSeen) <= R.ACTIVE_DAYS * DAY;

    var weeks = row.joinedMs ? Math.max(1, (nowMs - row.joinedMs) / (7 * DAY)) : null;
    var pace = weeks ? row.progress.done / weeks : 0;
    if (row.progress.done >= R.PACE_MIN_LESSONS && pace >= R.PACE_PER_WEEK) {
      reasons.push('קצב ' + (Math.round(pace * 10) / 10) + ' שיעורים בשבוע');
    }
    if ((row.questions || 0) >= R.QUESTIONS_MIN) reasons.push(row.questions + ' שאלות ליועצת');
    if (row.progress.pct >= R.HALF_PCT) reasons.push('עברה ' + row.progress.pct + '% מהשיעורים');

    return { hot: !!active && reasons.length > 0, active: !!active, reasons: reasons, pace: pace };
  };

  /* ---------- מיון ---------- */
  S.SORTS = [
    { v: 'hot',      label: 'חמות קודם' },
    { v: 'seen',     label: 'נכנסה לאחרונה' },
    { v: 'progress', label: 'הכי מתקדמות' },
    { v: 'joined',   label: 'הצטרפה לאחרונה' },
    { v: 'asks',     label: 'הכי הרבה שאלות' },
    { v: 'name',     label: 'שם (א-ת)' }
  ];

  S.sort = function (rows, by) {
    var r = rows.slice();
    var tie = function (a, b) { return (b.lastSeenMs || 0) - (a.lastSeenMs || 0); };
    var cmp = {
      hot: function (a, b) {
        return (b.hot.hot ? 1 : 0) - (a.hot.hot ? 1 : 0) || b.progress.pct - a.progress.pct || tie(a, b);
      },
      seen: tie,
      progress: function (a, b) { return b.progress.pct - a.progress.pct || tie(a, b); },
      joined: function (a, b) { return (b.joinedMs || 0) - (a.joinedMs || 0); },
      asks: function (a, b) { return (b.questions || 0) - (a.questions || 0) || tie(a, b); },
      name: function (a, b) { return String(a.name || a.email).localeCompare(String(b.name || b.email), 'he'); }
    }[by] || tie;
    return r.sort(cmp);
  };

  /* ---------- חיפוש ---------- */
  S.matches = function (row, term) {
    term = String(term || '').trim().toLowerCase();
    if (!term) return true;
    var digits = term.replace(/\D/g, '');
    var hay = [row.name, row.email, (row.links && row.links.business) || ''].join(' ').toLowerCase();
    if (hay.indexOf(term) !== -1) return true;
    /* טלפון: משווים ספרות בלבד, כדי ש-054-123 ו-054123 יימצאו שניהם */
    return digits.length >= 3 && String(row.phone || '').replace(/\D/g, '').indexOf(digits) !== -1;
  };

  /* ---------- "לפני כמה זמן" ---------- */
  S.ago = function (t, nowMs) {
    if (!t) return '';
    var d = Math.floor(((nowMs || Date.now()) - t) / DAY);
    if (d <= 0) return 'היום';
    if (d === 1) return 'אתמול';
    if (d < 7) return 'לפני ' + d + ' ימים';
    if (d < 14) return 'לפני שבוע';
    if (d < 60) return 'לפני ' + Math.round(d / 7) + ' שבועות';
    return 'לפני ' + Math.round(d / 30) + ' חודשים';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = S;
  root.StudentsData = S;
})(typeof window !== 'undefined' ? window : globalThis);
