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
      + '#' + BTN_ID + ':disabled{opacity:.6;cursor:not-allowed;transform:none}'
      /* botão Exibir na linha do candidato */
      + '.adm-view-btn{display:inline-flex;align-items:center;justify-content:center;'
      + 'width:34px;height:34px;border-radius:8px;background:#eef0ff;color:#5b21b6;border:1px solid #d6dafd;'
      + 'cursor:pointer;margin-right:6px;font-size:15px;line-height:1;transition:transform .1s, background .1s}'
      + '.adm-view-btn:hover{background:#dde0ff;transform:translateY(-1px)}'
      /* modal de detalhes */
      + '#adm-details-back{position:fixed;inset:0;background:rgba(8,16,32,.55);'
      + 'display:flex;align-items:center;justify-content:center;z-index:2147483646;'
      + 'opacity:0;transition:opacity .18s ease;padding:16px;'
      + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}'
      + '#adm-details-back.show{opacity:1}'
      + '#adm-details{background:#fff;border-radius:14px;max-width:680px;width:100%;max-height:90vh;'
      + 'overflow:auto;box-shadow:0 24px 60px rgba(0,0,0,.35);transform:translateY(8px) scale(.98);'
      + 'transition:transform .22s cubic-bezier(.2,.8,.2,1)}'
      + '#adm-details-back.show #adm-details{transform:translateY(0) scale(1)}'
      + '#adm-details .adm-d-head{display:flex;align-items:center;justify-content:space-between;'
      + 'padding:18px 22px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;border-radius:14px 14px 0 0}'
      + '#adm-details .adm-d-head h3{margin:0;font-size:17px;font-weight:700}'
      + '#adm-details .adm-d-close{background:rgba(255,255,255,.2);border:0;color:#fff;width:32px;height:32px;'
      + 'border-radius:50%;cursor:pointer;font-size:16px;font-family:inherit;line-height:1}'
      + '#adm-details .adm-d-close:hover{background:rgba(255,255,255,.35)}'
      + '#adm-details .adm-d-body{padding:18px 22px 22px}'
      + '#adm-details .adm-d-section{margin-bottom:18px}'
      + '#adm-details .adm-d-section h4{margin:0 0 8px;color:#5b21b6;font-size:13px;font-weight:700;'
      + 'text-transform:uppercase;letter-spacing:.5px}'
      + '#adm-details .adm-d-row{display:flex;gap:8px;padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:14px}'
      + '#adm-details .adm-d-row:last-child{border-bottom:0}'
      + '#adm-details .adm-d-row b{min-width:170px;color:#374151;font-weight:600}'
      + '#adm-details .adm-d-row span{color:#111827;flex:1;word-break:break-word}';
    document.head.appendChild(s);
  }

  function isCadastroPage() {
    return /\/donaspainel\/cadastro(\b|$|\/)/.test(location.pathname);
  }
  function isInscricoesPage() {
    return location.pathname.indexOf('/donaspainel/inscri') === 0;
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

  function handleAuthError(status) {
    // 401/403 — apenas avisa, sem redirecionar (usuário pode estar com cache de token velho)
    if (status === 401 || status === 403) {
      if (window.IdecanNotice) {
        IdecanNotice('Sua sessão precisa ser renovada. Saia e entre novamente no painel para continuar.', { title: 'Token expirado' });
      }
      return true;
    }
    return false;
  }

  function handleClick(btn) {
    var token = getToken();
    if (!token) {
      handleAuthError(401);
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
          if (handleAuthError(r.status)) return null;
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (j) {
          if (!j) return;
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
    // Limpa botão "Limpar Cadastros" se não estiver na página de cadastro
    if (!isCadastroPage()) {
      var existing = document.getElementById(BTN_ID);
      if (existing) existing.remove();
    } else if (!document.getElementById(BTN_ID)) {
      var container = findActionsContainer();
      if (container) {
        injectStyles();
        var btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.type = 'button';
        btn.setAttribute('data-testid', 'btn-limpar-cadastros');
        btn.innerHTML = '<span aria-hidden="true">🗑</span><span>Limpar Cadastros</span>';
        btn.addEventListener('click', function () { handleClick(btn); });
        container.appendChild(btn);
      }
    }
    // Lógica que se aplica a múltiplas páginas do painel
    injectStyles();
    if (isCadastroPage()) {
      injectViewButtons();
      overrideExportButton();
    }
    if (isInscricoesPage()) {
      enrichInscriptionRows();
    }
  }

  /* ====== Enriquece linhas da página de Inscrições: nome completo + vaga ====== */
  var _inscCache = null;
  var _inscCacheAt = 0;
  function fetchInscCache() {
    var now = Date.now();
    if (_inscCache && (now - _inscCacheAt) < 6000) return Promise.resolve(_inscCache);
    var token = getToken();
    if (!token) return Promise.resolve(null);
    return fetch(API + '/admin/inscriptions?limit=10000', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (r) { return r.json(); }).then(function (d) {
      var items = (d && (d.items || d.inscriptions)) || (Array.isArray(d) ? d : []);
      var byCpf = {};
      items.forEach(function (it) {
        var c = (it.cpf || '').replace(/\D/g, '');
        if (!byCpf[c]) byCpf[c] = [];
        byCpf[c].push(it);
      });
      _inscCache = byCpf; _inscCacheAt = now;
      return _inscCache;
    }).catch(function () { return null; });
  }

  function enrichInscriptionRows() {
    if (!isInscricoesPage()) return;
    fetchInscCache().then(function (byCpf) {
      if (!byCpf) return;
      injectInscStyles();
      // Estratégia simplificada: para cada DIV/SPAN folha com texto contendo "@",
      // sobe até achar um ancestor com CPF formatado e VALOR, e substitui o email pelo cargo.
      var candidates = document.querySelectorAll('div, span, p, td');
      candidates.forEach(function (el) {
        if (el.children.length) return;
        if (el.classList && el.classList.contains('adm-vaga-inline')) return;
        var t = (el.textContent || '').trim();
        if (!t || t.indexOf('@') < 0 || t.length > 100) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return;
        // sobe DOM procurando o CPF e o valor
        var row = el.parentElement;
        for (var i = 0; i < 8 && row && row !== document.body; i++) {
          if (row.hasAttribute && row.hasAttribute('data-adm-enriched')) return;
          var rt = (row.textContent || '');
          var cpfMatch = rt.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
          var valMatch = rt.match(/R\$\s*([\d.,]+)/);
          if (cpfMatch && valMatch && rt.length < 1500) {
            var cpfDigits = cpfMatch[0].replace(/\D/g, '');
            var inscs = byCpf[cpfDigits] || [];
            if (!inscs.length) return;
            var ins = inscs[0];
            if (inscs.length > 1) {
              var rowVal = parseFloat(valMatch[1].replace(/\./g,'').replace(',','.'));
              var found = inscs.find(function (x) { return Math.abs((x.valor || 0) - rowVal) < 0.5; });
              if (found) ins = found;
            }
            var cargo = (ins.cargo_titulo || ins.cargo_codigo || '').trim();
            if (cargo) {
              el.textContent = cargo;
              el.classList.add('adm-vaga-inline');
              row.setAttribute('data-adm-enriched', '1');
            }
            return;
          }
          row = row.parentElement;
        }
      });
    });
  }

  function injectInscStyles() {
    if (document.getElementById('adm-insc-css')) return;
    var s = document.createElement('style');
    s.id = 'adm-insc-css';
    s.textContent = ''
      + '.adm-full-name{font-weight:600;color:#1f2937;line-height:1.2;font-size:13.5px}'
      + '.adm-vaga{font-size:11.5px;color:#7c3aed;margin-top:3px;line-height:1.25;font-weight:500;letter-spacing:.2px}'
      + '.adm-vaga-inline{color:#7c3aed !important;font-weight:600 !important;font-size:11.5px !important;letter-spacing:.2px}';
    document.head.appendChild(s);
  }

  /* ====== Botão "Exibir" em cada linha (coluna AÇÕES) ====== */
  function injectViewButtons() {
    // A tabela do painel é construída com divs (flex/grid), não <tr>.
    // Estratégia: procurar elementos cujo texto seja um CPF formatado.
    // Subir no DOM até achar o container da "linha" (que tem a lixeira/SVG).
    var candidates = document.querySelectorAll('a, span, div, td');
    candidates.forEach(function (el) {
      if (el.children.length) return; // só folhas
      var t = (el.textContent || '').trim();
      if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(t)) return;
      var cpfDigits = t.replace(/\D/g, '');

      // sobe até achar uma linha que tenha um botão de lixeira (e ainda não tenha o nosso)
      var row = el;
      for (var i = 0; i < 8 && row && row !== document.body; i++) {
        if (row.querySelector('.adm-view-btn')) return; // já injetado
        // Procura um botão que tenha SVG/ícone (lixeira). Vamos detectar buttons dentro do row
        var btns = row.querySelectorAll('button');
        if (btns.length) {
          // achamos a linha
          var trashBtn = btns[btns.length - 1];
          // confirma que esta linha contém o CPF e não é o container inteiro
          var rowText = (row.textContent || '');
          if (rowText.indexOf(t) !== -1 && rowText.length < 500) {
            var viewBtn = document.createElement('button');
            viewBtn.type = 'button';
            viewBtn.className = 'adm-view-btn';
            viewBtn.setAttribute('data-testid', 'btn-exibir-cadastro');
            viewBtn.setAttribute('title', 'Exibir dados do cadastro');
            viewBtn.innerHTML = '👁';
            viewBtn.addEventListener('click', function (ev) {
              ev.preventDefault(); ev.stopPropagation();
              openDetailsModal(cpfDigits);
            });
            trashBtn.parentElement.insertBefore(viewBtn, trashBtn);
            return;
          }
        }
        row = row.parentElement;
      }
    });
  }

  /* ====== Modal de detalhes ====== */
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});
  }
  function fmtCPF(v) {
    var d = String(v||'').replace(/\D/g,'');
    if (d.length !== 11) return v||'';
    return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) { return iso; }
  }

  function buildRows(pairs) {
    return pairs.map(function (p) {
      return '<div class="adm-d-row"><b>' + escapeHtml(p[0]) + '</b><span>' + escapeHtml(p[1] || '—') + '</span></div>';
    }).join('');
  }

  function openDetailsModal(cpfDigits) {
    var token = getToken();
    if (!token) {
      if (window.IdecanNotice) IdecanNotice('Sessão expirada. Faça login novamente.', { title: 'Não autenticado' });
      return;
    }
    injectStyles();
    var back = document.createElement('div');
    back.id = 'adm-details-back';
    back.innerHTML = ''
      + '<div id="adm-details" data-testid="modal-detalhes-cadastro">'
      + '  <div class="adm-d-head"><h3>Carregando…</h3>'
      + '    <button class="adm-d-close" type="button" aria-label="Fechar">✕</button></div>'
      + '  <div class="adm-d-body"><p style="color:#6b7280;text-align:center">Buscando dados do candidato…</p></div>'
      + '</div>';
    document.body.appendChild(back);
    function close() {
      back.classList.remove('show');
      setTimeout(function () { back.remove(); }, 180);
    }
    back.querySelector('.adm-d-close').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    requestAnimationFrame(function () { back.classList.add('show'); });

    fetch(API + '/admin/cadastros/' + cpfDigits + '/details', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (r) {
      if (handleAuthError(r.status)) { close(); return null; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (doc) {
      if (!doc) return;
      var fd = doc.form_data || {};
      var head = back.querySelector('.adm-d-head h3');
      head.textContent = doc.nome || 'Candidato';
      var body = back.querySelector('.adm-d-body');
      var basic = buildRows([
        ['Nome', doc.nome],
        ['CPF', fmtCPF(doc.cpf)],
        ['E-mail', doc.email],
        ['Último concurso', doc.last_concurso],
        ['Inscrições', String(doc.inscricoes_count != null ? doc.inscricoes_count : 0)],
        ['Data do cadastro', fmtDate(doc.last_at || doc.created_at)],
      ]);
      var formHtml = '';
      if (fd && Object.keys(fd).length) {
        var personal = buildRows([
          ['Nome', fd.nome], ['Nome Social', fd.nomeSocial],
          ['Sexo', fd.sexo], ['Nascimento', fd.nascimento],
          ['Nacionalidade', fd.nacionalidade], ['Escolaridade', fd.escolaridade],
          ['Estado Civil', fd.estadoCivil], ['Nome da Mãe', fd.nomeMae],
        ]);
        var address = buildRows([
          ['CEP', fd.cep], ['Endereço', fd.endereco], ['Número', fd.numero],
          ['Complemento', fd.complemento], ['Bairro', fd.bairro],
          ['Cidade', fd.cidade], ['UF', fd.uf],
        ]);
        var contact = buildRows([
          ['Telefone 1', fd.tel1 + (fd.tel1Tipo ? ' (' + fd.tel1Tipo + ')' : '')],
          ['Telefone 2', fd.tel2 ? (fd.tel2 + (fd.tel2Tipo ? ' (' + fd.tel2Tipo + ')' : '')) : '—'],
          ['E-mail', fd.email], ['PCD', fd.pcd],
        ]);
        var docs = buildRows([
          ['RG', fd.rg], ['Data RG', fd.rgData],
          ['Órgão', fd.rgOrgao], ['UF', fd.rgUF],
          ['CPF', fmtCPF(fd.cpf || doc.cpf)],
        ]);
        formHtml =
          '<div class="adm-d-section"><h4>Dados Pessoais</h4>' + personal + '</div>' +
          '<div class="adm-d-section"><h4>Endereço</h4>' + address + '</div>' +
          '<div class="adm-d-section"><h4>Contatos</h4>' + contact + '</div>' +
          '<div class="adm-d-section"><h4>Documentos</h4>' + docs + '</div>';
      } else {
        formHtml = '<p style="color:#92400e;background:#fef3c7;padding:10px;border-radius:8px;font-size:13px">' +
                   '⚠️ Este cadastro foi criado antes da coleta de todos os campos. ' +
                   'Apenas os dados básicos estão disponíveis.</p>';
      }
      body.innerHTML =
        '<div class="adm-d-section"><h4>Resumo</h4>' + basic + '</div>' +
        formHtml;
    }).catch(function (e) {
      var body = back.querySelector('.adm-d-body');
      body.innerHTML = '<p style="color:#b91c1c">Erro ao carregar: ' + escapeHtml(e.message) + '</p>';
    });
  }

  /* ====== Sobrescreve "Salvar .txt" para baixar versão completa ====== */
  function overrideExportButton() {
    var btns = document.querySelectorAll('button:not([data-adm-export-bound])');
    btns.forEach(function (b) {
      var t = (b.textContent || '').trim().toLowerCase();
      if (t === 'salvar .txt' || t.startsWith('salvar .txt')) {
        b.setAttribute('data-adm-export-bound', '1');
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopImmediatePropagation();
          var token = getToken();
          if (!token) { handleAuthError(401); return; }
          // baixa a versão completa
          fetch(API + '/admin/cadastros/export-full.txt', {
            headers: { 'Authorization': 'Bearer ' + token }
          }).then(function (r) {
            if (handleAuthError(r.status)) return null;
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.blob().then(function (blob) {
              var cd = r.headers.get('Content-Disposition') || '';
              var m = /filename="?([^"]+)"?/.exec(cd);
              var fn = (m && m[1]) || 'cadastros_completos.txt';
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url; a.download = fn;
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            });
          }).catch(function (err) {
            if (window.IdecanNotice) IdecanNotice('Erro ao baixar: ' + err.message, { title: 'Falha' });
          });
        }, true);
      }
    });
  }

  // Observa o DOM (SPA — rotas mudam sem reload)
  var mo = new MutationObserver(function () { ensureButton(); enhanceDetailModal(); });

  /* ====== Customiza modal "Detalhes do candidato" do React Admin ======
   * Adiciona/renomeia a linha "Qr code gerado com a chave" ao final.
   * - Renomeia label "Pix Key Used" para "Qr code gerado com a chave"
   * - Esconde "Pix Key Used At" (timestamp interno)
   * - Se a inscrição NÃO tem pix_key_used (PIX ainda não gerado),
   *   injeta uma linha customizada com "aguardando gerar". */
  function enhanceDetailModal() {
    // Procura modal aberto pelo título
    var headings = document.querySelectorAll('h1, h2, h3, h4');
    var modal = null;
    for (var i = 0; i < headings.length; i++) {
      if ((headings[i].textContent || '').trim().indexOf('Detalhes do candidato') === 0) {
        modal = headings[i].closest('[role="dialog"], .dp-modal, .modal') ||
                headings[i].parentElement && headings[i].parentElement.parentElement;
        break;
      }
    }
    if (!modal) return;
    // Só processa quando o corpo do modal estiver populado
    var body = modal.querySelector('.dp-modal-body, .dp-detail-body');
    if (!body) return;
    var kvKeys = body.querySelectorAll('.kv-k');
    if (kvKeys.length === 0) return;  // dados ainda não chegaram

    /* Labels para ESCONDER */
    var hideLabels = {
      'Cargo Codigo': 1, 'Cargo Código': 1,
      'Finalized': 1, 'Finalized At': 1,
      'Pix Status At': 1,
      'Pix Key Used At': 1
    };
    /* Labels para RENOMEAR */
    var renameLabels = { 'Pix Key Used': 'Chave pix usada' };

    var foundUsed = false;
    var processedCount = 0;
    kvKeys.forEach(function (el) {
      var txt = (el.textContent || '').trim();
      if (renameLabels[txt]) {
        el.textContent = renameLabels[txt];
        foundUsed = true;
        processedCount++;
      } else if (hideLabels[txt]) {
        var row = el.closest('.dp-kv');
        if (row) row.style.display = 'none';
        processedCount++;
      }
    });

    // Só marca como processado se realmente fez alguma alteração
    if (processedCount === 0 && !foundUsed) return;
    if (modal.dataset.idcEnhanced === '1') return;
    modal.dataset.idcEnhanced = '1';

    // Remove a antiga linha "aguardando gerar" no header (bug anterior)
    var oldStrayRows = document.querySelectorAll('[data-testid="modal-chave-aguardando"]');
    oldStrayRows.forEach(function (n) { n.remove(); });

    // Se NÃO encontrou "Pix Key Used", PIX ainda não foi gerado (ou registro antigo)
    if (!foundUsed) {
      var lastSection = body.querySelector('.dp-section:last-of-type') || body;
      var lastGrid = lastSection.querySelector('.dp-kv-grid:last-of-type') || lastSection;
      var newKv = document.createElement('div');
      newKv.className = 'dp-kv flat';
      newKv.setAttribute('data-testid', 'modal-chave-aguardando');
      newKv.innerHTML =
        '<div class="kv-k">Chave pix usada</div>' +
        '<div class="kv-v" style="color:#9ca3af;font-style:italic">aguardando gerar</div>';
      lastGrid.appendChild(newKv);
    }
  }

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
  // expõe para debug e re-execução manual após mudanças assíncronas
  window.IdecanAdminExtras = {
    ensureButton: ensureButton,
    enrich: enrichInscriptionRows,
    enhanceDetailModal: enhanceDetailModal
  };
})();
