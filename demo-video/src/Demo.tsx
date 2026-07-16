import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: sans } = loadFont();
const { fontFamily: mono } = loadMono();

const BG = "#ffffff";
const FG = "#0a0a0a";
const MUTED = "#6b6b6b";
const LINE = "#e8e8e8";

const springIn = (frame: number, fps: number, delay = 0) =>
  spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

function FadeUp({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = springIn(frame, fps, delay);
  const y = interpolate(t, [0, 1], [28, 0]);
  const opacity = interpolate(t, [0, 1], [0, 1]);
  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, ...style }}>
      {children}
    </div>
  );
}

/** 0–90: Logo + title */
function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = springIn(frame, fps, 5);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        color: FG,
        fontFamily: sans,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          opacity: mark,
          transform: `scale(${interpolate(mark, [0, 1], [0.92, 1])})`,
          textAlign: "center",
        }}
      >
        <pre
          style={{
            fontFamily: mono,
            fontSize: 28,
            lineHeight: 1.25,
            letterSpacing: "0.04em",
            margin: 0,
            color: FG,
          }}
        >{`+----+
| DG |
+----+`}</pre>
        <h1
          style={{
            marginTop: 48,
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: 0,
          }}
        >
          DripGuard
        </h1>
        <p
          style={{
            marginTop: 20,
            fontSize: 28,
            color: MUTED,
            fontWeight: 400,
            maxWidth: 720,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Rate-limited spend for autonomous agents
        </p>
        <p
          style={{
            marginTop: 16,
            fontFamily: mono,
            fontSize: 16,
            color: MUTED,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Stellar · Soroban · Testnet
        </p>
      </div>
    </AbsoluteFill>
  );
}

/** 90–240: Problem */
function SceneProblem() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        color: FG,
        fontFamily: sans,
        justifyContent: "center",
        padding: "0 120px",
      }}
    >
      <FadeUp>
        <p
          style={{
            fontFamily: mono,
            fontSize: 18,
            color: MUTED,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          The problem
        </p>
      </FadeUp>
      <FadeUp delay={8}>
        <h2
          style={{
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            maxWidth: 1000,
            margin: 0,
          }}
        >
          Agents can pay.
          <br />
          Nothing rate-limits the burn.
        </h2>
      </FadeUp>
      <FadeUp delay={18}>
        <p
          style={{
            marginTop: 32,
            fontSize: 26,
            color: MUTED,
            maxWidth: 720,
            lineHeight: 1.45,
          }}
        >
          One bad loop, leaked key, or prompt injection — full budget gone in
          seconds.
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}

const STEPS = [
  {
    code: "01",
    title: "Fund",
    body: "Deposit XLM into a vault. Policy holds custody — not a hot wallet.",
  },
  {
    code: "02",
    title: "Drip",
    body: "Budget unlocks on a schedule. Agents only spend what vested.",
  },
  {
    code: "03",
    title: "Stop",
    body: "Pause, revoke, or velocity auto-freeze spend spikes.",
  },
];

/** 240–570: Fund. Drip. Stop. */
function SceneSteps() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        color: FG,
        fontFamily: sans,
        padding: "80px 100px",
      }}
    >
      <FadeUp>
        <p
          style={{
            fontFamily: mono,
            fontSize: 16,
            color: MUTED,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          How it works
        </p>
      </FadeUp>
      <FadeUp delay={6}>
        <h2
          style={{
            fontSize: 52,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            margin: "0 0 56px 0",
          }}
        >
          Fund. Drip. Stop.
        </h2>
      </FadeUp>

      <div style={{ display: "flex", gap: 28 }}>
        {STEPS.map((step, i) => {
          const t = springIn(frame, fps, 18 + i * 14);
          const y = interpolate(t, [0, 1], [40, 0]);
          return (
            <div
              key={step.code}
              style={{
                flex: 1,
                border: `1px solid ${LINE}`,
                borderRadius: 20,
                padding: "36px 32px",
                backgroundColor: BG,
                opacity: t,
                transform: `translateY(${y}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 16,
                  color: MUTED,
                  marginBottom: 20,
                }}
              >
                {step.code}
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  marginBottom: 16,
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: MUTED,
                  lineHeight: 1.45,
                }}
              >
                {step.body}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

const RAILS = [
  { code: "VEST", title: "Linear drip" },
  { code: "CAP", title: "Per-call max" },
  { code: "ALLOW", title: "Payee allowlist" },
  { code: "VEL", title: "Velocity breaker" },
];

/** 570–750: Guardrails */
function SceneRails() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        color: FG,
        fontFamily: sans,
        padding: "80px 100px",
        justifyContent: "center",
      }}
    >
      <FadeUp>
        <h2
          style={{
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            margin: "0 0 48px 0",
          }}
        >
          Policy on-chain, not hope.
        </h2>
      </FadeUp>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {RAILS.map((r, i) => {
          const t = springIn(frame, fps, 10 + i * 10);
          return (
            <div
              key={r.code}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 48,
                padding: "22px 0",
                borderTop: `1px solid ${LINE}`,
                borderBottom: i === RAILS.length - 1 ? `1px solid ${LINE}` : undefined,
                opacity: t,
                transform: `translateX(${interpolate(t, [0, 1], [24, 0])}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 18,
                  width: 100,
                  color: FG,
                }}
              >
                {r.code}
              </span>
              <span style={{ fontSize: 28, fontWeight: 500 }}>{r.title}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** 750–900: CTA */
function SceneCta() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = springIn(frame, fps, 8);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: FG,
        color: BG,
        fontFamily: sans,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          opacity: t,
          transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)`,
        }}
      >
        <pre
          style={{
            fontFamily: mono,
            fontSize: 22,
            lineHeight: 1.25,
            margin: "0 0 40px 0",
            opacity: 0.85,
          }}
        >{`+----+
| DG |
+----+`}</pre>
        <h2
          style={{
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            margin: "0 0 20px 0",
          }}
        >
          Open the treasury console.
        </h2>
        <p style={{ fontSize: 24, opacity: 0.65, marginBottom: 40 }}>
          Freighter · Stellar testnet · Not audited — demo only
        </p>
        <div
          style={{
            display: "inline-block",
            backgroundColor: BG,
            color: FG,
            fontSize: 22,
            fontWeight: 600,
            padding: "18px 40px",
            borderRadius: 999,
          }}
        >
          npm run dev → localhost:3000
        </div>
        <p
          style={{
            marginTop: 36,
            fontFamily: mono,
            fontSize: 14,
            opacity: 0.45,
            letterSpacing: "0.04em",
          }}
        >
          CBUGXL76…Z3ML · testnet
        </p>
      </div>
    </AbsoluteFill>
  );
}

export const Demo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Sequence from={0} durationInFrames={90} premountFor={15}>
        <SceneHook />
      </Sequence>
      <Sequence from={90} durationInFrames={150} premountFor={15}>
        <SceneProblem />
      </Sequence>
      <Sequence from={240} durationInFrames={330} premountFor={15}>
        <SceneSteps />
      </Sequence>
      <Sequence from={570} durationInFrames={180} premountFor={15}>
        <SceneRails />
      </Sequence>
      <Sequence from={750} durationInFrames={150} premountFor={15}>
        <SceneCta />
      </Sequence>
    </AbsoluteFill>
  );
};
