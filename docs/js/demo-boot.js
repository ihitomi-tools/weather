// デモ用。demo.html の中の2画面でだけ働く(アドレスに ?demo=h か ?demo=y が付き、外側が demo.html のとき)。
// 本番のときは何もしない。デモ中は、端末の保存にも、サーバーにも、いっさい触れない。
function find() {
  try {
    const who = new URLSearchParams(location.search).get('demo');
    if ((who === 'h' || who === 'y') && window.parent !== window && window.parent.__demo) return { role: who, host: window.parent.__demo };
  } catch (e) { /* 外側が別の場所のときは、デモではない */ }
  return null;
}

export const DEMO = find();

// デモの時計: 「10分すすめる」などで、アプリの中の「いま」をずらす
if (DEMO) {
  const Real = Date;
  const shift = () => DEMO.host.offset || 0;
  class Demo extends Real {
    constructor(...a) { if (a.length === 0) super(Real.now() + shift()); else super(...a); }
    static now() { return Real.now() + shift(); }
  }
  globalThis.Date = Demo;
}
if (DEMO) {
  const st = document.createElement('style');
  st.textContent = '[data-hide]{display:none!important}'; // 「もどる」(天気の画面へ)は、デモでは出さない
  document.head.append(st);
}
