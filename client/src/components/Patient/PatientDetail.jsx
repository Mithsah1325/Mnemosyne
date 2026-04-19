import CognitiveChart from "./CognitiveChart";

function PatientDetail() {
  return (
    <section className="stack">
      <h2 className="section-title">Patient Record</h2>

      <div className="panel-grid two">
        <section className="card stack">
          <div className="row">
            <h3>Jordan Parker</h3>
            <span className="badge">Moderate Risk</span>
          </div>
          <p className="metric-label">Patient ID: PT-1044A</p>
          <p className="metric-label">Care Region: District 7 North</p>
          <p className="metric-label">Primary Contact: A. Parker (Daughter)</p>
          <p className="metric-label">Last Check-In: Today, 09:30 AM</p>
        </section>

        <section className="card stack">
          <h3>Current Care Actions</h3>
          <div className="bubble">
            <strong>Medication Reminder</strong>
            <p className="metric-label">Due in 45 minutes</p>
          </div>
          <div className="bubble">
            <strong>Hydration Follow-up</strong>
            <p className="metric-label">Voice prompt queued</p>
          </div>
          <div className="bubble">
            <strong>Family Outreach</strong>
            <p className="metric-label">Suggested if confusion persists past 2 hours</p>
          </div>
        </section>
      </div>

      <CognitiveChart />
    </section>
  );
}

export default PatientDetail;
