import React, { useEffect, useState } from 'react';
import api from './api';
import { User, Save, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function AdminProfile() {
  const [me, setMe] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api.get('/admin/auth/me').then(r => {
      setMe(r.data);
      setNewUsername(r.data.username);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setOk('');
    if (newPwd && newPwd !== confirmPwd) {
      setErr('A confirmação da nova senha não confere.'); return;
    }
    if (!currentPwd) { setErr('Informe sua senha atual para confirmar a alteração.'); return; }
    setBusy(true);
    try {
      const payload = { current_password: currentPwd };
      if (newUsername && newUsername.trim().toLowerCase() !== me.username) payload.new_username = newUsername.trim().toLowerCase();
      if (newPwd) payload.new_password = newPwd;
      const { data } = await api.put('/admin/auth/profile', payload);
      if (data.token) localStorage.setItem('donas_admin_token', data.token);
      setOk(data.changed ? 'Dados atualizados com sucesso.' : 'Nada para atualizar.');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      const meRes = await api.get('/admin/auth/me');
      setMe(meRes.data);
      setNewUsername(meRes.data.username);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Erro ao atualizar perfil.');
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="dp-page-head">
        <div>
          <h1 className="dp-page-h1">Cadastro</h1>
          <div className="dp-page-sub">Atualize suas credenciais de acesso ao painel.</div>
        </div>
      </div>

      <div className="dp-panel" style={{maxWidth:640}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
          <div className="dp-admin-avatar" style={{width:56,height:56,fontSize:22,background:'linear-gradient(135deg,#c084fc 0%,#ec4899 100%)'}}>
            {(me?.username || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>{me?.username || '—'}</div>
            <div style={{fontSize:12,color:'var(--text-soft)'}}>Perfil: <strong style={{color:'var(--violet-2)'}}>{(me?.role || 'admin').toUpperCase()}</strong></div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="dp-field-light">
            <label>Nome de usuário</label>
            <input className="dp-input-light" value={newUsername} onChange={e=>setNewUsername(e.target.value)}
              minLength={3} required data-testid="input-profile-username"/>
          </div>

          <div className="dp-field-light">
            <label>Senha atual (obrigatória)</label>
            <div className="dp-pwd-wrap-light">
              <input className="dp-input-light" type={showCurrent?'text':'password'} value={currentPwd}
                onChange={e=>setCurrentPwd(e.target.value)} placeholder="Confirme sua senha atual"
                required data-testid="input-profile-current-pwd"/>
              <button type="button" className="dp-eye-light" tabIndex={-1} onClick={()=>setShowCurrent(v=>!v)}>
                {showCurrent ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <div className="dp-field-light">
            <label>Nova senha (opcional)</label>
            <div className="dp-pwd-wrap-light">
              <input className="dp-input-light" type={showNew?'text':'password'} value={newPwd}
                onChange={e=>setNewPwd(e.target.value)} placeholder="Deixe em branco para manter a atual"
                data-testid="input-profile-new-pwd"/>
              <button type="button" className="dp-eye-light" tabIndex={-1} onClick={()=>setShowNew(v=>!v)}>
                {showNew ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          {newPwd && (
            <div className="dp-field-light">
              <label>Confirmar nova senha</label>
              <input className="dp-input-light" type={showNew?'text':'password'} value={confirmPwd}
                onChange={e=>setConfirmPwd(e.target.value)} data-testid="input-profile-confirm-pwd"/>
            </div>
          )}

          {err && <div className="dp-form-err" data-testid="profile-error">{err}</div>}
          {ok && <div className="dp-form-ok" data-testid="profile-ok"><CheckCircle2 size={15}/> {ok}</div>}

          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:18}}>
            <button type="submit" className="dp-btn primary" disabled={busy} data-testid="btn-save-profile">
              {busy ? <><Loader2 size={14} className="dp-spin"/> Salvando…</> : <><Save size={14}/> Salvar alterações</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
