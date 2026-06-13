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
