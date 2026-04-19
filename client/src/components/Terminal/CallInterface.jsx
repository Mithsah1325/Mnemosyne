import AudioVisualizer from "./AudioVisualizer";
import {
  escalateCall,
  getComplianceCertificate,
  getGatewayLatency,
  getPatientSummary,
  sendMessageToAI
} from "../../services/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken, setAuthToken } from "../../services/authTokenStore";
import { inspectJwtToken } from "../../services/jwtDiagnostics";
import { isOidcConfigured } from "../../services/oidcService";
import { useAuth } from "../../hooks/useAuth";

const SESSION_TIMEOUT_SECONDS = 15 * 60;
const SESSION_WARNING_SECONDS = 2 * 60;
const AUTO_ESCALATION_THRESHOLD = Number(import.meta.env.VITE_CONFUSION_ESCALATION_THRESHOLD || 2);
const DEFAULT_AUDIO_LEVELS = [30, 45, 35, 50, 32, 43, 38, 55];
const CONFUSION_PATTERNS = [
  /i\s*(am|'m)\s*confused/,
  /where\s+am\s+i/,
  /who\s+are\s+you/,
  /i\s+don'?t\s+remember/,
  /help\s+me/,
  /what\s+is\s+happening/
];
const MANUAL_TOKEN_ALLOWED =
  import.meta.env.VITE_ENABLE_MANUAL_TOKEN === "true" || !isOidcConfigured();

const DEMO_SUMMARY = {
  patientId: "patient-demo-001",
  primaryDiagnosis: "Early-stage Alzheimer's",
  pseudoId: "patient-demo-001",
  communicationPreferences: ["One question at a time", "Warm and slow pacing"],
  emergencyContact: { name: "A. Parker", phone: "+1-555-0103" },
  escalationThreshold: "Escalate if confusion continues for 2 interactions"
};

function hashTranscriptEntry(entry) {
  const payload = `${entry.source}|${entry.speaker}|${entry.text}|${entry.timestamp}`;
  let hash = 5381;

  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 33) ^ payload.charCodeAt(i);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function CallInterface({ onSystemStatusChange }) {
  const { user, oidcConfigured, signInWithOidc } = useAuth();
  const [messages, setMessages] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [draftText, setDraftText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [tokenInput, setTokenInput] = useState(getAuthToken());
  const [isMuted, setIsMuted] = useState(false);
  const [onAir, setOnAir] = useState(true);
  const [latencyMs, setLatencyMs] = useState(null);
  const [gatewayLatencyMs, setGatewayLatencyMs] = useState(null);
  const [sessionRemaining, setSessionRemaining] = useState(SESSION_TIMEOUT_SECONDS);
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());
  const [patientSummary, setPatientSummary] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [escalationStatus, setEscalationStatus] = useState("");
  const [alertMode, setAlertMode] = useState(false);
  const [summaryLoadState, setSummaryLoadState] = useState("idle");
  const [certificateLoadState, setCertificateLoadState] = useState("idle");
  const [tokenDiagnostics, setTokenDiagnostics] = useState(null);
  const [micPermission, setMicPermission] = useState("pending");
  const [speechState, setSpeechState] = useState("idle");
  const [audioLevels, setAudioLevels] = useState(DEFAULT_AUDIO_LEVELS);
  const [confusionSignals, setConfusionSignals] = useState(0);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animationFrameRef = useRef(0);
  const recognitionRef = useRef(null);
  const recognitionRunningRef = useRef(false);
  const autoEscalatedRef = useRef(false);
  const latestAuthRef = useRef(false);
  const mutedRef = useRef(false);
  const onAirRef = useRef(true);
  const micPermissionRef = useRef("pending");

  const patientId = "patient-demo-001";
  const hasManualToken = Boolean(getAuthToken());
  const canCallProtectedApi = Boolean(user) || (MANUAL_TOKEN_ALLOWED && hasManualToken);

  useEffect(() => {
    latestAuthRef.current = canCallProtectedApi;
  }, [canCallProtectedApi]);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    onAirRef.current = onAir;
  }, [onAir]);

  useEffect(() => {
    micPermissionRef.current = micPermission;
  }, [micPermission]);

  const addMessageToTranscript = (speaker, source, text) => {
    const timestamp = new Date().toISOString();
    const baseEntry = { id: crypto.randomUUID(), speaker, source, text, timestamp };
    const hash = hashTranscriptEntry(baseEntry);
    setMessages((prev) => [...prev, { ...baseEntry, hash }]);
    setLastActivityAt(Date.now());
  };

  const sessionWarning = sessionRemaining <= SESSION_WARNING_SECONDS;
  const idMismatch = Boolean(
    patientSummary?.patientId && patientSummary.patientId.toLowerCase() !== patientId.toLowerCase()
  );

  const sessionLabel = useMemo(() => {
    const minutes = Math.floor(sessionRemaining / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (sessionRemaining % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [sessionRemaining]);

  const refreshPatientSummary = async () => {
    setSummaryLoadState("loading");
    try {
      const data = await getPatientSummary(patientId);
      setPatientSummary(data.summary || DEMO_SUMMARY);
      setSummaryLoadState("success");
    } catch (error) {
      setPatientSummary(DEMO_SUMMARY);
      setSummaryLoadState("fallback");
      setErrorText(error.message);
    }
  };

  const refreshComplianceCertificate = async () => {
    setCertificateLoadState("loading");
    try {
      const data = await getComplianceCertificate();
      setCertificate(data);
      setCertificateLoadState("success");
    } catch (error) {
      setCertificate({
        region: "Regional Zone A",
        certificateId: "UNVERIFIED",
        issuedBy: "Unavailable",
        validUntil: "Unknown"
      });
      setCertificateLoadState("fallback");
      setErrorText(error.message);
    }
  };

  const refreshGatewayLatency = async () => {
    try {
      const ms = await getGatewayLatency();
      setGatewayLatencyMs(ms);
    } catch (_error) {
      setGatewayLatencyMs(null);
    }
  };

  const clearAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevels(DEFAULT_AUDIO_LEVELS);
  };

  const beginAudioMonitoring = (stream) => {
    if (typeof window === "undefined" || !window.AudioContext) {
      return;
    }

    const context = new window.AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const sourceNode = context.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    audioContextRef.current = context;
    analyserRef.current = analyser;
    sourceNodeRef.current = sourceNode;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const pump = () => {
      analyser.getByteFrequencyData(frequencyData);
      const bucketSize = Math.max(1, Math.floor(frequencyData.length / 8));

      const levels = Array.from({ length: 8 }, (_, index) => {
        const start = index * bucketSize;
        const end = Math.min(start + bucketSize, frequencyData.length);
        let total = 0;

        for (let i = start; i < end; i += 1) {
          total += frequencyData[i];
        }

        const average = end > start ? total / (end - start) : 0;
        return Math.max(10, Math.round((average / 255) * 100));
      });

      setAudioLevels(levels);
      animationFrameRef.current = requestAnimationFrame(pump);
    };

    animationFrameRef.current = requestAnimationFrame(pump);
  };

  const stopSpeechRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    try {
      recognition.stop();
    } catch (_error) {
      // ignore redundant stop events from rapid UI toggles
    }

    recognitionRunningRef.current = false;
    setSpeechState("idle");
  };

  const triggerAutomaticEscalation = async (snippet, signalCount) => {
    if (!latestAuthRef.current) {
      return;
    }

    try {
      setAlertMode(true);
      onSystemStatusChange?.("Emergency Response Mode");

      const result = await escalateCall(
        patientId,
        `Auto escalation triggered after ${signalCount} confusion signals. Snippet: ${snippet.slice(0, 120)}`
      );

      setEscalationStatus(
        `Auto escalation active (${result.escalationId}) after ${signalCount} confusion signals.`
      );
    } catch (error) {
      autoEscalatedRef.current = false;
      setErrorText(error.message || "Automatic escalation failed");
    }
  };

  const processFinalTranscript = (finalText) => {
    if (!finalText) {
      return;
    }

    const normalized = finalText.trim();
    if (!normalized) {
      return;
    }

    setDraftText((prev) => (prev ? `${prev} ${normalized}`.trim() : normalized));
    setInterimText(normalized);
    setLastActivityAt(Date.now());

    const lower = normalized.toLowerCase();
    const hasConfusionSignal = CONFUSION_PATTERNS.some((pattern) => pattern.test(lower));

    if (!hasConfusionSignal) {
      return;
    }

    setConfusionSignals((prev) => {
      const next = prev + 1;

      if (next >= AUTO_ESCALATION_THRESHOLD && !autoEscalatedRef.current) {
        autoEscalatedRef.current = true;
        triggerAutomaticEscalation(normalized, next);
      }

      return next;
    });
  };

  const startSpeechRecognition = () => {
    if (typeof window === "undefined") {
      setSpeechState("unsupported");
      return;
    }

    const RecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionApi) {
      setSpeechState("unsupported");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new RecognitionApi();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        recognitionRunningRef.current = true;
        setSpeechState("listening");
      };

      recognition.onresult = (event) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const segment = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalChunk += `${segment} `;
          } else {
            interim += segment;
          }
        }

        const cleanInterim = interim.trim();
        if (cleanInterim) {
          setInterimText(cleanInterim);
        }

        if (finalChunk.trim()) {
          processFinalTranscript(finalChunk);
        }
      };

      recognition.onerror = (event) => {
        recognitionRunningRef.current = false;
        setSpeechState("error");

        if (event.error === "not-allowed") {
          setMicPermission("denied");
          setOnAir(false);
          setErrorText("Microphone access denied. Allow microphone access in browser settings.");
        }
      };

      recognition.onend = () => {
        recognitionRunningRef.current = false;

        if (!mutedRef.current && onAirRef.current && micPermissionRef.current === "granted") {
          try {
            recognition.start();
          } catch (_error) {
            setSpeechState("idle");
          }
        } else {
          setSpeechState("idle");
        }
      };

      recognitionRef.current = recognition;
    }

    if (!recognitionRunningRef.current && !mutedRef.current && onAirRef.current) {
      try {
        recognitionRef.current.start();
      } catch (_error) {
        setSpeechState("error");
      }
    }
  };

  const startRecording = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      setOnAir(false);
      setErrorText("This browser does not support live microphone capture.");
      return;
    }

    if (streamRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");
      setOnAir(true);
      beginAudioMonitoring(stream);
      startSpeechRecognition();
    } catch (_error) {
      setMicPermission("denied");
      setOnAir(false);
      setErrorText("Microphone permission is blocked. Enable it to use live speech features.");
    }
  };

  const stopRecording = () => {
    stopSpeechRecognition();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    clearAudioMonitoring();
    setOnAir(false);
  };

  useEffect(() => {
    if (!canCallProtectedApi && oidcConfigured && !MANUAL_TOKEN_ALLOWED) {
      setPatientSummary(DEMO_SUMMARY);
      setSummaryLoadState("fallback");
      setCertificate({
        region: "Regional Zone A",
        certificateId: "UNVERIFIED",
        issuedBy: "Unavailable",
        validUntil: "Unknown"
      });
      setCertificateLoadState("fallback");
      setErrorText("Authentication required: sign in or provide a valid API token.");
      return;
    }

    refreshPatientSummary();
    refreshComplianceCertificate();
    refreshGatewayLatency();
  }, [patientId, canCallProtectedApi, oidcConfigured]);

  useEffect(() => {
    const probe = setInterval(refreshGatewayLatency, 15000);
    return () => clearInterval(probe);
  }, []);

  useEffect(() => {
    startRecording();

    return () => {
      stopRecording();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityAt) / 1000);
      const remaining = Math.max(SESSION_TIMEOUT_SECONDS - elapsed, 0);
      setSessionRemaining(remaining);

      if (remaining === 0) {
        setAuthToken("");
        setTokenInput("");
        stopRecording();
        onSystemStatusChange?.("Operational");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastActivityAt, onSystemStatusChange]);

  const playAudioBase64 = async (base64Audio) => {
    // Placeholder for real TTS playback; keep async shape for easy replacement.
    return Promise.resolve(base64Audio);
  };

  const handleUserMessage = async (text) => {
    if (!canCallProtectedApi && oidcConfigured && !MANUAL_TOKEN_ALLOWED) {
      setErrorText("Authentication required: sign in or provide a valid API token.");
      return;
    }

    setInterimText("");
    setErrorText("");
    setEscalationStatus("");
    addMessageToTranscript("Patient", "operatorInput", text);
    setAiSpeaking(true);

    try {
      const transcript = [...messages, { speaker: "Patient", text, source: "operatorInput" }]
        .map((m) => `${m.speaker}: ${m.text}`)
        .join("\n");

      const startedAt = performance.now();
      const { text: aiText, audio: base64Audio } = await sendMessageToAI(transcript, patientId);
      const endedAt = performance.now();
      setLatencyMs(Math.round(endedAt - startedAt));

      addMessageToTranscript("AI", "aiResponse", aiText);
      await playAudioBase64(base64Audio);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Backend request failed";
      setErrorText(message);
    } finally {
      setAiSpeaking(false);
      startRecording();
    }
  };

  const handleEmergencyEscalation = async () => {
    const confirmed = window.confirm(
      "Confirm emergency escalation? This will bypass AI and alert a human supervisor."
    );

    if (!confirmed) {
      return;
    }

    try {
      setAlertMode(true);
      onSystemStatusChange?.("Emergency Response Mode");
      const result = await escalateCall(
        patientId,
        "Operator triggered escalation from live terminal red button"
      );
      setEscalationStatus(`Escalation active (${result.escalationId})`);
      setLastActivityAt(Date.now());
    } catch (error) {
      setErrorText(error.message);
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (nextMuted) {
      stopSpeechRecognition();
      setOnAir(false);
      setSpeechState("idle");
    } else {
      setOnAir(true);
      startSpeechRecognition();
    }

    setLastActivityAt(Date.now());
  };

  const handleResolveEmergency = () => {
    setAlertMode(false);
    setEscalationStatus("Emergency cleared by operator");
    onSystemStatusChange?.("Operational");
  };

  const runTokenSelfTest = () => {
    const result = inspectJwtToken(tokenInput.trim());
    setTokenDiagnostics(result);
  };

  return (
    <section className={alertMode ? "stack alert-mode" : "stack"}>
      <h2 className="section-title">Live Call Terminal</h2>

      <div className="panel-grid terminal-layout">
        <section className="card stack">
          <div className="row">
            <h3>Patient Summary</h3>
            <span className="badge">Pre-call Context</span>
          </div>
          {patientSummary ? (
            <>
              <p className="metric-label">
                Diagnosis: <strong>{patientSummary.primaryDiagnosis}</strong>
              </p>
              <p className="metric-label">Pseudo ID: {patientSummary.pseudoId}</p>
              <p className={idMismatch ? "alert" : "metric-label"}>
                Session Mapping: {patientSummary.patientId || patientSummary.pseudoId} {idMismatch ? "(ID mismatch)" : "(verified)"}
              </p>
              <p className="metric-label">
                Communication: {(patientSummary.communicationPreferences || []).join(", ")}
              </p>
              <p className="metric-label">
                Guardian: {patientSummary.emergencyContact?.name} ({patientSummary.emergencyContact?.phone})
              </p>
              <p className="metric-label">Escalation Rule: {patientSummary.escalationThreshold}</p>
            </>
          ) : (
            <p className="metric-label">Loading patient summary...</p>
          )}
          {summaryLoadState === "fallback" ? (
            <p className="metric-label">Using cached demo summary. Check token and retry.</p>
          ) : null}
          <button type="button" onClick={refreshPatientSummary}>
            Retry Summary
          </button>

          <button type="button" className="danger-button" onClick={handleEmergencyEscalation}>
            Emergency Escalation
          </button>
          {escalationStatus ? <p className="alert-ok">{escalationStatus}</p> : null}
          {alertMode ? (
            <button type="button" onClick={handleResolveEmergency}>
              Resolve Emergency Mode
            </button>
          ) : null}

          <button type="button" onClick={handleMuteToggle}>
            {isMuted ? "Unmute Microphone" : "Mute Microphone"}
          </button>
          <p className={onAir ? "on-air on-air-live" : "on-air"}>On Air: {onAir ? "Yes" : "No"}</p>
          <p className="metric-label">
            Auto Escalation Signals: {confusionSignals}/{AUTO_ESCALATION_THRESHOLD}
          </p>

          <p className={sessionWarning ? "alert" : "metric-label"}>
            Session Timeout: {sessionLabel} {sessionWarning ? "(warning)" : ""}
          </p>

          <p className="metric-label">
            Latency: {latencyMs === null ? "--" : `${latencyMs} ms`} | Gateway: {gatewayLatencyMs === null ? "--" : `${gatewayLatencyMs} ms`}
          </p>

          {certificate ? (
            <details>
              <summary>Compliance Certificate ({certificate.region})</summary>
              <p className="metric-label">Certificate: {certificate.certificateId}</p>
              <p className="metric-label">Issued By: {certificate.issuedBy}</p>
              <p className="metric-label">Valid Until: {certificate.validUntil}</p>
            </details>
          ) : null}
          {certificateLoadState === "fallback" ? (
            <p className="metric-label">Certificate verification pending. Retry after re-auth.</p>
          ) : null}
          <button type="button" onClick={refreshComplianceCertificate}>
            Retry Certificate
          </button>
        </section>

        <section className="card stack">
          <div className="row">
            <p>
              Session Status: <strong>{aiSpeaking ? "AI is typing..." : "Ready"}</strong>
            </p>
            <span className="badge">Patient: {patientId}</span>
          </div>

          <p className="metric-label">
            Mic: {micPermission === "granted" ? "Connected" : micPermission === "pending" ? "Requesting" : micPermission} | Speech: {speechState}
          </p>

          <details>
            <summary>How the microphone is used in this terminal</summary>
            <p className="metric-label" style={{ marginTop: "0.5rem" }}>
              The microphone is the primary input bridge between the patient and Care AI.
            </p>
            <ul>
              <li>
                <strong>Real-time monitoring:</strong> powers the audio visualizer so operators can verify
                speaking activity even before transcript updates.
              </li>
              <li>
                <strong>AI transcription and analysis:</strong> captured speech supports interim transcript flow
                and response guidance.
              </li>
              <li>
                <strong>Privacy control:</strong> the mute button toggles the On Air state to prevent accidental
                processing during private conversation.
              </li>
              <li>
                <strong>Crisis detection:</strong> continuous session audio can support emergency triggers and
                escalation policy workflows.
              </li>
            </ul>
            <p className="metric-label">
              Current session state: microphone on-air for {patientId} unless muted by operator.
            </p>
          </details>

          <p className="metric-label">Interim Transcript: {interimText || "(none)"}</p>

          {MANUAL_TOKEN_ALLOWED ? (
          <div>
            <label className="form-label" htmlFor="api-token">
              API Access Token (required when backend auth is enabled)
            </label>
            <textarea
              id="api-token"
              rows="2"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Paste bearer token from server configuration"
            />
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => {
                  setAuthToken(tokenInput.trim());
                  setErrorText("");
                  runTokenSelfTest();
                  refreshPatientSummary();
                  refreshComplianceCertificate();
                  refreshGatewayLatency();
                }}
              >
                Save Token
              </button>
              <button type="button" onClick={runTokenSelfTest}>
                Token Self-Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setTokenInput("");
                  setAuthToken("");
                  setCertificate(null);
                  setPatientSummary(null);
                  setTokenDiagnostics(null);
                }}
              >
                Clear Token
              </button>
            </div>
            {tokenDiagnostics ? (
              <div className="token-diagnostics">
                <p className={tokenDiagnostics.valid ? "alert-ok" : "alert"}>
                  Token Check: {tokenDiagnostics.reason}
                </p>
                {tokenDiagnostics.checks ? (
                  <>
                    <p className="metric-label">Issuer: {tokenDiagnostics.checks.issuer}</p>
                    <p className="metric-label">Audience: {String(tokenDiagnostics.checks.audience)}</p>
                    <p className="metric-label">Issued At: {tokenDiagnostics.checks.issuedAt}</p>
                    <p className="metric-label">Expires At: {tokenDiagnostics.checks.expiresAt}</p>
                    <p className="metric-label">
                      Roles: {tokenDiagnostics.checks.roles.length ? tokenDiagnostics.checks.roles.join(", ") : "(none)"}
                    </p>
                    <p className={tokenDiagnostics.checks.hasExpectedRole ? "metric-label" : "alert"}>
                      Required Role Present: {tokenDiagnostics.checks.hasExpectedRole ? "Yes" : "No"}
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          ) : (
            <div className="stack">
              <p className="metric-label">Authentication is managed by OIDC sign-in. Manual token entry is disabled.</p>
              {!user ? (
                <button type="button" onClick={() => signInWithOidc()}>
                  Sign In (OIDC)
                </button>
              ) : null}
            </div>
          )}

          <div>
            <label className="form-label" htmlFor="patient-message">
              Patient Message
            </label>
            <textarea
              id="patient-message"
              rows="4"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder="Type what the patient said..."
            />
          </div>

          <div className="row">
            <button
              type="button"
              onClick={() => {
                const text = draftText.trim();
                if (!text) {
                  return;
                }
                setDraftText("");
                handleUserMessage(text);
              }}
              disabled={aiSpeaking || (!canCallProtectedApi && oidcConfigured && !MANUAL_TOKEN_ALLOWED)}
            >
              Send to Care AI
            </button>
            <span className="metric-label">Voice output returns automatically</span>
          </div>

          {errorText ? (
            <p role="alert" className="alert">
              Error: {errorText}
            </p>
          ) : null}
        </section>

        <section className="card stack">
          <h3>Transcript</h3>
          <div className="transcript">
            {messages.length === 0 ? (
              <p className="metric-label">
                {draftText.trim() ? "Draft ready. Click Send to Care AI." : "No messages yet."}
              </p>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.speaker === "Patient" ? "bubble patient" : "bubble ai"}
              >
                <div className="row">
                  <strong>
                    {message.speaker} ({message.source})
                  </strong>
                  <span className="metric-label">Hash: {message.hash}</span>
                </div>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AudioVisualizer
        audioLevels={audioLevels}
        onAir={onAir}
        isMuted={isMuted}
        micPermission={micPermission}
        speechState={speechState}
      />
    </section>
  );
}

export default CallInterface;
