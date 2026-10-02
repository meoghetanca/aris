#!/usr/bin/env node
/**
 * Builds a clean, synthetic aris project that passes every gate.
 *
 *   node test/fixture.mjs <dir>     write a fixture there
 *
 * WHY THIS IS GENERATED AND NOT CHECKED IN AS JSON. Half the gates compare a stored
 * date against today: a source accessed more than 180 days ago is stale, a claim
 * verified more than 90 days ago is stale, a launch date in the past is wrong. A
 * fixture with dates baked into it passes on the day it was written and fails every
 * day after, which teaches a maintainer that the suite is unreliable rather than that
 * the code is. Dates here are relative to the run.
 *
 * WHY IT IS SYNTHETIC. The product, the quotes and the sources are invented. A real
 * run's .aris carries someone's market research and belongs to whoever ran it, which
 * is why the first version of this suite was never distributable and so never ran
 * twice. Nothing in here is anybody's property.
 *
 * It deliberately includes one asset in a subdirectory, because a flat readdir in four
 * different scripts is what let an asset publish unexamined.
 */
import fs from "node:fs";
import path from "node:path";

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();
const day = (offsetDays) => iso(offsetDays).slice(0, 10);

const PRODUCT = "Ledgerline";
const LAUNCH = day(30);        // one future date, the same one everywhere
const READ = iso(-10);         // when sources were read
const CHECKED = iso(-5);       // when claims were verified at source
const UTM = "?utm_source=launch&utm_medium=email&utm_campaign=ledgerline-launch";

/* ------------------------------------------------------------------ sources */
const sources = [
  { id: "SRC-001", url: "https://reviews.example.net/clearbooks/1", title: "Clearbooks review, two stars", publisher: "ReviewSite", sourceType: "review", accessedAt: READ, reliability: "high" },
  { id: "SRC-002", url: "https://reviews.example.net/clearbooks/2", title: "Clearbooks review, one star", publisher: "ReviewSite", sourceType: "review", accessedAt: READ, reliability: "high" },
  { id: "SRC-003", url: "https://forum.example.net/t/month-end-close", title: "Month-end close thread", publisher: "Forum", sourceType: "community", accessedAt: READ, reliability: "medium" },
  { id: "SRC-004", url: "https://forum.example.net/t/reconciliation-pain", title: "Reconciliation thread", publisher: "Forum", sourceType: "community", accessedAt: READ, reliability: "medium" },
  { id: "SRC-005", url: "https://clearbooks.example.net/pricing", title: "Clearbooks pricing", publisher: "Clearbooks", sourceType: "vendor", accessedAt: READ, reliability: "high" },
  { id: "SRC-006", url: "https://tallyup.example.net/pricing", title: "TallyUp pricing", publisher: "TallyUp", sourceType: "vendor", accessedAt: READ, reliability: "high" },
  { id: "SRC-007", url: "https://stats.example.net/smb-count", title: "Registered small businesses", publisher: "StatsOffice", sourceType: "statistics", accessedAt: READ, reliability: "high" },
  { id: "SRC-008", url: "https://stats.example.net/finance-staff", title: "Finance headcount by company size", publisher: "StatsOffice", sourceType: "statistics", accessedAt: READ, reliability: "high" },
  { id: "SRC-009", url: "https://ads.example.net/library/clearbooks", title: "Clearbooks ad library entry", publisher: "AdLibrary", sourceType: "ads", accessedAt: READ, reliability: "medium" },
];

/* -------------------------------------------------------------------- pains */
// PAIN-001 is validated: 8 quotes across 4 sources. PAIN-002 is honestly short.
const q = (n, src, text) => ({ id: `Q-${String(n).padStart(3, "0")}`, sourceId: src, text, url: sources.find((s) => s.id === src).url + `#c${n}`, date: day(-40 + n) });
const p1quotes = [
  q(1, "SRC-001", "Closing the month takes me four evenings and I still find errors the next week."),
  q(2, "SRC-001", "Every reconciliation is a manual export into a spreadsheet nobody else can read."),
  q(3, "SRC-002", "I rebuild the same pivot every single month because the report cannot be saved."),
  q(4, "SRC-002", "Support told me to export to CSV and do it by hand. That is the whole answer."),
  q(5, "SRC-003", "Our close slipped again and the board pack went out with last quarter numbers."),
  q(6, "SRC-003", "Two of us spend the first week of every month copying figures between systems."),
  q(7, "SRC-004", "Nobody can tell me which of the two totals is the real one, so I check both."),
  q(8, "SRC-004", "I would pay for something that just told me what changed since last month."),
];
const p2quotes = [
  q(11, "SRC-003", "Onboarding a new bookkeeper takes a fortnight because nothing is written down."),
  q(12, "SRC-004", "The handover doc is a screenshot folder, which is as bad as it sounds."),
];
const pains = [
  {
    id: "PAIN-001",
    statement: "The monthly close is rebuilt by hand every month, and nobody trusts the result",
    status: "validated",
    frequency: { quoteCount: p1quotes.length, sourceCount: new Set(p1quotes.map((x) => x.sourceId)).size },
    quotes: p1quotes,
  },
  {
    id: "PAIN-002",
    statement: "Handing the books to someone else loses the method with the person",
    status: "insufficient",
    frequency: { quoteCount: p2quotes.length, sourceCount: new Set(p2quotes.map((x) => x.sourceId)).size },
    quotes: p2quotes,
  },
];

/* ----------------------------------------------------------------- personas */
const personas = [
  {
    id: "PERSONA-001",
    name: "The one who owns the close",
    jobToBeDone: "Get a month-end pack out that nobody has to re-check",
    pains: ["PAIN-001"],
    attributes: [
      { attribute: "Rebuilds the same report every month", evidence: ["Q-003", "Q-006"] },
      { attribute: "Does not trust two totals that disagree", evidence: ["Q-007"] },
      { attribute: "Will pay for a change summary", evidence: ["Q-008"] },
    ],
  },
];

/* ------------------------------------------------------------------- sizing */
// 420000 businesses * 0.18 reachable * 1.4 seats = 105840, and the range holds it.
const sizing = {
  factors: [
    { id: "F-001", name: "registered small businesses in market", value: 420000, sourceId: "SRC-007" },
    { id: "F-002", name: "share with a finance employee", value: 0.18, sourceId: "SRC-008" },
    { id: "F-003", name: "seats per customer", value: 1.4, sourceId: "SRC-008" },
  ],
  calculations: {
    tam: { formula: "F-001 * F-003", range: [560000, 620000] },
    sam: { formula: "F-001 * F-002 * F-003", range: [100000, 112000] },
    som: { formula: "F-001 * F-002 * F-003 * 0.02", range: [1900, 2300] },
  },
  limitations: [
    "The seats-per-customer factor is read off one statistics release and is the weakest number here.",
    "Nothing in this estimate establishes that anyone will switch.",
  ],
};

/* ------------------------------------------------------------------- demand */
const demand = {
  status: "inferred_not_tested",
  doesNotProve: ["product-market fit", "willingness to pay", "conversion rate"],
  signals: [
    { id: "SIG-001", type: "ad_persistence", metric: "months the same ad has run", value: 14, sourceId: "SRC-009" },
    { id: "SIG-002", type: "review_growth", metric: "new reviews per month", value: 22, sourceId: "SRC-001" },
  ],
};

/* --------------------------------------------------------------- positioning */
const positioning = {
  selected: "DIR-002",
  directions: [
    { id: "DIR-001", name: "The fastest close", statement: "FOR finance leads WHO dread month-end, Ledgerline IS THE close tool THAT finishes in a day, UNLIKE Clearbooks, BECAUSE it keeps the method with the file.", painIds: ["PAIN-001"], targetPersonaIds: ["PERSONA-001"], whitespace: ["Speed is the one axis every competitor already claims."] },
    { id: "DIR-002", name: "The close you can hand over", statement: "FOR finance leads WHO own the month-end pack, Ledgerline IS THE reconciliation tool THAT shows what changed since last month, UNLIKE Clearbooks, BECAUSE the method lives in the file rather than in one person.", painIds: ["PAIN-001", "PAIN-002"], targetPersonaIds: ["PERSONA-001"], whitespace: ["No competitor sells the handover, and two of the four pains are about it.", "It is the only claim in this set that the quotes support directly."] },
    { id: "DIR-003", name: "The cheapest ledger", statement: "FOR small firms WHO watch every cost, Ledgerline IS THE ledger THAT costs less, UNLIKE TallyUp, BECAUSE it does less.", painIds: ["PAIN-001"], targetPersonaIds: ["PERSONA-001"], whitespace: ["Price is a race the incumbent wins."] },
  ],
  rejected: [
    { id: "DIR-001", reason: "Every competitor already claims speed, and no quote asked for it." },
    { id: "DIR-003", reason: "Competing on price against a funded incumbent is a plan to lose slowly." },
  ],
};

/* ------------------------------------------------------------------ messages */
const messages = {
  usp: "Ledgerline shows what changed since last month, so the close is a review rather than a rebuild.",
  personaMessages: [
    {
      personaId: "PERSONA-001",
      painIds: ["PAIN-001", "PAIN-002"],
      messageHierarchy: [
        { id: "MSG-001", priority: 1, message: "See what changed since last month", benefit: "The close becomes a review instead of a rebuild", proof: "The change summary is the product", cta: "Start a close", evidence: ["PAIN-001", "Q-008"] },
        { id: "MSG-002", priority: 2, message: "The method stays with the file", benefit: "A handover does not lose how the work was done", proof: "Steps are stored next to the figures", cta: "Start a close", evidence: ["PAIN-002", "Q-011"] },
      ],
    },
  ],
  unattachedMessages: [],
  elevatorPitch: { short: "Ledgerline shows what changed since last month.", long: "Ledgerline is a reconciliation tool for the people who own the month-end pack. It keeps the method next to the figures, so the close is a review and a handover does not lose the work." },
  featureToBenefit: [
    { feature: "Change summary", benefit: "You read what moved instead of rebuilding the report" },
    { feature: "Stored method", benefit: "The next person can run the close you ran" },
  ],
  tone: { avoid: ["effortless", "seamless", "revolutionary"] },
};

/* ---------------------------------------------------------------------- gtm */
const gtm = {
  channels: [
    { channel: "Review sites", priority: "primary", role: "Where the complaints that produced this positioning were written", competitorPresence: ["Clearbooks and TallyUp both answer reviews there"] },
    { channel: "Accounting communities", priority: "primary", role: "Where handover is discussed without a vendor present", competitorPresence: ["Neither competitor posts there"] },
    { channel: "Paid search", priority: "test", role: "One test against the change-summary message", competitorPresence: ["Clearbooks has run the same ad for over a year"], note: "Budgeted as a test, not a channel." },
  ],
  pricing: { recommended: { amount: 29, currency: "USD", unit: "per seat, per month" }, basis: ["Clearbooks publishes 35 and TallyUp publishes 24, so this sits between them.", "No price has been tested with a buyer."] },
  budgetAllocation: { content: 50, community: 30, paid: 20 },
};

/* ------------------------------------------------------------------- assets */
// Every asset names the product once, spelled one way. Every factual sentence with a
// number carries a claim id. One asset lives in a subdirectory on purpose.
const assets = {
  "launch-post.md": `# Ledgerline is open

Ledgerline shows what changed since last month, so the close is a review rather than a rebuild.

The people who told us this were not asked. They wrote it on review sites and in forums while
complaining about something else, and two of the four complaints we could evidence were about
handing the books to someone else rather than about speed [CLAIM-001].

Ledgerline costs $29/mo per seat. There is a free tier, and what it limits is written on the
pricing page [CLAIM-002].

Where your data is stored, and the sub-processor list, are both on the security page. The
licence is on the same page. Our privacy policy covers what we keep and for how long.

Ledgerline opens on ${LAUNCH}.

**Start a close**

[Read the security page](https://ledgerline.example.net/security${UTM})
`,
  "email-1.md": `# Ledgerline: the close you can hand over

You own the month-end pack. Ledgerline shows what changed since last month, so the close is a
review rather than a rebuild.

We did not run a survey. We read what people wrote while they were annoyed, and the method
going missing with the person came up as often as the close itself [CLAIM-001].

Ledgerline costs $29/mo per seat, and the free tier limits are published rather than
discovered. You can cancel in the product, and the terms say so.

Where the data is stored and which sub-processor touches it are both published. The licence
is published next to them. The privacy policy is linked from every page.

Ledgerline opens on ${LAUNCH}.

**Start a close**

[Start a close](https://ledgerline.example.net/start${UTM})
`,
  "security-and-licensing.md": `# Ledgerline: what we store, and under what licence

This page exists because the three questions a buyer asks first are where the data is stored,
who else touches it, and what the free tier limits.

Ledgerline stores your ledger in one region and names it on signup. The sub-processor list is
published and versioned. The licence is published beside it.

We make no certification claim on this page. When there is an audit, the report will exist and
the auditor will be nameable.

Benchmarks: we publish none yet. When we do, the methodology will be published with the number,
because a benchmark without a reproducible method is a number nobody can check.

Our privacy policy states what is kept and for how long, and cancellation terms are in the
product.

Ledgerline opens on ${LAUNCH}.

**Read the security page**

[Read the security page](https://ledgerline.example.net/security${UTM})
`,
  "social/post-1.md": `# Ledgerline, on the handover

Ledgerline shows what changed since last month.

Two of the four complaints we could evidence were about handing the books to someone else,
not about speed [CLAIM-001].

Ledgerline costs $29/mo per seat. Privacy policy and cancellation terms are linked from the
site, the licence is published, the sub-processor list is published, and where data is stored
is published.

Ledgerline opens on ${LAUNCH}.

**Start a close**

[Start a close](https://ledgerline.example.net/start${UTM})
`,
};

/* ------------------------------------------------------------------- claims */
const claims = [
  {
    id: "CLAIM-001",
    text: "Two of the four evidenced complaints were about handover rather than speed",
    status: "verified",
    sourceIds: ["SRC-003", "SRC-004"],
    messageId: "MSG-002",
    usedIn: ["launch-post.md", "email-1.md", "social/post-1.md"],
    verification: { verdict: "supports", checkedAt: CHECKED, where: "both threads", note: "Counted from the coded quotes." },
  },
  {
    id: "CLAIM-002",
    text: "The free tier limits are published on the pricing page",
    status: "verified",
    sourceIds: ["SRC-005"],
    messageId: "MSG-001",
    usedIn: ["launch-post.md"],
    verification: { verdict: "supports", checkedAt: CHECKED, where: "pricing page", note: "Read at source." },
  },
];

/* ------------------------------------------------------------- harness, etc */
const metrics = {
  metrics: [
    { id: "MET-001", name: "Closes started", baseline: null, target: 40, source: "product analytics" },
    { id: "MET-002", name: "Handover documents created", baseline: null, target: 15, source: "product analytics" },
  ],
};
const dashboard = { panels: [{ id: "PAN-001", metricIds: ["MET-001", "MET-002"], title: "Activation" }], state: "empty until an export lands in evidence/analytics" };
const playbook = {
  rules: [
    { id: "RULE-001", when: "cost per signup is above 40 for 14 consecutive days", then: "stop paid search and move the budget to community", metricIds: ["MET-001"] },
    { id: "RULE-002", when: "fewer than 10 handover documents are created in the first month", then: "the handover positioning is not landing; re-read the review quotes before rewriting copy", metricIds: ["MET-002"] },
  ],
};
const runway = {
  weeks: [
    { week: 1, focus: "Answer every review that mentions the close", decision: "none" },
    { week: 4, focus: "First handover case study, if one exists", decision: "keep or drop the handover message" },
    { week: 12, focus: "Read the two growth rules against real numbers", decision: "continue, change channel, or stop" },
  ],
};
const assumptions = {
  assumptions: [
    { id: "ASSUM-001", statement: "Buyers who complain about handover will pay to fix it", reason: "One quote offers to pay; the rest complain without pricing it", confidence: 0.45, blastRadius: "total" },
    { id: "ASSUM-002", statement: "Seats per customer is 1.4", reason: "Read off one statistics release", confidence: 0.6, blastRadius: "medium" },
  ],
};
const cutSteps = {
  cuts: [
    { deleted: "customer interviews", reason: "No access to buyers inside the window", consequence: "Every pain rests on text written for another purpose", risk: "high" },
    { deleted: "price testing", reason: "Nothing to sell yet", consequence: "The recommended price is a position between two competitors, not a tested number", risk: "medium" },
  ],
};
const category = {
  players: [
    { name: "Clearbooks", type: "incumbent", pricing: [{ amount: 35, currency: "USD", unit: "per seat, per month", sourceId: "SRC-005" }], positioning: ["The complete ledger"], weaknesses: ["Reports cannot be saved", "Support answers with CSV export"] },
    { name: "TallyUp", type: "challenger", pricing: [{ amount: 24, currency: "USD", unit: "per seat, per month", sourceId: "SRC-006" }], positioning: ["Cheaper than the incumbent"], weaknesses: ["No handover story"] },
  ],
  priceLadder: [
    { player: "Clearbooks", amount: 35, currency: "USD", unit: "per user, per month", sourceId: "SRC-005" },
    { player: "TallyUp", amount: 24, currency: "USD", unit: "per user, per month", sourceId: "SRC-006" },
  ],
  featureMatrix: {
    "Saved reports": { Clearbooks: { value: false }, TallyUp: { value: true }, Ledgerline: { value: true } },
    "Stored method": { Clearbooks: { value: false }, TallyUp: { value: false }, Ledgerline: { value: true } },
  },
  marketGaps: [{ value: "Nobody sells the handover", sourceIds: ["SRC-003", "SRC-004"] }],
};
const state = {
  product: { name: PRODUCT, oneLiner: "Reconciliation that shows what changed since last month" },
  market: { sector: "b2b-saas", sectorStatus: "covered", category: "accounting and reconciliation", language: ["en"], geo: "UK" },
  status: "production",
  launchAuthorization: false,
  launchDate: LAUNCH,
};

/* -------------------------------------------------------------------- write */
export function build(dir) {
  const A = (rel) => path.join(dir, ".aris", rel);
  const put = (rel, obj) => {
    fs.mkdirSync(path.dirname(A(rel)), { recursive: true });
    fs.writeFileSync(A(rel), JSON.stringify(obj, null, 2) + "\n");
  };
  fs.rmSync(path.join(dir, ".aris"), { recursive: true, force: true });
  put("state.json", state);
  put("assumptions.json", assumptions);
  put("cutSteps.json", cutSteps);
  put("intel/category.json", category);
  put("intel/sources.json", { sources });
  put("intel/pains.json", { pains });
  put("intel/personas.json", { personas });
  put("intel/tam-sam-som.json", sizing);
  put("intel/demand.json", demand);
  put("strategy/positioning.json", positioning);
  put("strategy/messages.json", messages);
  put("strategy/gtm.json", gtm);
  put("assets/claims.json", { claims });
  put("harness/metrics.json", metrics);
  put("harness/dashboard-spec.json", dashboard);
  put("playbook/growth-rules.json", playbook);
  put("playbook/runway.json", runway);
  for (const [rel, body] of Object.entries(assets)) {
    const p = A(path.join("assets", rel));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { process.stderr.write("usage: fixture.mjs <dir>\n"); process.exit(2); }
  fs.mkdirSync(dir, { recursive: true });
  build(dir);
  process.stdout.write(`fixture written to ${path.join(dir, ".aris")}\n`);
}
