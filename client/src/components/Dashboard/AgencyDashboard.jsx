import StatCard from "./StatCard";

function AgencyDashboard() {
  const stats = [
    { label: "Active Patients", value: 124, trend: "+8 since yesterday" },
    { label: "Calls in Progress", value: 11, trend: "2 escalations" },
    { label: "Critical Alerts", value: 4, trend: "1 unresolved > 15 min" }
  ];

  const incidents = [
    { id: "ALRT-8832", region: "North Ward", severity: "High", age: "09m" },
    { id: "ALRT-8824", region: "South Hub", severity: "Medium", age: "12m" },
    { id: "ALRT-8819", region: "East Transit", severity: "High", age: "16m" }
  ];

  return (
    <section className="stack">
      <h2 className="section-title">Operations Dashboard</h2>

      <div className="panel-grid three">
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} trend={item.trend} />
        ))}
      </div>

      <div className="panel-grid two">
        <section className="card">
          <div className="row" style={{ marginBottom: "0.7rem" }}>
            <h3>Service Coverage Heat</h3>
            <span className="badge">Realtime</span>
          </div>
          <svg className="sparkline" viewBox="0 0 500 100" aria-label="Coverage trend">
            <polyline
              fill="none"
              stroke="#0f6e68"
              strokeWidth="4"
              points="0,78 56,65 110,72 165,41 220,46 280,30 335,34 390,22 445,30 500,20"
            />
            <polyline
              fill="none"
              stroke="rgba(15,110,104,0.25)"
              strokeWidth="10"
              points="0,78 56,65 110,72 165,41 220,46 280,30 335,34 390,22 445,30 500,20"
            />
          </svg>
          <p className="metric-label">Network quality is stable with minor volatility in Sector 4.</p>
        </section>

        <section className="card">
          <div className="row" style={{ marginBottom: "0.7rem" }}>
            <h3>Active Incidents</h3>
            <span className="badge">Priority Queue</span>
          </div>
          <div className="stack">
            {incidents.map((incident) => (
              <div key={incident.id} className="row bubble">
                <div>
                  <strong>{incident.id}</strong>
                  <p className="metric-label">{incident.region}</p>
                </div>
                <div>
                  <strong>{incident.severity}</strong>
                  <p className="metric-label">Age {incident.age}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default AgencyDashboard;
