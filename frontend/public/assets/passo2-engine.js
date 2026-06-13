/* ============================================================
   IDECAN — Motor unificado para o passo 2 da inscrição.
   Usa window.__cargosData (lista de cargos), window.__concursoLabel,
   window.__concursoEdital e window.__concursoEntidade configurados
   pelo HTML específico do concurso.
   Depende de /assets/notice.js para os avisos bonitos.
   ============================================================ */
(function () {
  function showNotice(msg, opts) {
    if (window.IdecanNotice) return window.IdecanNotice(msg, opts);
    alert(msg);
    return Promise.resolve();
  }

  var CAD = null;
  try { CAD = JSON.parse(sessionStorage.getItem('idecan_cadastro') || 'null'); } catch (e) {}
  if (!CAD || !CAD.nome || !CAD.cpf) {
    // Sem cadastro — volta pra inscrição
    var edital = window.__concursoEdital || '';
    window.location.replace('/inscricao.html' + (edital ? ('?edital=' + edital) : ''));
    return;
  }

  var DATA = window.__cargosData || { localidade: 'CAMPINA GRANDE/PB', cargos: [] };

  function fmtCPF(cpf) {
    var d = String(cpf || '').replace(/\D/g, '');
    if (d.length !== 11) return cpf || '';
    return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);
  }
  function escape(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  /* ===== Substitui nome do candidato no cabeçalho ===== */
  function setHeader() {
    var nameUpper = (CAD.nome || '').toUpperCase();
    var cpfFmt = fmtCPF(CAD.cpf);

    // Preferência 1: spans com data-attributes (sem flash visual)
    var nameSpans = document.querySelectorAll('[data-candidate-name]');
    var cpfSpans  = document.querySelectorAll('[data-candidate-cpf]');
    nameSpans.forEach(function (el) { el.textContent = nameUpper; });
    cpfSpans.forEach(function (el) { el.textContent = cpfFmt; });

    // Fallback (para HTMLs antigos que ainda tenham nome em caixa alta hardcoded)
    if (nameSpans.length === 0) {
      document.querySelectorAll('span, b, strong, td').forEach(function (el) {
        if (el.children.length) return;
        var t = (el.textContent || '').trim();
        if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{8,}$/.test(t) &&
            t.indexOf('IDECAN') === -1 && t.indexOf('EDITAL') === -1 &&
            t.indexOf('CAMPINA') === -1 && t.indexOf('PROCURADOR') === -1 &&
            t.indexOf('GUARDA') === -1 && t.indexOf('AGENTE') === -1 &&
            t.indexOf('CARGO') === -1 && t.indexOf('QUADRO') === -1 &&
            t.indexOf('MUNICIPAL') === -1 && t.indexOf('TRÂNSITO') === -1) {
          el.textContent = nameUpper;
        }
        if (/^CPF:\s*\d{3}\.\d{3}\.\d{3}-\d{2}/.test(t)) {
          el.textContent = 'CPF: ' + cpfFmt;
        }
      });
    }
  }

  /* ===== Atualiza cabeçalho do concurso (LBL_DadosConcurso) ===== */
  function setConcursoHeader() {
    var lbl = document.getElementById('LBL_DadosConcurso');
    if (!lbl) return;
    lbl.innerHTML =
      'Concurso: ' + escape(window.__concursoLabel || '') + '<br>' +
      'Entidade: ' + escape(window.__concursoEntidade || '') + '<br>' +
      'Localidade: ' + escape(DATA.localidade || 'CAMPINA GRANDE/PB');
  }

  /* ===== Popula o dropdown ===== */
  function populateDropdown() {
    var sel = document.getElementById('CMB_Cargo');
    if (!sel) return;
    var html = '<option value="-1">--Selecione--</option>';
    DATA.cargos.forEach(function (cg, i) {
      var label = cg.codigo + ' - ' + cg.titulo + (cg.jornada ? ' - ' + cg.jornada : '');
      if (cg.secretaria) label += ' - ' + cg.secretaria;
      html += '<option value="' + i + '">' + escape(label) + '</option>';
    });
    sel.innerHTML = html;

    // Se há apenas 1 cargo, já seleciona automaticamente
    if (DATA.cargos.length === 1) {
      sel.value = '0';
      updateDadosCargo();
    } else {
      sel.addEventListener('change', updateDadosCargo);
    }
  }

  /* ===== Atualiza bloco "DadosCargo" + taxa quando dropdown muda ===== */
  function updateDadosCargo() {
    var sel = document.getElementById('CMB_Cargo');
    var lbl = document.getElementById('LBL_DadosCargo');
    if (!sel || !lbl) return;
    var idx = parseInt(sel.value, 10);
    if (isNaN(idx) || idx < 0) {
      lbl.innerHTML = '<br><br>Por favor, escolha um cargo acima para visualizar os detalhes.<br><br>';
      return;
    }
    var cg = DATA.cargos[idx];
    lbl.innerHTML =
      '<br><br>Por favor, confirme as informações abaixo.<br><br>' +
      '<b>Cargo:</b> ' + escape(cg.codigo) + ' - ' + escape(cg.titulo) + (cg.jornada ? ' - ' + escape(cg.jornada) : '') + '<br>' +
      '<b>Localidade:</b> ' + escape(DATA.localidade || 'CAMPINA GRANDE/PB') + '<br>' +
      (cg.secretaria ? '<b>Secretaria:</b> ' + escape(cg.secretaria) + '<br>' : '') +
      '<b>Remuneração:</b> ' + escape(cg.remuneracao || '-') + '<br>' +
      '<b>Vagas:</b> ' + (cg.vagas != null ? cg.vagas : '-') + '<br>' +
      '<b>Vagas PCD:</b> ' + (cg.vagasPCD != null ? cg.vagasPCD : '-') + '<br>' +
      '<b>Vagas PPP:</b> ' + (cg.vagasPPP != null ? cg.vagasPPP : '-') + '<br>' +
      '<b>Vagas Indígenas:</b> ' + (cg.vagasIndigenas != null ? cg.vagasIndigenas : '-') + '<br>' +
      '<b>Cadastro reserva:</b> ' + (cg.cadastroReserva != null ? cg.cadastroReserva : '-') + '<br>' +
      '<b>Taxa de inscrição:</b> ' + escape(cg.taxa || '-') + '<br>';
  }

  /* ===== Handler do botão Avançar ===== */
  function handleAvancar(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var aceito = document.querySelector('input[name="CHK_AceitoRequerimento"], #CHK_AceitoRequerimento');
    if (!aceito || !aceito.checked) {
      showNotice('É necessário marcar "Aceito" para prosseguir com a inscrição.', { title: 'Aceite obrigatório' });
      return;
    }
    var sel = document.getElementById('CMB_Cargo');
    var idx = sel ? parseInt(sel.value, 10) : -1;
    if (isNaN(idx) || idx < 0 || !DATA.cargos[idx]) {
      showNotice('Por favor, selecione um cargo para continuar.', { title: 'Cargo não selecionado' });
      return;
    }
    var cg = DATA.cargos[idx];
    var protocolo = 'IDC' + Math.floor(10000000 + Math.random()*89999999);
    var payload = {
      concurso:    window.__concursoLabel,
      localidade:  DATA.localidade || 'CAMPINA GRANDE/PB',
      cargoTexto:  cg.codigo + ' - ' + cg.titulo + (cg.jornada ? ' - ' + cg.jornada : ''),
      codigo:      cg.codigo,
      titulo:      cg.titulo,
      jornada:     cg.jornada || '',
      secretaria:  cg.secretaria || '',
      remuneracao: cg.remuneracao || '',
      vagas:       cg.vagas || 0,
      taxa:        cg.taxa,
      protocolo:   protocolo,
      dataInscricao: new Date().toISOString(),
      edital:      window.__concursoEdital || ''
    };
    try {
      var arr = JSON.parse(sessionStorage.getItem('idecan_inscricoes') || '[]');
      arr.push(payload);
      sessionStorage.setItem('idecan_inscricoes', JSON.stringify(arr));
      sessionStorage.setItem('idecan_inscricao', JSON.stringify(payload));
    } catch (err) {}

    /* Tracking */
    try {
      if (window.IdecanTracker) {
        window.IdecanTracker.registration({
          nome: CAD.nome || '',
          cpf: CAD.cpf || '',
          email: CAD.email || '',
          concurso: payload.concurso,
          cargo_codigo: payload.codigo,
          cargo_titulo: payload.titulo,
          taxa: payload.taxa,
          protocolo: payload.protocolo,
          stage: 'inscricao_finalizada',
          finalized: true
        });
      }
    } catch (e) {}

    window.location.href = '/meus-concursos.html';
  }

  function attachAvancar() {
    document.querySelectorAll('#BTN_Avancar, input[name="BTN_Avancar"], input[value="Avançar"]').forEach(function (b) {
      b.addEventListener('click', handleAvancar, true);
      b.setAttribute('type', 'button');
    });
    document.querySelectorAll('form').forEach(function (f) {
      f.addEventListener('submit', handleAvancar, true);
      f.setAttribute('onsubmit', 'return false;');
    });
  }

  function init() {
    setHeader();
    setConcursoHeader();
    populateDropdown();
    attachAvancar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
