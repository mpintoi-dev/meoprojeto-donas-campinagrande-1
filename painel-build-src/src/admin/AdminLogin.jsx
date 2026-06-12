import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import api from './api';
import './admin.css';

export default function AdminLogin() {
  const nav = useNavigate();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/login', { username: u, password: p });
      localStorage.setItem('donas_admin_token', data.token);
      nav('/donaspainel');
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Erro ao entrar');
    } finally { setLoading(false); }
  }

  return (
    <div className="dp-root">
      <div className="dp-login">
        <div className="dp-login-hero">
          <div className="dp-hero-bottom">
            <div className="dp-pill"><span className="dp-dot"></span> ACESSO RESTRITO</div>
            <p className="dp-quote">O conhecimento é como uma escada: quanto mais alto você sobe, mais <span className="hl">ampla é sua visão</span>.</p>
          </div>
        </div>
        <div className="dp-login-right">
          <form className="dp-login-card" onSubmit={onSubmit}>
            <div className="dp-brand">
              <div className="dp-avatar">D</div>
              <div className="dp-brand-text">
                <div className="t">Donas</div>
                <div className="s">PAINEL ADMINISTRATIVO</div>
              </div>
            </div>
            <h1>Acessar painel</h1>
            <p className="sub">Digite suas credenciais para continuar.</p>

            <div className="dp-field">
              <label>Usuário</label>
              <input data-testid="admin-login-username" className="dp-input" value={u} onChange={(e)=>setU(e.target.value)} autoFocus />
            </div>
            <div className="dp-field">
              <label>Senha</label>
              <div className="dp-pwd-wrap">
                <input data-testid="admin-login-password" type={show?'text':'password'} className="dp-input" value={p} onChange={(e)=>setP(e.target.value)} />
                <button type="button" className="dp-eye" onClick={()=>setShow(!show)} aria-label="toggle password">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {err && <div className="dp-err" data-testid="admin-login-error" style={{color:'#dc2626',fontSize:13,marginBottom:8}}>{err}</div>}
            <button data-testid="admin-login-submit" className="dp-btn-primary" disabled={loading}>
              {loading?'Entrando...':'Entrar'} <ArrowRight size={18} />
            </button>
            <div className="dp-secure"><Lock size={13} /> Conexão segura · Apenas administradores autorizados.</div>
          </form>
        </div>
      </div>
    </div>
  );
}
