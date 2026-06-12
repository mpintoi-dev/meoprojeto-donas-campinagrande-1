import React, { useEffect, useState } from "react";

export default function ProjectModal({ open, initial, onClose, onSave }) {
  const empty = {
    name: "", site_url: "", admin_url: "", username: "", password: "",
    category: "", icon_url: "", notes: "", color: "#10b981",
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setErr("");
      setForm(initial ? { ...empty, ...initial } : empty);
    }
  }, [open, initial]);

  if (!open) return null;
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || !form.site_url.trim()) {
      setErr("Nome e URL do site são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e2) {
      const msg = e2?.response?.data?.detail || "Erro ao salvar";
      setErr(typeof msg === "string" ? msg : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="project-modal">
      <div className="modal-panel fade-up">
        <h2 className="brutalist-h" style={{ fontSize: 20, margin: 0, marginBottom: 4 }}>
          {initial ? "EDIT PROJECT" : "NEW PROJECT"}
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: 11, marginBottom: 22, letterSpacing: "0.1em" }}>
          {initial ? "> mutate registry entry" : "> register a new asset in the vault"}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Nome do Projeto<span className="req">*</span></label>
            <input data-testid="project-name-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Meu Saas" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>URL do Site<span className="req">*</span></label>
            <input data-testid="project-siteurl-input" value={form.site_url} onChange={(e) => set("site_url", e.target.value)} placeholder="https://meusite.com" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>URL do Painel Admin</label>
            <input data-testid="project-adminurl-input" value={form.admin_url || ""} onChange={(e) => set("admin_url", e.target.value)} placeholder="https://meusite.com/admin" />
          </div>
          <div className="field">
            <label>Usuário</label>
            <input data-testid="project-username-input" value={form.username || ""} onChange={(e) => set("username", e.target.value)} placeholder="admin" />
          </div>
          <div className="field">
            <label>Senha</label>
            <input data-testid="project-password-input" value={form.password || ""} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
          </div>
          <div className="field">
            <label>Categoria / Tag</label>
            <input data-testid="project-category-input" value={form.category || ""} onChange={(e) => set("category", e.target.value)} placeholder="saas, blog, ecommerce..." />
          </div>
          <div className="field">
            <label>Cor de destaque</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input data-testid="project-color-input" type="color" value={form.color || "#10b981"} onChange={(e) => set("color", e.target.value)} style={{ width: 50, height: 38, padding: 0, border: "1px solid #27272a", background: "transparent" }} />
              <input value={form.color || "#10b981"} onChange={(e) => set("color", e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Ícone / Logo (URL)</label>
            <input data-testid="project-icon-input" value={form.icon_url || ""} onChange={(e) => set("icon_url", e.target.value)} placeholder="https://.../logo.png (opcional)" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Observações</label>
            <textarea data-testid="project-notes-input" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="anotações livres..." />
          </div>

          {err && (
            <div data-testid="project-modal-error" style={{ gridColumn: "1 / -1", color: "#ef4444", fontSize: 12, borderLeft: "2px solid #ef4444", paddingLeft: 10 }}>
              [error] {err}
            </div>
          )}

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose} data-testid="project-modal-cancel">CANCELAR</button>
            <button type="submit" className="btn-primary" disabled={saving} data-testid="project-modal-save">
              {saving ? "SALVANDO…" : initial ? "ATUALIZAR" : "CRIAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
