
export default function Home() {
  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>RTG Monitoring</h1>

      <p>
        Sistem Monitoring Kelayakan dan Kondisi Unit RTG.
      </p>

      <button
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Lihat Data RTG
      </button>
    </main>
  );
}
