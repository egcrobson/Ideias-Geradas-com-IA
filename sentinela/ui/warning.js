const p = new URLSearchParams(location.search);
const url = p.get('u') || '';
let reasons = [];
try { reasons = JSON.parse(p.get('r') || '[]'); } catch { }

document.getElementById('url').textContent = url;
const ul = document.getElementById('reasons');
for (const r of reasons) { const li = document.createElement('li'); li.textContent = r; ul.append(li); }

document.getElementById('back').onclick = () => {
  if (history.length > 2) history.go(-2);
  else location.href = 'https://www.google.com/';
};
document.getElementById('proceed').onclick = async () => {
  if (!/^https?:\/\//i.test(url)) return;
  await chrome.runtime.sendMessage({ cmd: 'allowOnce', url });
  location.href = url;
};
