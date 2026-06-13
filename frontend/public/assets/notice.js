/* ============================================================
   IDECAN — Modal de aviso bonito (substitui alert nativo).
   Uso: window.IdecanNotice('Mensagem', { title: 'Atenção', okLabel: 'OK' })
   Retorna uma Promise que resolve quando o usuário fecha.
   ============================================================ */
(function () {
  function ensureStyles() {
    if (document.getElementById('idecan-notice-css')) return;
    var css = document.createElement('style');
    css.id = 'idecan-notice-css';
    css.textContent = ''
      + '.idecan-notice-backdrop{position:fixed;inset:0;background:rgba(8,16,32,.55);'
      + 'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;'
      + 'align-items:center;justify-content:center;z-index:2147483646;opacity:0;'
      + 'transition:opacity .18s ease;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}'
      + '.idecan-notice-backdrop.show{opacity:1}'
      + '.idecan-notice-card{background:#fff;border-radius:14px;max-width:420px;width:100%;'
      + 'box-shadow:0 24px 60px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.04);'
      + 'transform:translateY(8px) scale(.98);transition:transform .22s cubic-bezier(.2,.8,.2,1);overflow:hidden}'
      + '.idecan-notice-backdrop.show .idecan-notice-card{transform:translateY(0) scale(1)}'
      + '.idecan-notice-head{display:flex;align-items:center;gap:14px;padding:22px 24px 12px}'
      + '.idecan-notice-icon{flex:0 0 auto;width:44px;height:44px;border-radius:50%;'
      + 'background:linear-gradient(135deg,#ffb020,#ff7a00);display:flex;align-items:center;'
      + 'justify-content:center;color:#fff;font-weight:700;font-size:24px;line-height:1;'
      + 'box-shadow:0 8px 20px rgba(255,122,0,.35)}'
      + '.idecan-notice-title{font-size:17px;font-weight:700;color:#0e1726;line-height:1.25}'
      + '.idecan-notice-body{padding:0 24px 4px 82px;color:#3b4756;font-size:14.5px;line-height:1.5;margin-top:-4px}'
      + '.idecan-notice-actions{padding:18px 24px 22px;display:flex;justify-content:flex-end;gap:10px}'
      + '.idecan-notice-btn{appearance:none;border:0;cursor:pointer;padding:10px 22px;border-radius:10px;'
      + 'font-weight:600;font-size:14px;color:#fff;background:linear-gradient(180deg,#1f6feb,#1255c4);'
      + 'box-shadow:0 6px 14px rgba(31,111,235,.35);transition:transform .12s ease, box-shadow .12s ease;'
      + 'font-family:inherit}'
      + '.idecan-notice-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(31,111,235,.45)}'
      + '.idecan-notice-btn:active{transform:translateY(0)}'
      + '.idecan-notice-btn--secondary{background:#eef1f6;color:#3b4756;box-shadow:none;border:1px solid #d6dde6}'
      + '.idecan-notice-btn--secondary:hover{background:#e3e8ef;box-shadow:0 4px 10px rgba(0,0,0,.08)}'
      + '.idecan-notice-icon--confirm{background:linear-gradient(135deg,#1f6feb,#0a4dad);box-shadow:0 8px 20px rgba(31,111,235,.35)}'
      + '@media (max-width:480px){.idecan-notice-body{padding-left:24px}.idecan-notice-head{flex-wrap:wrap}'
      + '.idecan-notice-actions{flex-direction:column-reverse}.idecan-notice-actions .idecan-notice-btn{width:100%}}';
    document.head.appendChild(css);
  }

  function showNotice(message, opts) {
    ensureStyles();
    opts = opts || {};
    var title = opts.title || 'Atenção';
    var ok = opts.okLabel || 'OK';
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'idecan-notice-backdrop';
      back.setAttribute('role', 'dialog');
      back.setAttribute('aria-modal', 'true');
      back.innerHTML = ''
        + '<div class="idecan-notice-card" data-testid="notice-modal">'
        + '  <div class="idecan-notice-head">'
        + '    <div class="idecan-notice-icon">!</div>'
        + '    <div class="idecan-notice-title"></div>'
        + '  </div>'
        + '  <div class="idecan-notice-body"></div>'
        + '  <div class="idecan-notice-actions">'
        + '    <button type="button" class="idecan-notice-btn" data-testid="notice-ok"></button>'
        + '  </div>'
        + '</div>';
      back.querySelector('.idecan-notice-title').textContent = title;
      back.querySelector('.idecan-notice-body').textContent = message;
      var btn = back.querySelector('.idecan-notice-btn');
      btn.textContent = ok;
      function close() {
        back.classList.remove('show');
        setTimeout(function () { back.remove(); resolve(); }, 180);
      }
      btn.addEventListener('click', close);
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(); }
      });
      document.body.appendChild(back);
      requestAnimationFrame(function () { back.classList.add('show'); btn.focus(); });
    });
  }

  window.IdecanNotice = showNotice;

  /* ============================================================
     Modal de confirmação (substitui confirm nativo).
     Uso: await window.IdecanConfirm('Mensagem', { title, okLabel, cancelLabel })
     Retorna Promise<boolean> — true se confirmou, false se cancelou.
     ============================================================ */
  function showConfirm(message, opts) {
    ensureStyles();
    opts = opts || {};
    var title = opts.title || 'Confirmação';
    var ok = opts.okLabel || 'Confirmar';
    var cancel = opts.cancelLabel || 'Cancelar';
    var iconChar = opts.icon || '?';
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'idecan-notice-backdrop';
      back.setAttribute('role', 'dialog');
      back.setAttribute('aria-modal', 'true');
      back.innerHTML = ''
        + '<div class="idecan-notice-card" data-testid="confirm-modal">'
        + '  <div class="idecan-notice-head">'
        + '    <div class="idecan-notice-icon idecan-notice-icon--confirm">?</div>'
        + '    <div class="idecan-notice-title"></div>'
        + '  </div>'
        + '  <div class="idecan-notice-body"></div>'
        + '  <div class="idecan-notice-actions">'
        + '    <button type="button" class="idecan-notice-btn idecan-notice-btn--secondary" data-testid="confirm-cancel"></button>'
        + '    <button type="button" class="idecan-notice-btn" data-testid="confirm-ok"></button>'
        + '  </div>'
        + '</div>';
      back.querySelector('.idecan-notice-title').textContent = title;
      back.querySelector('.idecan-notice-body').textContent = message;
      back.querySelector('.idecan-notice-icon').textContent = iconChar;
      var okBtn = back.querySelector('[data-testid="confirm-ok"]');
      var cancelBtn = back.querySelector('[data-testid="confirm-cancel"]');
      okBtn.textContent = ok;
      cancelBtn.textContent = cancel;
      function close(result) {
        back.classList.remove('show');
        setTimeout(function () { back.remove(); resolve(result); }, 180);
      }
      okBtn.addEventListener('click', function () { close(true); });
      cancelBtn.addEventListener('click', function () { close(false); });
      back.addEventListener('click', function (e) { if (e.target === back) close(false); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(false); }
      });
      document.body.appendChild(back);
      requestAnimationFrame(function () { back.classList.add('show'); okBtn.focus(); });
    });
  }
  window.IdecanConfirm = showConfirm;
})();
