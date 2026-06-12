import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import AdminInscriptions from './admin/AdminInscriptions';
import AdminUsers from './admin/AdminUsers';
import AdminCadastros from './admin/AdminCadastros';
import AdminProfile from './admin/AdminProfile';
import AdminSettings from './admin/AdminSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/donaspainel/login" element={<AdminLogin/>}/>
        <Route path="/donaspainel" element={<AdminLayout/>}>
          <Route index element={<AdminDashboard/>}/>
          <Route path="inscricoes" element={<AdminInscriptions/>}/>
          <Route path="cadastro" element={<AdminCadastros/>}/>
          <Route path="perfil" element={<AdminProfile/>}/>
          <Route path="usuarios" element={<AdminUsers/>}/>
          <Route path="configuracoes" element={<AdminSettings/>}/>
        </Route>
        <Route path="*" element={<Navigate to="/donaspainel/login" replace/>}/>
      </Routes>
    </BrowserRouter>
  );
}
