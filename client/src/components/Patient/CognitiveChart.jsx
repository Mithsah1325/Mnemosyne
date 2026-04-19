function CognitiveChart() {
  return (
    <section className="card stack">
      <h3>Cognitive Trends</h3>
      <p className="metric-label">7-day rolling indicators for memory, speech coherence, and orientation.</p>
      <svg className="sparkline" viewBox="0 0 500 100" aria-label="Cognitive trend chart">
        <polyline
          fill="none"
          stroke="#0f6e68"
          strokeWidth="3.5"
          points="0,52 70,49 145,54 215,48 285,56 355,51 430,58 500,53"
        />
        <polyline
          fill="none"
          stroke="#1d79b8"
          strokeWidth="3"
          points="0,41 70,43 145,38 215,42 285,40 355,39 430,44 500,41"
        />
      </svg>
      <div className="row">
        <span className="badge">Memory Recall: -4% week over week</span>
        <span className="badge">Speech Coherence: Stable</span>
      </div>
    </section>
  );
}

export default CognitiveChart;
