import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from './api';
import {
  MousePointerClick, FileText, DollarSign, Copy, Download, RefreshCw, Trash2, X, Search, Smartphone, Monitor,
  Eye, UserPlus, QrCode, Briefcase, BookOpen, MapPin, ClipboardCheck, CreditCard,
  TrendingUp, TrendingDown, ArrowRight, Minus,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';

/* KPI cards (5) */
const KPI_DEFS = [
  { key:'acessos',     label:'Acessos',              icon:Eye,           color:'#8b5cf6', cssVar:'--c-acessos',    fmt:'int',     sub:(k)=>'Usuários únicos →' },
  { key:'inscricoes',  label:'Total de Inscrições',  icon:FileText,      color:'#3b82f6', cssVar:'--c-inscricoes', fmt:'int',     sub:(k)=>'Candidatos cadastrados' },
  { key:'valor_total', label:'Valor Total Gerado',   icon:DollarSign,    color:'#10b981', cssVar:'--c-valor',      fmt:'money',   sub:(k)=>`${(k.pix_gerados||0).toLocaleString('pt-BR')} PIX gerado(s)` },
  { key:'valor_copiados', label:'PIX Copiados',      icon:Copy,          color:'#f59e0b', cssVar:'--c-pix-copy',   fmt:'money',   sub:(k)=>`${(k.pix_copiados||0).toLocaleString('pt-BR')} pix copiados` },
  { key:'valor_baixados', label:'PIX Baixados',      icon:Download,      color:'#ec4899', cssVar:'--c-pix-down',   fmt:'money',   sub:(k)=>`${(k.pix_baixados||0).toLocaleString('pt-BR')} comprovantes baixados` },
];

const FUNNEL_ICONS = {
  'Acessos ao site':       Eye,
  'Inscrições finalizadas':FileText,
  'PIX gerado':            CreditCard,
  'PIX copiado':           Copy,
  'PIX baixado':           Download,
};

const EVENT_DEFS = {
  access:               { icon: MousePointerClick, color:'#8b5cf6', soft:'#ede9fe' },
  registration:         { icon: UserPlus,          color:'#3b82f6', soft:'#dbeafe' },
  inscricao_finalizada: { icon: ClipboardCheck,    color:'#0ea5e9', soft:'#e0f2fe' },
  pix_generated:        { icon: QrCode,            color:'#10b981', soft:'#dcfce7' },
  pix_copied:           { icon: Copy,              color:'#f59e0b', soft:'#fef3c7' },
  pix_downloaded:       { icon: Download,          color:'#ec4899', soft:'#fce7f3' },
  edital:               { icon: BookOpen,          color:'#8b5cf6', soft:'#ede9fe' },
  cargo:                { icon: Briefcase,         color:'#06b6d4', soft:'#cffafe' },
};

const fmtMoney = (v) => 'R$ ' + (Number(v||0)).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
const fmtInt = (v) => (Number(v||0)).toLocaleString('pt-BR');

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  let s = Math.floor((Date.now() - d.getTime())/1000);
  if (s < 0) s = 0; // future-dated (clock skew) -> show as just now
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s/60); if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m/60); if (h < 24) return `${h} h atrás`;
  return `${Math.floor(h/24)} d atrás`;
}

function eventTitle(ev) {
  const k = ev.kind;
  const meta = ev.meta || {};
  if (k === 'access') return `Novo acesso ${meta.device === 'mobile' ? 'mobile' : 'desktop'}`;
  if (k === 'registration') return 'Inscrição iniciada';
  if (k === 'inscricao_finalizada') return 'Inscrição finalizada';
  if (k === 'pix_generated') return 'PIX gerado';
  if (k === 'pix_copied') return 'PIX copiado';
  if (k === 'pix_downloaded') return 'Comprovante baixado';
  return ev.description || 'Evento';
}

function eventSub(ev) {
  const meta = ev.meta || {};
  const loc = meta.location || (meta.city ? `${meta.city}${meta.uf ? '/' + meta.uf : ''}` : '');
  const parts = [];
  if (meta.page === '/edital' || meta.page === '/editais') parts.push('Tela do edital');
  if (ev.kind === 'registration') parts.push('Tela de cadastro');
  if (loc) parts.push(loc);
  return parts.join(' · ') || '';
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [events, setEvents] = useState([]);
  const [chart, setChart] = useState([]);
  const [locs, setLocs] = useState([]);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [range, setRange] = useState('24h'); // '1h' | '24h' | '7d'

  const loadAll = useCallback(async () => {
    try {
      const [a,b,d] = await Promise.all([
        api.get('/admin/dashboard/kpis'),
        api.get('/admin/dashboard/funnel'),
        api.get('/admin/dashboard/locations'),
      ]);
      setKpis(a.data); setFunnel(b.data); setLocs(d.data);
    } catch(e) { console.error(e); }
  }, []);

  const loadChart = useCallback(async (r) => {
    try {
      const { data } = await api.get(`/admin/dashboard/activity?range=${r}`);
      setChart(data);
    } catch(e) { console.error(e); }
  }, []);

  const loadEvents = useCallback(async () => {
    try { const { data } = await api.get('/admin/dashboard/realtime?limit=50'); setEvents(data); } catch(e){}
  }, []);

  useEffect(() => {
    loadAll(); loadEvents(); loadChart(range);
    // Atividade em tempo real: refresh a cada 3s (discreto, só altera o feed)
    const iEvents = setInterval(loadEvents, 3000);
    // Painel inteiro (KPIs, funil, gráfico, top localizações): refresh silencioso a cada 60s
    const iAll = setInterval(() => { loadAll(); loadChart(range); }, 60000);
    const onVis = () => { if (!document.hidden) { loadAll(); loadEvents(); loadChart(range); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iEvents); clearInterval(iAll); document.removeEventListener('visibilitychange', onVis); };
  }, [loadAll, loadEvents, loadChart, range]);

  async function resetKpis() {
    if (!window.confirm('Tem certeza que deseja zerar todos os KPIs? Isso apaga os contadores mas mantém usuários/inscrições.')) return;
    await api.post('/admin/reset-kpis');
    loadAll(); loadEvents();
  }

  return (
    <>
      <div className="dp-page-head">
        <div>
          <h1 className="dp-page-h1">Dashboard</h1>
          <div className="dp-page-sub">Visão geral em tempo real do portal.</div>
        </div>
        <div className="dp-actions">
          <button className="dp-btn danger" onClick={resetKpis} data-testid="btn-reset"><Trash2 size={14}/> Zerar KPIs</button>
          <button className="dp-btn" onClick={() => { loadAll(); loadEvents(); }} data-testid="btn-refresh"><RefreshCw size={14}/> Atualizar</button>
        </div>
      </div>

      <div className="dp-kpis">
        {KPI_DEFS.map(def => {
          const Ico = def.icon;
          const value = kpis ? kpis[def.key] : null;
          const display = def.fmt === 'money' ? fmtMoney(value) : fmtInt(value);
          const sub = kpis ? def.sub(kpis) : '—';
          const isClickable = def.key === 'acessos';
          return (
            <div
              key={def.key}
              className={`dp-kpi${isClickable ? ' clickable' : ''}`}
              data-testid={`kpi-${def.key}`}
              style={{ '--accent': def.color }}
              onClick={isClickable ? () => setAccessModalOpen(true) : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') setAccessModalOpen(true); } : undefined}
            >
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

      <div className="dp-grid2">
        <div className="dp-panel">
          <div className="dp-panel-head">
            <div>
              <h3>Funil de conversão</h3>
              <div className="panel-sub">Distribuição das etapas — passe o mouse sobre cada fatia</div>
            </div>
          </div>

          <FunnelDonut funnel={funnel}/>
        </div>

        <div className="dp-panel">
          <h3>Atividade em tempo real <span className="dp-live">AO VIVO</span></h3>
          <div className="panel-sub">Últimos eventos no portal</div>
          <div className="dp-events">
            {events.length === 0 && <div className="dp-events-empty">Aguardando atividade…</div>}
            {events.map((ev, i) => {
              const def = EVENT_DEFS[ev.kind] || EVENT_DEFS.access;
              const Ico = def.icon;
              const isMobile = (ev.meta?.device === 'mobile');
              const showDevice = ev.kind === 'access';
              return (
                <div className="dp-event" key={i}>
                  <div className="ico" style={{ background:def.soft, color:def.color }}><Ico size={18}/></div>
                  <div className="body">
                    <div className="row1">
                      <span className="desc">{eventTitle(ev)}</span>
                      {showDevice && (
                        <span className={`device-pill ${isMobile ? 'mobile' : 'desktop'}`}>
                          {isMobile ? <Smartphone size={11}/> : <Monitor size={11}/>}
                          {isMobile ? 'Mobile' : 'Desktop'}
                        </span>
                      )}
                    </div>
                    <div className="sub">{eventSub(ev)}</div>
                  </div>
                  <div className="time">{timeAgo(ev.created_at)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dp-grid2">
        <div className="dp-panel">
          <div className="dp-panel-head">
            <div>
              <h3>Atividade</h3>
              <div className="panel-sub">
                {range === '1h' && 'Acessos × Inscrições nos últimos 60 minutos (buckets de 5 min)'}
                {range === '24h' && 'Acessos × Inscrições nas últimas 24 horas (buckets de 1 hora)'}
                {range === '7d' && 'Acessos × Inscrições nos últimos 7 dias'}
              </div>
            </div>
            <div className="dp-seg" role="tablist" aria-label="Intervalo de tempo">
              {[
                { v: '1h',  l: 'Última hora' },
                { v: '24h', l: '24 horas' },
                { v: '7d',  l: '7 dias' },
              ].map(opt => (
                <button
                  key={opt.v}
                  role="tab"
                  aria-selected={range === opt.v}
                  className={`dp-seg-btn${range === opt.v ? ' active' : ''}`}
                  onClick={() => setRange(opt.v)}
                  data-testid={`range-${opt.v}`}
                >{opt.l}</button>
              ))}
            </div>
          </div>
          <div style={{width:'100%',height:300,marginTop:8}}>
            <ResponsiveContainer>
              <LineChart data={chart} margin={{top:10,right:18,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece8f7"/>
                <XAxis dataKey="day" stroke="#8a7fa3" fontSize={11.5} tickLine={false} axisLine={{stroke:'#dcd7ec'}}/>
                <YAxis stroke="#8a7fa3" fontSize={11.5} tickLine={false} axisLine={{stroke:'#dcd7ec'}}/>
                <Tooltip contentStyle={{background:'#fff',border:'1px solid #e9e6f5',borderRadius:10,color:'#1a1326',boxShadow:'0 8px 24px -8px rgba(20,8,40,.12)'}} labelStyle={{color:'#5a4f73',fontSize:12,fontWeight:700}}/>
                <Legend wrapperStyle={{fontSize:12,paddingTop:6}} iconType="circle"/>
                <Line type="monotone" dataKey="acessos"    name="Acessos"    stroke="#8b5cf6" strokeWidth={2.5} dot={{r:3,fill:'#8b5cf6'}} activeDot={{r:5}}/>
                <Line type="monotone" dataKey="inscricoes" name="Inscrições" stroke="#10b981" strokeWidth={2.5} dot={{r:3,fill:'#10b981'}} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dp-panel">
          <h3>Top localizações</h3>
          <div className="panel-sub">De onde vêm os visitantes</div>
          <div className="dp-loc-list" style={{maxHeight:340,overflowY:'auto',paddingRight:6}}>
            {locs.length === 0 && <div style={{color:'#8a7fa3',fontSize:13,padding:'18px 0'}}>Sem dados ainda.</div>}
            {locs.map((l, i) => {
              const max = Math.max(...locs.map(x => x.count), 1);
              return (
                <div className="dp-loc" key={i}>
                  <MapPin size={15} color="#ec4899"/>
                  <div style={{minWidth:0}}>
                    <div className="nm">{l.city || '—'}</div>
                    <div style={{fontSize:11.5,color:'#8a7fa3'}}>{l.uf || ''}</div>
                  </div>
                  <span className="bar"><div style={{width:`${(l.count/max)*100}%`}}/></span>
                  <span className="ct">{l.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {accessModalOpen && <AccessesModal onClose={() => setAccessModalOpen(false)}/>}
    </>
  );
}

/* ============================================================
 * FunnelDonut — Donut + lista lateral de etapas
 *   • Centro do donut = etapa em foco (default: PIX gerado)
 *   • Hover em uma fatia OU em um card da lista atualiza o centro
 *   • Rodapé com 3 conversões-chave (INSC→PIX, PIX→BAIXADOS, GERAL)
 * ============================================================ */
function FunnelDonut({ funnel }) {
  // Remove "Cadastros criados" — etapa intermediária técnica que não vai no novo design
  const stages = useMemo(
    () => (funnel || []).filter(f => f.label !== 'Cadastros criados'),
    [funnel]
  );

  const [focusIdx, setFocusIdx] = useState(2); // default: PIX gerado

  if (!stages.length) {
    return <div style={{padding:'40px 0', textAlign:'center', color:'#8a7fa3', fontSize:13}}>Sem dados ainda.</div>;
  }

  const total = stages.reduce((s, f) => s + (f.count || 0), 0);
  const focus = stages[focusIdx] || stages[0];
  const prev = focusIdx > 0 ? stages[focusIdx - 1] : null;

  // Centro do donut
  const centerLabel = focusIdx === 0
    ? 'TOPO DO FUNIL'
    : `${prev.label.toUpperCase()} → ${focus.label.toUpperCase()}`;
  const centerPct = focusIdx === 0
    ? (total ? (focus.count / total * 100) : 0)
    : (prev && prev.count ? (focus.count / prev.count * 100) : 0);
  const centerSub = focusIdx === 0
    ? `${fmtInt(focus.count)} visitantes`
    : `${fmtInt(focus.count)} de ${fmtInt(prev?.count || 0)}`;

  // Conversões-chave (resumo)
  const acc = stages.find(s => s.label === 'Acessos ao site')?.count || 0;
  const insc = stages.find(s => s.label === 'Inscrições finalizadas')?.count || 0;
  const pixGen = stages.find(s => s.label === 'PIX gerado')?.count || 0;
  const pixDown = stages.find(s => s.label === 'PIX baixado')?.count || 0;
  const cInscPix = insc ? (pixGen / insc * 100) : 0;
  const cPixDown = pixGen ? (pixDown / pixGen * 100) : 0;
  const cGeral = acc ? (pixDown / acc * 100) : 0;

  const pieData = stages.map(s => ({ name: s.label, value: Math.max(s.count, 0), color: s.color }));
  // Se tudo zero, mostra fatia placeholder pra desenhar o donut
  const hasData = pieData.some(d => d.value > 0);
  const drawData = hasData ? pieData : [{ name: '—', value: 1, color: '#ede9fe' }];

  return (
    <div className="dp-fdn">
      {/* Donut */}
      <div className="dp-fdn-donut" data-testid="funnel-donut">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={drawData}
              dataKey="value"
              cx="50%" cy="50%"
              innerRadius="68%" outerRadius="92%"
              paddingAngle={hasData && drawData.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive
              onMouseEnter={(_, idx) => hasData && setFocusIdx(idx)}
            >
              {drawData.map((d, i) => (
                <Cell key={i} fill={d.color} opacity={hasData && i === focusIdx ? 1 : (hasData ? .55 : 1)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="dp-fdn-center">
          <div className="dp-fdn-pct" style={{ color: focus.color }}>
            {centerPct.toFixed(1)}<span className="dp-fdn-pct-sym">%</span>
          </div>
          <div className="dp-fdn-center-lb">{centerLabel}</div>
          <div className="dp-fdn-center-sub">{centerSub}</div>
        </div>
      </div>

      {/* Lista lateral */}
      <div className="dp-fdn-list">
        {stages.map((s, i) => {
          const Ico = FUNNEL_ICONS[s.label] || Eye;
          const isFocus = i === focusIdx;
          const conv = s.conversion;
          // Trend: > 50% = up, > 0 = right (neutral), 0 = down/empty
          let TrendIco = Minus;
          let trendKind = 'neutral';
          if (i === 0) {
            TrendIco = Minus; trendKind = 'topo';
          } else if (conv >= 50) {
            TrendIco = TrendingUp; trendKind = 'up';
          } else if (conv > 0) {
            TrendIco = ArrowRight; trendKind = 'right';
          } else {
            TrendIco = TrendingDown; trendKind = 'down';
          }
          return (
            <div
              key={i}
              className={`dp-fdn-row${isFocus ? ' is-focus' : ''}`}
              style={{ '--accent': s.color }}
              onMouseEnter={() => setFocusIdx(i)}
              data-testid={`funnel-row-${i}`}
            >
              <div className="dp-fdn-row-ico" style={{ background:`${s.color}1f`, color:s.color }}>
                <Ico size={18}/>
              </div>
              <div className="dp-fdn-row-body">
                <div className="dp-fdn-row-top">
                  <span className="dp-fdn-row-lb">{s.label}</span>
                  <span className="dp-fdn-row-count">{fmtInt(s.count)}</span>
                </div>
                <div className="dp-fdn-row-meta">
                  {i === 0
                    ? <span className={`dp-fdn-pill ${trendKind}`}><TrendIco size={11}/> topo</span>
                    : <>
                        <span className={`dp-fdn-pill ${trendKind}`}>
                          <TrendIco size={11}/> {conv?.toFixed?.(1) ?? conv}%
                        </span>
                        {s.dropped > 0 && <span className="dp-fdn-drop">{fmtInt(s.dropped)} saíram</span>}
                      </>}
                </div>
              </div>
            </div>
          );
        })}

        {/* Rodapé com 3 conversões-chave */}
        <div className="dp-fdn-summary">
          <div className="dp-fdn-sum-cell">
            <div className="v">{cInscPix.toFixed(1)}%</div>
            <div className="l">INSC → PIX</div>
          </div>
          <div className="dp-fdn-sum-cell">
            <div className="v">{cPixDown.toFixed(1)}%</div>
            <div className="l">PIX → BAIXADOS</div>
          </div>
          <div className="dp-fdn-sum-cell">
            <div className="v">{cGeral.toFixed(2)}%</div>
            <div className="l">GERAL</div>
          </div>
        </div>
      </div>
    </div>
  );
}


function AccessesModal({ onClose }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/accesses?limit=500${q ? `&q=${encodeURIComponent(q)}` : ''}`);
      setData(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  return (
    <div className="dp-modal-overlay" onClick={onClose} data-testid="accesses-modal">
      <div className="dp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dp-modal-head">
          <h2>
            Acessos ao site
            <span className="badge">{data.total} visitas registradas</span>
          </h2>
          <button className="dp-modal-close" onClick={onClose} data-testid="accesses-modal-close" aria-label="Fechar"><X size={18}/></button>
        </div>
        <div className="dp-modal-body">
          <div className="dp-modal-tools">
            <div style={{position:'relative',flex:1,minWidth:240}}>
              <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#8a7fa3',pointerEvents:'none'}}/>
              <input
                data-testid="accesses-search"
                className="dp-search"
                placeholder="Buscar por IP, cidade, UF ou dispositivo..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{paddingLeft:34,width:'100%'}}
              />
            </div>
          </div>

          <div className="dp-table-head">
            <span>Data / Hora</span>
            <span>IP</span>
            <span>Localização</span>
            <span style={{textAlign:'right'}}>Dispositivo</span>
          </div>

          <div className="dp-accesses">
            {loading && <div className="dp-access-empty">Carregando…</div>}
            {!loading && data.items.length === 0 && <div className="dp-access-empty">Nenhum acesso encontrado.</div>}
            {!loading && data.items.map((it, i) => {
              const isMobile = it.device === 'mobile';
              const Dev = isMobile ? Smartphone : Monitor;
              const loc = it.city
                ? `${it.city}${it.uf ? '/' + it.uf : ''}`
                : (it.region_name || it.country || it.uf || '—');
              return (
                <div className="dp-access-row" key={i}>
                  <span className="when">{fmtDate(it.created_at)}</span>
                  <span className="ip">{it.ip || '—'}</span>
                  <span className="loc">{loc}</span>
                  <span className={`dev ${isMobile ? 'mobile' : 'desktop'}`}><Dev size={12}/> {isMobile ? 'Mobile' : 'Desktop'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
