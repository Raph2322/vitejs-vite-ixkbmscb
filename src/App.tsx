import React, { useState, useMemo } from "react";
import {
  ShieldCheck, KeyRound, Database, Laptop, Wifi, Siren, Handshake,
  ArrowRight, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  XCircle, RotateCcw, Download, Sparkles, Scale, Lock, ArrowLeft, Copy, Check,
} from "lucide-react";

// ---- Unlock code system --------------------------------------------------
// A Scan ID is generated per session. The founder sends it to you after paying;
// you compute the matching unlock code using the same formula (see the
// standalone generator tool) and send it back. This is intentionally simple —
// good enough to gate access at low volume, not meant as strong security.
const UNLOCK_SECRET = 481523; // must match the standalone generator tool exactly
const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

function generateScanId() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return s;
}

function computeUnlockCode(scanId) {
  let sum = 0;
  for (let i = 0; i < scanId.length; i++) sum += scanId.charCodeAt(i) * (i + 7);
  sum += UNLOCK_SECRET;
  return String((sum % 900000) + 100000); // always a 6-digit code
}

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
      "A breach notification process to the NDPC is defined",
      "Backups are taken and recovery has been tested",
    ]},
  { id: "vendor", label: "Vendor & Third-Party", icon: Handshake, weight: 1,
    questions: [
      "Vendors handling customer data go through a security review",
      "Data-sharing agreements are documented with partners",
    ]},
];

// Remediation content — the actual paid-report value. Keyed by "domainId-questionIndex".
const REMEDIATION = {
  "iam-0": {
    why: "Stolen or guessed passwords are the single most common way attackers get in. MFA stops most of these attempts cold, even when a password is compromised.",
    legal: "Falls under the NDPA's general duty to implement \u201Cappropriate technical and organisational measures\u201D to secure personal data — MFA is a baseline control regulators expect to see during a compliance audit.",
    fix: "Turn on MFA (authenticator app preferred over SMS) for every staff account, starting with admin, finance, and anyone with customer-data access. Most email/identity providers (Microsoft 365, Google Workspace) support this natively at no extra cost.",
  },
  "iam-1": {
    why: "Over-permissioned accounts turn one compromised login into full system exposure instead of a contained incident.",
    legal: "Same general security-safeguards duty under the NDPA — proportionate access control is part of demonstrating \u201Caccountability,\u201D one of the Act's core principles.",
    fix: "Review who has access to what every quarter. New accounts should start with the minimum access needed, not full access by default.",
  },
  "iam-2": {
    why: "Dormant accounts from former staff are a common, quiet breach vector — nobody's watching them, but they still work.",
    legal: "Security-safeguards duty and accountability principle under the NDPA.",
    fix: "Add account deactivation to your official offboarding checklist so it happens same-day, not \u201Cwhen someone remembers.\u201D Review for stale/inactive accounts monthly.",
  },
  "data-0": {
    why: "If a device or server is lost, stolen, or breached, unencrypted data is instantly and fully exposed — encrypted data is not.",
    legal: "Encryption is explicitly named as an expected \u201Ctechnical and organisational measure\u201D under the NDPA's security obligations and reinforced by GAID.",
    fix: "Enable encryption at rest (AES-256 on databases/storage) and in transit (HTTPS/TLS on every endpoint, no exceptions). Most cloud providers (AWS, Azure, GCP) offer this as a configuration toggle, not a rebuild.",
  },
  "data-1": {
    why: "Data kept indefinitely with no purpose is pure downside — it adds breach exposure and legal liability without any business benefit.",
    legal: "Directly tied to the NDPA's storage-limitation principle: personal data must not be kept longer than necessary for the purpose it was collected for.",
    fix: "Write down how long each data type is actually needed (e.g. transaction records vs. marketing leads), then automate deletion or anonymization after that point.",
  },
  "data-2": {
    why: "Collecting personal data without proper consent is a violation on its own — independent of how well you secure it afterward.",
    legal: "Tied to the NDPA's lawful-basis requirements; GAID Article 19 specifically requires opt-in consent for cookies and tracking tools, with exceptions only for strictly necessary ones.",
    fix: "Build a clear opt-in consent flow (no pre-ticked boxes), log the timestamp and version of what was consented to, and give users an easy way to withdraw consent later.",
  },
  "endpoint-0": {
    why: "Unprotected endpoints are the easiest entry point for ransomware and malware — often the actual root cause behind headline breaches.",
    legal: "Falls under the NDPA's security-safeguards duty.",
    fix: "Deploy endpoint protection (Microsoft Defender, CrowdStrike, or similar) across every company device — including personal devices used for work, if allowed.",
  },
  "endpoint-1": {
    why: "A lost or stolen laptop with unencrypted storage is an automatic data breach the moment it goes missing.",
    legal: "Security-safeguards duty; encryption is specifically flagged by GAID as an expected control.",
    fix: "Turn on BitLocker (Windows) or FileVault (Mac) fleet-wide. Both are built in and free — this is a configuration change, not a purchase.",
  },
  "endpoint-2": {
    why: "Unpatched software is consistently the most exploited vulnerability category — attackers scan for known, unpatched holes at scale.",
    legal: "Security-safeguards duty under the NDPA.",
    fix: "Set a patching cadence (e.g. critical security patches within 7 days) and use a lightweight MDM tool once your device count grows past what you can track manually.",
  },
  "network-0": {
    why: "Unsecured remote access exposes internal systems to interception, especially over public or home Wi-Fi.",
    legal: "Security-safeguards duty under the NDPA.",
    fix: "Require a VPN or zero-trust access tool for any remote connection into internal systems or customer data.",
  },
  "network-1": {
    why: "Undocumented firewall rules accumulate silently over time and become impossible to audit or trust.",
    legal: "Security-safeguards duty, and the NDPA's accountability principle — you must be able to demonstrate your controls, not just have them.",
    fix: "Document current firewall rules, review them quarterly, and remove anything no longer in active use.",
  },
  "network-2": {
    why: "A compromised guest device shouldn't have a path to internal systems or customer data.",
    legal: "Security-safeguards duty under the NDPA.",
    fix: "Split guest and staff traffic onto separate SSIDs or VLANs — a standard feature on most modern business routers.",
  },
  "ir-0": {
    why: "Without a plan, the 72-hour regulatory clock starts before anyone in the organization knows what to actually do.",
    legal: "Implicitly required to meet the breach-notification obligation under NDPA Section 40 and GAID Article 7(p).",
    fix: "Draft a short plan naming who leads the response, who they escalate to, and how the NDPC gets notified — written down before an incident, not improvised during one.",
  },
  "ir-1": {
    why: "Missing the notification deadline is a separate compliance failure on top of the breach itself — the clock doesn't wait for you to figure out a process.",
    legal: "NDPA Section 40 and GAID Article 7(p) require notifying the NDPC within 72 hours of becoming aware of a breach likely to risk data subjects' rights. A separate Data Subject Notice is required \u201Cwithout undue delay\u201D for breaches posing a high risk to affected individuals.",
    fix: "Pre-write your NDPC notification procedure and templates now: who has authority to file it, what details are required, and how affected users get notified if the breach is high-risk.",
  },
  "ir-2": {
    why: "Backups that are never tested routinely fail exactly when they're needed most — commonly discovered mid-ransomware-recovery, too late.",
    legal: "Security-safeguards duty (resilience and availability of processing systems).",
    fix: "Schedule regular restore drills, not just backup jobs. A backup you haven't restored from is unverified.",
  },
  "vendor-0": {
    why: "Your vendors' security weaknesses become your breach — and your regulatory liability — the moment they touch your customer data.",
    legal: "NDPA Section 29(2) requires a written contract with any processor acting on your behalf, and the controller remains accountable for how that processor handles the data.",
    fix: "Require a basic security questionnaire before onboarding any vendor that will touch customer data — even a simple one is better than none.",
  },
  "vendor-1": {
    why: "Without a documented agreement, there's no clear legal basis or accountability trail for data shared with a partner.",
    legal: "NDPA Section 29(2) — a written contract (Data Processing Agreement) is a legal requirement between a controller and any processor, not just best practice.",
    fix: "Put a Data Processing Agreement in place with every partner or vendor that touches customer data before sharing anything with them.",
  },
};

const VALUES = { yes: 1, partial: 0.5, no: 0 };

function computeReport(answers) {
  let earned = 0, max = 0;
  const domainScores = [];
  const gaps = [];
  const allItems = [];
  DOMAINS.forEach((d) => {
    let dE = 0, dM = 0;
    d.questions.forEach((q, i) => {
      const key = `${d.id}-${i}`;
      const v = answers[key];
      allItems.push({ key, domain: d.label, question: q, answer: v });
      if (v === "na" || v === undefined) return;
      const pts = VALUES[v];
      dE += pts; dM += 1;
      if (pts < 1) gaps.push({ key, domain: d.label, question: q, severity: d.weight * (1 - pts) });
    });
    domainScores.push({ label: d.label, icon: d.icon, pct: dM ? (dE / dM) * 100 : 100, answered: dM });
    earned += dE * d.weight; max += dM * d.weight;
  });
  const score = max ? Math.round((earned / max) * 100) : 0;
  const tier = score >= 85 ? "Low Risk" : score >= 65 ? "Medium Risk" : score >= 40 ? "High Risk" : "Critical Risk";
  const tierColor = score >= 85 ? C.success : score >= 65 ? C.warn : score >= 40 ? "#D97706" : C.danger;
  const tierSoft = score >= 85 ? C.successSoft : score >= 65 ? C.warnSoft : score >= 40 ? "#FDEEDC" : C.dangerSoft;
  gaps.sort((a, b) => b.severity - a.severity);
  return { score, tier, tierColor, tierSoft, domainScores, gaps: gaps.slice(0, 6), allGaps: gaps, allItems };
}

// ---- Gauge -------------------------------------------------------------------
function ScoreGauge({ score, color, size = 176 }) {
  const stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
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
        <div style={{ fontSize: size * 0.25, fontWeight: 700, color: C.textPrimary, lineHeight: 1, fontFamily: "'Sora', sans-serif" }}>{score}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, letterSpacing: 0.4 }}>OUT OF 100</div>
      </div>
    </div>
  );
}

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

function StatusPill({ answer }) {
  const map = {
    yes: { label: "PASS", color: C.success, bg: C.successSoft },
    partial: { label: "PARTIAL", color: C.warn, bg: C.warnSoft },
    no: { label: "FAIL", color: C.danger, bg: C.dangerSoft },
    na: { label: "N/A", color: C.textSecondary, bg: "#F2F4F7" },
  };
  const m = map[answer] || map.na;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: m.color, backgroundColor: m.bg, padding: "3px 9px", borderRadius: 20, letterSpacing: 0.3, flexShrink: 0 }}>
      {m.label}
    </span>
  );
}

export default function EnterpriseNDPRTool() {
  const [stage, setStage] = useState("intro"); // intro | quiz | scanning | report | locked | fullReport
  const [domainIndex, setDomainIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanId] = useState(generateScanId);
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  function checkUnlockCode() {
    if (codeInput.trim() === computeUnlockCode(scanId)) {
      setUnlocked(true);
      setCodeError(false);
      setStage("fullReport");
    } else {
      setCodeError(true);
    }
  }

  function copyScanId() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(scanId).then(() => {
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 1800);
      });
    }
  }

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
              <div style={{ fontSize: 11, color: C.textMuted }}>NDPA Readiness Assessment</div>
            </div>
          </div>
          {stage === "quiz" && (
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>
              {totalAnswered} / {totalQuestions} answered
            </div>
          )}
          {(stage === "fullReport" || stage === "locked") && (
            <button
              onClick={() => setStage("report")}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <ArrowLeft size={15} /> Back to summary
            </button>
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
              and mapped directly to NDPA obligations. Get a readiness score and a prioritized action
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

        {/* FREE REPORT */}
        {stage === "report" && (
          <div>
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, display: "flex", alignItems: "center", gap: 40, marginBottom: 24, flexWrap: "wrap" }}>
              <ScoreGauge score={report.score} color={report.tierColor} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "inline-block", backgroundColor: report.tierSoft, color: report.tierColor, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 20, marginBottom: 12 }}>
                  {report.tier.toUpperCase()}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px", fontFamily: "'Sora', sans-serif" }}>
                  Your NDPA Readiness Report
                </h2>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
                  Based on {totalAnswered} answered checks across six domains. This free summary
                  highlights your top gaps — the full report includes remediation steps and legal
                  citations for every finding.
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
                <div style={{ fontSize: 13, color: "#B7C4DA" }}>Step-by-step remediation and NDPA/GAID legal citations for every gap.</div>
              </div>
              <button
                onClick={() => setStage(unlocked ? "fullReport" : "locked")}
                style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#fff", color: C.navy, border: "none", padding: "12px 22px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
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

        {/* LOCKED — unlock code gate */}
        {stage === "locked" && (
          <div style={{ maxWidth: 480, margin: "40px auto 0" }}>
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 36, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <Lock size={24} color={C.brand} />
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px", fontFamily: "'Sora', sans-serif" }}>
                Unlock Your Full Report
              </h2>
              <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6, margin: "0 0 24px" }}>
                Send your Scan ID below to receive payment instructions and your unlock code.
              </p>

              <div style={{ backgroundColor: C.bg, border: `1px dashed ${C.borderStrong}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>Your Scan ID</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, letterSpacing: 2, fontFamily: "'Sora', sans-serif" }}>{scanId}</div>
                </div>
                <button
                  onClick={copyScanId}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.borderStrong}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}
                >
                  {idCopied ? <Check size={13} color={C.success} /> : <Copy size={13} />}
                  {idCopied ? "Copied" : "Copy"}
                </button>
              </div>

              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: "0 0 20px" }}>
                Message this Scan ID to <strong style={{ color: C.textPrimary }}>[090 3359 6366]</strong> to
                complete payment — you'll receive a 6-digit unlock code in reply.
              </p>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 4 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, textAlign: "left" }}>
                  Enter Unlock Code
                </label>
                <input
                  value={codeInput}
                  onChange={(e) => { setCodeInput(e.target.value); setCodeError(false); }}
                  placeholder="6-digit code"
                  maxLength={6}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 9, fontSize: 18,
                    letterSpacing: 4, textAlign: "center", fontFamily: "'Sora', sans-serif", fontWeight: 700,
                    border: `1.5px solid ${codeError ? C.danger : C.borderStrong}`, color: C.textPrimary, marginBottom: 8,
                    outline: "none",
                  }}
                />
                {codeError && (
                  <div style={{ fontSize: 12.5, color: C.danger, marginBottom: 12, textAlign: "left" }}>
                    That code doesn't match this Scan ID. Double-check and try again.
                  </div>
                )}
                <button
                  onClick={checkUnlockCode}
                  disabled={codeInput.trim().length !== 6}
                  style={{
                    width: "100%", marginTop: 4, backgroundColor: codeInput.trim().length === 6 ? C.navy : C.border,
                    color: codeInput.trim().length === 6 ? "#fff" : C.textMuted, border: "none", padding: "13px", borderRadius: 9,
                    fontSize: 14, fontWeight: 700, cursor: codeInput.trim().length === 6 ? "pointer" : "default",
                  }}
                >
                  Unlock Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULL REPORT */}
        {stage === "fullReport" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: C.successSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={15} color={C.success} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.success, letterSpacing: 0.4, textTransform: "uppercase" }}>Full Report Unlocked</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: C.textPrimary, margin: "8px 0 8px", fontFamily: "'Sora', sans-serif" }}>
              NDPA Compliance Remediation Report
            </h1>
            <p style={{ fontSize: 14.5, color: C.textSecondary, lineHeight: 1.6, maxWidth: 700, margin: "0 0 28px" }}>
              Every check from your scan, with why it matters, the relevant NDPA/GAID basis, and exactly
              what to do about it. Share this with your team, your investors, or your legal counsel.
            </p>

            <div style={{ display: "flex", gap: 40, marginBottom: 32, backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, flexWrap: "wrap", alignItems: "center" }}>
              <ScoreGauge score={report.score} color={report.tierColor} size={120} />
              <div>
                <div style={{ display: "inline-block", backgroundColor: report.tierSoft, color: report.tierColor, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 20, marginBottom: 10 }}>
                  {report.tier.toUpperCase()}
                </div>
                <div style={{ fontSize: 13.5, color: C.textSecondary }}>
                  {report.allGaps.length} of {totalAnswered} answered checks need attention.
                </div>
              </div>
            </div>

            {DOMAINS.map((d) => {
              const items = report.allItems.filter((it) => it.domain === d.label && it.answer !== undefined);
              if (items.length === 0) return null;
              const Icon = d.icon;
              return (
                <div key={d.id} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Icon size={17} color={C.navy} />
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: 0, fontFamily: "'Sora', sans-serif" }}>{d.label}</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {items.map((it) => {
                      const rem = REMEDIATION[it.key];
                      const isPass = it.answer === "yes";
                      const isNa = it.answer === "na";
                      return (
                        <div key={it.key} style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: (isPass || isNa) ? 0 : 14 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 600, color: C.textPrimary, lineHeight: 1.4 }}>{it.question}</div>
                            <StatusPill answer={it.answer} />
                          </div>
                          {!isPass && !isNa && rem && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                              <div>
                                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>Why it matters</div>
                                <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.55 }}>{rem.why}</div>
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                                  <Scale size={11} color={C.brand} />
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.4 }}>Legal basis</span>
                                </div>
                                <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.55 }}>{rem.legal}</div>
                              </div>
                              <div style={{ backgroundColor: C.brandSoft, borderRadius: 8, padding: "10px 14px" }}>
                                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>How to fix it</div>
                                <div style={{ fontSize: 13.5, color: C.navy, lineHeight: 1.55 }}>{rem.fix}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ backgroundColor: "#F2F4F7", border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px", marginTop: 8, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Legal disclaimer</div>
              <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>
                This report is for informational purposes and does not constitute legal advice. It does
                not replace formal certification by a licensed Data Protection Compliance Organisation
                (DPCO) or consultation with a qualified attorney. For official NDPC registration, DPO
                appointment, or Compliance Audit Return filing, consult a licensed DPCO.
              </div>
            </div>

            <button
              onClick={restart}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textMuted, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              <RotateCcw size={13} /> Start a new scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
