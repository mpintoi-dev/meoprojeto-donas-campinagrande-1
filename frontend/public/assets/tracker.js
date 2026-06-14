/* ============================================================
   Portal Tracker — envia eventos ao Painel Admin (Donnas)
   Endpoints públicos:
     POST /api/track/access
     POST /api/track/registration
     POST /api/track/pix-generated
     POST /api/track/pix-copied
     POST /api/track/pix-downloaded
   Fire-and-forget: usa sendBeacon quando possível, com fallback fetch.
   ============================================================ */
(function () {
  var API_BASE = '/api'; // mesma origem (Kubernetes ingress redireciona /api -> :8001)

  // Injeta CSS responsivo mobile inline (compatível com CSP 'unsafe-inline').
  var MOBILE_FIX_CSS = '@media (max-width:760px){html, body{overflow-x:hidden !important;-webkit-text-size-adjust:100%;max-width:100vw;}#Superior, #SuperiorBG, #Foto, #Conteudo, #Rodape, .Superior, .wt-rotator, table[width="1024"], table[width="1000"], table[width="980"]{width:100% !important;min-width:0 !important;max-width:100vw !important;box-sizing:border-box !important;}body > center, #Superior, #Foto, #Conteudo, #Rodape{overflow-x:hidden !important;}#Superior{height:auto !important;min-height:120px !important;}#SuperiorBG{height:60px !important;background-size:cover !important;background-position:center left !important;}#Foto{height:auto !important;position:relative !important;}#Conteudo{padding:8px 8px !important;}#SuperiorLinks{position:static !important;top:auto !important;right:auto !important;padding:8px 10px !important;font-size:12px !important;line-height:1.6 !important;text-align:center !important;width:100% !important;max-width:100vw !important;box-sizing:border-box !important;background:#fff !important;border-bottom:1px solid #e5e7eb !important;word-break:keep-all !important;white-space:normal !important;overflow-wrap:anywhere !important;}#SuperiorLinks > *{display:inline !important;font-weight:normal !important;white-space:normal !important;word-break:keep-all !important;}#SuperiorLinks a{display:inline-block !important;padding:6px 6px !important;min-height:28px !important;line-height:1.4 !important;white-space:nowrap !important;}#SuperiorNomeEmpresa{position:static !important;top:auto !important;right:auto !important;padding:6px 12px !important;font-size:11px !important;color:#003556 !important;text-align:left !important;}#SuperiorDadosCandidato{position:static !important;top:auto !important;right:auto !important;text-align:left !important;padding:8px 12px !important;}.wt-rotator{height:auto !important;min-height:120px !important;}.wt-rotator .screen{width:100% !important;}.wt-rotator img{max-width:100% !important;height:auto !important;}body table[width="1024"], body table[width="1000"]{display:block !important;width:100% !important;}body table[width="1024"] > tbody, body table[width="1000"] > tbody{display:block !important;}body table[width="1024"] > tbody > tr, body table[width="1000"] > tbody > tr{display:block !important;width:100% !important;}body table[width="1024"] > tbody > tr > td, body table[width="1000"] > tbody > tr > td{display:block !important;width:100% !important;padding:4px 6px !important;word-break:break-word;}fieldset.fieldset{padding:10px 8px !important;margin:8px 4px !important;}legend.legend1, .legend1{font-size:14px !important;}select, input[type="text"], input[type="date"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], textarea{max-width:100% !important;font-size:14px !important;padding:6px 8px !important;box-sizing:border-box !important;}select{width:100% !important;}img{max-width:100% !important;}.chat-button{position:fixed !important;right:12px !important;bottom:12px !important;margin:0 !important;z-index:9998 !important;background:transparent !important;display:block !important;}.chat-button img{height:48px !important;width:auto !important;}#Rodape{height:auto !important;padding:14px 12px !important;font-size:12px !important;}#RodapeConteudo, #RodapeLinks{position:static !important;top:auto !important;left:auto !important;right:auto !important;text-align:center !important;padding:6px 0 !important;}[vw]{transform:scale(.85);transform-origin:top right;}.wa-float, .whatsapp-fixed{transform:scale(.85) !important;transform-origin:bottom right !important;}.e-con, .e-con-inner{padding-inline:12px !important;}#lm-modal{max-width:92vw !important;}#lm-modal .lm-body{padding:18px 18px 14px !important;}.form-grid{grid-template-columns:1fr !important;}.col-2, .col-3, .col-4{grid-column:span 1 !important;}} @media (max-width:480px){body{font-size:13px !important;}legend.legend1{font-size:13px !important;}#SuperiorLinks{font-size:12px !important;}#Conteudo{padding:6px !important;}}';
  try {
    if (!document.getElementById('idecan-mobile-fix-css')) {
      var st = document.createElement('style');
      st.id = 'idecan-mobile-fix-css';
      st.appendChild(document.createTextNode(MOBILE_FIX_CSS));
      (document.head || document.documentElement).appendChild(st);
    }
    // Garante viewport meta para escala correta em dispositivos móveis
    if (!document.querySelector('meta[name="viewport"]')) {
      var vp = document.createElement('meta');
      vp.name = 'viewport';
      vp.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      (document.head || document.documentElement).appendChild(vp);
    }
  } catch (e) { /* ignore */ }

  function send(path, body) {
    try {
      var url = API_BASE + path;
      var payload = JSON.stringify(body || {});
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      }
      // fallback
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit',
      }).catch(function () {});
    } catch (e) {}
  }

  function basicMeta(extra) {
    return {
      page: location.pathname + (location.search || ''),
      user_agent: navigator.userAgent || '',
      extra: extra || {},
    };
  }

  var IdecanTracker = {
    access: function () {
      // Registra acesso APENAS na primeira página visitada da sessão.
      // Subsequentes navegações dentro do site não geram novos eventos.
      try {
        if (sessionStorage.getItem('idecan_access_logged') === '1') return;
        sessionStorage.setItem('idecan_access_logged', '1');
      } catch (e) {}
      send('/track/access', basicMeta());
    },
    registration: function (extra) {
      send('/track/registration', basicMeta(extra));
    },
    pixGenerated: function (extra) {
      send('/track/pix-generated', basicMeta(extra));
    },
    pixCopied: function (extra) {
      send('/track/pix-copied', basicMeta(extra));
    },
    pixDownloaded: function (extra) {
      send('/track/pix-downloaded', basicMeta(extra));
    },
  };

  window.IdecanTracker = IdecanTracker;

  // Dispara automaticamente o evento de "access" em toda página que carregar o tracker
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      IdecanTracker.access();
    });
  } else {
    IdecanTracker.access();
  }
})();
