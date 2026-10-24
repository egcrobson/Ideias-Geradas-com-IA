// Detecta campos de senha na página (sinal clássico de página de phishing).
// Não lê nada do que você digita — só avisa que o campo existe.
(() => {
  if (window.top !== window) return;
  let sent = false;
  let timer = null;

  function check() {
    if (sent) return;
    const pw = document.querySelector('input[type="password"]');
    if (!pw) return;
    sent = true;
    obs.disconnect();
    const form = pw.form;
    try {
      chrome.runtime.sendMessage({
        cmd: 'passwordField',
        url: location.href,
        formAction: form && form.getAttribute('action') ? form.action : ''
      }).catch(() => { });
    } catch { /* extensão recarregada */ }
  }

  const obs = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; check(); }, 800);
  });
  check();
  if (!sent && document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 20000);
  }
})();
