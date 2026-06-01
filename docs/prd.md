# PRD — Tanya
### The trusted answer engine for Muslims who feel lost
**Version:** 0.1 (MVP) · **Market:** Indonesia first · **Status:** Draft for build

---

## 1. The one-line wedge

> **Tanya** is an "ask anything" engine for Muslims who feel lost — answers are AI-fast, ustadz-verified, and source-cited. Indonesia first.

It is **not** another Muslim Pro / Quran-utility clone. Those apps are *utilities* (prayer times, Quran reading). Tanya is an *answer*. Different job; users will keep both. The defensible moat is **trust**, not content volume.

---

## 2. Problem & target user

**Sharpest user (launch wedge):**
A new or returning Muslim in Indonesia who feels lost and is drowning in scattered, contradictory, untrustworthy online content — and cannot tell what is authentic or relevant to their own life.

**Core problem (ranked #1 by founder):** Knowledge is scattered and untrustworthy. Free Islamic content is everywhere; *trustworthy, personalized, clearly-sourced* answers are not.

**Expansion path (later, not MVP):** Gen-Z Muslims navigating faith vs. modern life (natural adjacency), then global English markets.

**Why incumbents don't solve it:** Utility apps don't do guided answers. Forums and social media produce flame wars and anonymous fatwa. Generic AI hallucinates rulings — which is *dangerous*, not just unhelpful.

---

## 3. Product principles (non-negotiable)

1. **Trust is the product.** Every answer shows *who* stands behind it and *what* it's based on.
2. **The AI is a librarian, not a mufti.** It retrieves and assembles from a curated corpus. It never freely generates religious rulings.
3. **A human ustadz stands at the gate** for anything sensitive. This protects users *and* the ustadz's name.
4. **Two voices.** The app voice is warm and friendly (buttons, prompts). The answer voice stays clean and full of adab. Casual never erodes trust.
5. **Honest labeling always.** Sourced-but-unreviewed content is clearly marked as such. An ustadz's name never appears on something they didn't verify.
6. **Built Indonesian-first**, not translated. Local Islamic vocabulary (thaharah, sanad, mualaf, muamalah), local register, local scholarly credibility markers.

---

## 4. How it works — the two-tier answer model

When a user asks a question:

```
User asks (plain language)
        │
        ▼
 Is the topic SENSITIVE?  ── (list defined by ustadz; see §7)
        │
   ┌────┴─────────────────────────────┐
   │ YES                              │ NO
   ▼                                  ▼
 No AI answer.                  Match against Verified Answer Bank
 Routed to a human ustadz.            │
 "This needs a scholar —       ┌──────┴───────┐
  Ust. [X] will respond."      │ match        │ no match
                               ▼              ▼
                        Tier 2 answer   Tier 1 answer (instant):
                        (✓ Verified,    sourced Qur'an & Sunnah,
                         ustadz name)   labelled "belum ditinjau
                               │         ustadz" + queued for upgrade
                               │              │
                               └──────┬───────┘
                                      ▼
                          User notified when an ustadz
                          verifies → joins the Bank for everyone
```

**Tier 1 — Source answer (instant, safe topics only).** AI retrieves relevant Qur'an + authentic hadith and presents them with light framing — *not a ruling*. Clearly labelled "📖 Dari Al-Qur'an & Sunnah · belum ditinjau ustadz." No verified badge, no ustadz name.

**Tier 2 — Ustadz answer (verified).** Once an ustadz approves an AI-drafted answer, it is saved as a canonical verified answer with their name + ✓ badge. The Bank **compounds**: every approval makes the app faster and more complete.

**Why this model:** It honours the "ask anything" promise (you can always ask) without "answer anything recklessly" (the core risk). Everyone gets something instantly; the human layer upgrades it over time.

---

## 5. The corpus (what the AI answers FROM)

Two clearly separated layers.

**Layer 1 — Source Corpus (retrieval base):**
- Qur'an + a vetted Indonesian translation (e.g. Kemenag).
- Authentic hadith collections with gradings (properly licensed, structured dataset).
- **The founding ustadz's own past content** (videos/posts), transcribed, chunked, topic-tagged. *This is the unfair advantage* — answers can echo a scholar the user already trusts.
- Stored as embeddings in a vector DB; retrieval-augmented generation (RAG).

**Layer 2 — Verified Answer Bank (what users see):**
- Ustadz-approved answers, canonical, named, badged, semantically searchable for instant re-serving.

**Sources approved for launch:** Qur'an + authentic hadith translations, and founding ustadz's own content. (Vetted fatwa databases / fiqh books deferred to a later phase.)

---

## 6. Madhhab / ormas positioning

- **Default at launch:** show the mainstream position. Where the four madhhabs differ, **say so transparently** ("Mayoritas ulama membolehkan…; sebagian berpendapat…") rather than hiding the difference. Transparency about differences *is* a trust feature.
- **Roadmap:** a madhhab-preference filter for users, and a madhhab tag for ustadz.
- **Data implication:** answers carry a `madhhab` tag from day one so the filter can be added without re-architecting.
- **Indonesia reality to manage:** the first ustadz's leanings (Syafi'i / NU / Muhammadiyah) will shape perceived positioning. Recruit and label intentionally.

---

## 7. Safety — the sensitive-topic gate

A launch requirement, not a nice-to-have. Hallucinated or unframed scripture on certain topics causes real harm (e.g. violence, jihad, apostasy, divorce/inheritance law, medical-religious edge cases, takfir).

- **The sensitive list is defined by the ustadz**, not unilaterally by the founder. This makes them co-owners of safety and protects their name.
- Sensitive questions get **no AI answer ever** — they route straight to a human ustadz.
- Each ustadz marks, during onboarding, which topics are "khusus saya" (gate-to-me-only).

---

## 8. Ustadz strategy — anchor-first, not a wide funnel

**Founder asset:** 1–3 credible, mid-tier ustadz with large followings, reachable now. Mid-tier is the sweet spot — credible but reachable, motivated by reach/growth, not jaded.

**Reframe:** Ustadz are not "users" you acquire; they are partners whose reputation you borrow. The funnel must **de-risk them**, not just sell them.

**The offer at launch:** reach + audience growth (non-cash), framed as **founding-ustadz status** + influence over how the product is built. Day-one reach is near zero, so sell *founder status and co-building*, not fictional reach. Payment / guidance revenue-share comes later, once value is proven.

**The pitch (essence):** "Reach 10x the people *without recording new content*. Approve or correct AI drafts in under a minute. Your name on every answer. You own your audience."

**Funnel stages:**
1. **Pre-work** — a clickable demo showing *their face* on a verified answer.
2. **Acquire** — the 1–3 warm anchors. Sell distribution-without-effort + founder status.
3. **Activate** — first verification must take <60s; hand-feed 10 real questions. If their first session exceeds ~10 min total, that's a product failure.
4. **Retain** — weekly scoreboard ("your answers helped 1,240 people this week").
5. **Expand** — anchors recruit peers (ustadz trust ustadz). Add per-answer pay / revenue-share here.

---

## 9. Monetization (recommended; not in MVP)

- **Free:** unlimited AI/source answers with citations. Growth engine + sadaqah. **No ads** — ads erode the trust that *is* the product.
- **Paid (later):** "Ask an Ustadz directly" — a real human answers *your specific* situation, privately. People pay for personal religious guidance, not generic answers.
- **Secondary:** donation / waqf ("fund a verified answer for someone who can't pay") — culturally resonant in SEA, low friction.
- **Logic:** give knowledge free (trust + reach); charge for *human attention* (scarce + valuable). This is also the bridge from "ustadz as verifier" to "ustadz as paid guidance marketplace."

---

## 10. App flow & screens (MVP)

**Design language:** clean, minimalist, airy; emerald as the single accent; minimal labels; calm not busy (the user is already overwhelmed).

**User-facing screens:**
1. **Home — ask-first.** Big ask box ("Mau tanya soal Islam? Sini."). Optional ustadz selector defaulting to "Any verified." A few trending verified questions so an empty box isn't intimidating.
2. **Answer screen.** Answer first → **trust block** (ustadz photo, credential, ✓ badge or ⏳ pending) → **sources** (ayah / hadith, tappable) → next-step nudge → "ask a follow-up."
3. **Ustadz profile.** Photo, credentials, specialties, # answers, people helped, trust score. "Ask this ustadz."
4. **Library / "Your journey."** Saved answers + question history + gentle follow-up nudges (retention).

**User onboarding (3 screens) — job: build trust first.**
1. Welcome — the promise in one line.
2. **How verification works** — a 3-step visual: ask → Qur'an & Sunnah → ustadz verifies ✓. (The one screen allowed to be word-heavier, because trust requires explanation; kept as a diagram.)
3. Light personalization — new / returning / practicing, one tap, framed as private.

**Ustadz onboarding (5 screens) — short, covers all three jobs.**
1. The offer (founder status, reach-without-recording).
2. Verify credentials (ijazah / sanad, ID, linked public profile).
3. Specialties + madhhab + what to gate ("khusus saya").
4. Feel the 60-second verification flow (approve / edit a sample draft).
5. **🔒 Pending state** — "Mohon tunggu, pendaftaran sedang kami verifikasi." Dashboard stays locked until approved. Only "Keluar." Framed as amanah, not bureaucracy.

---

## 11. Ustadz selection behaviour (MVP decision)

- Named ustadz act as the **front door and brand** (their followers come "for them") — a distribution weapon given their large followings.
- **"Any verified" is the engine underneath** for answer coverage, since no single ustadz has answered everything.
- Picking a specific ustadz filters/prioritises *their* verified answers; gaps are filled by the collective verified corpus, clearly labelled.
- **Absolute rule:** never attach an ustadz's name to content they didn't verify.

---

## 12. Language & voice

- **Indonesian-first, not translated.** Local Islamic terms: thaharah, sanad, mualaf, muamalah, salat, talak, waris.
- **App voice:** warm, friendly, relatable, **no slang** ("Mulai sekarang", "Mulai bertanya", "Bukan grup WA"). Emoji sparingly.
- **Answer voice:** clean, calm, full adab; scholarly register. The ustadz's name attaches only to this.
- **Architecture note:** store answers with a `language` tag so English (for Gen-Z / global expansion) can be added without re-architecting.

---

## 13. Data model implications (for build)

- **Ustadz account states:** `pending` (locked, post-submit) → `approved` (dashboard unlocked) → `rejected` (notified, can resubmit/appeal). No app access before `approved`.
- **Answer object tags:** `status` (ai_pending / verified), `verifying_ustadz`, `madhhab`, `language`, `topic`, `is_sensitive`.
- **Verified Answer Bank:** semantic match on incoming questions before any AI draft.
- **Sensitive-topic classifier:** runs *before* answering; list configurable per ustadz.

---

## 14. North Star & key metrics

- **North Star (proposed):** Weekly Active Askers who receive a *verified* answer (i.e. trust delivered, not just usage).
- **Key drivers to instrument:**
  - Verified Answer Bank coverage (% of questions served instantly from the Bank).
  - Median time-to-verified-answer.
  - Ustadz verification throughput (answers/ustadz/week) and median review time (<60s target).
  - Return rate / follow-up engagement (retention).
- **Guardrail metric:** sensitive-topic leakage (should be ~0 AI answers on gated topics).

---

## 15. Key risks

1. **Corpus / verification pipeline is the make-or-break.** Weak corpus = "ChatGPT with a mosque logo," which is dangerous. Hardest early work is sourcing a clean authentic corpus + recruiting 2–3 credible anchor ustadz — not code.
2. **Reach-as-payment is hollow on day one** (no users = no reach). Bridge with founder-status + influence framing.
3. **Retention** — Q&A alone has weak retention. Patch cheaply via next-step nudges and follow-up prompts.
4. **Sectarian conflict** — manage via transparent madhhab differences + intentional ustadz labelling.
5. **First-asker latency** on un-banked safe topics — mitigated by instant Tier-1 sourced answers + pre-seeding common questions.

---

## 16. Open decisions / next steps

- Pre-seed 200–500 common questions into the Bank before launch? (Recommended — removes first-asker latency.)
- Finalise the sensitive-topic list *with* the founding ustadz.
- Confirm hadith dataset licensing.
- Decide ustadz positioning mix (NU / Muhammadiyah / cross-ormas) for the first anchors.
- Build sequence: 90-day plan (next document).

---

*This PRD captures decisions made during the founding brainstorm. Each choice has reasoning attached; revisit the reasoning before reversing a decision.*
