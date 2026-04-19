const metrics = {
  requestsTotal: 0,
  errorsTotal: 0,
  byPath: new Map()
};

export function trackMetrics(req, res, next) {
  metrics.requestsTotal += 1;
  const key = `${req.method} ${req.route?.path || req.path}`;
  metrics.byPath.set(key, (metrics.byPath.get(key) || 0) + 1);

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      metrics.errorsTotal += 1;
    }
  });

  next();
}

export function renderPrometheusMetrics() {
  const lines = [
    "# HELP mnemosyne_requests_total Total requests handled",
    "# TYPE mnemosyne_requests_total counter",
    `mnemosyne_requests_total ${metrics.requestsTotal}`,
    "# HELP mnemosyne_errors_total Total error responses",
    "# TYPE mnemosyne_errors_total counter",
    `mnemosyne_errors_total ${metrics.errorsTotal}`
  ];

  for (const [path, count] of metrics.byPath.entries()) {
    const label = path.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
    lines.push(`mnemosyne_requests_by_path_total{path=\"${label}\"} ${count}`);
  }

  return `${lines.join("\n")}\n`;
}
