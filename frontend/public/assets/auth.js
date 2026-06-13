/* ============================================================
   IDECAN Auth Toggle — Login ↔ Sair
   - Se sessionStorage 'idecan_cadastro' existir → mostra "Sair"
   - Clique em "Sair" → limpa sessionStorage e volta para /idecan.html
   - Clique em "Login" → leva para /inscricao.html (não há login real)
   ============================================================ */
(function () {
  function hasCadastro() {
    try {
      var raw = sessionStorage.getItem('idecan_cadastro');
      if (!raw) return false;
      var data = JSON.parse(raw);
      return !!(data && data.nome && data.cpf);
    } catch (e) { return false; }
  }

  function logout(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      sessionStorage.removeItem('idecan_cadastro');
      sessionStorage.removeItem('idecan_inscricao');
      sessionStorage.removeItem('idecan_inscricoes');
      sessionStorage.removeItem('idecan_edital');
      sessionStorage.removeItem('idecan_cargo');
    } catch (err) {}
    window.location.href = '/idecan.html';
  }

  function goToLogin(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    window.location.href = '/inscricao.html';
  }

  function isAuthLink(a) {
    var t = (a.textContent || '').trim().toLowerCase();
    return t === 'login' || t === 'sair' || t === 'entrar';
  }

  function applyState() {
    var logged = hasCadastro();
    // Procura QUALQUER <a> com texto "Login"/"Sair"/"Entrar" e ajusta
    var links = document.querySelectorAll('a');
    links.forEach(function (a) {
      if (!isAuthLink(a)) return;
      var orig = (a.textContent || '').trim();
      var isUpper = orig === orig.toUpperCase();
      a.setAttribute('data-auth-link', '1');

      // remove handlers antigos
      a.onclick = null;

      if (logged) {
        a.textContent = isUpper ? 'SAIR' : 'Sair';
        a.setAttribute('data-testid', 'nav-sair');
        a.addEventListener('click', logout);
      } else {
        a.textContent = isUpper ? 'LOGIN' : 'Login';
        a.setAttribute('data-testid', 'nav-login');
        a.addEventListener('click', goToLogin);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyState);
  } else {
    applyState();
  }

  // Expõe para chamadas manuais (ex.: após cadastrar/sair em SPAs)
  window.IdecanAuth = { applyState: applyState, logout: logout, hasCadastro: hasCadastro };
})();
