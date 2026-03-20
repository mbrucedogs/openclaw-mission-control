# Karpathy Autoresearch — Deep Research

## What It Is

A framework for autonomous self-improving AI agents. Based on a simple insight: **you don't need AGI to make progress — you need a goal, a metric, and a loop that never quits.**

Karpathy demonstrated it with a 630-line Python script that ran 100 ML experiments overnight, automatically improving model performance by iterating: make one change → verify mechanically → keep if better, revert if worse → repeat.

The core principle: **one metric + constrained scope + fast verification + automatic rollback + git as memory = compounding gains without catastrophic failures.**

## How It Works — Technical Breakdown

The loop (simplified):

```
LOOP FOREVER:
  1. Review current state + git history + results log
  2. Pick ONE focused change based on what worked/failed/untried
  3. Make the change + git commit (before verification)
  4. Run mechanical verification (tests, benchmarks, scores)
  5. If improved → keep. If worse → git revert. If crashed → fix or skip.
  6. Log the result
  7. Repeat
```

Key components:
- **Mechanical verification only** — no subjective judgment. Must have a number to compare.
- **Automatic rollback** — git revert on failure. Failed experiments are preserved in history.
- **Git as memory** — agent reads `git log` + `git diff` before each iteration. Experiments tagged with `experiment:` prefix.
- **One change per iteration** — atomic changes mean you always know what caused what.
- **Simplicity wins** — equal results + less code = always prefer the simpler version.

## Why It's Different from RAG / Standard Agents

| | RAG | Standard Agents | Autoresearch |
|---|---|---|---|
| Core operation | Retrieve info | Take actions | Iterate on a metric |
| Feedback loop | None | Human feedback | Automatic (metric) |
| Memory | Static documents | Human-provided | Git history + logs |
| Improvement | None | Human-driven | Self-directed |
| Risk of regression | Low | Human-controlled | Auto-rollback prevents it |

RAG retrieves knowledge. Agents take actions. **Autoresearch compounds improvements over time** — that's the difference.

## The Core Insight

**Not AGI. Compounding engineering.**

You don't need a superintelligent agent. You need:
1. A precise metric you can measure automatically
2. A constrained scope for what can change
3. A loop that runs forever and never gets tired or distracted
4. Automatic safety nets (rollback on failure)

The compounding effect: after 100 iterations, you're not just doing work — you're doing *optimized* work. Each failure is instantly reverted. Each success is permanent.

## Application to Matt's OpenClaw/MC Ecosystem

### Direct Applications

**1. MC Task Pipeline Optimization (HIGH VALUE)**
- Set a metric: task completion rate, time-to-complete, stuck task count
- Let an agent iterate on workflow configuration automatically
- Autoresearch could tune the Alice→Bob→Charlie handoff logic, success criteria, escalation thresholds
- Run it overnight — wake up to a better pipeline

**2. Tron Self-Improvement Loop (HIGH VALUE)**
- Tron's current heartbeat just monitors. Give it a metric (tasks completed per hour, false positive rate on alerts)
- Let Tron iterate on its own alert thresholds and routing logic
- Git as memory means Tron's "learning" is visible and revertable

**3. iOS Build Optimization**
- Metric: build time, test pass rate, crash count
- An autoresearch agent could iterate on Xcode settings, dependency versions, CI config
- The MLX port (autoresearch-mlx) shows this works well on Apple Silicon

**4. Code Quality Compounding**
- Set a metric: test coverage %, lint errors, type errors
- Run `/autoresearch` on the iOS project overnight
- Wake up to cleaner code than when you left

### How to Integrate with Current Stack

1. **Install the Claude/Coding Agent skill** — the uditgoenka/autoresearch skill implements this for Claude Code
2. **Define a metric for your MC pipeline** — e.g., "tasks marked Done per day / stuck task count"
3. **Set Tron as the "autoresearch agent"** for pipeline optimization
4. **Use MC's evidence/log system as the verification layer** — MC already tracks task outcomes, which is the metric input

### Practical First Steps

1. Pick ONE metric in MC that you care about (e.g., "tasks completed same-day")
2. Give Tron a nightly autoresearch loop on that metric
3. Let it run for a week and observe

## Risks and Challenges

- **Metric gaming** — if the metric isn't perfectly aligned with the real goal, the agent will optimize for the number, not the outcome
- **Scope creep** — without strict boundaries on what can change, the agent may touch things it shouldn't
- **Verification reliability** — if the mechanical test is flaky, the whole loop breaks
- **NotAGI** — this doesn't lead to general intelligence. It's mechanical optimization. Valuable, but bounded.
- **Git discipline required** — needs clean git history to work well. Matt's repos need to be well-maintained.

## Recommendation: EVALUATE_LATER

**Rationale:** The framework is genuinely powerful and directly applicable to MC's pipeline optimization. The "compounding engineering" insight is worth adopting. However, the best immediate application would require:

1. A stable metric to optimize (needs MC to be more mature)
2. An overnight-running agent with `ask:off` (now done — all agents have it)
3. A defined scope for what can change (needs guardrails)

**Best first experiment:** Run `/autoresearch` on the iOS project to optimize build time or test coverage. Concrete, bounded, immediately valuable. The MLX port (`autoresearch-mlx`) even runs natively on Mac Mini Apple Silicon.

**Revisit pipeline integration in 4-6 weeks** once current MC task flow stabilizes and there's a clear metric to optimize.
