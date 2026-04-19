import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import AgencyDashboard from "./components/Dashboard/AgencyDashboard";
import PatientDetail from "./components/Patient/PatientDetail";
import CallInterface from "./components/Terminal/CallInterface";
import { useAuth } from "./hooks/useAuth";

function App() {
  const [systemStatus, setSystemStatus] = useState("Operational");
  const [showVisionModal, setShowVisionModal] = useState(true);
  const { user, oidcConfigured, signInWithOidc, signOut } = useAuth();

  useEffect(() => {
    if (!showVisionModal) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowVisionModal(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showVisionModal]);

  const navItems = [
    { to: "/", label: "Operations" },
    { to: "/patient", label: "Patient Record" },
    { to: "/terminal", label: "Live Call" }
  ];

  return (
    <div className="app-bg">
      <div className="app-glow" aria-hidden="true" />
      <div className="app-grid" aria-hidden="true" />

      {showVisionModal ? (
        <div className="vision-modal-overlay" role="presentation">
          <section className="vision-modal" role="dialog" aria-modal="true" aria-label="About Mnemosyne platform">
            <p className="eyebrow">Welcome Briefing</p>
            <h2>What This Platform Is About</h2>
            <p>
              Mnemosyne is a secure assistive-care operations platform that helps teams support people with
              memory challenges through safer communication, faster escalation, and clearer clinical context.
            </p>

            <h3>Our Core Ideas</h3>
            <ul>
              <li>Human-first AI support for high-stress care moments.</li>
              <li>Real-time summaries to reduce caregiver cognitive load.</li>
              <li>Reliable escalation paths when risk signals appear.</li>
              <li>Audit-ready workflows designed for public accountability.</li>
            </ul>

            <h3>How It Helps People And Government</h3>
            <ul>
              <li>Improves continuity of care across agencies and call centers.</li>
              <li>Supports faster interventions and fewer preventable incidents.</li>
              <li>Enables policy reporting with privacy-aware operational data.</li>
              <li>Strengthens trust through transparent, traceable decisions.</li>
            </ul>

            <h3>How To Use This Platform (Very Simple Steps)</h3>
            <ol>
              <li>Press <strong>Enter Platform</strong> to start.</li>
              <li>Open <strong>Operations</strong> to see system health and updates.</li>
              <li>Open <strong>Patient Record</strong> to check the person details safely.</li>
              <li>Open <strong>Live Call</strong> when you need AI help during a conversation.</li>
              <li>Type the patient message in the box and press <strong>Send to Care AI</strong>.</li>
              <li>Read the AI response, then continue the conversation step by step.</li>
              <li>If there is danger, press <strong>Emergency Escalation</strong> to alert humans fast.</li>
            </ol>
            <p>
              Easy rule: read, type, send, check, and ask for help when unsure.
            </p>

            <h3>Future Ideas</h3>
            <ul>
              <li>Multilingual care guidance and culturally adaptive prompts.</li>
              <li>Predictive risk trends for regional planning and staffing.</li>
              <li>Integration with emergency dispatch and hospital systems.</li>
              <li>Citizen and family-facing companion app for care coordination.</li>
            </ul>

            <div className="vision-modal-actions">
              <button type="button" onClick={() => setShowVisionModal(false)}>
                Enter Platform
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">National Memory Support Console</p>
            <h1>Mnemosyne Control Center</h1>
            {user ? <p className="metric-label">Signed in as {user.name}</p> : null}
            {oidcConfigured ? (
              <div className="row" style={{ marginTop: "0.35rem", justifyContent: "flex-start" }}>
                {user ? (
                  <button type="button" onClick={signOut}>Sign Out</button>
                ) : (
                  <button type="button" onClick={() => signInWithOidc()}>Sign In (OIDC)</button>
                )}
              </div>
            ) : null}
          </div>

          <nav className="app-nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "nav-pill nav-pill-active" : "nav-pill")}
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <section className="status-ribbon">
          <p className={systemStatus === "Emergency Response Mode" ? "status-critical" : ""}>
            System Status <strong>{systemStatus}</strong>
          </p>
          <p>
            Data Residency <strong>Regional Zone A</strong>
          </p>
          <p>
            Last Integrity Check <strong>2 min ago</strong>
          </p>
        </section>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<AgencyDashboard />} />
            <Route path="/patient" element={<PatientDetail />} />
            <Route
              path="/terminal"
              element={<CallInterface onSystemStatusChange={setSystemStatus} />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
