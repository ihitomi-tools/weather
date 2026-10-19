// Firebaseコンソールの「ウェブアプリ」に表示される設定値を貼り付ける。
// これは公開されても問題ない設定値で、パスワードではない(アクセス制御はfirestore.rulesとログインが担う)。
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  appId: 'YOUR_APP_ID',
};

export const isConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
