function AudioVisualizer({ audioLevels, onAir, isMuted, micPermission, speechState }) {
  const statusText =
    micPermission === "granted"
      ? isMuted
        ? "Microphone muted"
        : onAir
          ? "Listening live"
          : "Microphone paused"
      : micPermission === "denied"
        ? "Microphone permission denied"
        : micPermission === "unsupported"
          ? "Microphone unsupported in this browser"
          : "Requesting microphone permission";

  return (
    <section className="card stack">
      <h3>Audio Visualizer</h3>
      <p className="metric-label">{statusText} | Speech engine: {speechState}</p>
      <div className={onAir && !isMuted ? "wave wave-live" : "wave"} aria-label="Live audio levels">
        {(audioLevels || []).map((level, index) => (
          <span
            key={`level-${index}`}
            className="wave-bar"
            style={{ height: `${Math.max(8, Math.min(100, level || 10))}%` }}
          />
        ))}
      </div>
    </section>
  );
}

export default AudioVisualizer;
