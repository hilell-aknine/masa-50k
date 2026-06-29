/* =================================================================
   משתמשים מורשים · דמו בלבד
   ⚠️ בפרודקשן עובר ל-Supabase Auth (סיסמאות חזקות, role בצד שרת).
   טלפון-כסיסמה כאן הוא לדמו זמני · לא לפרודקשן.
   ================================================================= */
window.USERS = [
  { email:'orianc561@gmail.com',     pass:'0523401420', name:'אוריאן כהן', role:'admin' },
  { email:'htjewelry.a474@gmail.com', pass:'0549116092', name:'הלל אקנין',  role:'admin' }
];

window.authUser = function(email, pass){
  var e = (email||'').trim().toLowerCase();
  var p = (pass||'').trim();
  for (var i = 0; i < window.USERS.length; i++){
    if (window.USERS[i].email.toLowerCase() === e && window.USERS[i].pass === p) return window.USERS[i];
  }
  return null;
};
