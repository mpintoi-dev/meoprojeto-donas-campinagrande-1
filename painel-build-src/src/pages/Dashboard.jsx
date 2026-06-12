import React, { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, LogOut, Activity, Power } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ProjectCard from "@/components/ProjectCard";
import ProjectModal from "@/components/ProjectModal";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 15000); // refresh status display
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === "online" && p.status !== "online") return false;
      if (filter === "offline" && p.status !== "offline") return false;
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.site_url?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
      );
    });
  }, [projects, search, filter]);

  const onlineCount = projects.filter(p => p.status === "online").length;
  const offlineCount = projects.filter(p => p.status === "offline").length;
  const unknownCount = projects.filter(p => p.status !== "online" && p.status !== "offline").length;

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await api.post("/projects/check-all");
      await fetchProjects();
      toast.success("> varredura completa");
    } catch {
      toast.error("> falha na varredura");
    } finally {
      setRefreshing(false);
    }
  };

  const onSave = async (form) => {
    if (editing) {
      const { data } = await api.put(`/projects/${editing.id}`, form);
      setProjects((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      toast.success("> projeto atualizado");
    } else {
      const { data } = await api.post("/projects", form);
      setProjects((prev) => [data, ...prev]);
      toast.success("> projeto registrado");
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* ---------- HEADER ---------- */}
      <header style={{ borderBottom: "1px solid #27272a", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/donnas-logo.png" alt="Donnas" style={{ height: 42, objectFit: "contain", filter: "drop-shadow(0 0 12px rgba(16,185,129,0.35))" }} />
          <div>
            <div className="brutalist-h" style={{ fontSize: 16, letterSpacing: "0.06em" }}>ADMINISTRATIVO DONNAS</div>
            <div style={{ fontSize: 10, color: "#52525b", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              user: {user?.username || "—"} · session active
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={refreshAll} disabled={refreshing} className="btn-ghost" data-testid="refresh-all-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={12} className={refreshing ? "spin" : ""} /> {refreshing ? "VARRENDO…" : "REFRESH ALL"}
          </button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary" data-testid="new-project-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> NOVO PROJETO
          </button>
          <button onClick={logout} className="btn-ghost" data-testid="logout-btn" title="Logout" style={{ padding: "8px 10px" }}>
            <LogOut size={12} />
          </button>
        </div>
      </header>

      {/* ---------- STATS BAR ---------- */}
      <section style={{ padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, borderBottom: "1px solid #27272a" }}>
        <Stat label="TOTAL" value={projects.length} icon={<Activity size={14} />} color="#fff" testId="stat-total" />
        <Stat label="ONLINE" value={onlineCount} icon={<Activity size={14} />} color="#10b981" testId="stat-online" />
        <Stat label="OFFLINE" value={offlineCount} icon={<Power size={14} />} color="#ef4444" testId="stat-offline" />
        <Stat label="AGUARDANDO" value={unknownCount} icon={<RefreshCw size={14} />} color="#52525b" testId="stat-unknown" />
      </section>

      {/* ---------- TOOLBAR ---------- */}
      <section style={{ padding: "20px 32px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 480 }}>
          <Search size={14} style={{ position: "absolute", top: 12, left: 12, color: "#52525b" }} />
          <input
            data-testid="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar projeto, url, categoria..."
            style={{
              background: "#0a0a0a", border: "1px solid #27272a", color: "#fff",
              fontFamily: "JetBrains Mono", fontSize: 12, padding: "10px 12px 10px 36px", width: "100%", outline: "none"
            }}
            onFocus={(e) => { e.target.style.borderColor = "#10b981"; }}
            onBlur={(e) => { e.target.style.borderColor = "#27272a"; }}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { k: "all", l: "TODOS" },
            { k: "online", l: "ONLINE" },
            { k: "offline", l: "OFFLINE" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={filter === f.k ? "btn-primary" : "btn-ghost"}
              data-testid={`filter-${f.k}`}
              style={{ fontSize: 10, padding: "8px 12px" }}
            >
              {f.l}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- GRID ---------- */}
      <main style={{ padding: "12px 32px 48px" }}>
        {loading ? (
          <div style={{ color: "#52525b", padding: 40, textAlign: "center", fontFamily: "JetBrains Mono" }}>
            <span>{`> carregando inventário`}</span><span className="caret" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => { setEditing(null); setModalOpen(true); }} hasProjects={projects.length > 0} />
        ) : (
          <div
            data-testid="projects-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onChanged={(updated) => setProjects((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
                onEdit={(proj) => { setEditing(proj); setModalOpen(true); }}
                onDelete={(id) => setProjects((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid #27272a", padding: "16px 32px", fontSize: 10, color: "#52525b", letterSpacing: "0.18em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span>vault // health monitor running · check every 120s</span>
        <span>encrypted at rest · fernet aes-128</span>
      </footer>

      <ProjectModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={onSave}
      />
    </div>
  );
}

function Stat({ label, value, icon, color, testId }) {
  return (
    <div data-testid={testId} style={{
      background: "#0a0a0a", border: "1px solid #27272a", padding: "14px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "#52525b", textTransform: "uppercase" }}>{label}</div>
        <div className="brutalist-h" style={{ fontSize: 26, color, marginTop: 2 }}>{String(value).padStart(2, "0")}</div>
      </div>
      <div style={{ color, opacity: 0.7 }}>{icon}</div>
    </div>
  );
}

function EmptyState({ onAdd, hasProjects }) {
  return (
    <div style={{ border: "1px dashed #27272a", padding: 64, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
      <div style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        {hasProjects ? "> nenhum projeto corresponde aos filtros" : "> o vault está vazio. comece registrando seu primeiro projeto."}
      </div>
      {!hasProjects && (
        <button onClick={onAdd} className="btn-primary" data-testid="empty-add-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> REGISTRAR PROJETO
        </button>
      )}
    </div>
  );
}
