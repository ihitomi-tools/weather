// Firebaseとのやり取りはこのファイルだけに集める(乗り換えるときはここだけ直す)。
// ここに渡すのは暗号文と、誰がいつ送ったかだけ。
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, collection, doc, addDoc, setDoc, deleteDoc,
  query, orderBy, limitToLast, onSnapshot, serverTimestamp, Timestamp, writeBatch,
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

export const watchProfiles = (cb) => watchPlain('profiles', cb);
export const saveProfile = (uid, payload) => setDoc(doc(db, 'profiles', uid), payload);

export const watchShared = (cb) => watchPlain('shared', cb);
export const saveShared = (payload) => setDoc(doc(db, 'shared', 'main'), payload);
