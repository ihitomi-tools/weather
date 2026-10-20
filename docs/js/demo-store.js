// デモ用の入れ物。本物のFirebaseの代わりに、demo.html の中のメモリに置く(2画面で共有)。
// ページを開き直す・リセットすると、すべて消える。
import { DEMO } from './demo-boot.js';

const host = DEMO.host;
const uid = `demo-${DEMO.role}`;
const B = host.bus; // { data, subs, n }
const D = () => B.data;
const notify = () => [...B.subs].forEach((s) => { try { s(); } catch (e) { /* 閉じた画面の分は無視 */ } });
const watch = (name, map) => (cb) => {
  const s = () => cb(map ? map(D()[name]) : D()[name].slice());
  B.subs.add(s);
  setTimeout(s, 0);
  return () => B.subs.delete(s);
};
const put = (name, row, key = 'id') => { D()[name] = D()[name].filter((x) => x[key] !== row[key]); D()[name].push(row); notify(); };
const exists = (name, id) => D()[name].some((x) => x.id === id);

export function init() {}
export const onUser = (cb) => { setTimeout(() => cb({ uid }), 0); return () => {}; };
export const login = async () => { throw new Error('demo'); };
export const logout = async () => {};
export const currentUid = () => uid;

export const watchMessages = watch('messages');
export const sendMessage = async (payload, exp) => { B.n += 1; D().messages.push({ id: `m${B.n}`, ...payload, from: uid, ts: Date.now(), expireAt: exp ? Date.now() + exp : null }); notify(); };
export const removeMessage = async (id) => { D().messages = D().messages.filter((m) => m.id !== id); notify(); };
export const watchReads = watch('reads');
export const saveRead = async (at) => put('reads', { id: uid, at, from: uid });

export const watchEvents = watch('events');
export const saveEvent = async (id, payload) => { B.n += 1; put('events', { id: id || `e${B.n}`, ...payload }); };
export const removeEvent = async (id) => { D().events = D().events.filter((e) => e.id !== id); notify(); };

export const watchDays = watch('days');
export const saveDays = async (list) => { list.forEach(({ id, payload }) => { D().days = D().days.filter((x) => x.id !== id); D().days.push({ id, ...payload, owner: uid }); }); notify(); };
export const claimDays = async (ids) => { D().days.forEach((x) => { if (ids.includes(x.id) && !x.owner) x.owner = uid; }); notify(); };
export const removeDays = async (ids) => { D().days = D().days.filter((x) => !ids.includes(x.id)); notify(); };
export const watchPats = watch('pats');
export const savePat = async (id, payload) => put('pats', { id, ...payload, from: uid });
export const removePat = async (id) => { D().pats = D().pats.filter((x) => x.id !== id); notify(); };

export const watchStock = watch('stock');
export const addStock = async (payload) => { B.n += 1; put('stock', { id: `s${B.n}`, ...payload, from: uid }); };
export const removeStock = async (id) => { D().stock = D().stock.filter((x) => x.id !== id); notify(); };
export const watchQCards = watch('qcards');
export const createQCard = async (id, n, payload) => { if (exists('qcards', id)) throw new Error('exists'); put('qcards', { id, n, ...payload, from: uid }); };
export const watchAnswers = watch('answers');
export const saveAnswer = async (id, payload) => { if (exists('answers', id)) throw new Error('exists'); put('answers', { id, ...payload, owner: uid }); };

export const watchBoxes = watch('boxes');
export const createBox = async (id, payload, openAt) => { if (exists('boxes', id)) throw new Error('exists'); put('boxes', { id, ...payload, openAt, from: uid }); };
export const removeBox = async (id) => { D().boxes = D().boxes.filter((x) => x.id !== id); notify(); };
export const watchMarks = watch('marks');
export const addItem = async (id, box, openAt, payload) => { D().items.push({ id, ...payload, box, openAt, from: uid }); put('marks', { id, box, from: uid }); };
export const loadItems = async (until) => D().items.filter((x) => x.openAt <= until);

export const watchMoon = watch('moon');
export const addMoon = async (id, payload) => { if (exists('moon', id)) throw new Error('exists'); put('moon', { id, ...payload, from: uid }); };

export const watchProfiles = watch('profiles');
export const saveProfile = async (u, payload) => put('profiles', { id: u, ...payload });
export const watchShared = watch('shared');
export const saveShared = async (payload) => put('shared', { id: 'main', ...payload });
