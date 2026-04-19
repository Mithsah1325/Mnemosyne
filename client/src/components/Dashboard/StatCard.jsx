function StatCard({ label, value, trend }) {
  return (
    <article className="card">
      <p className="metric-label">{label}</p>
      <h3 className="metric-value">{value}</h3>
      <p className="metric-trend">{trend}</p>
    </article>
  );
}

export default StatCard;
