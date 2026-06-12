import React, { useMemo, useState } from "react";
import { ExternalLink, KeyRound, Pencil, Trash2, RefreshCw, Copy, Eye, EyeOff, Tag, Globe2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function statusLabel(s) {
  if (s === "online") return "[ ONLINE ]";
  if (s === "offline") return "[ OFFLINE ]";
  return "[ AGUARDANDO ]";
}

export default function ProjectCard({ project, onChanged, onEdit, onDelete }) {
  const [flash, setFlash] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const accent = project.color || "#10b981";

  const copy = async (text, label) => {
    if (!text) {
      toast.error(`> ${label} não definido`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`> ${label} copiado`);
    } catch {
      toast.error("> não foi possível acessar o clipboard");
    }
  };

  const openAdmin = async () => {
    if (!project.admin_url) {
      toast.error("> URL do admin não cadastrada");
      return;
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 900);

    window.open(project.admin_url, "_blank", "noopener,noreferrer");

    if (project.password) {
      try {
        await navigator.clipboard.writeText(project.password);
        toast.success("> senha copiada. cole no painel.", {
          description: project.username ? `user: ${project.username}` : undefined,
        });
      } catch {
        toast.warning("> aba aberta. (clipboard sem permissão)");
      }
    } else {
      toast.message("> abrindo admin");
    }
  };

  const openSite = () => {
    let url = project.site_url;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copySiteUrl = async (e) => {
    e.stopPropagation();
    let url = project.site_url;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("> url do site copiada");
    } catch {
      toast.error("> falha ao copiar url");
    }
  };

  const ping = async () => {
    setPinging(true);
    try {
      const { data } = await api.post(`/projects/${project.id}/check`);
      onChanged && onChanged(data);
      toast.success(`> ${data.status === "online" ? "online" : "offline"} (${data.response_time_ms ?? "—"}ms)`);
    } catch {
      toast.error("> falha ao verificar");
    } finally {
      setPinging(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Excluir "${project.name}" da vault?`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      onDelete && onDelete(project.id);
      toast.success("> projeto removido");
    } catch {
      toast.error("> falha ao excluir");
    }
  };

  const initials = useMemo(() => project.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase(), [project.name]);

  return (
    <div
      className={`proj-card ${flash ? "flashing" : ""} ${expanded ? "expanded" : "collapsed"}`}
      style={{ "--accent": accent }}
      data-testid={`project-card-${project.id}`}
    >
      <span className="accent" />
      <span className="accent-glow" />
      <span className="scan-flash" />

      {/* HEADER - sempre visível, clicável para expandir */}
      <div
        onClick={() => setExpanded(!expanded)}
        data-testid={`toggle-${project.id}`}
        style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1, cursor: "pointer", userSelect: "none" }}
      >
        <div style={{
          width: 38, height: 38, flex: "0 0 38px",
          background: project.icon_url ? `url(${project.icon_url}) center/cover, ${accent}22` : `${accent}22`,
          border: `1px solid ${accent}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Space Mono", fontWeight: 700, color: accent, fontSize: 12,
        }}>
          {!project.icon_url && initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="brutalist-h" style={{ fontSize: 14, lineHeight: 1.15, color: "#fff", wordBreak: "break-word" }}>
            {project.name}
          </div>
          <div style={{ fontSize: 10, color: "#52525b", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
            <Globe2 size={10} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.site_url}</span>
          </div>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: "#52525b",
            transition: "transform 0.2s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </div>

      {/* COMPACT STATUS ROW - sempre visível */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1, gap: 8 }}>
        <div className={`badge ${project.status || "unknown"}`} data-testid={`project-status-${project.id}`}>
          <span className="dot" />
          <span>{statusLabel(project.status)}</span>
        </div>
        <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "0.08em", textAlign: "right" }}>
          {project.response_time_ms != null && project.status === "online" ? `${project.response_time_ms}ms · ` : ""}
          {timeAgo(project.last_checked)}
        </div>
      </div>

      {/* EXPANDED BODY - só renderiza quando expandido */}
      {expanded && (
      <div className="card-body fade-up">
        {project.category && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            <Tag size={10} />
            {project.category}
          </div>
        )}

        {(project.username || project.password) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "#0a0a0a", border: "1px dashed #27272a", fontSize: 11 }}>
            {project.username && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "#52525b" }}>user</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ color: "#fff" }}>{project.username}</code>
                  <button onClick={() => copy(project.username, "usuário")} className="btn-ghost" style={{ padding: "2px 6px", fontSize: 10 }} data-testid={`copy-user-${project.id}`}>
                    <Copy size={10} />
                  </button>
                </span>
              </div>
            )}
            {project.password && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "#52525b" }}>pass</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ color: "#fff", fontFamily: "JetBrains Mono", letterSpacing: revealed ? "0.02em" : "0.2em" }}>
                    {revealed ? project.password : "••••••••"}
                  </code>
                  <button onClick={() => setRevealed(!revealed)} className="btn-ghost" style={{ padding: "2px 6px", fontSize: 10 }} data-testid={`reveal-pass-${project.id}`}>
                    {revealed ? <EyeOff size={10} /> : <Eye size={10} />}
                  </button>
                  <button onClick={() => copy(project.password, "senha")} className="btn-ghost" style={{ padding: "2px 6px", fontSize: 10 }} data-testid={`copy-pass-${project.id}`}>
                    <Copy size={10} />
                  </button>
                </span>
              </div>
            )}
          </div>
        )}

        {project.notes && (
          <div style={{ fontSize: 11, color: "#a1a1aa", borderLeft: `2px solid ${accent}`, paddingLeft: 10, whiteSpace: "pre-wrap" }}>
            {project.notes}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, position: "relative", zIndex: 1 }}>
          <button
            onClick={openAdmin}
            className="btn-primary"
            data-testid={`open-admin-${project.id}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px" }}
          >
            <KeyRound size={12} /> ADMIN
          </button>
          <div style={{ display: "flex", gap: 0, border: "1px solid #27272a" }}>
            <button
              onClick={openSite}
              data-testid={`open-site-${project.id}`}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "transparent", color: "#fff", border: "none", borderRight: "1px solid #27272a",
                fontFamily: "Space Mono", fontWeight: 700, textTransform: "uppercase", fontSize: 11,
                letterSpacing: "0.05em", padding: "8px 14px", cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#161616"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <ExternalLink size={12} /> SITE
            </button>
            <button
              onClick={copySiteUrl}
              data-testid={`copy-site-${project.id}`}
              title="Copiar URL do site"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", color: "#a1a1aa", border: "none",
                padding: "8px 12px", cursor: "pointer",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#161616"; e.currentTarget.style.color = "#10b981"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a1a1aa"; }}
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button onClick={ping} className="btn-ghost" disabled={pinging} title="Verificar status" data-testid={`ping-${project.id}`} style={{ padding: "6px 8px" }}>
            <RefreshCw size={12} className={pinging ? "spin" : ""} />
          </button>
          <button onClick={() => onEdit(project)} className="btn-ghost" title="Editar" data-testid={`edit-${project.id}`} style={{ padding: "6px 8px" }}>
            <Pencil size={12} />
          </button>
          <button onClick={remove} className="btn-danger" title="Excluir" data-testid={`delete-${project.id}`} style={{ padding: "6px 8px" }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      )}

      <style>{`
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .proj-card.collapsed { padding: 14px 16px; gap: 10px; }
        .proj-card.expanded { padding: 18px; gap: 14px; }
        .card-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
      `}</style>
    </div>
  );
}
