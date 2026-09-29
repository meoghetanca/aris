# Copy

## Write at the length it will be used

A headline that must fit a hero. A subject line under fifty characters. An ad headline
at the platform's limit. Copy written without its constraint gets cut by whoever pastes
it in, and the cut version ships.

State the constraint beside the copy so the next person can see what it was written to.

## Every state, not just the happy one

An asset is not finished when the success case reads well. Write the empty state, the
error, the loading text, the confirmation, the unsubscribe, the sold-out, the waitlist
position. These are where copy is missing when something launches, and they are the
moments a person is most likely to leave.

## Glossary-bound

Use the term from `messages.json`'s glossary. One concept, one word, across every
asset. Three synonyms for the same object read as three features.

## Length-realistic mock data

Mock data is where credibility dies. Use names of realistic length — a Vietnamese full
name, a German compound, a two-character name — because a layout that only survives
"John Smith" breaks in production. Use plausible values, and never a value that would
be wrong in the field: no impossible dates, no salary in the wrong currency, no medical
figure outside a human range.

**No real data.** No real employee, customer, patient or client names, values or
records, in copy or in a screenshot. The sector entries list this under `forbidden` for
good reason.

## Structure per asset

- **`landing-brief.md`** — the copy deck pica builds from: section order, the copy for
  each, the claim ids, the CTA. Not HTML. Hero, problem, value proposition, how it
  works, benefits, features, social-proof placeholder, objection handling, FAQ, CTA,
  footer.
- **`waitlist-page.md`** — headline, value proposition, who it is for, benefits, form
  fields, CTA, privacy note, confirmation state.
- **`email-sequence.md`** — five emails: problem, insight, solution, objection, launch.
  Each with subject, preview text, body, CTA, audience, send timing, claim ids.
- **`social-posts.md`** — twelve posts. Each with platform, objective, hook, body, CTA,
  visual direction, claim ids.
- **`launch-post.md`** — the canonical announcement.
- **`faq.md`** — questions from persona `objections`, competitor weaknesses, known
  product limits, pricing uncertainty. Not invented questions; every one traces to
  something in the research.
- **`sales-deck.md`** — cover, problem, market, customer, pain, solution, how it works,
  differentiation, benefits, pricing, objections, CTA.
- **`ad-variants.md`** — per variant: platform, audience, hook, primary text, headline,
  CTA, claim ids.
- **`pr-boilerplate.md`** — company description, product description, boilerplate,
  launch description, the approved claims, contact placeholder.

## The landing page itself is out of scope

`/aris-assets` writes the brief. **pica builds the page.** Do not write HTML here: it
would drift from the brief immediately and there would be two sources of truth for the
same copy.
