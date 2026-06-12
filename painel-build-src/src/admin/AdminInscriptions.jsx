import React, { useCallback, useEffect, useState } from 'react';
import api from './api';
import {
  Eye, FileText, DollarSign, Copy, Download, Trash2, RefreshCw, Search, Smartphone, Monitor, ChevronDown, X, User,
  ClipboardList, Accessibility, GraduationCap, Wallet,
} from 'lucide-react';

const KPI_DEFS = [
  { key:'acessos',     label:'Acessos',              icon:Eye,        color:'#8b5cf6', fmt:'int',     sub:'Usuários únicos' },
  { key:'inscricoes',  label:'Total de Inscrições',  icon:FileText,   color:'#3b82f6', fmt:'int',     sub:'Candidatos cadastrados' },
  { key:'valor_total', label:'Valor Total Gerado',   icon:DollarSign, color:'#10b981', fmt:'money',   subFn:(k)=>`${(k.pix_gerados||0).toLocaleString('pt-BR')} PIX gerado(s)` },
  { key:'valor_copiados', label:'PIX Copiados',      icon:Copy,       color:'#f59e0b', fmt:'money',   subFn:(k)=>`${(k.pix_copiados||0).toLocaleString('pt-BR')} pix copiados` },
  { key:'valor_baixados', label:'PIX Baixados',      icon:Download,   color:'#ec4899', fmt:'money',   subFn:(k)=>`${(k.pix_baixados||0).toLocaleString('pt-BR')} comprovantes baixados` },
];

const STATUS_OPTIONS = [
  { v:'', label:'Todos os status' },
  { v:'Aguardando pagamento', label:'Aguardando pagamento' },
  { v:'PIX gerado', label:'PIX gerado' },
  { v:'PIX copiado', label:'PIX copiado' },
  { v:'PIX baixado', label:'PIX baixado' },
];

const STATUS_STYLE = {
  'Aguardando pagamento': 'pill-amber',
  'PIX gerado': 'pill-amber-2',
  'PIX copiado': 'pill-green',
  'PIX baixado': 'pill-blue',
};

const fmtMoney = (v) => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtInt = (v) => Number(v||0).toLocaleString('pt-BR');

function fmtCPF(cpf) {
  const d = String(cpf||'').replace(/\D/g,'');
  if (d.length !== 11) return cpf || '—';
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function AdminInscriptions() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const [a, b] = await Promise.all([
        api.get(`/admin/inscriptions?${params.toString()}`),
        api.get('/admin/dashboard/kpis'),
      ]);
      setItems(a.data.items); setTotal(a.data.total); setKpis(b.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [q, status]);

  // Refresh silencioso: SEM loading state. Atualiza apenas os campos que mudaram em cada linha existente (status/valor).
  // Não substitui o array — usa map preservando referências quando nada muda.
  const silentRefresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const [a, b] = await Promise.all([
        api.get(`/admin/inscriptions?${params.toString()}`),
        api.get('/admin/dashboard/kpis'),
      ]);
      const fresh = a.data.items || [];
      const byKey = new Map(fresh.map(x => [x.id || x.cpf, x]));
      setItems(prev => {
        // Se quantidade mudou (nova inscrição/remoção), substitui o array
        if (prev.length !== fresh.length) return fresh;
        let changed = false;
        const next = prev.map(p => {
          const k = p.id || p.cpf;
          const f = byKey.get(k);
          if (!f) return p;
          // Compara apenas campos que mudam dinamicamente (status, pix_status_at)
          if (f.status !== p.status) { changed = true; return { ...p, status: f.status }; }
          return p;
        });
        return changed ? next : prev;
      });
      setKpis(prev => JSON.stringify(prev) === JSON.stringify(b.data) ? prev : b.data);
    } catch(e) { /* silencioso */ }
  }, [q, status]);

  useEffect(() => { load(); }, [load]);
  // Refresh silencioso a cada 60s (discreto, sem flash)
  useEffect(() => {
    const i = setInterval(() => { silentRefresh(); }, 60000);
    return () => clearInterval(i);
  }, [silentRefresh]);

  function exportTXT() {
    if (!items || items.length === 0) {
      window.alert('Nenhuma inscrição para baixar.');
      return;
    }
    // Helpers para extrair valor com mesma lógica do modal (incluindo derivações e combineWith)
    const getVal = (data, key, opts) => {
      const o = opts || {};
      if (typeof o.deriveFrom === 'function') {
        try { return o.deriveFrom(data) ? 'Sim' : 'Não'; } catch(e) { return ''; }
      }
      const v = data[key];
      if (v === null || v === undefined || v === '') return '';
      if (o.combineWith && data[o.combineWith]) return `${v}${o.sep || ' '}${data[o.combineWith]}`;
      if (o.kind === 'money') return fmtMoney(v);
      if (o.kind === 'cpf') return fmtCPF(v);
      if (o.kind === 'date') return fmtDate(v);
      if (o.kind === 'boolean' || o.kind === 'simNao') return (v === true || v === '1' || v === 1) ? 'Sim' : 'Não';
      if (o.kind === 'device') return String(v).toUpperCase();
      return String(v);
    };

    const lines = [];
    const sep = '═'.repeat(70);
    const subsep = '─'.repeat(70);
    lines.push(sep);
    lines.push(`  RELATÓRIO DE INSCRIÇÕES — Donas Painel`);
    lines.push(`  Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push(`  Total: ${items.length} ${items.length === 1 ? 'inscrição' : 'inscrições'}`);
    lines.push(sep);
    lines.push('');

    items.forEach((data, idx) => {
      lines.push(`■ INSCRIÇÃO ${String(idx+1).padStart(3,'0')} ${'─'.repeat(50)}`);
      lines.push('');
      SECTIONS.forEach(sec => {
        const seen = new Set();
        const fields = sec.fields.filter(([k]) => { if (seen.has(k)) return false; seen.add(k); return true; });
        const rows = [];
        fields.forEach(([k, label, opts]) => {
          const v = getVal(data, k, opts);
          if (v !== '' && v !== null && v !== undefined) rows.push([label, v]);
        });
        if (rows.length === 0) return;
        lines.push(`  ▸ ${sec.title.toUpperCase()}`);
        lines.push(`  ${subsep}`);
        const labelWidth = Math.max(...rows.map(r => r[0].length));
        rows.forEach(([label, value]) => {
          lines.push(`    ${label.padEnd(labelWidth, ' ')} : ${value}`);
        });
        lines.push('');
      });

      // OUTROS DADOS (campos não cobertos nas seções)
      const usedKeys = new Set();
      SECTIONS.forEach(s => s.fields.forEach(([k]) => usedKeys.add(k)));
      const extras = Object.entries(data).filter(([k, v]) =>
        !HIDDEN_FIELDS.has(k) && !usedKeys.has(k) && v !== null && v !== undefined && v !== ''
      );
      if (extras.length > 0) {
        lines.push('  ▸ OUTROS DADOS');
        lines.push(`  ${subsep}`);
        const lw = Math.max(...extras.map(([k]) => k.length));
        extras.forEach(([k, v]) => {
          let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
          lines.push(`    ${k.padEnd(lw, ' ')} : ${s}`);
        });
        lines.push('');
      }
      lines.push('');
    });

    lines.push(sep);
    lines.push(`  Fim do relatório — ${items.length} ${items.length === 1 ? 'inscrição listada' : 'inscrições listadas'}`);
    lines.push(sep);

    const txt = lines.join('\n');
    const blob = new Blob([txt], { type:'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscricoes_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearAll() {
    if (!window.confirm('Tem certeza que deseja apagar TODAS as inscrições? Esta ação é irreversível.')) return;
    await api.post('/admin/inscriptions/clear-all');
    load();
  }

  async function deleteOne(id) {
    if (!window.confirm('Apagar esta inscrição?')) return;
    await api.delete(`/admin/inscriptions/${id}`);
    load();
  }

  return (
    <>
      <div className="dp-page-head">
        <div>
          <h1 className="dp-page-h1">Inscrições</h1>
          <div className="dp-page-sub">Candidatos que efetivaram uma inscrição em algum concurso.</div>
        </div>
        <div className="dp-actions">
          <button className="dp-btn" onClick={exportTXT} data-testid="btn-export"><Download size={14}/> Baixar dados</button>
          <button className="dp-btn danger" onClick={clearAll} data-testid="btn-clear-all"><Trash2 size={14}/> Limpar inscrições</button>
          <button className="dp-btn" onClick={load} data-testid="btn-refresh"><RefreshCw size={14}/> Atualizar</button>
        </div>
      </div>

      <div className="dp-kpis">
        {KPI_DEFS.map(def => {
          const Ico = def.icon;
          const value = kpis ? kpis[def.key] : null;
          const display = def.fmt === 'money' ? fmtMoney(value) : fmtInt(value);
          const sub = kpis ? (def.subFn ? def.subFn(kpis) : def.sub) : '—';
          return (
            <div key={def.key} className="dp-kpi" data-testid={`kpi-${def.key}`} style={{ '--accent': def.color }}>
              <div className="top">
                <div className="lbl">{def.label}</div>
                <div className="ico" style={{ background:`${def.color}1f`, color:def.color }}><Ico size={18}/></div>
              </div>
              <div className="val">{kpis ? display : '—'}</div>
              <div className="sub">{sub}</div>
            </div>
          );
        })}
      </div>

      <div className="dp-toolbar">
        <div className="dp-search-wrap">
          <Search size={16} className="ico"/>
          <input
            data-testid="search-inscricoes"
            className="dp-search big"
            placeholder="Buscar por nome, CPF, e-mail, cidade ou nº de referência..."
            value={q} onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="dp-select-wrap">
          <span className="lb">STATUS:</span>
          <div className="dp-select">
            <select data-testid="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
            <ChevronDown size={16} className="caret"/>
          </div>
        </label>
      </div>

      <div className="dp-table-card">
        <div className="dp-tbl-head">
          <div>Candidato</div>
          <div>CPF</div>
          <div>Dispositivo</div>
          <div>Valor</div>
          <div>Status</div>
          <div>Inscrição em</div>
          <div className="ta-right">Ações</div>
        </div>

        {loading && <div className="dp-tbl-empty">Carregando…</div>}
        {!loading && items.length === 0 && <div className="dp-tbl-empty">Nenhuma inscrição encontrada.</div>}

        {!loading && items.map((i, idx) => (
          <div className="dp-tbl-row" key={i.id || idx} data-testid={`insc-row-${idx}`}>
            <div className="cand">
              <div className="nm">{(i.nome || '—').toUpperCase()}</div>
              <div className="em">{(i.email || '').toLowerCase()}</div>
            </div>
            <div className="mono">{fmtCPF(i.cpf)}</div>
            <div>
              <span className={`device-pill ${i.device === 'mobile' ? 'mobile' : 'desktop'}`}>
                {i.device === 'mobile' ? <Smartphone size={11}/> : <Monitor size={11}/>}
                {i.device === 'mobile' ? 'Mobile' : 'Desktop'}
              </span>
            </div>
            <div className="val-cell">{fmtMoney(i.valor)}</div>
            <div>
              <span className={`status-pill ${STATUS_STYLE[i.status] || 'pill-amber'}`}>{i.status}</span>
            </div>
            <div className="when">{fmtDate(i.created_at)}</div>
            <div className="acts">
              <button className="dp-act-btn primary" title="Exibir" data-testid={`btn-view-${idx}`} onClick={() => setViewing(i)}>Exibir</button>
              <button className="dp-act-btn icon danger" title="Apagar" onClick={() => deleteOne(i.id)} data-testid={`btn-del-${idx}`}><Trash2 size={14}/></button>
            </div>
          </div>
        ))}

        {!loading && items.length > 0 && (
          <div className="dp-tbl-foot">Mostrando {items.length} de {total} inscrição{total === 1 ? '' : 's'}</div>
        )}
      </div>

      {viewing && <InscriptionModal data={viewing} onClose={() => setViewing(null)}/>}
    </>
  );
}

/* === MODAL DE EXIBIR (seções estilo painel antigo) === */
// Campos técnicos que NUNCA aparecem
const HIDDEN_FIELDS = new Set(['_id','id','senha','senha_hash','password','password_hash','user_agent','__v','meta']);
const labelize = (k) => k.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());

// Definição das seções, cores e ícones
const SECTIONS = [
  {
    key:'inscricao', title:'Dados da inscrição', icon:ClipboardList, color:'#2563eb',
    fields:[
      ['numero_inscricao','Número de inscrição'],
      ['referencia','Nº de referência'],
      ['protocolo','Protocolo'],
      ['status','Status', { kind:'status' }],
      ['valor','Valor da taxa', { kind:'money' }],
      ['device','Dispositivo', { kind:'device' }],
      ['created_at','Data da inscrição', { kind:'date' }],
      ['ip','IP'],
      ['cidade_geo','Cidade/UF (Geo IP)', { combineWith:'uf_geo', sep:'/' }],
    ]
  },
  {
    key:'identificacao', title:'Identificação', icon:User, color:'#7c3aed',
    fields:[
      ['nome','Nome completo'],
      ['cpf','CPF', { kind:'cpf' }],
      ['data_nascimento','Data de nascimento', { kind:'dateOnly' }],
      ['nascimento','Data de nascimento', { kind:'dateOnly' }],
      ['data_nasc','Data de nascimento'],
      ['sexo','Sexo'],
      ['genero','Gênero'],
      ['estado_civil','Estado civil'],
      ['cor_raca','Cor/Raça'],
      ['raca','Cor/Raça'],
      ['cor','Cor/Raça'],
      ['email','E-mail'],
      ['email_contato','E-mail de contato'],
      ['telefone','Telefone'],
      ['telefone_cel','Telefone celular'],
      ['telefone_com','Telefone comercial'],
      ['celular','Celular'],
      ['whatsapp','WhatsApp'],
      ['rg','RG'],
      ['identidade','Identidade (RG)'],
      ['orgao_emissor','Órgão emissor'],
      ['data_expedicao','Data de expedição'],
      ['lingua_estrangeira','Língua estrangeira'],
      ['uf_prova','UF de prova'],
      ['municipio_prova','Município de prova'],
      ['cidade_prova','Cidade da prova'],
      ['cidade','Cidade'],
      ['uf','UF'],
      ['estado','Estado (UF)'],
      ['endereco','Endereço'],
      ['logradouro','Logradouro'],
      ['bairro','Bairro'],
      ['cep','CEP'],
      ['mae','Nome da mãe'],
      ['nome_mae','Nome da mãe'],
      ['pai','Nome do pai'],
      ['nome_pai','Nome do pai'],
      ['nacionalidade','Nacionalidade'],
      ['naturalidade','Naturalidade'],
      ['municipio_nasc','Município de nascimento'],
      ['uf_nasc','UF de nascimento'],
      ['profissao','Profissão'],
      ['eh_militar','É militar?', { kind:'simNao', deriveFrom:(d) => d.eh_militar === '1' || d.eh_militar === 1 || d.eh_militar === true }],
      ['renda','Renda familiar'],
    ]
  },
  {
    key:'atendimento', title:'Atendimento especializado', icon:Accessibility, color:'#0ea5e9',
    fields:[
      ['precisa_atendimento','Precisa de atendimento?', { kind:'boolean' }],
      ['pcd','PCD', { kind:'boolean' }],
      ['deficiencia','Deficiência'],
      ['tipo_deficiencia','Tipo de deficiência'],
      ['descricao_atendimento','Descrição do atendimento'],
    ]
  },
  {
    key:'ensino', title:'Ensino médio', icon:GraduationCap, color:'#10b981',
    fields:[
      ['situacao','Situação'],
      ['situacao_ensino','Situação'],
      ['tipo_escola','Tipo de escola'],
      ['escolaridade','Escolaridade'],
      ['cargo','Cargo'],
      ['vaga','Vaga'],
      ['concurso','Concurso'],
    ]
  },
  {
    key:'pagamento', title:'Pagamento PIX', icon:Wallet, color:'#f59e0b',
    fields:[
      ['status','Status atual', { kind:'status' }],
      ['pix_gerado','PIX gerado', { kind:'simNao', deriveFrom:(d) => d.status && d.status !== 'Aguardando pagamento' }],
      ['pix_copiado','PIX copiado', { kind:'simNao', deriveFrom:(d) => ['PIX copiado','PIX baixado'].includes(d.status) }],
      ['pix_baixado','Comprovante baixado', { kind:'simNao', deriveFrom:(d) => d.status === 'PIX baixado' }],
      ['recebedor','Recebedor (snapshot)'],
      ['chave_pix','Chave PIX'],
      ['qr_code','QR Code gerado na chave', { kind:'code' }],
      ['txid','TxID', { kind:'code' }],
    ]
  },
];

function fmtCPFView(v) { return fmtCPF(v); }
function fmtDateView(v) { try { return new Date(v).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return String(v); } }
function fmtDateOnly(v) {
  if (!v) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) {
    const [y, m, d] = String(v).slice(0,10).split('-');
    return `${d}/${m}/${y}`;
  }
  try { const t = new Date(v); if (!isNaN(t.getTime())) return t.toLocaleDateString('pt-BR'); } catch {}
  return String(v);
}

// Normaliza valores comuns (abreviações → textos completos)
function normalizeValue(k, v) {
  const s = String(v).trim();
  if (k === 'sexo' || k === 'genero') {
    if (/^f$/i.test(s)) return 'Feminino';
    if (/^m$/i.test(s)) return 'Masculino';
  }
  if (k === 'estado_civil') {
    const map = { S:'Solteiro(a)', C:'Casado(a)', V:'Viúvo(a)', D:'Divorciado(a)' };
    if (map[s.toUpperCase()]) return map[s.toUpperCase()];
  }
  return s;
}

function renderValue(raw, opts, data) {
  let v = raw;
  if (opts?.deriveFrom && (v === undefined || v === null || v === '')) {
    v = opts.deriveFrom(data);
  }
  if (opts?.combineWith) {
    const other = data[opts.combineWith];
    if (v && other) v = `${v}${opts.sep || ' '}${other}`;
    else v = v || other;
  }
  if (v === undefined || v === null || v === '') return <span className="kv-empty">—</span>;

  if (opts?.kind === 'status') {
    const cls = STATUS_STYLE[v] || 'pill-amber';
    const color = { 'pill-blue':'#1e40af', 'pill-green':'#15803d', 'pill-amber':'#a16207', 'pill-amber-2':'#92671e' }[cls];
    return <span style={{color, fontWeight:800, fontSize:16}}>{String(v)}</span>;
  }
  if (opts?.kind === 'simNao') {
    const yes = v === true || /^(sim|yes|true|1)$/i.test(String(v));
    return <span style={{color: yes ? '#10b981' : '#dc2626', fontWeight:800, fontSize:16}}>{yes ? 'Sim' : 'Não'}</span>;
  }
  if (opts?.kind === 'boolean') {
    const yes = v === true || /^(sim|yes|true|1)$/i.test(String(v));
    return yes ? 'Sim' : 'Não';
  }
  if (opts?.kind === 'cpf')   return fmtCPFView(v);
  if (opts?.kind === 'money') return typeof v === 'number' ? fmtMoney(v) : String(v);
  if (opts?.kind === 'date')  return fmtDateView(v);
  if (opts?.kind === 'dateOnly') return fmtDateOnly(v);
  if (opts?.kind === 'device') return <span className={`device-pill ${v === 'mobile' ? 'mobile' : 'desktop'}`}>{v === 'mobile' ? <Smartphone size={11}/> : <Monitor size={11}/>}{v === 'mobile' ? 'Mobile' : 'Desktop'}</span>;
  if (opts?.kind === 'code')  return <code className="kv-code">{String(v)}</code>;
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object')  return <pre style={{margin:0,whiteSpace:'pre-wrap',fontSize:13}}>{JSON.stringify(v, null, 2)}</pre>;
  return normalizeValue(opts?._key || '', String(v));
}

// helper: campo tem valor preenchido?
function hasFieldValue(data, key, opts) {
  if (opts?.deriveFrom) {
    const v = opts.deriveFrom(data);
    return v !== undefined && v !== null && v !== '';
  }
  if (opts?.combineWith) return !!(data[key] || data[opts.combineWith]);
  const v = data[key];
  return v !== undefined && v !== null && v !== '';
}

function InscriptionModal({ data, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pegar todos os campos já usados em alguma seção
  const usedKeys = new Set();
  SECTIONS.forEach(s => s.fields.forEach(([k]) => usedKeys.add(k)));

  // Campos extras não cobertos
  const extraEntries = Object.entries(data).filter(([k, v]) =>
    !HIDDEN_FIELDS.has(k) && !usedKeys.has(k) && v !== null && v !== undefined && v !== ''
  );

  return (
    <div className="dp-modal-overlay" onClick={onClose} data-testid="view-modal">
      <div className="dp-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:820}}>
        <div className="dp-modal-head">
          <h2 style={{fontSize:20}}>Detalhes do candidato</h2>
          <button className="dp-modal-close" onClick={onClose} data-testid="view-modal-close" aria-label="Fechar"><X size={20}/></button>
        </div>
        <div className="dp-modal-body dp-detail-body">
          {SECTIONS.map(sec => {
            const Ico = sec.icon;
            // Desduplica por label E por chave; e mostra apenas o primeiro alias com valor
            const seenLabels = new Set();
            const seenKeys = new Set();
            const fields = sec.fields.filter(([k, label]) => {
              if (seenKeys.has(k) || seenLabels.has(label)) return false;
              seenKeys.add(k); seenLabels.add(label);
              return true;
            });
            // Filtra apenas campos com valor real (ou que derivam de outro)
            const filledFields = fields.filter(([k, , opts]) => hasFieldValue(data, k, opts));
            // Sempre mostra a seção "Pagamento PIX" e "Dados da inscrição" se tiver pelo menos status/created
            const always = sec.key === 'pagamento' || sec.key === 'inscricao';
            if (filledFields.length === 0 && !always) return null;
            const finalFields = filledFields.length > 0 ? filledFields : fields.slice(0, 1);

            return (
              <div key={sec.key} className="dp-section">
                <div className="dp-section-head" style={{ color:sec.color }}>
                  <Ico size={18}/>
                  <span>{sec.title.toUpperCase()}</span>
                </div>
                <div className="dp-section-divider"/>
                <div className="dp-kv-grid">
                  {finalFields.map(([k, label, opts], i) => (
                    <div className="dp-kv flat" key={`${k}-${i}`}>
                      <div className="kv-k">{label}</div>
                      <div className="kv-v">{renderValue(data[k], { ...(opts||{}), _key:k }, data)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {extraEntries.length > 0 && (
            <div className="dp-section">
              <div className="dp-section-head" style={{ color:'#64748b' }}>
                <FileText size={18}/>
                <span>OUTROS DADOS</span>
              </div>
              <div className="dp-section-divider"/>
              <div className="dp-kv-grid">
                {extraEntries.map(([k, v]) => (
                  <div className="dp-kv flat" key={k}>
                    <div className="kv-k">{labelize(k)}</div>
                    <div className="kv-v">{renderValue(v, null, data)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
