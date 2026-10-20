// Open-Meteo(APIキー不要)から天気を取得する。失敗したときは最後に取れた値を使う。
const CACHE_PREFIX = 'wx:';

// WMO天気コード -> 表示の種類と日本語
export function describe(code) {
  if (code === 0) return { kind: 'sun', text: '快晴' };
  if (code === 1) return { kind: 'sun', text: '晴れ' };
  if (code === 2) return { kind: 'cloud', text: '晴れ時々くもり' };
  if (code === 3) return { kind: 'cloud', text: 'くもり' };
  if (code === 45 || code === 48) return { kind: 'cloud', text: '霧' };
  if (code >= 51 && code <= 57) return { kind: 'rain', text: '霧雨' };
  if (code >= 61 && code <= 67) return { kind: 'rain', text: '雨' };
  if (code >= 71 && code <= 77) return { kind: 'snow', text: '雪' };
  if (code >= 80 && code <= 82) return { kind: 'rain', text: 'にわか雨' };
  if (code === 85 || code === 86) return { kind: 'snow', text: 'にわか雪' };
  if (code >= 95) return { kind: 'rain', text: '雷雨' };
  return { kind: 'cloud', text: 'くもり' };
}

const WEEK = '日月火水木金土';

export function parseForecast(json, now = new Date()) {
  const hourlyTimes = json.hourly.time;
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
  let start = hourlyTimes.findIndex((t) => t >= nowKey);
  if (start < 0) start = 0;
  const hours = [];
  for (let i = start; i < Math.min(start + 6, hourlyTimes.length); i++) {
    hours.push({
      label: i === start ? 'いま' : `${Number(hourlyTimes[i].slice(11, 13))}時`,
      temp: Math.round(json.hourly.temperature_2m[i]),
      ...describe(json.hourly.weather_code[i]),
    });
  }
  const d = json.daily;
  const days = d.time.map((t, i) => ({
    label: i === 0 ? '今日' : WEEK[new Date(`${t}T00:00:00`).getDay()],
    min: Math.round(d.temperature_2m_min[i]),
    max: Math.round(d.temperature_2m_max[i]),
    ...describe(d.weather_code[i]),
  }));
  return {
    now: { temp: Math.round(json.current.temperature_2m), ...describe(json.current.weather_code) },
    hours,
    days,
    todayMin: days[0].min,
    todayMax: days[0].max,
  };
}

export async function loadWeather(city, fetchImpl = fetch) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${city.lat}&longitude=${city.lon}`
    + '&current=temperature_2m,weather_code'
    + '&hourly=temperature_2m,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
    + '&timezone=Asia%2FTokyo&forecast_days=7';
  try {
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(String(res.status));
    const raw = await res.json();
    try { localStorage.setItem(CACHE_PREFIX + city.name, JSON.stringify(raw)); } catch (e) { /* 保存できなくても動く */ }
    return { data: parseForecast(raw), stale: false };
  } catch (err) {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + city.name);
      if (cached) return { data: parseForecast(JSON.parse(cached)), stale: true };
    } catch (e) { /* 読めなければ失敗扱い */ }
    return { data: null, stale: true };
  }
}

// 雨の日か(いまか、きょう1日の天気が雨のとき)
export const isRainy = (parsed) => !!parsed && (parsed.now.kind === 'rain' || (parsed.days[0] && parsed.days[0].kind === 'rain'));
