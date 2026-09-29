# After the launch

Launch day is the smallest part of a product's marketing and the only part most plans
cover. Every asset this workflow wrote before this rule existed was acquisition: get
someone to the page, get them to sign up. Nothing addressed the ninety days where the
money actually is.

The measurement harness **watches** retention. Nothing **affects** it. This closes that.

---

## The three things that happen after launch

**1. Activation.** Someone signed up and has not yet done the thing the product is for.
This is the largest leak in any self-serve product and the cheapest to fix, because the
person is already interested and already reachable.

**2. Retention.** They did the thing once. Whether they do it again decides whether the
business exists. Retention work is unglamorous, mostly email and in-product prompts, and
worth more than any launch campaign.

**3. Cadence.** Content keeps arriving or the channel dies. A launch post is one day; a
channel is a habit. A plan with no cadence quietly assumes someone will improvise, which
means nothing ships in week three.

## What gets written

### `assets/lifecycle-emails.md`

Not a drip sequence. Each one fires on **something the person did or failed to do**, and
says which event triggers it:

| | Fires when | Its job |
|:--|:--|:--|
| Welcome | signup | say what to do first, once, in one sentence |
| Activation nudge | signed up, has not done the core action in N days | remove the specific obstacle, not "check out our features" |
| First-value | completed the core action | name what just happened so they recognise the value |
| Habit | used it twice in a week | make the second time a third |
| Dormancy | no activity in N days | ask what stopped, and mean it |
| Expiry | trial ending | say plainly what happens to their data |
| Win-back | cancelled | once, months later, only if something changed |

**N is a number from the harness, not a guess.** If the harness cannot yet say what
normal is, the email says `[N: set after the first cohort]` and does not ship.

### `assets/content-calendar.md`

Twelve weeks. For each week: what publishes, on which channel from `gtm.json`, and which
message it carries. A channel that appears here and not in the go-to-market plan is a
channel nobody agreed to run.

Cadence is a commitment about capacity. Two posts a week that actually appear beat five
that were planned by someone who did not have to write them. **Plan the cadence the
smallest likely team can hold**, and say what it assumes about who writes.

### `playbook/runway.json`

The first ninety days as decision points rather than activities. Each entry: the week,
what is true by then if things are working, and what to do if it is not. This is the
document someone reads in week six when the numbers are ambiguous and the temptation is
to change everything at once.

## Rules

**Every lifecycle email carries claim ids like any other asset.** "Teams like yours see
X" is a factual claim, and it is the most dangerous kind here because it arrives when
the person already trusts you.

**Never write an email that fires on a date alone.** A fourteen-day drip reaches someone
who churned on day two, and reaching them is worse than silence.

**A dormancy email asks a question and accepts the answer.** If it only pitches, it
teaches people to ignore the sender, and you spend a channel to save one account.

**Say what happens to their data.** At trial expiry and at cancellation, plainly. A
competitor profiled in this workflow destroys trial data unless a subscription is bought
and says so only in its terms; saying the opposite clearly is worth more than a feature.

**The calendar may only use channels from `gtm.json`**, and only at a cadence someone
has agreed to hold.
