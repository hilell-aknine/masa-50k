/* ============================================================
   advisor-sync · מיישר את החומר של היועצת מול data/content.js
   28.09.2026 · מחליף את load-to-advisor.mjs ו-seed-stations.mjs
   ============================================================

   הבאג שזה מתקן
   --------------
   הטוען הישן שייך תמלול לתחנה לפי שתי הספרות הראשונות בשם הקובץ
   (06-3-... → תחנה 6), כלומר לפי המספור של 22.09 בן 11 התחנות.
   אוריאן עברה ב-24.09 ל-10 תחנות, ומאז:
     · משפך VSL (היום תחנה 5) ישב על תחנה 6, שהיא היום CRM.
     · CRM ישב על 7 (היום ממומן), ממומן ישב על 8 (היום אינסטגרם).
     · גיוס עובד ראשון ישב על 11, שלא קיימת בכלל.
     · תחנות 5 ו-10 לא קיבלו שום חומר.
   גם advisor_stations נשאר עם 11 רשומות, שמות ישנים ו"התחנה הבאה"
   לפי הסדר הישן.

   העיקרון החדש
   ------------
   🔑 המפתח היציב הוא **מזהה היוטיוב**, לא מספר תחנה.
     קובץ תמלול → מזהה יוטיוב       (youtube-map.json, קבוע)
     מזהה יוטיוב → תחנה ומיקום       (data/content.js, בזמן ריצה)
   אוריאן משנה סדר או מספור? מריצים שוב, והכל מתיישר. אין כאן
   שום מספר תחנה כתוב ביד.

   מה נשמר בכוונה
   --------------
   · מסמך לכל שיעור: advisor_docs/transcript-yt-{youtubeId}.
     הסטטוס (טיוטה/פעיל) נשמר בין ריצות, כי הוא שייך לשיעור ולא
     למספר. אישור של אוריאן לא נמחק כשהמספור זז.
   · אם אוריאן ערכה (הגיהה) את גוף התמלול במרכז היועצת, הגוף לא
     נדרס. מזהים את זה לפי טביעת האצבע של מה שהטוען כתב בפעם
     הקודמת (seeded_hash).
   · בתחנות: "אם נתקעים כאן", יעדים ותיאור שאוריאן כתבה בעצמה
     עוברים עם התחנה שלהם למספר החדש, ולא נשארים תקועים על מספר
     שמתאר היום נושא אחר.

   הרצה
   ----
     node tools/advisor-sync.mjs              # יבש: קורא מהמסד החי, לא כותב
     node tools/advisor-sync.mjs --offline    # יבש בלי מסד בכלל
     node tools/advisor-sync.mjs --write      # ⚠️ כותב. אצל הלל בלבד.
   הרשאות: Application Default Credentials (gcloud auth
   application-default login) של חשבון עם גישה ל-k-business-c1213.
   ============================================================ */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const CONTENT = path.join(REPO, 'data', 'content.js');
const TRANSCRIBE = process.env.ORIANE_TRANSCRIBE_DIR || 'C:/AtomicBusiness/_videowork/oriane/transcribe';
const TEXT_DIR = path.join(TRANSCRIBE, 'text');
const MAP_FILE = path.join(TRANSCRIBE, 'youtube-map.json');
const PLAN_OUT = path.join(TRANSCRIBE, 'advisor-sync-plan.json');

const WRITE = process.argv.includes('--write');
const OFFLINE = process.argv.includes('--offline');
const PROJECT = 'k-business-c1213';

/* זהה לתקרה ב-functions/index.js. אם תחנה חוצה אותה, היועצת
   חותכת ומדווחת. כאן רק מזהירים מראש. */
const MAX_DOC_CHARS = 120000;

/* ---------- עזרים ---------- */
const sha = s => crypto.createHash('sha1').update(String(s), 'utf8').digest('hex').slice(0, 16);
const stripNum = t => String(t || '').replace(/^\s*\d+\s*·\s*/, '').trim();
const pad = (s, n) => { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); };

function loadCourse(src) {
  const win = {};
  new Function('window', src)(win);
  return (win.COURSE && win.COURSE.allStations) || [];
}

/* כל מזהי היוטיוב של תחנה. תחנה עם סרטון בודד ובלי מערך
   שיעורים נחשבת לשיעור אחד, בדיוק כמו ב-js/advisor-data.js. */
function lessonsOf(s) {
  if (Array.isArray(s.lessons) && s.lessons.length) return s.lessons;
  return s.youtubeId ? [{ n: s.name, youtubeId: s.youtubeId }] : [];
}

/* גוף התמלול בלי שורות הכותרת (#). הכותרות הישנות הכילו
   "תחנה 6", ומספר כזה בתוך הגוף היה מטעה את המודל אחרי כל
   שינוי מספור. הכותרת העדכנית חיה ב-title, שמתעדכן בכל ריצה. */
function transcriptBody(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  let i = 0;
  while (i < lines.length && (lines[i].startsWith('#') || !lines[i].trim())) i++;
  return lines.slice(i).join('\n').trim();
}

/* ---------- 1. מקור האמת: content.js ---------- */
const stations = loadCourse(fs.readFileSync(CONTENT, 'utf8'));
if (!stations.length) { console.error('לא נטענו תחנות מ-content.js'); process.exit(1); }

const ytIndex = {};   // youtubeId → מיקום נוכחי
stations.forEach((s, si) => {
  const ls = lessonsOf(s);
  ls.forEach((l, li) => {
    if (!l.youtubeId) return;
    ytIndex[l.youtubeId] = {
      station_id: s.id, station_name: s.name,
      lesson_index: li, lesson_pos: li + 1, lesson_total: ls.length,
      lesson_title: stripNum(l.n) || s.name
    };
  });
});

/* ---------- 2. התמלולים ---------- */
const registry = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')).files || {};
const txtFiles = fs.readdirSync(TEXT_DIR).filter(f => f.endsWith('.txt')).sort();

const lessonDocs = [];     // מה שייכתב
const orphans = [];        // יש תמלול, אין שיעור ב-content.js
const unmapped = [];       // יש תמלול, אין מזהה יוטיוב ברישום
const rawByFile = {};

for (const f of txtFiles) {
  const name = f.replace(/\.txt$/, '');
  const raw = fs.readFileSync(path.join(TEXT_DIR, f), 'utf8');
  rawByFile[name] = raw;
  const reg = registry[name];
  if (!reg || !reg.youtubeId) { unmapped.push(name); continue; }
  const pos = ytIndex[reg.youtubeId];
  if (!pos) { orphans.push({ name, youtubeId: reg.youtubeId }); continue; }
  const body = transcriptBody(raw);
  lessonDocs.push({
    id: `transcript-yt-${reg.youtubeId}`,
    file: name,
    youtube_id: reg.youtubeId,
    legacy_doc: reg.legacy_doc || null,
    ...pos,
    title: `תמלול · תחנה ${pos.station_id} · ${pos.station_name} · שיעור ${pos.lesson_pos}/${pos.lesson_total} · ${pos.lesson_title}`,
    body,
    chars: body.length
  });
}

/* שיעורים בקורס שאין להם תמלול. לא שגיאה, אבל היועצת לא
   תדע עליהם כלום, ולכן זה חייב להופיע בדוח. */
const covered = new Set(lessonDocs.map(d => d.youtube_id));
const missing = [];
stations.forEach(s => lessonsOf(s).forEach((l, li) => {
  if (l.youtubeId && !covered.has(l.youtubeId)) {
    missing.push({ station_id: s.id, lesson_pos: li + 1, title: stripNum(l.n), youtubeId: l.youtubeId });
  }
}));

/* ---------- 3. מפת התחנות (advisor_stations) ---------- */
const stationDocs = stations.map((s, i) => ({
  id: String(s.id),
  station_id: s.id,
  name: s.name,
  summary: s.desc || '',
  next_station_id: stations[i + 1] ? stations[i + 1].id : null,
  has_video: lessonsOf(s).some(l => l.youtubeId),
  anchor_youtube_ids: lessonsOf(s).map(l => l.youtubeId).filter(Boolean)
}));

/* ⚠️ רשומות שנזרעו לפני 28.09 לא נושאות עוגן. זה המבנה שלהן, כפי
   שהיה ב-content.js בקומיט 3f00747 (22.09). זו רשימה היסטורית
   קפואה, לא מספור נוכחי. היא משמשת רק כדי לדעת לאיזה נושא
   שייכת רשומה ישנה, ונזנחת אחרי ה---write הראשון שמטביע עוגנים. */
const LEGACY_22_09 = {
  1:  { name: 'תודעה ומיינדסט (זהות)', yt: ['yGLv93_FfrQ'] },
  2:  { name: 'קהל יעד ומסרים לפרסומים', yt: ['4hJYuwgMSEg'] },
  3:  { name: 'משפך מוצרים', yt: ['c_wDb_K7buw'] },
  4:  { name: 'פרסונל ברנד', yt: [] },
  5:  { name: 'שיווק אורגני', yt: [] },
  6:  { name: 'משפך VSL', yt: ['CYKCQ_SvP14'] },
  7:  { name: 'מערכת CRM ואוטומציות', yt: ['EwpQ92E5Y8c'] },
  8:  { name: 'שיווק ממומן', yt: ['rqNvDSIfsnk'] },
  9:  { name: 'פודקאסט · ערוץ שיווק מעולה', yt: [] },
  10: { name: 'קורס דיגיטלי', yt: [] },
  11: { name: 'עצמאי ממוקד', yt: ['kR2TYZqZyS0'] }
};

/* כל התיאורים שאי פעם היו ב-content.js. תיאור ברשומה ישנה שמופיע
   כאן נזרע אוטומטית ואפשר להחליף אותו. תיאור שלא מופיע כאן נכתב
   ע"י אוריאן במרכז היועצת, ולכן נשמר ועובר עם התחנה שלו. */
function historicalDescs() {
  const out = new Set();
  try {
    const hashes = execSync('git log --format=%H -- data/content.js', { cwd: REPO, encoding: 'utf8' })
      .split('\n').filter(Boolean);
    for (const h of hashes) {
      try {
        const src = execSync(`git show ${h}:data/content.js`, { cwd: REPO, encoding: 'utf8', maxBuffer: 8e6 });
        loadCourse(src).forEach(s => { if (s.desc) out.add(s.desc.trim()); });
      } catch (e) { /* גרסה שלא נטענת לא מבטלת את השאר */ }
    }
  } catch (e) {
    console.log('⚠️ git לא זמין. כל תיאור קיים ייחשב לכתוב ע"י אוריאן וישמר.');
  }
  return out;
}

/* ---------- 4. מצב חי (קריאה בלבד) ---------- */
let db = null, FieldValue = null;
const live = { docs: {}, stations: {}, readOk: false };

/* בדיקות: מצב חי מקובץ במקום מהמסד. לעולם לא כותב. */
const FIXTURE = process.env.ADVISOR_SYNC_FIXTURE;
if (FIXTURE) {
  if (WRITE) { console.error('--write אסור עם ADVISOR_SYNC_FIXTURE'); process.exit(1); }
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  Object.assign(live.docs, fx.docs || {});
  Object.assign(live.stations, fx.stations || {});
  live.readOk = true;
} else if (!OFFLINE) {
  const require = createRequire(path.join(REPO, 'functions', 'package.json'));
  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const fs2 = require('firebase-admin/firestore');
  FieldValue = fs2.FieldValue;
  initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  db = fs2.getFirestore();
  try {
    const [d, s] = await Promise.all([db.collection('advisor_docs').get(), db.collection('advisor_stations').get()]);
    d.docs.forEach(x => { live.docs[x.id] = x.data(); });
    s.docs.forEach(x => { live.stations[x.id] = x.data(); });
    live.readOk = true;
  } catch (e) {
    console.error('קריאת המסד נכשלה:', e.code || '', e.message);
    if (WRITE) process.exit(1);
    console.log('ממשיך כהרצה יבשה בלי מצב חי.\n');
  }
}

/* ---------- 5. התוכנית ---------- */
const plan = { set_docs: [], delete_docs: [], keep_docs: [], set_stations: [], delete_stations: [], warnings: [], conflicts: [] };

/* 5א. מסמכי שיעור */
for (const d of lessonDocs) {
  const cur = live.docs[d.id];
  const legacy = d.legacy_doc ? live.docs[d.legacy_doc] : null;
  /* סטטוס: קודם מה שכבר נקבע לשיעור הזה, אחר כך מה שהיה במסמך
     הישן שהתמלול ישב בו, ורק אז טיוטה. תמלול חדש לעולם לא נולד
     פעיל: אוריאן מאשרת לפני שהיועצת עונה ממנו. */
  const status = (cur && cur.status) || (legacy && legacy.status) || 'draft';
  const newHash = sha(d.body);
  const edited = cur && cur.seeded_hash && cur.body !== undefined && sha(cur.body) !== cur.seeded_hash;
  const doc = {
    title: d.title,
    scope: 'station',
    station_id: d.station_id,
    youtube_id: d.youtube_id,
    lesson_index: d.lesson_index,
    lesson_pos: d.lesson_pos,
    status,
    source: 'transcript',
    lessons: 1,
    transcript_file: d.file
  };
  if (edited) {
    /* אוריאן הגיהה. מעדכנים רק את השיוך והכותרת. */
    plan.warnings.push(`${d.id}: הגוף נערך במרכז היועצת, לא נדרס. עודכנו רק תחנה וכותרת.`);
  } else {
    doc.body = d.body;
    doc.char_count = d.chars;
    doc.seeded_hash = newHash;
  }
  const action = !cur ? 'חדש'
    : (cur.station_id !== d.station_id ? `הועבר ${cur.station_id}→${d.station_id}`
      : (edited || cur.seeded_hash === newHash ? 'ללא שינוי בגוף' : 'עודכן'));
  plan.set_docs.push({ id: d.id, action, chars: edited ? (cur.char_count || 0) : d.chars, doc });
}

/* 5ב. מסמכי תמלול ישנים ומסמכי שיעור שכבר לא בקורס */
const wantIds = new Set(lessonDocs.map(d => d.id));
for (const [id, x] of Object.entries(live.docs)) {
  if (x.source !== 'transcript') continue;           // מסמכים שאוריאן העלתה ביד לא נוגעים
  if (wantIds.has(id)) continue;

  if (/^transcript-station-\d+$/.test(id)) {
    /* המסמך הישן נמחק רק אם הוא זהה בדיוק למה שהטוען הישן
       כתב. אם אוריאן ערכה אותו, משאירים ומסמנים לבדיקה ידנית. */
    const files = Object.entries(registry).filter(([, r]) => r.legacy_doc === id).map(([n]) => n).sort();
    const rebuilt = files.filter(n => rawByFile[n] !== undefined).map(n => rawByFile[n].trim()).join('\n\n---\n\n');
    if (files.length && rebuilt === x.body) {
      plan.delete_docs.push({ id, why: `מבנה ישן לפי מספר תחנה (${x.station_id}). התוכן עבר למסמכי שיעור.` });
    } else {
      plan.keep_docs.push({ id, why: 'הגוף שונה ממה שהטוען הישן כתב, ייתכן שאוריאן ערכה. לא נמחק.' });
      plan.warnings.push(`${id}: לא נמחק כי נערך. ⚠️ עדיין משויך לתחנה ${x.station_id} — לבדוק ידנית.`);
    }
  } else if (/^transcript-yt-/.test(id)) {
    const edited = x.seeded_hash && sha(x.body || '') !== x.seeded_hash;
    if (edited) {
      plan.keep_docs.push({ id, why: 'השיעור ירד מ-content.js אבל התמלול נערך. לא נמחק.' });
      plan.warnings.push(`${id}: השיעור לא קיים יותר בקורס ותמלולו נערך. לבדוק ידנית.`);
    } else {
      plan.delete_docs.push({ id, why: 'השיעור לא קיים יותר ב-content.js.' });
    }
  }
}

/* 5ג. מפת התחנות */
const oldDescs = Object.keys(live.stations).length ? historicalDescs() : new Set();

function identityOf(docId, x) {
  if (Array.isArray(x.anchor_youtube_ids)) return { yt: x.anchor_youtube_ids, name: x.anchor_name || x.name };
  const L = LEGACY_22_09[Number(docId)];
  return L ? { yt: L.yt, name: L.name } : { yt: [], name: x.name };
}

function authoredOf(x) {
  const a = {};
  if (Array.isArray(x.goals) && x.goals.length) a.goals = x.goals;
  if ((x.stuck_hint || '').trim()) a.stuck_hint = x.stuck_hint;
  const sum = (x.summary || '').trim();
  const seeded = x.seeded_summary !== undefined ? sum === (x.seeded_summary || '').trim() : oldDescs.has(sum);
  if (sum && !seeded) a.summary = x.summary;
  return a;
}

/* לכל רשומה קיימת: לאיזו תחנה נוכחית היא שייכת לפי נושא */
const carry = {};           // מספר תחנה נוכחי → שדות שאוריאן כתבה
for (const [docId, x] of Object.entries(live.stations)) {
  const idn = identityOf(docId, x);
  const target = stationDocs.find(s => idn.yt.some(y => s.anchor_youtube_ids.includes(y)))
              || stationDocs.find(s => s.name === idn.name);
  const authored = authoredOf(x);
  const hasAuthored = Object.keys(authored).length > 0;

  if (target) {
    if (hasAuthored) {
      carry[target.id] = authored;
      if (target.id !== docId) plan.warnings.push(`תחנה ${docId}→${target.id}: מה שאוריאן כתבה (${Object.keys(authored).join(', ')}) עובר עם הנושא "${target.name}".`);
    }
  } else if (hasAuthored) {
    carry['__orphan_' + docId] = authored;
    if (stationDocs.some(s => s.id === docId)) {
      /* המספר הזה תפוס היום ע"י נושא אחר, וכתיבה תדרוס את הטקסט
         של אוריאן. אין דרך אוטומטית נכונה, ולכן חוסמים כתיבה. */
      plan.conflicts.push(`רשומת תחנה ${docId} ("${x.name}") מכילה טקסט של אוריאן (${Object.keys(authored).join(', ')}), ` +
        `הנושא ירד מהקורס, והמספר ${docId} שייך היום ל"${stationDocs.find(s => s.id === docId).name}". ` +
        `להעתיק את הטקסט ידנית ואז למחוק את השדות, ורק אז להריץ --write.`);
    } else {
      plan.warnings.push(`רשומת תחנה ${docId} ("${x.name}") מכילה טקסט של אוריאן ואין לה נושא תואם בקורס. לא נמחקת.`);
    }
  }
}

for (const s of stationDocs) {
  const a = carry[s.id] || {};
  const cur = live.stations[s.id];
  plan.set_stations.push({
    id: s.id,
    action: !cur ? 'חדש' : (cur.name !== s.name ? `"${cur.name}" → "${s.name}"` : 'רענון'),
    doc: {
      station_id: s.station_id,
      name: s.name,
      summary: a.summary !== undefined ? a.summary : s.summary,
      seeded_summary: s.summary,
      goals: a.goals || [],
      stuck_hint: a.stuck_hint || '',
      next_station_id: s.next_station_id,
      has_video: s.has_video,
      anchor_youtube_ids: s.anchor_youtube_ids,
      anchor_name: s.name
    }
  });
}
for (const [docId, x] of Object.entries(live.stations)) {
  if (stationDocs.some(s => s.id === docId)) continue;
  if (carry['__orphan_' + docId]) continue;
  plan.delete_stations.push({ id: docId, why: `"${x.name}" לא קיימת במבנה הנוכחי ואין בה טקסט של אוריאן.` });
}

/* 5ד. תקציב חומר לתחנה */
const perStation = {};
for (const p of plan.set_docs) perStation[p.doc.station_id] = (perStation[p.doc.station_id] || 0) + p.chars;
for (const [sid, n] of Object.entries(perStation)) {
  if (n > MAX_DOC_CHARS) plan.warnings.push(`תחנה ${sid}: ${n.toLocaleString()} תווים, מעל תקרת ${MAX_DOC_CHARS.toLocaleString()}. היועצת תחתוך.`);
}

/* ---------- 6. הדפסה ---------- */
console.log(`\ncontent.js: ${stations.length} תחנות · ${Object.keys(ytIndex).length} שיעורים עם וידאו`);
console.log(`תמלולים: ${txtFiles.length} קבצים · ${lessonDocs.length} משויכים · ${orphans.length} יתומים · ${unmapped.length} בלי מזהה`);
console.log(`מצב חי: ${OFFLINE ? 'לא נקרא (--offline)' : (live.readOk ? `נקרא · ${Object.keys(live.docs).length} מסמכים · ${Object.keys(live.stations).length} תחנות` : 'הקריאה נכשלה')}\n`);

console.log('── חומר לכל תחנה ─────────────────────────────');
for (const s of stations) {
  const mine = plan.set_docs.filter(p => p.doc.station_id === s.id).sort((a, b) => a.doc.lesson_pos - b.doc.lesson_pos);
  const tot = lessonsOf(s).length;
  const chars = mine.reduce((n, p) => n + p.chars, 0);
  console.log(`תחנה ${pad(s.id, 3)} ${pad(s.name, 34)} ${mine.length}/${tot} שיעורים · ${chars.toLocaleString()} תווים`);
  mine.forEach(p => console.log(`    ${pad(p.id, 28)} שיעור ${p.doc.lesson_pos} · ${pad(p.doc.status, 6)} · ${p.action}`));
}

console.log('\n── מחיקות advisor_docs ───────────────────────');
plan.delete_docs.length ? plan.delete_docs.forEach(d => console.log(`  ✂ ${pad(d.id, 26)} ${d.why}`)) : console.log('  אין');
plan.keep_docs.forEach(d => console.log(`  ⏸ ${pad(d.id, 26)} ${d.why}`));

console.log('\n── advisor_stations ──────────────────────────');
plan.set_stations.forEach(s => console.log(`  ${pad(s.id, 3)} ${pad(s.doc.name, 34)} הבאה: ${pad(s.doc.next_station_id ?? '—', 3)} ${s.action}`));
plan.delete_stations.forEach(s => console.log(`  ✂ ${pad(s.id, 3)} ${s.why}`));

if (missing.length) {
  console.log('\n── שיעורים בלי תמלול (היועצת לא תדע עליהם) ──');
  missing.forEach(m => console.log(`  תחנה ${m.station_id} · שיעור ${m.lesson_pos} · ${m.title} (${m.youtubeId})`));
}
if (orphans.length) {
  console.log('\n── תמלולים בלי שיעור בקורס (לא נטענים) ──────');
  orphans.forEach(o => console.log(`  ${o.name} (${o.youtubeId})`));
}
if (unmapped.length) {
  console.log('\n── תמלולים בלי מזהה יוטיוב ב-youtube-map.json ─');
  unmapped.forEach(n => console.log('  ' + n));
}
if (plan.conflicts.length) {
  console.log('\n── 🛑 התנגשויות שחוסמות כתיבה ─────────────────');
  plan.conflicts.forEach(c => console.log('  🛑 ' + c));
}
if (plan.warnings.length) {
  console.log('\n── אזהרות ─────────────────────────────────────');
  plan.warnings.forEach(w => console.log('  ⚠️ ' + w));
}

fs.writeFileSync(PLAN_OUT, JSON.stringify({
  generated_at: new Date().toISOString(), write: WRITE, live_read: live.readOk,
  set_docs: plan.set_docs.map(p => ({ id: p.id, action: p.action, station_id: p.doc.station_id, lesson_pos: p.doc.lesson_pos, status: p.doc.status, chars: p.chars, title: p.doc.title })),
  delete_docs: plan.delete_docs, keep_docs: plan.keep_docs,
  set_stations: plan.set_stations.map(s => ({ id: s.id, action: s.action, ...s.doc })),
  delete_stations: plan.delete_stations,
  missing, orphans, unmapped, warnings: plan.warnings, conflicts: plan.conflicts
}, null, 2), 'utf8');
console.log(`\nהתוכנית המלאה נשמרה: ${PLAN_OUT}`);

if (!WRITE) {
  console.log('(הרצה יבשה. שום דבר לא נכתב. לכתיבה: --write)');
  process.exit(0);
}

/* ---------- 7. כתיבה ---------- */
if (!live.readOk) { console.error('אין כתיבה בלי קריאת מצב חי תקינה.'); process.exit(1); }
if (plan.conflicts.length) { console.error('🛑 יש התנגשויות (למעלה). לא נכתב כלום.'); process.exit(1); }

const ops = [];
const now = FieldValue.serverTimestamp();
for (const p of plan.set_docs) {
  ops.push(b => b.set(db.collection('advisor_docs').doc(p.id),
    { ...p.doc, updated_at: now, updated_by: 'advisor-sync' }, { merge: true }));
}
for (const d of plan.delete_docs) ops.push(b => b.delete(db.collection('advisor_docs').doc(d.id)));
/* תחנות נכתבות במלואן (בלי merge), כדי שטקסט שעבר לתחנה אחרת לא
   יישאר גם על המספר הישן. מה שאוריאן כתבה כבר הועבר בתוכנית. */
for (const s of plan.set_stations) {
  ops.push(b => b.set(db.collection('advisor_stations').doc(s.id),
    { ...s.doc, updated_at: now, updated_by: 'advisor-sync' }));
}
for (const s of plan.delete_stations) ops.push(b => b.delete(db.collection('advisor_stations').doc(s.id)));

for (let i = 0; i < ops.length; i += 400) {
  const batch = db.batch();
  ops.slice(i, i + 400).forEach(fn => fn(batch));
  await batch.commit();
}
console.log(`\n✅ נכתב: ${plan.set_docs.length} מסמכי שיעור · ${plan.delete_docs.length} נמחקו · ` +
  `${plan.set_stations.length} תחנות · ${plan.delete_stations.length} תחנות נמחקו.`);
console.log('התמלולים בטיוטה עד שאוריאן מפעילה אותם במרכז היועצת.');
