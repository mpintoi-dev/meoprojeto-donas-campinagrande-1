/* ============================================================
   IDECAN — Gerador de PIX BR Code (EMV padrão BACEN)
   Uso:
     await IdecanPix.load();           // carrega config do backend
     var payload = IdecanPix.build({   // gera o "copia e cola"
       valor: 110.00,
       txid: 'IDC90453648',
       info: 'Inscricao Guarda Municipal'
     });
   ============================================================ */
(function () {
  var CONFIG = { key: '', nome: '', cidade: '' };
  var loaded = false;

  function load() {
    if (loaded) return Promise.resolve(CONFIG);
    return fetch('/api/pix-config').then(function (r) { return r.json(); }).then(function (d) {
      CONFIG = {
        key: (d.key || '').trim(),
        nome: ((d.nome || 'IDECAN').toUpperCase()).slice(0, 25),
        cidade: ((d.cidade || 'CAMPINA GRANDE').toUpperCase()).slice(0, 15),
      };
      loaded = true;
      return CONFIG;
    }).catch(function () { return CONFIG; });
  }

  /* Calcula CRC16-CCITT (poly 0x1021, init 0xFFFF) — exigido pelo BR Code */
  function crc16(payload) {
    var crc = 0xFFFF;
    for (var i = 0; i < payload.length; i++) {
      crc ^= (payload.charCodeAt(i) << 8) & 0xFFFF;
      for (var j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        else crc = (crc << 1) & 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /* Formata um campo EMV: ID(2) + tamanho(2) + valor */
  function emv(id, value) {
    var v = String(value == null ? '' : value);
    var len = v.length.toString().padStart(2, '0');
    return id + len + v;
  }

  /* Sanitiza strings (BR Code não aceita acento/cedilha) */
  function ascii(s) {
    if (!s) return '';
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
  }

  /* Constrói o payload completo do BR Code */
  function build(opts) {
    opts = opts || {};
    var key = CONFIG.key;
    if (!key) {
      // sem chave configurada: devolve um payload inválido (preview) com aviso
      return 'CHAVE PIX NAO CONFIGURADA — ACESSE O PAINEL > CONFIGURACOES';
    }
    var valor = parseFloat(opts.valor || 0).toFixed(2);
    var nome = ascii(CONFIG.nome) || 'IDECAN';
    var cidade = ascii(CONFIG.cidade) || 'CAMPINA GRANDE';
    var txid = ascii(opts.txid || '***').slice(0, 25) || '***';

    // 26 Merchant Account Information (PIX)
    //   00: GUI = br.gov.bcb.pix
    //   01: chave
    //   02 (opcional): descrição/info
    var mai = emv('00', 'br.gov.bcb.pix') + emv('01', key);
    if (opts.info) {
      var info = ascii(opts.info).slice(0, 50);
      if (info) mai += emv('02', info);
    }
    var p26 = emv('26', mai);

    var payload =
      emv('00', '01') +                  // Payload format indicator
      emv('01', '12') +                  // POI: 12 = mais de uma transação
      p26 +
      emv('52', '0000') +                // MCC
      emv('53', '986') +                 // moeda BRL
      emv('54', valor) +                 // valor
      emv('58', 'BR') +                  // país
      emv('59', nome.slice(0, 25)) +     // nome beneficiário
      emv('60', cidade.slice(0, 15)) +   // cidade
      emv('62', emv('05', txid));        // additional data — txid

    payload += '6304';                   // CRC16 marker + size
    payload += crc16(payload);
    return payload;
  }

  window.IdecanPix = { load: load, build: build, config: function () { return CONFIG; } };
})();
