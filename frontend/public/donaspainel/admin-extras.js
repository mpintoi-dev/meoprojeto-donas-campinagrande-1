/* ============================================================
   IDECAN — Painel Admin (Donnas): extras
   Adiciona um botão "Limpar Cadastros" na página /donaspainel/cadastro
   sem precisar mexer no build React.
   ============================================================ */
(function () {
  var API = '/api';
  var BTN_ID = 'admin-extra-limpar-cadastros';

  function getToken() {
    var keys = ['donas_admin_token', 'donas_token', 'admin_token', 'token', 'authToken', 'jwt'];
    for (var i = 0; i < keys.length; i++) {
      var v = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
      if (v && v.length > 10) return v.replace(/^"|"$/g, '');
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById('admin-extras-css')) return;
    var s = document.createElement('style');
    s.id = 'admin-extras-css';
    s.textContent = ''
      + '#' + BTN_ID + '{display:inline-flex;align-items:center;gap:8px;'
      + 'padding:10px 16px;border-radius:10px;background:linear-gradient(180deg,#ef4444,#b91c1c);'
      + 'color:#fff;font-weight:600;font-size:13.5px;cursor:pointer;border:0;'
      + 'box-shadow:0 6px 14px rgba(220,38,38,.35);transition:transform .12s, box-shadow .12s;'
      + 'font-family:inherit;margin-left:8px}'
      + '#' + BTN_ID + ':hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(220,38,38,.45)}'
      + '#' + BTN_ID + ':disabled{opacity:.6;cursor:not-allowed;transform:none}';
    document.head.appendChild(s);
  }

  function isCadastroPage() {
    return /\/donaspainel\/cadastro(\b|$|\/)/.test(location.pathname);
  }

  function ensureNoticeLib(cb) {
    if (window.IdecanConfirm) { cb(); return; }
    var s = document.createElement('script');
    s.src = '/assets/notice.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function findActionsContainer() {
    // O React render coloca os botões "Buscar / Atualizar / Salvar .txt" próximos do header.
    // Vamos procurar pelo botão "Atualizar" (mais estável) e anexar do lado dele.
    var btns = document.querySelectorAll('button');
    var target = null;
    btns.forEach(function (b) {
      var t = (b.textContent || '').trim().toLowerCase();
      if (t === 'salvar .txt' || t.startsWith('salvar .txt')) target = b;
    });
    if (target && target.parentElement) return target.parentElement;
    // fallback: lado do Atualizar
    btns.forEach(function (b) {
      var t = (b.textContent || '').trim().toLowerCase();
      if (t === 'atualizar') target = b;
    });
    return target ? target.parentElement : null;
  }

  function findCountBadge() {
    // Procura por um elemento com "candidatos" e número (ex.: "80 cadastros")
    var nodes = document.querySelectorAll('strong, b, span, p');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (/^\d+\s+cadastros?\.?$/i.test(t)) return nodes[i];
    }
    return null;
  }

  function handleClick(btn) {
    var token = getToken();
    if (!token) {
      if (window.IdecanNotice) IdecanNotice('Sessão expirada. Faça login novamente.', { title: 'Não autenticado' });
      else alert('Sessão expirada. Faça login novamente.');
      return;
    }
    ensureNoticeLib(function () {
      window.IdecanConfirm(
        'Esta ação irá apagar TODOS os cadastros (candidatos) do banco. As inscrições NÃO serão afetadas. Continuar?',
        { title: 'Limpar todos os cadastros?', okLabel: 'Sim, limpar tudo', cancelLabel: 'Cancelar' }
      ).then(function (ok) {
        if (!ok) return;
        btn.disabled = true;
        var orig = btn.textContent;
        btn.textContent = 'Limpando…';
        fetch(API + '/admin/cadastros', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (j) {
          var n = (j && j.deleted) || 0;
          window.IdecanNotice(
            n + ' cadastro(s) removido(s) com sucesso. A página será recarregada.',
            { title: 'Limpeza concluída' }
          ).then(function () { location.reload(); });
        }).catch(function (e) {
          btn.disabled = false;
          btn.textContent = orig;
          window.IdecanNotice('Erro ao limpar cadastros: ' + e.message, { title: 'Falha' });
        });
      });
    });
  }

  function ensureButton() {
    if (!isCadastroPage()) {
      var existing = document.getElementById(BTN_ID);
      if (existing) existing.remove();
      return;
    }
    if (document.getElementById(BTN_ID)) return;
    var container = findActionsContainer();
    if (!container) return;
    injectStyles();
    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.setAttribute('data-testid', 'btn-limpar-cadastros');
    btn.innerHTML = '<span aria-hidden="true">🗑</span><span>Limpar Cadastros</span>';
    btn.addEventListener('click', function () { handleClick(btn); });
    container.appendChild(btn);
  }

  // Observa o DOM (SPA — rotas mudam sem reload)
  var mo = new MutationObserver(function () { ensureButton(); });
  function start() {
    mo.observe(document.body, { childList: true, subtree: true });
    ensureButton();
    // também checa a cada mudança de URL (history API do React Router)
    var lastPath = location.pathname;
    setInterval(function () {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        ensureButton();
      }
    }, 500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
