import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, LogOut, ChevronLeft, ClipboardList } from 'lucide-react';
import './admin.css';

export default function AdminLayout() {
  const nav = useNavigate();
  const token = localStorage.getItem('donas_admin_token');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dp_sb_collapsed') === '1');

  useEffect(() => {
    localStorage.setItem('dp_sb_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  if (!token) return <Navigate to="/donaspainel/login" replace />;

  function logout() {
    localStorage.removeItem('donas_admin_token');
    nav('/donaspainel/login');
  }

  const linkCls = ({isActive}) => isActive ? 'active' : '';

  return (
    <div className={`dp-root${collapsed ? ' sb-collapsed' : ''}`}>
      <div className="dp-layout">
        <aside className="dp-sidebar" data-testid="admin-sidebar">
          <button
            className="dp-sb-toggle"
            onClick={() => setCollapsed(v => !v)}
            data-testid="sidebar-toggle"
            aria-label={collapsed ? 'Expandir menu' : 'Retrair menu'}
            title={collapsed ? 'Expandir menu' : 'Retrair menu'}
          >
            <ChevronLeft size={16}/>
          </button>

          <div className="dp-sb-brand">
            <div className="dp-avatar">D</div>
            <div className="dp-sb-text">
              <div className="t">Donas</div>
              <div className="s">Painel</div>
            </div>
          </div>

          <nav className="dp-nav">
            <NavLink to="/donaspainel" end className={linkCls} data-testid="nav-dashboard" title="Dashboard"><LayoutDashboard size={18}/> <span className="lb">Dashboard</span></NavLink>
            <NavLink to="/donaspainel/inscricoes" className={linkCls} data-testid="nav-inscricoes" title="Inscrições"><FileText size={18}/> <span className="lb">Inscrições</span></NavLink>
            <NavLink to="/donaspainel/cadastro" className={linkCls} data-testid="nav-cadastro" title="Cadastro"><ClipboardList size={18}/> <span className="lb">Cadastro</span></NavLink>
            <NavLink to="/donaspainel/usuarios" className={linkCls} data-testid="nav-usuarios" title="Usuários"><Users size={18}/> <span className="lb">Usuários</span></NavLink>
            <NavLink to="/donaspainel/configuracoes" className={linkCls} data-testid="nav-configuracoes" title="Configurações"><Settings size={18}/> <span className="lb">Configurações</span></NavLink>
          </nav>

          <div className="dp-sb-user">
            <div className="dp-avatar-sm">D</div>
            <div className="dp-sb-text" style={{minWidth:0}}>
              <div className="nm">donas (root)</div>
              <div className="rl">Administrador</div>
            </div>
          </div>
          <button className="dp-sb-logout" onClick={logout} data-testid="admin-logout" title="Sair"><LogOut size={15}/> <span className="lb">Sair</span></button>
        </aside>
        <main className="dp-main"><Outlet/></main>
      </div>
    </div>
  );
}
