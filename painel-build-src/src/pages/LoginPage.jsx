import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const PROMPTS = [
  "> donnas system online…",
  "> verificando integridade…",
  "> autentique-se para continuar.",
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user && user.username) nav("/", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    if (step >= PROMPTS.length) return;
    const t = setTimeout(() => setStep(step + 1), 380);
    return () => clearTimeout(t);
  }, [step]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(u.trim(), p);
      toast.success("> access granted. welcome back.");
      nav("/", { replace: true });
    } catch (e2) {
      const msg = e2?.response?.data?.detail || "authentication failed";
      setErr(typeof msg === "string" ? msg : "authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", zIndex: 1 }}>
      <div className="terminal-box fade-up" data-testid="login-terminal">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22, gap: 8 }}>
          <img src="/donnas-logo.png" alt="Donnas" style={{ height: 64, objectFit: "contain", filter: "drop-shadow(0 0 18px rgba(16,185,129,0.35))" }} />
          <span className="brutalist-h" style={{ fontSize: 11, letterSpacing: "0.32em", color: "#52525b" }}>
            ADMINISTRATIVO
          </span>
        </div>

        <div style={{ marginBottom: 22, minHeight: 70, fontSize: 12, color: "#a1a1aa", lineHeight: 1.7 }}>
          {PROMPTS.slice(0, step).map((t, i) => (
            <div key={i} className="fade-up">{t}</div>
          ))}
          {step < PROMPTS.length && <span className="caret" />}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label>Usuário<span className="req">*</span></label>
            <input
              data-testid="login-username-input"
              type="text"
              value={u}
              onChange={(e) => setU(e.target.value)}
              autoFocus
              autoComplete="username"
              spellCheck={false}
              placeholder="donas"
            />
          </div>
          <div className="field">
            <label>Senha<span className="req">*</span></label>
            <input
              data-testid="login-password-input"
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {err && (
            <div data-testid="login-error" style={{ color: "#ef4444", fontSize: 12, borderLeft: "2px solid #ef4444", paddingLeft: 10 }}>
              [error] {err}
            </div>
          )}

          <button data-testid="login-submit-button" type="submit" className="btn-primary" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}>
            {loading ? "AUTHENTICATING…" : <>ENTER VAULT <ChevronRight size={14} /></>}
          </button>
        </form>

        <div style={{ marginTop: 28, fontSize: 10, color: "#52525b", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          single-user · encrypted at rest · zero-trust
        </div>
      </div>
    </div>
  );
}
