// Firebaseとのやり取りはこのファイルだけに集める(乗り換えるときはここだけ直す)。
// ここに渡すのは暗号文と、誰がいつ送ったかだけ。
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, collection, doc, addDoc, setDoc, deleteDoc,
  query, orderBy, limitToLast, onSnapshot, serverTimestamp, Timestamp, writeBatch, getDocs, where,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let auth;
let db;

export function init(config) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
}

export const onUser = (cb) => onAuthStateChanged(auth, cb);
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const currentUid = () => auth.currentUser && auth.currentUser.uid;

export function watchMessages(cb) {
  const q = query(collection(db, 'messages'), orderBy('ts'), limitToLast(300));
  return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    cb(snap.docs.map((d) => {
      const x = d.data({ serverTimestamps: 'estimate' });
      return {
        id: d.id, from: x.from, v: x.v, iv: x.iv, ct: x.ct,
        ts: x.ts ? x.ts.toMillis() : Date.now(),
        expireAt: x.expireAt ? x.expireAt.toMillis() : null,
      };
    }));
  });
}

export function sendMessage(payload, expireAfterMs) {
  const data = { ...payload, from: auth.currentUser.uid, ts: serverTimestamp() };
  if (expireAfterMs) data.expireAt = Timestamp.fromMillis(Date.now() + expireAfterMs);
  return addDoc(collection(db, 'messages'), data);
}

export const removeMessage = (id) => deleteDoc(doc(db, 'messages', id));

// 既読: 「ここまで読んだ」という、相手のメッセージの時刻を、1人1件だけ置く
export const watchReads = (cb) => watchPlain('reads', cb);
export const saveRead = (at) => setDoc(doc(db, 'reads', auth.currentUser.uid), { at, from: auth.currentUser.uid });

function watchPlain(name, cb) {
  return onSnapshot(collection(db, name), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export const watchEvents = (cb) => watchPlain('events', cb);
export const saveEvent = (id, payload) => (id
  ? setDoc(doc(db, 'events', id), payload)
  : addDoc(collection(db, 'events'), payload));
export const removeEvent = (id) => deleteDoc(doc(db, 'events', id));

export const watchDays = (cb) => watchPlain('days', cb);
export function saveDays(list) {
  const batch = writeBatch(db);
  list.forEach(({ id, payload }) => batch.set(doc(db, 'days', id), { ...payload, owner: auth.currentUser.uid }));
  return batch.commit();
}

// 持ち主のいない古い記録を、自分のものにする
export function claimDays(ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, 'days', id), { owner: auth.currentUser.uid }));
  return batch.commit();
}

export const watchPats = (cb) => watchPlain('pats', cb);
export const savePat = (id, payload) => setDoc(doc(db, 'pats', id), { ...payload, from: auth.currentUser.uid });
export const removePat = (id) => deleteDoc(doc(db, 'pats', id));
export function removeDays(ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(doc(db, 'days', id)));
  return batch.commit();
}

// ---- 毎日のお題 ----
export const watchStock = (cb) => watchPlain('stock', cb);
export const addStock = (payload) => addDoc(collection(db, 'stock'), { ...payload, from: auth.currentUser.uid });
export const removeStock = (id) => deleteDoc(doc(db, 'stock', id));
export const watchQCards = (cb) => watchPlain('qcards', cb);
// 同じ番号のお題が、2つの端末から同時にできたときは、先にできたほうが残る(あとのほうは書き込めない)
export const createQCard = (id, n, payload) => setDoc(doc(db, 'qcards', id), { ...payload, n, from: auth.currentUser.uid });
export const watchAnswers = (cb) => watchPlain('answers', cb);
export const saveAnswer = (id, payload) => setDoc(doc(db, 'answers', id), { ...payload, owner: auth.currentUser.uid });

// ---- ボックス(タイムカプセル・誕生日) ----
// 中身(items)は、開く日(openAt)まで、サーバーが読ませない。件数の印(marks)だけ、いつでも読める。
export const watchBoxes = (cb) => watchPlain('boxes', cb);
export const createBox = (id, payload, openAtMs) => setDoc(doc(db, 'boxes', id), { ...payload, openAt: Timestamp.fromMillis(openAtMs), from: auth.currentUser.uid });
export const removeBox = (id) => deleteDoc(doc(db, 'boxes', id));
export const watchMarks = (cb) => watchPlain('marks', cb);

export function addItem(id, boxId, openAtMs, payload) {
  const uid = auth.currentUser.uid;
  const batch = writeBatch(db);
  batch.set(doc(db, 'items', id), { ...payload, box: boxId, openAt: Timestamp.fromMillis(openAtMs), from: uid });
  batch.set(doc(db, 'marks', id), { box: boxId, from: uid });
  return batch.commit();
}

// 開く日が来た中身だけを読む(開く日の範囲で絞らないと、ルールに断られる)
export async function loadItems(untilMs) {
  const snap = await getDocs(query(collection(db, 'items'), where('openAt', '<=', Timestamp.fromMillis(untilMs))));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export const watchProfiles = (cb) => watchPlain('profiles', cb);
export const saveProfile = (uid, payload) => setDoc(doc(db, 'profiles', uid), payload);

export const watchShared = (cb) => watchPlain('shared', cb);
export const saveShared = (payload) => setDoc(doc(db, 'shared', 'main'), payload);
