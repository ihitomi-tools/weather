// これは公開されても問題ない設定値で、パスワードではない(アクセス制御はfirestore.rulesとログインが担う)。
export const firebaseConfig = {
  apiKey: 'AIzaSyAiTWZYXjxG70wkkPOY9de0idCAWVPGmMk',
  authDomain: 'weather-1065b.firebaseapp.com',
  projectId: 'weather-1065b',
  storageBucket: 'weather-1065b.firebasestorage.app',
  messagingSenderId: '553992937904',
  appId: '1:553992937904:web:1d50f5fb40e4355a067675',
};

export const isConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
