import React, { useState, useMemo } from "react";
import {
  ShieldCheck, KeyRound, Database, Laptop, Wifi, Siren, Handshake,
  ArrowRight, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  XCircle, RotateCcw, Download, Sparkles,
} from "lucide-react";

// ---- Design tokens ----------------------------------------------------------
const C = {
  bg: "#F4F6FA",
  surface: "#FFFFFF",
  border: "#E3E8EF",
  borderStrong: "#CBD3E1",
  navy: "#0F2A4A",
  brand: "#2F6FED",
  brandSoft: "#EAF1FF",
  success: "#12805C",
  successSoft: "#E6F6F0",
  warn: "#B7791F",
  warnSoft: "#FBF1DE",
  danger: "#C0362C",
  dangerSoft: "#FBEAE8",
  textPrimary: "#101828",
  textSecondary: "#667085",
  textMuted: "#98A2B3",
};

const DOMAINS = [
  { id: "iam", label: "Identity & Access", icon: KeyRound, weight: 1,
    questions: [
      "Multi-factor authentication is enforced for all staff accounts",
      "Access follows least-privilege — staff only reach what their role needs",
      "Departing staff have accounts disabled within 24 hours",
    ]},
  { id: "data", label: "Data Protection", icon: Database, weight: 1.5,
    questions: [
      "Customer data is encrypted at rest and in transit",
      "A data retention policy exists and is followed",
      "Consent is captured and logged before collecting personal data",
    ]},
  { id: "endpoint", label: "Endpoint Security", icon: Laptop, weight: 1,
    questions: [
      "Company devices run antivirus / endpoint protection",
      "Device storage is encrypted (e.g. BitLocker or equivalent)",
      "A patching process keeps systems updated on a schedule",
    ]},
  { id: "network", label: "Network Security", icon: Wifi, weight: 1,
    questions: [
      "Remote access requires a VPN or equivalent secure tunnel",
      "Firewall rules are documented and reviewed",
      "Guest and staff networks are separated",
    ]},
  { id: "ir", label: "Incident Response", icon: Siren, weight: 1.5,
    questions: [
      "A written incident response plan exists",
      "A breach notification process to NITDA is defined",
      "Backups are taken and recovery has been tested",
    ]},
  { id: "vendor", label: "Vendor & Third-Party", icon: Handshake, weight: 1,
    questions: [
      "Vendors handling customer data go through a security review",
      "Data-sharing agreements are documented with partners",
    ]},
];

const VALUES = { yes: 1, partial: 0.5, no: 0 };

function computeReport(answers) {
  let earned = 0, max = 0;
  const domainScores = [];
  const gaps = [];
  DOMAINS.forEach((d) => {
    let dE = 0, dM = 0;
    d.questions.forEach((q, i) => {
      const key = `${d.id}-${i}`;
      const v = answers[key];
      if (v === "na" || v === undefined) return;
      const pts = VALUES[v];
      dE += pts; dM += 1;
      if (pts < 1) gaps.push({ domain: d.label, question: q, severity: d.weight * (1 - pts) });
    });
    domainScores.push({ label: d.label, icon: d.icon, pct: dM ? (dE / dM) * 100 : 100, answered: dM });
    earned += dE * d.weight; max += dM * d.weight;
  });
  const score = max ? Math.round((earned / max) * 100) : 0;
  const tier = score >= 85 ? "Low Risk" : score >= 65 ? "Medium Risk" : score >= 40 ? "High Risk" : "Critical Risk";
  const tierColor = score >= 85 ? C.success : score >= 65 ? C.warn : score >= 40 ? "#D97706" : C.danger;
  const tierSoft = score >= 85 ? C.successSoft : score >= 65 ? C.warnSoft : score >= 40 ? "#FDEEDC" : C.dangerSoft;
  gaps.sort((a, b) => b.severity - a.severity);
  return { score, tier, tierColor, tierSoft, domainScores, gaps: gaps.slice(0, 6) };
}

// ---- Gauge -------------------------------------------------------------------
function ScoreGauge({ score, color }) {
  const size = 176, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.textPrimary, lineHeight: 1, fontFamily: "'Sora', sans-serif" }}>{score}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, letterSpacing: 0.4 }}>OUT OF 100</div>
      </div>
    </div>
  );
}

// ---- Answer control ------------------------------------------------------------
function SegButton({ selected, onClick, tone, children }) {
  const tones = {
    yes: { fg: C.success, bg: C.successSoft, border: C.success },
    partial: { fg: C.warn, bg: C.warnSoft, border: C.warn },
    no: { fg: C.danger, bg: C.dangerSoft, border: C.danger },
    na: { fg: C.textSecondary, bg: "#F2F4F7", border: C.borderStrong },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: `1.5px solid ${selected ? t.border : C.border}`,
        backgroundColor: selected ? t.bg : C.surface,
        color: selected ? t.fg : C.textSecondary,
        cursor: "pointer", transition: "all .12s ease", fontFamily: "'Inter', sans-serif",
      }}
    >
      {children}
    </button>
  );
}

export default function EnterpriseNDPRTool() {
  const [stage, setStage] = useState("intro");
  const [domainIndex, setDomainIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [scanning, setScanning] = useState(false);

  const domain = DOMAINS[domainIndex];
  const report = useMemo(() => computeReport(answers), [answers]);
  const domainDone = domain ? domain.questions.every((_, i) => answers[`${domain.id}-${i}`] !== undefined) : false;
  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = DOMAINS.reduce((s, d) => s + d.questions.length, 0);

  function setAnswer(key, val) { setAnswers((p) => ({ ...p, [key]: val })); }
  function goNext() {
    if (domainIndex < DOMAINS.length - 1) setDomainIndex((d) => d + 1);
    else { setScanning(true); setTimeout(() => { setScanning(false); setStage("report"); }, 1200); }
  }
  function goBack() { if (domainIndex > 0) setDomainIndex((d) => d - 1); }
  function restart() { setAnswers({}); setDomainIndex(0); setStage("intro"); }

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={18} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, fontFamily: "'Sora', sans-serif" }}>Compliance Scan</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>NDPR Readiness Assessment</div>
            </div>
          </div>
          {stage === "quiz" && (
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>
              {totalAnswered} / {totalQuestions} answered
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* INTRO */}
        {stage === "intro" && (
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: C.brandSoft, color: C.brand, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 20, marginBottom: 20 }}>
              <Sparkles size={13} /> Free · 4-minute assessment
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 700, color: C.textPrimary, lineHeight: 1.15, margin: "0 0 16px", fontFamily: "'Sora', sans-serif", letterSpacing: -0.5 }}>
              Know your data protection<br />posture before regulators do.
            </h1>
            <p style={{ fontSize: 16, color: C.textSecondary, lineHeight: 1.6, maxWidth: 560, margin: "0 0 32px" }}>
              A structured scan across six security domains, built on NIST &amp; CIS control frameworks
              and mapped directly to NDPR obligations. Get a readiness score and a prioritized action
              plan in minutes.
            </p>
            <button
              onClick={() => setStage("quiz")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: C.navy, color: "#fff", border: "none", padding: "13px 24px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Start assessment <ArrowRight size={16} />
            </button>

            <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {DOMAINS.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.id} style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                    <Icon size={18} color={C.brand} strokeWidth={2} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginTop: 10 }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{d.questions.length} checks</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUIZ */}
        {stage === "quiz" && !scanning && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32 }}>
            {/* Sidebar rail */}
            <div>
              {DOMAINS.map((d, i) => {
                const Icon = d.icon;
                const isActive = i === domainIndex;
                const isDone = d.questions.every((_, qi) => answers[`${d.id}-${qi}`] !== undefined);
                return (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 4, backgroundColor: isActive ? C.brandSoft : "transparent" }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      backgroundColor: isDone ? C.success : isActive ? C.brand : C.border,
                    }}>
                      {isDone ? <CheckCircle2 size={13} color="#fff" /> : <Icon size={12} color={isActive ? "#fff" : C.textMuted} />}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? C.navy : C.textSecondary }}>{d.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Question card */}
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <domain.icon size={16} color={C.brand} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.brand, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  Domain {domainIndex + 1} of {DOMAINS.length}
                </span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: "4px 0 28px", fontFamily: "'Sora', sans-serif" }}>{domain.label}</h2>

              <div>
                {domain.questions.map((q, i) => {
                  const key = `${domain.id}-${i}`;
                  return (
                    <div key={key} style={{ paddingBottom: 24, marginBottom: 24, borderBottom: i < domain.questions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <p style={{ fontSize: 14.5, color: C.textPrimary, marginBottom: 12, lineHeight: 1.5 }}>{q}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <SegButton tone="yes" selected={answers[key] === "yes"} onClick={() => setAnswer(key, "yes")}>Yes</SegButton>
                        <SegButton tone="partial" selected={answers[key] === "partial"} onClick={() => setAnswer(key, "partial")}>Partial</SegButton>
                        <SegButton tone="no" selected={answers[key] === "no"} onClick={() => setAnswer(key, "no")}>No</SegButton>
                        <SegButton tone="na" selected={answers[key] === "na"} onClick={() => setAnswer(key, "na")}>N/A</SegButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <button
                  onClick={goBack} disabled={domainIndex === 0}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: domainIndex === 0 ? "default" : "pointer", opacity: domainIndex === 0 ? 0.35 : 1 }}
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  onClick={goNext} disabled={!domainDone}
                  style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: domainDone ? C.navy : C.border, color: domainDone ? "#fff" : C.textMuted, border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: domainDone ? "pointer" : "default" }}
                >
                  {domainIndex === DOMAINS.length - 1 ? "Generate report" : "Continue"} <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCANNING */}
        {scanning && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 0" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.brand, animation: "spin 0.8s linear infinite", marginBottom: 20 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary }}>Generating your report…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* REPORT */}
        {stage === "report" && (
          <div>
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, display: "flex", alignItems: "center", gap: 40, marginBottom: 24, flexWrap: "wrap" }}>
              <ScoreGauge score={report.score} color={report.tierColor} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "inline-block", backgroundColor: report.tierSoft, color: report.tierColor, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 20, marginBottom: 12 }}>
                  {report.tier.toUpperCase()}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px", fontFamily: "'Sora', sans-serif" }}>
                  Your NDPR Readiness Report
                </h2>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
                  Based on {totalAnswered} answered checks across six domains. This free summary
                  highlights your top gaps — the full report includes remediation steps for every finding.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
              {report.domainScores.map((d) => {
                const Icon = d.icon;
                const color = d.pct >= 70 ? C.success : d.pct >= 40 ? C.warn : C.danger;
                return (
                  <div key={d.label} style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Icon size={15} color={C.textSecondary} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.textPrimary }}>{d.label}</span>
                    </div>
                    <div style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${d.pct}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.8s ease" }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: C.textMuted }}>{Math.round(d.pct)}% complete</span>
                  </div>
                );
              })}
            </div>

            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Priority actions</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 20 }}>Ranked by regulatory and operational risk</div>
              {report.gaps.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.success, fontSize: 14, fontWeight: 600 }}>
                  <CheckCircle2 size={17} /> No significant gaps found.
                </div>
              ) : (
                <div>
                  {report.gaps.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: g.severity >= 1 ? C.dangerSoft : C.warnSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        {g.severity >= 1 ? <XCircle size={13} color={C.danger} /> : <AlertTriangle size={13} color={C.warn} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>{g.domain}</div>
                        <div style={{ fontSize: 14, color: C.textPrimary, lineHeight: 1.5 }}>{g.question}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ backgroundColor: C.navy, borderRadius: 14, padding: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4, fontFamily: "'Sora', sans-serif" }}>Get the full report</div>
                <div style={{ fontSize: 13, color: "#B7C4DA" }}>Step-by-step remediation for every gap, ready to share with investors or partners.</div>
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#fff", color: C.navy, border: "none", padding: "12px 22px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                <Download size={15} /> Unlock full report
              </button>
            </div>

            <button
              onClick={restart}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textMuted, fontSize: 12.5, fontWeight: 600, marginTop: 24, cursor: "pointer" }}
            >
              <RotateCcw size={13} /> Start a new scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
