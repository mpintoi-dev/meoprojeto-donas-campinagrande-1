/* ============================================================
   IDECAN — Modal de Login (estilo original IDECAN)
   Triggers:
   - Cliques em <a> com texto "Login" ou data-testid="nav-login"
   - Cliques em links/botões que apontem para /inscricao.html ou
     tenham data-testid="btn-inscricao-online"
   Lógica:
   - CPF deve ser válido (algoritmo)
   - Qualquer senha (não validamos)
   - Backend POST /api/auth/check-candidate retorna cadastro ou 404
   - Se OK → popula sessionStorage.idecan_cadastro e redireciona
   - Se NOK → mostra erro "Candidato não cadastrado"
   ============================================================ */
(function () {
  var API = '/api';
  var MODAL_ID = 'idecan-login-modal';

  /* ===== Validação de CPF ===== */
  function isValidCPF(cpf) {
    cpf = String(cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    var sum = 0, rest;
    for (var i = 1; i <= 9; i++) sum += parseInt(cpf.charAt(i - 1)) * (11 - i);
    rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.charAt(9))) return false;
    sum = 0;
    for (var j = 1; j <= 10; j++) sum += parseInt(cpf.charAt(j - 1)) * (12 - j);
    rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(cpf.charAt(10));
  }
  function fmtCPF(cpf) {
    var d = String(cpf || '').replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0,3)+'.'+d.slice(3);
    if (d.length <= 9) return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6);
    return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);
  }

  /* ===== CSS ===== */
  function injectStyles() {
    if (document.getElementById('idecan-login-css')) return;
    var s = document.createElement('style');
    s.id = 'idecan-login-css';
    s.textContent = ''
      + '#'+MODAL_ID+'-back{position:fixed;inset:0;background:rgba(0,0,0,.45);'
      + 'display:flex;align-items:center;justify-content:center;z-index:2147483645;'
      + 'opacity:0;transition:opacity .2s ease;font-family:Tahoma,Verdana,Arial,sans-serif;padding:16px}'
      + '#'+MODAL_ID+'-back.show{opacity:1}'
      + '#'+MODAL_ID+'{background:#fff;border-radius:6px;width:100%;max-width:520px;position:relative;'
      + 'box-shadow:0 16px 50px rgba(0,0,0,.4);transform:translateY(8px);transition:transform .22s cubic-bezier(.2,.8,.2,1)}'
      + '#'+MODAL_ID+'-back.show #'+MODAL_ID+'{transform:translateY(0)}'
      + '#'+MODAL_ID+' .lm-close{position:absolute;top:-14px;right:-14px;width:32px;height:32px;'
      + 'border-radius:50%;background:#1f1f1f;color:#fff;display:flex;align-items:center;justify-content:center;'
      + 'font-size:18px;cursor:pointer;border:0;box-shadow:0 4px 10px rgba(0,0,0,.3);font-family:inherit}'
      + '#'+MODAL_ID+' .lm-close:hover{background:#000}'
      + '#'+MODAL_ID+' .lm-head{background:#194a8a;color:#fff;padding:14px 18px;font-size:15.5px;font-weight:700;'
      + 'border-top-left-radius:6px;border-top-right-radius:6px}'
      + '#'+MODAL_ID+' .lm-body{padding:24px 28px 24px 28px;display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}'
      + '#'+MODAL_ID+' .lm-form{flex:1;min-width:240px;display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center}'
      + '#'+MODAL_ID+' .lm-form label{color:#333;font-size:13.5px;text-align:right}'
      + '#'+MODAL_ID+' .lm-form input{padding:6px 8px;border:1px solid #999;border-radius:2px;font-size:13.5px;font-family:inherit;'
      + 'background:#fff;color:#000;width:100%;box-sizing:border-box}'
      + '#'+MODAL_ID+' .lm-form input:focus{outline:0;border-color:#194a8a;box-shadow:0 0 0 2px rgba(25,74,138,.15)}'
      + '#'+MODAL_ID+' .lm-links{min-width:180px;display:flex;flex-direction:column;gap:8px;padding-top:6px}'
      + '#'+MODAL_ID+' .lm-links a{color:#194a8a;font-size:13px;text-decoration:none;line-height:1.5}'
      + '#'+MODAL_ID+' .lm-links a:hover{text-decoration:underline}'
      + '#'+MODAL_ID+' .lm-links li{list-style:disc;margin-left:18px}'
      + '#'+MODAL_ID+' .lm-error{flex-basis:100%;color:#c40000;font-size:13px;background:#fff3f3;border:1px solid #f3c2c2;'
      + 'padding:8px 10px;border-radius:4px;margin-top:6px;display:none}'
      + '#'+MODAL_ID+' .lm-error.show{display:block}'
      + '#'+MODAL_ID+' .lm-footer{padding:8px 28px 28px;text-align:center}'
      + '#'+MODAL_ID+' .lm-submit{background:linear-gradient(180deg,#e63a3a,#b91414);color:#fff;border:0;border-radius:4px;'
      + 'padding:9px 28px;font-size:13.5px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;'
      + 'box-shadow:0 4px 10px rgba(185,20,20,.35);font-family:inherit;transition:transform .12s, box-shadow .12s}'
      + '#'+MODAL_ID+' .lm-submit:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(185,20,20,.5)}'
      + '#'+MODAL_ID+' .lm-submit:disabled{opacity:.6;cursor:not-allowed;transform:none}'
      + '@media (max-width:480px){#'+MODAL_ID+' .lm-body{flex-direction:column}#'+MODAL_ID+' .lm-form label{text-align:left}}';
    document.head.appendChild(s);
  }

  function buildModal() {
    if (document.getElementById(MODAL_ID + '-back')) return document.getElementById(MODAL_ID + '-back');
    injectStyles();
    var back = document.createElement('div');
    back.id = MODAL_ID + '-back';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.innerHTML = ''
      + '<div id="'+MODAL_ID+'" data-testid="login-modal">'
      + '  <button type="button" class="lm-close" data-testid="login-close" aria-label="Fechar">✕</button>'
      + '  <div class="lm-head">Identificação</div>'
      + '  <form class="lm-body" id="'+MODAL_ID+'-form" autocomplete="off">'
      + '    <div class="lm-form">'
      + '      <label for="lm-cpf">CPF</label>'
      + '      <input id="lm-cpf" name="cpf" type="text" maxlength="14" inputmode="numeric" required data-testid="login-cpf" />'
      + '      <label for="lm-senha">Senha</label>'
      + '      <input id="lm-senha" name="senha" type="password" required data-testid="login-senha" />'
      + '    </div>'
      + '    <ul class="lm-links" style="padding:6px 0 0 0;margin:0">'
      + '      <li><a href="#" data-testid="link-cadastro" id="lm-not-registered">Candidato não cadastrado</a></li>'
      + '      <li><a href="#" data-testid="link-recover">Recuperar senha</a></li>'
      + '    </ul>'
      + '    <div class="lm-error" data-testid="login-error"></div>'
      + '    <div class="lm-footer" style="grid-column:1/-1;flex-basis:100%">'
      + '      <button type="submit" class="lm-submit" data-testid="login-submit">Avançar</button>'
      + '    </div>'
      + '  </form>'
      + '</div>';
    document.body.appendChild(back);

    var modal = back.querySelector('#'+MODAL_ID);
    var form = back.querySelector('#'+MODAL_ID+'-form');
    var cpfInp = back.querySelector('#lm-cpf');
    var senhaInp = back.querySelector('#lm-senha');
    var errBox = back.querySelector('[data-testid="login-error"]');
    var submitBtn = back.querySelector('[data-testid="login-submit"]');
    var closeBtn = back.querySelector('[data-testid="login-close"]');
    var notRegLink = back.querySelector('#lm-not-registered');
    var recoverLink = back.querySelector('[data-testid="link-recover"]');

    function showError(msg) {
      errBox.textContent = msg || '';
      errBox.classList.toggle('show', !!msg);
    }
    cpfInp.addEventListener('input', function () {
      var s = cpfInp.selectionStart;
      cpfInp.value = fmtCPF(cpfInp.value);
      try { cpfInp.setSelectionRange(s, s); } catch (e) {}
      showError('');
    });

    function close() {
      back.classList.remove('show');
      setTimeout(function () { back.remove(); }, 200);
    }
    closeBtn.addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' && document.getElementById(MODAL_ID + '-back')) {
        document.removeEventListener('keydown', esc);
        close();
      }
    });
    notRegLink.addEventListener('click', function (e) {
      e.preventDefault();
      try {
        sessionStorage.removeItem('idecan_cadastro');
      } catch (err) {}
      var edital = '';
      try { edital = sessionStorage.getItem('idecan_edital') || ''; } catch (e) {}
      window.location.href = '/inscricao.html' + (edital ? ('?edital=' + edital) : '');
    });
    recoverLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.IdecanNotice) window.IdecanNotice('Para recuperar a senha, entre em contato com o suporte: atendimento@idecan.org.br ou refaça seu cadastro novamente.', { title: 'Recuperar senha' });
      else alert('Para recuperar a senha, entre em contato com o suporte: atendimento@idecan.org.br ou refaça seu cadastro novamente.');
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var cpfDigits = (cpfInp.value || '').replace(/\D/g, '');
      if (!isValidCPF(cpfDigits)) {
        showError('CPF inválido. Verifique e tente novamente.');
        cpfInp.focus();
        return;
      }
      if (!senhaInp.value) {
        showError('Informe a senha.');
        senhaInp.focus();
        return;
      }
      submitBtn.disabled = true;
      var origLbl = submitBtn.textContent;
      submitBtn.textContent = 'Verificando...';
      try {
        var resp = await fetch(API + '/auth/check-candidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: cpfDigits }),
        });
        if (resp.status === 404) {
          showError('Candidato não cadastrado. Por favor, faça o cadastro primeiro.');
          submitBtn.disabled = false;
          submitBtn.textContent = origLbl;
          return;
        }
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        var cad = data.cadastro || {};
        // Popula sessão como se tivesse acabado de cadastrar
        try {
          sessionStorage.setItem('idecan_cadastro', JSON.stringify({
            nome: cad.nome, cpf: cad.cpf, email: cad.email,
          }));
        } catch (err) {}
        close();
        // redireciona para Meus Concursos (área logada)
        window.location.href = '/meus-concursos.html';
      } catch (err) {
        showError('Falha ao verificar cadastro. Tente novamente em instantes.');
        submitBtn.disabled = false;
        submitBtn.textContent = origLbl;
      }
    });

    requestAnimationFrame(function () { back.classList.add('show'); cpfInp.focus(); });
    return back;
  }

  function openModal() {
    buildModal();
  }
  window.IdecanLogin = { open: openModal, isValidCPF: isValidCPF };

  /* ===== Hook nos links/botões ===== */
  function hasCadastro() {
    try {
      var raw = sessionStorage.getItem('idecan_cadastro');
      if (!raw) return false;
      var d = JSON.parse(raw);
      return !!(d && d.nome && d.cpf);
    } catch (e) { return false; }
  }

  function interceptClicks(e) {
    var a = e.target.closest('a, button');
    if (!a) return;
    var txt = (a.textContent || '').trim().toLowerCase();
    var testid = a.getAttribute('data-testid') || '';
    var href = a.getAttribute('href') || '';

    // 1) Clique em "Login" / "Entrar" — sempre abre modal
    if (testid === 'nav-login' || txt === 'login' || txt === 'entrar') {
      e.preventDefault(); e.stopPropagation();
      openModal();
      return;
    }

    // 2) Botão "Inscrição On-line" ou link para /inscricao.html
    var isInscricaoLink =
      testid === 'btn-inscricao-online' ||
      (href && /\/inscricao\.html(\?|$)/.test(href));

    if (isInscricaoLink && !hasCadastro()) {
      e.preventDefault(); e.stopPropagation();
      // salva o destino para reabrir depois (se quiser refinar)
      openModal();
      return;
    }
  }

  // captura na fase de captura para vencer outros handlers (auth.js, etc.)
  document.addEventListener('click', interceptClicks, true);
})();
