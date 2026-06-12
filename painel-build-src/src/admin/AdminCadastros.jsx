import React, { useEffect, useState, useCallback } from 'react';
import api from './api';
import { Search, Trash2, Smartphone, Monitor, Loader2, UserPlus, RefreshCw, FileDown } from 'lucide-react';

function formatCpf(cpf) {
  const d = (cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return cpf || '—';
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

export default function AdminCadastros() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/cadastros?q=${encodeURIComponent(q)}&limit=200`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { /* interceptor handles 401 */ }
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  async function del(cpf) {
    if (!window.confirm(`Excluir o cadastro do CPF ${formatCpf(cpf)}?\nEsta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/admin/cadastros/${cpf}`);
      load();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Erro ao excluir.');
    }
  }

  async function exportTxt() {
    setExporting(true);
    try {
      const res = await api.get(`/admin/cadastros/export.txt?q=${encodeURIComponent(q)}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      a.href = url;
      a.download = `cadastros_${stamp}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.response?.data?.detail || 'Erro ao exportar TXT.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="dp-page-head">
        <div>
          <h1 className="dp-page-h1">Cadastro</h1>
          <div className="dp-page-sub">Candidatos cadastrados no portal. {total > 0 && <strong>{total} {total === 1 ? 'cadastro' : 'cadastros'}</strong>}.</div>
        </div>
        <div className="dp-actions">
          <input
            className="dp-search"
            placeholder="Buscar por CPF, nome ou e-mail…"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            data-testid="search-cadastros"
            style={{minWidth:240}}
          />
          <button className="dp-btn" onClick={load} data-testid="btn-search-cadastros" title="Buscar">
            <Search size={14}/> Buscar
          </button>
          <button className="dp-btn" onClick={load} data-testid="btn-refresh-cadastros" title="Atualizar lista" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'dp-spin' : ''}/> Atualizar
          </button>
          <button className="dp-btn outline-green" onClick={exportTxt} data-testid="btn-export-cadastros" title="Baixar lista em .txt" disabled={exporting || total === 0}>
            {exporting ? <><Loader2 size={14} className="dp-spin"/> Salvando…</> : <><FileDown size={14}/> Salvar .txt</>}
          </button>
        </div>
      </div>

      {/* Stat card */}
      <div className="dp-stat-card" data-testid="card-cadastros-total" style={{marginBottom:24}}>
        <div className="dp-stat-row">
          <div className="dp-stat-lbl">CADASTROS</div>
          <div className="dp-stat-ico"><UserPlus size={20}/></div>
        </div>
        <div className="dp-stat-val">{loading ? '—' : total}</div>
        <div className="dp-stat-divider" />
        <div className="dp-stat-foot">candidatos com cadastro no portal</div>
      </div>

      {/* Table */}
      <div className="dp-panel">
        <div className="dp-cad-table">
          <div className="dp-cad-thead">
            <div>CPF</div>
            <div>NOME</div>
            <div>E-MAIL</div>
            <div>DATA</div>
            <div>DISPOSITIVO</div>
            <div className="ta-right">AÇÕES</div>
          </div>

          {loading && (
            <div className="dp-admins-empty"><Loader2 size={18} className="dp-spin"/> Carregando cadastros…</div>
          )}

          {!loading && items.length === 0 && (
            <div className="dp-admins-empty">Nenhum cadastro encontrado.</div>
          )}

          {!loading && items.map((c, idx) => {
            const dt = c.last_at || c.created_at;
            const isMobile = c.device === 'mobile';
            return (
              <div className="dp-cad-row" key={c.cpf} data-testid={`cad-row-${idx}`}>
                <div className="mono">{formatCpf(c.cpf)}</div>
                <div className="dp-cad-name">{c.nome || '—'}</div>
                <div className="dp-cad-email">{(c.email || '').toLowerCase() || '—'}</div>
                <div className="dp-cad-when">{formatDate(dt)}</div>
                <div>
                  <span className={`device-pill ${isMobile ? 'mobile' : 'desktop'}`}>
                    {isMobile ? <Smartphone size={11}/> : <Monitor size={11}/>}
                    {isMobile ? 'Mobile' : 'Desktop'}
                  </span>
                </div>
                <div className="ta-right">
                  <button
                    className="dp-icon-btn danger"
                    onClick={()=>del(c.cpf)}
                    title="Excluir cadastro"
                    data-testid={`btn-del-cad-${idx}`}
                  >
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
