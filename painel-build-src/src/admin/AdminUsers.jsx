import React, { useEffect, useState } from 'react';
import api from './api';
import { Users, Trash2, Plus, X, Shield, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

function avatarColor(name) {
  const palette = [
    'linear-gradient(135deg,#c084fc 0%,#ec4899 100%)',
    'linear-gradient(135deg,#60a5fa 0%,#a78bfa 100%)',
    'linear-gradient(135deg,#34d399 0%,#06b6d4 100%)',
    'linear-gradient(135deg,#fbbf24 0%,#f97316 100%)',
    'linear-gradient(135deg,#f87171 0%,#ec4899 100%)',
  ];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function NewAdminModal({ open, onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setUsername(''); setPassword(''); setErr(''); setShowPwd(false); }
  }, [open]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api.post('/admin/admins', { username: username.trim().toLowerCase(), password });
      onCreated && onCreated();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Erro ao criar administrador.');
    } finally { setBusy(false); }
  }

  return (
    <div className="dp-modal-overlay" onClick={onClose} data-testid="modal-new-admin">
      <div className="dp-modal dp-modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="dp-modal-head">
          <h2><Shield size={18}/> Novo administrador</h2>
          <button className="dp-modal-close" onClick={onClose} data-testid="btn-close-new-admin"><X size={18}/></button>
        </div>
        <form onSubmit={submit} className="dp-modal-body" style={{padding:'24px 28px 28px'}}>
          <p style={{color:'var(--text-soft)',fontSize:13.5,margin:'0 0 18px'}}>
            Crie credenciais de acesso para um novo administrador. Ele(a) poderá entrar pelo painel com usuário e senha.
          </p>
          <div className="dp-field-light">
            <label>Usuário</label>
            <input className="dp-input-light" autoFocus value={username} onChange={e=>setUsername(e.target.value)}
              placeholder="ex: maria.silva" data-testid="input-new-admin-username" required minLength={3}/>
          </div>
          <div className="dp-field-light">
            <label>Senha</label>
            <div className="dp-pwd-wrap-light">
              <input className="dp-input-light" type={showPwd?'text':'password'} value={password}
                onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                data-testid="input-new-admin-password" required minLength={6}/>
              <button type="button" className="dp-eye-light" onClick={()=>setShowPwd(v=>!v)} tabIndex={-1}>
                {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          {err && <div className="dp-form-err" data-testid="new-admin-error">{err}</div>}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:18}}>
            <button type="button" className="dp-btn" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="submit" className="dp-btn primary" disabled={busy} data-testid="btn-submit-new-admin">
              {busy ? <><Loader2 size={14} className="dp-spin"/> Criando…</> : <><Plus size={14}/> Criar administrador</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [modal, setModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data }, meRes] = await Promise.all([
        api.get('/admin/admins'),
        api.get('/admin/auth/me'),
      ]);
      setItems(data.items || []);
      setMe(meRes.data);
    } catch (e) { /* token interceptor cuida */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function del(username) {
    if (!window.confirm(`Excluir o administrador "${username}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/admin/admins/${encodeURIComponent(username)}`);
      load();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Erro ao excluir.');
    }
  }

  return (
    <>
      <div className="dp-page-head">
        <div>
          <h1 className="dp-page-h1">Usuários</h1>
          <div className="dp-page-sub">Administradores com acesso ao painel.</div>
        </div>
      </div>

      {/* Stat card */}
      <div className="dp-stat-card" data-testid="card-admins-total">
        <div className="dp-stat-row">
          <div className="dp-stat-lbl">ADMINISTRADORES</div>
          <div className="dp-stat-ico"><Users size={20}/></div>
        </div>
        <div className="dp-stat-val">{loading ? '—' : items.length}</div>
        <div className="dp-stat-divider" />
        <div className="dp-stat-foot">com acesso ao painel</div>
      </div>

      {/* List */}
      <div className="dp-panel" style={{marginTop:24}}>
        <div className="dp-panel-head">
          <h3 style={{margin:0}}>Lista de administradores</h3>
          <button className="dp-btn primary" onClick={()=>setModal(true)} data-testid="btn-novo-admin">
            <Plus size={14}/> Novo administrador
          </button>
        </div>

        <div className="dp-admins-table">
          <div className="dp-admins-thead">
            <div>USUÁRIO</div>
            <div>PAPEL</div>
            <div>CRIADO EM</div>
            <div className="ta-right">AÇÕES</div>
          </div>

          {loading && (
            <div className="dp-admins-empty"><Loader2 size={18} className="dp-spin"/> Carregando…</div>
          )}

          {!loading && items.length === 0 && (
            <div className="dp-admins-empty">Nenhum administrador cadastrado.</div>
          )}

          {!loading && items.map((adm, idx) => {
            const isRoot = adm.role === 'root';
            const isSelf = me && adm.username === me.username;
            const canDelete = !isRoot && !isSelf;
            return (
              <div className="dp-admins-row" key={adm.username} data-testid={`admin-row-${idx}`}>
                <div className="dp-admin-cell">
                  <div className="dp-admin-avatar" style={{background:avatarColor(adm.username)}}>
                    {(adm.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="dp-admin-name">{adm.username}{isSelf && <span className="dp-self-tag">você</span>}</div>
                </div>
                <div>
                  {isRoot
                    ? <span className="dp-role-badge role-root"><ShieldCheck size={11}/> ROOT</span>
                    : <span className="dp-role-badge role-admin"><Shield size={11}/> ADMIN</span>}
                </div>
                <div className="dp-admin-when">{formatDate(adm.created_at)}</div>
                <div className="ta-right">
                  <button
                    className="dp-icon-btn danger"
                    onClick={() => canDelete && del(adm.username)}
                    disabled={!canDelete}
                    title={isRoot ? 'Administrador root protegido' : (isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir administrador')}
                    data-testid={`btn-del-admin-${idx}`}
                  >
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NewAdminModal open={modal} onClose={()=>setModal(false)} onCreated={load}/>
    </>
  );
}
