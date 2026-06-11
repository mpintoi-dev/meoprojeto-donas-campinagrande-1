import { useState } from "react";
import "@/App.css";

function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div data-testid="loading-overlay" className="loading-overlay">
          <div className="loading-spinner" />
          <p className="loading-text">Carregando site…</p>
        </div>
      )}
      <iframe
        data-testid="site-iframe"
        src="/idecan.html"
        title="IDECAN"
        onLoad={() => setLoaded(true)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.3s ease-in",
        }}
      />
    </>
  );
}

export default App;
