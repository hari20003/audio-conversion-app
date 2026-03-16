import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="glass-nav">
          <div>
            <div className="brand-title">AudioFlow Studio</div>
            <div className="brand-subtitle">
              Transcription, conversion, review, and Dataloop delivery
            </div>
          </div>

          <div className="nav-links">
            <Link to="/" className="nav-pill">Home</Link>
            <Link to="/audio-to-script" className="nav-pill">Convert Audio</Link>
            <Link to="/conversion-two" className="nav-pill">Conversion Two</Link>
          </div>
        </div>


        <div style={{ marginBottom: 22 }}>
          <h2 className="section-title">Choose your workflow</h2>
          <p className="section-subtitle">
            Start with the exact stage you need. Both workflows follow the same premium
            interface and support a cleaner review process.
          </p>
        </div>

        <div className="card-grid" style={{ marginBottom: 28 }}>
          <div className="lux-card">
            <div className="card-icon">🎧</div>
            <h3 className="card-title">Convert Audio to Script</h3>
            <p className="card-text">
              Upload one or more audio files, monitor each file’s processing status live,
              review generated JSON, search records, and prepare selected outputs for the
              next operational step.
            </p>

            <div className="card-meta">
              <span className="meta-chip">Multi-file</span>
              <span className="meta-chip">Status tracking</span>
              <span className="meta-chip">JSON preview</span>
            </div>

            <button
              className="primary-btn"
              onClick={() => navigate("/audio-to-script")}
            >
              Open Workflow →
            </button>
          </div>
<div className="lux-card">
  <div className="card-icon">☁️</div>
  <h3 className="card-title">Dataloop Bulk Upload</h3>
  <p className="card-text">
    Load processed files, select only the required items, and send them to
    Dataloop from a dedicated upload page.
  </p>

  <div className="card-meta">
    <span className="meta-chip">Bulk upload</span>
    <span className="meta-chip">Selection table</span>
    <span className="meta-chip">Redirect flow</span>
  </div>

  <button
    className="primary-btn"
    onClick={() => navigate("/dataloop-upload")}
  >
    Open Workflow →
  </button>
</div>
          <div className="lux-card">
            <div className="card-icon">✨</div>
            <h3 className="card-title">Conversion Two</h3>
            <p className="card-text">
              Select local JSON files, run second-stage conversion, follow per-file progress,
              and save converted outputs directly into your chosen local folder.
            </p>

            <div className="card-meta">
              <span className="meta-chip">Local JSON</span>
              <span className="meta-chip">Folder save</span>
              <span className="meta-chip">Per-file status</span>
            </div>

            <button
              className="primary-btn"
              onClick={() => navigate("/conversion-two")}
            >
              Open Workflow →
            </button>
          </div>
        </div>

        <div className="page-card">
          <h2 className="section-title">Recent Activity</h2>
          <p className="section-subtitle">
            Recently processed audio and conversion tasks across your workspace.
          </p>

          <div className="table-wrap">
            <table className="lux-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Audio101_Tamil.wav</td>
                  <td>Tamil</td>
                  <td>
                    <span className="badge badge-success">Completed</span>
                  </td>
                  <td>Today</td>
                </tr>

                <tr>
                  <td>Audio159_Bengali.wav</td>
                  <td>Bengali</td>
                  <td>
                    <span className="badge badge-pending">Processing</span>
                  </td>
                  <td>Today</td>
                </tr>

                <tr>
                  <td>Audio207_English.wav</td>
                  <td>English</td>
                  <td>
                    <span className="badge badge-failed">Failed</span>
                  </td>
                  <td>Yesterday</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="page-card">
          <h2 className="section-title">System Status</h2>
          <p className="section-subtitle">
            Current operational health of the connected platform services.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div className="lux-card" style={{ padding: "20px" }}>
              <div className="stat-label">Backend API</div>
              <div className="stat-value">🟢 Running</div>
            </div>

            <div className="lux-card" style={{ padding: "20px" }}>
              <div className="stat-label">Database</div>
              <div className="stat-value">🟢 Connected</div>
            </div>

            <div className="lux-card" style={{ padding: "20px" }}>
              <div className="stat-label">ElevenLabs</div>
              <div className="stat-value">🟢 Active</div>
            </div>

            <div className="lux-card" style={{ padding: "20px" }}>
              <div className="stat-label">Dataloop</div>
              <div className="stat-value">🟢 Ready</div>
            </div>
          </div>
        </div>

        <div className="page-card">
          <h2 className="section-title">How the Platform Works</h2>
          <p className="section-subtitle">
            Follow a streamlined pipeline from audio intake to final dataset delivery.
          </p>

          <div className="card-grid">
            <div className="lux-card">
              <div className="card-icon">1️⃣</div>
              <h3 className="card-title">Upload Audio</h3>
              <p className="card-text">
                Upload one or many audio files into the processing workflow using the
                same clean dashboard.
              </p>
            </div>

            <div className="lux-card">
              <div className="card-icon">2️⃣</div>
              <h3 className="card-title">Generate Transcript</h3>
              <p className="card-text">
                Convert audio into structured annotation JSON using the first-stage
                transcription pipeline.
              </p>
            </div>

            <div className="lux-card">
              <div className="card-icon">3️⃣</div>
              <h3 className="card-title">Review & Convert</h3>
              <p className="card-text">
                Preview outputs, edit JSON where required, and run second-stage
                conversion for final formatting.
              </p>
            </div>

            <div className="lux-card">
              <div className="card-icon">4️⃣</div>
              <h3 className="card-title">Upload to Dataloop</h3>
              <p className="card-text">
                Push selected processed outputs into Dataloop through the same integrated
                operational flow.
              </p>
            </div>
          </div>
        </div>

        <div className="page-card">
          <h2 className="section-title">Quick Access</h2>
          <p className="section-subtitle">
            Jump directly into the workflow you need most.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <button
              className="primary-btn"
              onClick={() => navigate("/audio-to-script")}
            >
              Start Audio Processing
            </button>

            <button
              className="secondary-btn"
              onClick={() => navigate("/conversion-two")}
            >
              Open Conversion Two
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;