// frontend/src/pages/Landing.tsx
//
// v4 — a real landing page this time. Shows the product instead of
// describing it.
//
// Structure:
//   Nav
//   Hero (with embedded animated app window mock on the right)
//   TechStrip (replaces marquee — cleaner static strip)
//   HowItWorks (3 cards, each with a stylized product mini-mock)
//   ScorecardShowcase (the sample evaluation, framed as product screenshot)
//   Faq
//   FinalCta
//   Footer

import { Link } from "react-router-dom";
import "./Landing.css";

const GITHUB_URL = "https://github.com/bekiTil/ai-mock-interview";

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-bg-grid" aria-hidden="true" />
      <div className="landing-bg-glow" aria-hidden="true" />

      <Nav />
      <main>
        <Hero />
        <TechStrip />
        <HowItWorks />
        <ScorecardShowcase />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Nav ---------------- */

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <LogoMark />
          <span className="nav-logo-text">mock-with-ai</span>
        </Link>
        <div className="nav-right">
          <a href={GITHUB_URL} className="nav-link" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link to="/interview" className="btn btn-primary btn-sm">
            Start interview
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> free · open source · no signup
          </span>
          <h1 className="hero-headline">
            The mock interview
            <br />
            that actually
            <br />
            <span className="hero-headline-accent">pushes back.</span>
          </h1>
          <p className="hero-sub">
            Real coding problems. A conversational AI interviewer that reads your
            code and asks real follow-ups. Honest, calibrated feedback you can
            act on — not a participation trophy.
          </p>
          <div className="hero-cta">
            <Link to="/interview" className="btn btn-primary">
              Start an interview
              <ArrowRight />
            </Link>
            <a href={GITHUB_URL} className="btn btn-ghost" target="_blank" rel="noreferrer">
              View source
            </a>
          </div>
          <p className="hero-footnote">
            ~30 min per session · Python support · bring your own LLM key to self-host
          </p>
        </div>

        <div className="hero-product">
          <ProductWindow />
        </div>
      </div>
    </section>
  );
}

/* ---------------- Product window mock (hero visual) ---------------- */

function ProductWindow() {
  return (
    <div className="pw">
      <div className="pw-chrome">
        <div className="pw-dots">
          <span className="pw-dot pw-dot-r" />
          <span className="pw-dot pw-dot-y" />
          <span className="pw-dot pw-dot-g" />
        </div>
        <div className="pw-url">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="2" y="4.5" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
            <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="0.8" />
          </svg>
          <span>mock-with-ai.is-a.dev/interview</span>
        </div>
        <div className="pw-chrome-right" aria-hidden>
          <span className="pw-live-dot" />
          <span>live</span>
        </div>
      </div>

      <div className="pw-body">
        <div className="pw-header">
          <span className="pw-header-title">Two Sum</span>
          <span className="pw-header-chip pw-chip-easy">Easy</span>
        </div>

        <div className="pw-split">
          <div className="pw-chat">
            <div className="pw-chat-msg pw-chat-interviewer">
              <div className="pw-avatar pw-avatar-int">AI</div>
              <div className="pw-bubble">
                Walk me through your approach before you write anything.
              </div>
            </div>
            <div className="pw-chat-msg pw-chat-candidate">
              <div className="pw-bubble pw-bubble-you">
                I'd use a hash map — one pass, O(n) time and space.
              </div>
              <div className="pw-avatar pw-avatar-you">Y</div>
            </div>
            <div className="pw-chat-msg pw-chat-interviewer">
              <div className="pw-avatar pw-avatar-int">AI</div>
              <div className="pw-bubble">
                Good. What about duplicates in the input?
              </div>
            </div>
            <div className="pw-typing">
              <span /><span /><span />
            </div>
          </div>

          <div className="pw-code">
            <div className="pw-code-tab">
              <span className="pw-code-filename">solution.py</span>
              <span className="pw-code-lang">Python 3</span>
            </div>
            <pre className="pw-code-body">
{`def two_sum(`}<span className="pw-c-param">{`nums`}</span>{`, `}<span className="pw-c-param">{`target`}</span>{`):
    `}<span className="pw-c-comment">{`# hash map -> index`}</span>{`
    `}<span className="pw-c-kw">{`seen`}</span>{` = {}
    `}<span className="pw-c-kw">{`for`}</span>{` i, n `}<span className="pw-c-kw">{`in`}</span>{` enumerate(nums):
        need = target - n
        `}<span className="pw-c-kw">{`if`}</span>{` need `}<span className="pw-c-kw">{`in`}</span>{` seen:
            `}<span className="pw-c-kw">{`return`}</span>{` [seen[need], i]
        seen[n] = i
    `}<span className="pw-c-kw">{`return`}</span>{` []`}
            </pre>
            <div className="pw-code-footer">
              <button className="pw-mini-btn pw-mini-run">
                <MiniPlay /> Run
              </button>
              <button className="pw-mini-btn pw-mini-submit">
                <MiniCheck /> Submit
              </button>
            </div>
          </div>
        </div>

        <div className="pw-scorecard">
          <span className="pw-sc-label">Last evaluation</span>
          <div className="pw-sc-scores">
            <PwScore label="Correctness" value={5} />
            <PwScore label="Code quality" value={4} />
            <PwScore label="Communication" value={3} />
            <PwScore label="Problem solving" value={4} />
          </div>
          <span className="pw-sc-verdict">Solid</span>
        </div>
      </div>
    </div>
  );
}

function PwScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="pw-sc-item">
      <span className="pw-sc-item-label">{label}</span>
      <div className="pw-sc-dots">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`pw-sc-dot ${n <= value ? "filled" : ""}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Tech strip (replaces marquee) ---------------- */

function TechStrip() {
  const items = [
    "Python",
    "FastAPI",
    "React + Vite",
    "Monaco Editor",
    "LLM Interviewer",
    "Sandboxed execution",
    "Structured scoring",
    "Self-hostable",
  ];
  return (
    <div className="tech-strip">
      <div className="container tech-strip-inner">
        <span className="tech-strip-label">Under the hood</span>
        <div className="tech-strip-items">
          {items.map((t) => (
            <span key={t} className="tech-chip"><Dot /> {t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- How it works (visual cards) ---------------- */

function HowItWorks() {
  return (
    <section className="section section-steps">
      <div className="container">
        <SectionHeader
          eyebrow="How it works"
          title="Three steps to an honest scorecard."
          sub="Each step is designed to feel as close to a real phone screen as we can make it — no fluff, no participation trophies."
        />
        <div className="steps-grid">
          <StepCard
            n="01"
            title="Pick a problem"
            body="Grab a random one, or filter by topic and difficulty. Starter code and examples are ready to go."
            visual={<StepVisualPick />}
          />
          <StepCard
            n="02"
            title="Interview in real time"
            body="Talk through your approach. The interviewer reads your code as you write it and asks real follow-ups."
            visual={<StepVisualChat />}
          />
          <StepCard
            n="03"
            title="Submit for a scorecard"
            body="Run hidden tests, then submit. Four axes, written summary, and a verdict that won't paper over silence."
            visual={<StepVisualScore />}
          />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  n,
  title,
  body,
  visual,
}: {
  n: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="step-card">
      <div className="step-card-visual">{visual}</div>
      <div className="step-card-body">
        <div className="step-card-meta">
          <span className="step-card-n">{n}</span>
          <span className="step-card-dots">
            <span className={`step-card-dot ${n === "01" ? "on" : ""}`} />
            <span className={`step-card-dot ${n === "02" ? "on" : ""}`} />
            <span className={`step-card-dot ${n === "03" ? "on" : ""}`} />
          </span>
        </div>
        <h3 className="step-card-title">{title}</h3>
        <p className="step-card-text">{body}</p>
      </div>
    </div>
  );
}

function StepVisualPick() {
  const rows = [
    { title: "Two Sum",         diff: "easy",   current: true },
    { title: "Valid Parens",    diff: "easy" },
    { title: "LRU Cache",       diff: "medium" },
    { title: "Word Ladder",     diff: "hard" },
  ];
  return (
    <div className="sv sv-pick">
      <div className="sv-pick-search">
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>Search problems…</span>
      </div>
      <ul className="sv-pick-list">
        {rows.map((r) => (
          <li key={r.title} className={`sv-pick-row ${r.current ? "current" : ""}`}>
            <span>{r.title}</span>
            <span className={`sv-pick-diff sv-pick-diff-${r.diff}`}>{r.diff}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepVisualChat() {
  return (
    <div className="sv sv-chat">
      <div className="sv-chat-bubble sv-chat-int">
        How would you handle the empty input case?
      </div>
      <div className="sv-chat-bubble sv-chat-you">
        Return an empty list. Let me add that guard.
      </div>
      <div className="sv-chat-bubble sv-chat-int sv-chat-typing">
        <span/><span/><span/>
      </div>
    </div>
  );
}

function StepVisualScore() {
  const axes = [
    { label: "Correctness",     value: 5 },
    { label: "Code quality",    value: 4 },
    { label: "Communication",   value: 3 },
    { label: "Problem solving", value: 4 },
  ];
  return (
    <div className="sv sv-score">
      <div className="sv-score-header">
        <span className="sv-score-eyebrow">Evaluation</span>
        <span className="sv-score-verdict">Solid</span>
      </div>
      {axes.map((a) => (
        <div key={a.label} className="sv-score-row">
          <span className="sv-score-label">{a.label}</span>
          <div className="sv-score-bar">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`sv-score-dot ${n <= a.value ? "filled" : ""}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Scorecard showcase ---------------- */

function ScorecardShowcase() {
  const axes: Array<{ label: string; value: number }> = [
    { label: "Correctness",     value: 5 },
    { label: "Code quality",    value: 4 },
    { label: "Communication",   value: 2 },
    { label: "Problem solving", value: 3 },
  ];
  return (
    <section className="section section-scorecard">
      <div className="container">
        <div className="scorecard-split">
          <div className="scorecard-copy">
            <span className="eyebrow"><span className="eyebrow-dot" />The output</span>
            <h2 className="section-title">
              You get a scorecard,
              <br />
              not a vibe.
            </h2>
            <p className="scorecard-sub">
              Four axes, a verdict, strengths, weaknesses, and a written summary
              you can act on. The evaluator reads the full transcript — silent
              submits score 1/5 on communication, period.
            </p>
            <ul className="scorecard-bullets">
              <li><CheckDot /> <span>Mechanical rubric floors — no participation-trophy scoring.</span></li>
              <li><CheckDot /> <span>Verdict is a single call: <em>strong</em>, <em>solid</em>, <em>needs work</em>, or <em>not ready</em>.</span></li>
              <li><CheckDot /> <span>Written summary you can screenshot before your next real round.</span></li>
            </ul>
            <div className="scorecard-cta">
              <Link to="/interview" className="btn btn-primary">
                Try it now
                <ArrowRight />
              </Link>
            </div>
          </div>

          <div className="scorecard-frame">
            <div className="scorecard-frame-chrome">
              <div className="pw-dots">
                <span className="pw-dot pw-dot-r" />
                <span className="pw-dot pw-dot-y" />
                <span className="pw-dot pw-dot-g" />
              </div>
              <span className="scorecard-frame-title">Evaluation · session #427</span>
            </div>
            <div className="scorecard-card eval-needs_work">
              <div className="scorecard-card-header">
                <span className="scorecard-card-eyebrow">Verdict</span>
                <span className="scorecard-card-verdict">Needs work</span>
              </div>
              <div className="scorecard-card-scores">
                {axes.map((a) => (
                  <div key={a.label} className="sc-row">
                    <span className="sc-label">{a.label}</span>
                    <div className="sc-bar">
                      {[1,2,3,4,5].map((n) => (
                        <span key={n} className={`sc-dot ${n <= a.value ? "filled" : ""}`} />
                      ))}
                    </div>
                    <span className="sc-value">{a.value}/5</span>
                  </div>
                ))}
              </div>
              <div className="scorecard-card-section">
                <div className="sc-sec-label">Strengths</div>
                <ul className="sc-list">
                  <li>Correct use of a hash map for O(n) lookup.</li>
                  <li>Clean code, idiomatic Python.</li>
                </ul>
              </div>
              <div className="scorecard-card-section">
                <div className="sc-sec-label">Areas to improve</div>
                <ul className="sc-list">
                  <li>Didn't walk through the approach before coding.</li>
                  <li>Missed the duplicate-input edge case.</li>
                </ul>
              </div>
              <p className="scorecard-summary">
                Correct and efficient, but the candidate stayed silent through
                most of the interview. A strong junior verbalizes the O(n²) vs
                O(n) trade-off before writing either.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

function Faq() {
  const items = [
    {
      q: "What languages are supported?",
      a: "Python for v1. JavaScript and TypeScript are on the roadmap.",
    },
    {
      q: "Where does my code run?",
      a: "Your code is executed in a sandboxed environment. Each run is isolated — no shared state, nothing persisted after the run completes.",
    },
    {
      q: "Is voice mode coming?",
      a: "Yes. v2 adds real-time voice so you can literally talk to the interviewer. v1 is chat-only, which matches a lot of real phone screens anyway.",
    },
    {
      q: "Does it replace real mock interviews?",
      a: "No. It's a complement — great for reps before you pay for a real coach or bug a friend at 10pm. A senior engineer who's actually hired people will notice things the AI won't.",
    },
  ];
  return (
    <section className="section section-faq">
      <div className="container container-narrow">
        <SectionHeader eyebrow="FAQ" title="Questions." align="center" />
        <div className="faq-list">
          {items.map((it) => (
            <details key={it.q} className="faq-item">
              <summary>
                <span>{it.q}</span>
                <PlusIcon />
              </summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCta() {
  return (
    <section className="section section-cta">
      <div className="container container-narrow cta-box">
        <h2 className="cta-title">Ready to see how you'd actually do?</h2>
        <p className="cta-sub">
          No signup. No credit card. Just a problem, a blinking cursor, and an
          interviewer that won't let you off the hook.
        </p>
        <Link to="/interview" className="btn btn-primary btn-lg">
          Start an interview
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <LogoMark />
          <span>mock-with-ai</span>
        </div>
        <div className="footer-meta">
          <span>Built with React + FastAPI.</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="nav-link">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Small utilities ---------------- */

function SectionHeader({
  eyebrow,
  title,
  sub,
  align = "split",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "split" | "center";
}) {
  const cls =
    align === "center" ? "section-header section-header-center" : "section-header";
  return (
    <div className={cls}>
      <div className="section-header-main">
        <span className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
}

/* ---------------- Inline icons ---------------- */

function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="2" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7.5L10 11L14 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12L10 15.5L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Dot() {
  return (
    <svg width="4" height="4" viewBox="0 0 4 4" fill="currentColor" aria-hidden>
      <circle cx="2" cy="2" r="2" />
    </svg>
  );
}
function CheckDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="scorecard-check">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 7L6.5 9L9.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="faq-plus">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function MiniPlay() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden>
      <path d="M2 1.5v5l4-2.5-4-2.5z" />
    </svg>
  );
}
function MiniCheck() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
