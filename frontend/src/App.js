import "@/App.css";

function App() {
  return (
    <iframe
      data-testid="site-iframe"
      src="/idecan.html"
      title="IDECAN"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        margin: 0,
        padding: 0,
      }}
    />
  );
}

export default App;
