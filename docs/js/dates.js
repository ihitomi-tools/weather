// 誕生日(年なし)と、開封日の計算。
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// うるう日(2/29)は、うるう年でない年は2/28にする
export function birthdayDate(m, d, year) {
  return new Date(year, m - 1, m === 2 && d === 29 && !isLeap(year) ? 28 : d);
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// 今日を含めて、次の誕生日(daysLeft=0 は今日)
export function nextBirthday(m, d, today) {
  const t0 = startOfDay(today);
  let date = birthdayDate(m, d, t0.getFullYear());
  if (date < t0) date = birthdayDate(m, d, t0.getFullYear() + 1);
  return { date, daysLeft: Math.round((date - t0) / 864e5) };
}

// メッセージを封をして贈れる、次の誕生日(今日が誕生日なら、来年)
export function nextGiftBirthday(m, d, today) {
  const nb = nextBirthday(m, d, today);
  return nb.daysLeft === 0 ? nextBirthday(m, d, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)) : nb;
}

export const isBirthdayOn = (m, d, date) => {
  const b = birthdayDate(m, d, date.getFullYear());
  return b.getMonth() === date.getMonth() && b.getDate() === date.getDate();
};

// 'YYYY-MM-DD' の0時(端末の時刻)
export function midnightMs(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export const POP_DAYS = 14; // 誕生日の何日前から、ポップを出すか
