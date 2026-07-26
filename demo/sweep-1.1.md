---
roadmap:
  theme:
    preset: fun
  background:
    enabled: true
    seed: sweep-1.1
    density: 0.55
    size: 0.8
    animated: 1.5
  tags:
    foundation:
      icon: check
      accent: green
      label: Foundation
    contextual:
      icon: ":bulb:"
      accent: blue
      label: Adopt when applicable
    advanced:
      icon: star
      accent: violet
      label: Advanced at scale
---

# Sweep 1.1 — Software Engineering ++_Essential Practices_++ :broom:

:boom: **SWEEP 1.1** groups essential practices by maturity: start with
[foundation], adopt [contextual] when needed, and add [advanced] at scale.

* :one: Discovery & Design
*:beginner: [Product discovery](https://www.svpg.com/product-discovery/) is **crucial** to success. Involve your customers and key stakeholders — discovery decides ==_what_== to create.*
  + [Domain discovery](https://www.infoq.com/articles/architecture-modernization-domain-driven-discovery/) [contextual]
    > Before designing anything, learn the business terrain: which domains exist, where their
    > boundaries run, and which ones differentiate you. InfoQ's field guide shows how to run
    > this discovery.
    * [Capability mapping](https://microservices.io/patterns/decomposition/decompose-by-business-capability.html) [contextual]
      > Name what the business must be able to do, independent of any system — those
      > capabilities become candidate module and team boundaries. Richardson's pattern shows the
      > technique.
    * [Context mapping](https://www.infoq.com/articles/ddd-contextmapping/) [contextual]
      > Your domains will overlap and translate badly at the seams; map the bounded contexts and
      > their relationships early, because every seam is a future integration contract.
    * [Event storming](https://www.eventstorming.com/) [contextual]
      > The fastest way to get engineers and domain experts sharing one picture: a wall, sticky
      > notes, and the domain's events in order. Run one before committing to a design.
  * [Product design](https://www.nngroup.com/articles/design-thinking/) [foundation]
    > Shape what you build around evidence from users, not opinions in meetings. Design
    > thinking's cycle — empathize, define, ideate, prototype, test — is the loop to
    > internalize.
    * [UI/UX prototyping](https://www.nngroup.com/articles/ux-prototype-hi-lo-fidelity/) [contextual]
      > Test the flow while it is still cheap to change: an interactive prototype answers
      > usability questions before implementation begins.
    * [User story mapping](https://www.jpattonassociates.com/story-mapping/) [contextual]
      > Flat backlogs hide the product; arrange stories along the user's journey instead, so
      > releases slice into thin end-to-end walking skeletons. Jeff Patton invented the
      > technique.
    * [Impact mapping](https://www.impactmapping.org/) [contextual]
      > Tie every deliverable to an actor and the behavior change you expect from them —
      > features that map to no impact are cut before they cost anything.
    * [Design sprint](https://designsprintkit.withgoogle.com) [contextual]
      > For a consequential, uncertain question, run a focused workshop to prototype and test a
      > possible answer before committing the team to implementation.
    * [Design systems](https://www.designsystems.com/) [contextual]
      > Shared components, tokens, and guidance improve consistency and reduce repeated design
      > and implementation work when a product family benefits from standardization.
    * [Accessibility](https://www.w3.org/WAI/standards-guidelines/wcag/) [foundation]
      > Include accessibility from the first wireframe so it shapes flows, content, and
      > components. WCAG defines the shared standard; verification is accessibility testing's
      > job in chapter two.
    * [Product analytics](https://www.gov.uk/service-manual/measuring-success) [foundation]
      > Define success measures before delivery and instrument them with appropriate consent —
      > the outcome reviews in chapter three depend on these signals existing.
    * [Customer feedback](https://www.gov.uk/service-manual/user-research) [foundation]
      > Combine interviews, support signals, usability studies, and behavioral evidence. Feed
      > what you learn back into discovery instead of treating release as the finish line.
  * [Requirements & outcomes](https://en.wikipedia.org/wiki/Requirements_engineering) [foundation]
    > Translate discovery into testable outcomes, constraints, and evidence. Requirements stay
    > useful when each one has an owner, rationale, and way to verify it.
    * [Functional requirements](https://en.wikipedia.org/wiki/Functional_requirement) [foundation]
      > Describe the behavior users and dependent systems need without prescribing unnecessary
      > implementation details.
    * [Quality attributes](https://en.wikipedia.org/wiki/Non-functional_requirement) [foundation]
      > The classic NFRs: make performance, reliability, security, accessibility, privacy, and
      > operability measurable; these constraints often shape architecture more than features
      > do.
    * [Acceptance criteria](https://gojko.net/books/specification-by-example/) [foundation]
      > State the observable examples that prove a change works, including failure paths and
      > boundary conditions.
    * [Risk & compliance](https://csrc.nist.gov/projects/risk-management) [contextual]
      > Identify legal, regulatory, safety, privacy, and business risks early enough to change
      > the design, and record which obligations apply — the secure development lifecycle in
      > chapter three turns them into controls.
    * [Traceability](https://en.wikipedia.org/wiki/Requirements_traceability) [contextual]
      > Connect important requirements to design decisions, tests, releases, and operational
      > evidence when the product's risk or regulation demands it.
  * [Technical design](https://martinfowler.com/architecture/) [foundation]
    > Decide the shapes that are expensive to change — boundaries, data ownership, communication
    > — and postpone everything else. Fowler's guide frames which decisions deserve the effort.
    * [Visual communication](https://c4model.com/) [foundation]
      > An architecture nobody can see is an architecture nobody can critique. C4's four zoom
      > levels give the team one drawing convention from bird's-eye view to code.
    * [Technology scouting](https://www.thoughtworks.com/radar) [contextual]
      > Watch the landscape deliberately instead of adopting whatever trends: assess, trial,
      > adopt, hold. The ThoughtWorks Radar models the discipline twice a year.
    * [API design-first](https://www.infoq.com/articles/design-first-api-development/) [contextual]
      > Agree the contract before writing the implementation: consumers review it, mocks unblock
      > parallel work, and the API ends up shaped by its users rather than your database.
    * [ADRs](https://adr.github.io/) [foundation]
      > Future maintainers will ask why — answer them now, in a one-page record per significant
      > decision, with the context and the trade-offs that drove it.
    * [Threat modeling](https://owasp.org/www-community/Threat_Modeling) [foundation]
      > Ask what can go wrong while the design is still on the whiteboard: attackers, assets,
      > entry points. Fixing a flaw here costs a meeting; in production it costs an incident.
  * [Team spirit](https://www.atlassian.com/team-playbook) [foundation]
    > Culture is the multiplier on every practice in this roadmap: trust, autonomy, and shared
    > direction decide whether the rest is adopted or merely performed.
    * [Psychological safety](https://rework.withgoogle.com/en/guides/understanding-team-effectiveness) [foundation]
      > Google's Project Aristotle found it to be the strongest predictor of team effectiveness:
      > people must be safe to ask, dissent, and admit mistakes — build this before process.
    * [Empowerment](https://www.svpg.com/empowered-product-teams/) [foundation]
      > Give teams problems to solve, not features to build — empowered teams discover
      > solutions; feature factories just ship output. Cagan's essay is the reference argument.
    * [Ownership](https://www.scrum.org/resources/blog/how-can-agile-leaders-create-right-context-ownership) [foundation]
      > Ownership is created by context, not demanded: teams that hold their product end to end
      > make better decisions than teams executing someone else's ticket queue.
    * [Accountability](https://www.scrum.org/resources/blog/accountability-quality-agile) [foundation]
      > The counterpart of autonomy: a professional team holds itself to its own definition of
      > done and answers for outcomes, not activity.
    * [Aligned objectives](https://www.svpg.com/team-objectives-overview/) [foundation]
      > Autonomous teams still need one direction: outcome-based objectives, assigned with
      > context, keep ten empowered teams from pulling in ten directions.

* :two: Development & Delivery
*:beginner: [Software engineers](https://en.wikipedia.org/wiki/Software_engineering) build quality into every change. Fast feedback, small batches, automation, and shared ownership decide ==_how_== the product is created.*
  * [Developer Experience](https://developerexperience.io/articles/good-developer-experience) [foundation]
    > Fast feedback, low cognitive load, clear golden paths — DevEx is the compound interest of
    > delivery: every friction you remove pays out on every change forever after.
  * [DevOps](https://martinfowler.com/bliki/DevOpsCulture.html) [foundation]
    > You build it, you run it: shared responsibility between development and operations is the
    > cultural foundation everything else in this chapter stands on.
  * [Team Topologies](https://teamtopologies.com/) [contextual]
    > Organize teams for fast flow: stream-aligned teams own value end to end, platform and
    > enabling teams reduce their load, and interaction modes are chosen deliberately.
  * [Quality engineering](https://moderntesting.org/) [foundation]
    > Quality is designed, built, verified, and monitored by the whole team. Independent testing
    > adds perspective, but it does not replace developer ownership of quality.
    * [Acceptance & exploratory testing](https://www.satisfice.com/exploratory-testing) [foundation]
      > Automate stable acceptance examples and use exploratory testing to investigate risks,
      > interactions, and failure modes that scripted checks do not anticipate.
    * [Performance & resilience testing](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/performance-test) [foundation]
      > Validate latency, throughput, resource use, degradation, and recovery against explicit
      > targets before production traffic discovers the limits.
    * [Accessibility testing](https://www.w3.org/WAI/test-evaluate/) [foundation]
      > Combine automated checks, keyboard and screen-reader evaluation, and testing with people.
      > Automation alone cannot establish that an experience is accessible.
    * [Security testing](https://owasp.org/www-project-devsecops-guideline/) [foundation]
      > Build security verification into everyday delivery: automated checks in the pipeline,
      > human review where risk concentrates. The specific controls and probes are defined by
      > the security practices in chapter three.
    * [Test data & environments](https://12factor.net/dev-prod-parity) [foundation]
      > Create representative, isolated, privacy-safe data and reproducible environments. Define
      > ownership for flaky tests instead of normalizing unreliable feedback.
  * [Code review](https://google.github.io/eng-practices/review/) [foundation]
    > Match review rigor to risk. Pull-request review, pairing, and ensemble work can all provide
    > correctness checks, shared ownership, and knowledge transfer without stalling flow.
  * [Branching strategy](https://martinfowler.com/articles/branching-patterns.html) [foundation]
    > How you branch decides how often you integrate, and integration frequency drives delivery
    > performance more than almost anything — choose a strategy, don't inherit one.
    * [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/) [contextual]
      > The heavyweight classic: release and hotfix branches for versioned, multi-release
      > products. Even its author now points most teams to trunk-based instead.
    * [Trunk-based](https://trunkbaseddevelopment.com/) [foundation]
      > Everyone integrates to one branch at least daily, behind flags when needed — small
      > merges, no long-lived divergence, and the foundation CI/CD actually requires.
  * [CI/CD](https://continuousdelivery.com/) [foundation]
    > Make releasing boring: every commit builds, tests, and can deploy through one automated
    > pipeline, so shipping is a routine decision rather than an event.
    * [Commit semantics](https://www.conventionalcommits.org/en/v1.0.0/) [contextual]
      > Structured commit messages (feat:, fix:, breaking) turn history into data — changelogs
      > and releases generate themselves.
    * [Feature flags](https://martinfowler.com/articles/feature-toggles.html) [contextual]
      > Decouple deploy from release: unfinished work ships dark, risky changes roll out
      > gradually, and rollback is a toggle. Budget for flag cleanup or they become debt.
    * [Merge queues](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) [advanced]
      > At scale, green PRs still break main when they land together; a merge queue validates
      > each merge against the latest main before it lands, keeping trunk always releasable.
    * [Configuration management](https://12factor.net/config) [foundation]
      > Keep environment-specific configuration outside code, validate it, protect sensitive
      > values, and promote the same immutable artifact through each environment.
    * [Artifact provenance](https://12factor.net/build-release-run) [foundation]
      > Build once, promote unchanged: the same immutable artifact moves through every
      > environment, so what you verified is what you ship and every release traces back to its
      > source. Signing and attestation belong to supply chain security.
    * [Database evolution](https://martinfowler.com/articles/evodb.html) [foundation]
      > Use backward-compatible schema and data migrations so old and new application versions
      > can coexist during deployment and recovery.
    * [Progressive delivery](https://launchdarkly.com/blog/what-is-progressive-delivery-all-about/) [contextual]
      > Release to 1% before 100%: canaries, rings, and targeting contain the blast radius of
      > every change, with metrics deciding each next step.
    * [Release verification](https://sre.google/workbook/canarying-releases/) [foundation]
      > Run automated smoke tests and health checks after deployment, then stop or reverse a
      > rollout when user and system signals breach its guardrails.
    * [Rollback & roll-forward](https://martinfowler.com/bliki/BlueGreenDeployment.html) [foundation]
      > Rehearse both recovery paths. Prefer a fast corrective release when state has changed,
      > and retain rollback when the artifact and data remain compatible.
  * [DoD](https://www.scrum.org/resources/blog/walking-through-definition-done) [foundation]
    > One shared answer to 'is it actually done?' — tested, reviewed, documented, deployed.
    > Without it, every done means something different.
  * [Source control](https://en.wikipedia.org/wiki/Version_control) [foundation]
    > Everything that produces the product lives in version control — code, configuration,
    > documentation, infrastructure — with a history that explains itself.
    * [Git](https://git-scm.com) [contextual]
      > Learn the team's source-control system beyond commit and push. History, bisect, and
      > recovery tools shorten diagnosis when a change causes a failure.

  * [Architecture patterns](https://en.wikipedia.org/wiki/Architectural_pattern) [contextual]
    > Layers, events, microservices — patterns are a vocabulary of trade-offs, not badges; know
    > them well enough to pick the boring one that fits.
  * [Coding conventions](https://en.wikipedia.org/wiki/Coding_conventions) [foundation]
    > Consistency is a team feature: shared conventions make every file feel familiar and free
    > reviews to discuss substance instead of style.
    * [Linting](https://en.wikipedia.org/wiki/Lint_(software)) [foundation]
      > Machines catch the mechanical bugs and smells before humans ever look — a linter in the
      > pipeline is the cheapest reviewer you will ever hire.
    * [Formatting](https://editorconfig.org/) [foundation]
      > Automate style entirely out of discussion: one formatter config in the repo
      > (EditorConfig at minimum) and no human ever argues whitespace again.
    * [Coding style](https://google.github.io/styleguide/) [foundation]
      > Where conventions need judgment — naming, idioms, structure — write them down. Google's
      > public style guides show what battle-tested guidance looks like.
  * [Refactoring](https://refactoring.com/) [foundation]
    > Improve structure in small, behavior-preserving steps as part of daily work — not as a
    > big-bang project you must ask permission for. Fowler's catalog names the moves.
  * [Versioning](https://en.wikipedia.org/wiki/Software_versioning) [foundation]
    > Give every release an identity: a scheme that communicates change, compatibility, and
    > support expectations to everyone downstream.
    * [Semver](https://semver.org/) [contextual]
      > When software declares a public API, MAJOR.MINOR.PATCH communicates compatible and
      > breaking changes. Products without a public API can use a scheme suited to their release
      > and support model.
    * [Deprecation & end of life](https://endoflife.date/) [foundation]
      > Publish migration paths and support windows before removing an interface, runtime, or
      > product version. Track adoption until retirement is safe.
  * [Dependency management](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html) [foundation]
    > Inventory direct and transitive dependencies, automate safe updates, and review
    > unsupported components — chapter three's vulnerability scanning decides how urgently a
    > fix ships.
  * [Instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/) [foundation]
    > Telemetry is a feature you build, not an agent you bolt on: emit spans, metrics, and logs
    > from your own code at the source, and chapter three becomes possible.
    * [OpenTelemetry](https://opentelemetry.io/) :telescope: [contextual]
      > OpenTelemetry standardizes traces, metrics, logs, and context propagation. Check signal
      > and language maturity, semantic conventions, and backend compatibility before adopting
      > it.
  * [Docs-as-Code](https://www.writethedocs.org/guide/docs-as-code/) [foundation]
    > Docs live where code lives: versioned, reviewed in PRs, published by the pipeline — the
    > only documentation that stays true is the kind that ships with the change.
    * [Markdown](https://www.markdownguide.org/) [contextual]
      > The lingua franca of docs-as-code: plain text that diffs, reviews, and renders
      > everywhere.
  * [Testability](https://martinfowler.com/testing/) [foundation]
    > Design code so it can be tested — seams, injectable dependencies, honest boundaries;
    > testability pressure is design feedback, not overhead.
    * [TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html) [contextual]
      > Red, green, refactor: writing the test first forces the design conversation before the
      > implementation hardens, and leaves a regression net behind.
    * [Contract testing](https://docs.pact.io/) [contextual]
      > Verify that each service honors what its consumers actually depend on — catching
      > integration breaks in seconds without spinning up the whole stack.
    * [Test pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) [contextual]
      > Use a context-appropriate mix of fast focused tests, integration tests, and end-to-end
      > tests. Keep feedback fast, cover real boundaries, and avoid duplicating the same checks.
  * [Deployability](https://www.sei.cmu.edu/blog/two-categories-of-architecture-patterns-for-deployability/) [foundation]
    > Architect so any component can deploy independently and safely — deployability is a design
    > property you build in, not an ops problem you discover later.
  * [AI-assisted engineering](https://dora.dev/research/ai/) [advanced]
    > The defining shift since 2023: agents plan, edit, and verify code under
    > engineer supervision. Start here after your delivery flow is solid.
    * [Coding agents](https://martinfowler.com/articles/exploring-gen-ai.html) [advanced]
      > The 2023-onward shift: agents plan, edit, and verify code under your supervision. Treat
      > them as capable pairs whose work you review, and learn their failure modes.
    * [Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) [advanced]
      > An agent is only as good as what it can see: curate the instructions, tools, and
      > knowledge in its context deliberately — this is the new craft of working with AI.
    * [Spec-driven development](https://github.com/github/spec-kit) [advanced]
      > Write the specification precisely enough to constrain an agent, then let implementation
      > flow from it — GitHub's Spec Kit turns the idea into a working method.
  * [DORA metrics](https://dora.dev/guides/dora-metrics/) [foundation]
    > Five measures — change lead time, deployment frequency, failed deployment recovery time,
    > change fail rate, and deployment rework rate — expose delivery throughput and instability.
    > Compare one service with itself over time; context matters.

* :three: Deployment & Operations
*:beginner: High-quality software can ship frequently and safely — and stay ==_running_==. [DevSecOps](https://www.redhat.com/en/topics/devops/what-is-devsecops) provides continuous delivery and deployment capabilities by bringing development, security, and operations together.*
  + [Infrastructure](https://aws.amazon.com/architecture/well-architected/) [foundation]
    > Run on foundations you can reason about: the Well-Architected pillars — operations,
    > security, reliability, performance, cost, sustainability — are the checklist for this
    > whole column.
    * [Infrastructure as code](https://martinfowler.com/bliki/InfrastructureAsCode.html) [foundation]
      > Infrastructure belongs in version control like everything else: reviewed, repeatable,
      > and rebuildable from scratch — console clicks are unrecorded outages waiting to happen.
    * [GitOps](https://opengitops.dev/) [contextual]
      > Declare the desired state in Git and let controllers continuously reconcile reality to
      > it — deployments become pull requests, and drift fixes itself.
    * [FinOps](https://www.finops.org/) [contextual]
      > Cloud spend is an engineering signal: give teams visibility and ownership of their cost,
      > and efficiency becomes part of design instead of a finance escalation.
    * [Platform engineering](https://platformengineering.org/) [advanced]
      > Pave the golden path: an internal platform, run as a product, lets stream teams ship
      > without each reinventing infrastructure — and without ticket-ops in between.
    * [Auto-scaling](https://en.wikipedia.org/wiki/Autoscaling) [contextual]
      > When demand varies enough to justify it, scale capacity within tested limits and retain
      > headroom for bursts. Predictable or stateful workloads may need a different strategy.
    * [Green operations](https://greensoftware.foundation/) [contextual]
      > Measure and reduce the energy and carbon cost of software where the workload and
      > organizational goals make it material. The Green Software Foundation collects patterns.
  * [Reliability](https://learn.microsoft.com/en-us/azure/well-architected/reliability/design-patterns) [foundation]
    > Assume everything fails and design for it: retries with backoff, bulkheads, circuit
    > breakers — Microsoft's pattern catalog is a practical menu.
    * [Self-healing](https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/self-healing) [contextual]
      > Prefer systems that remediate themselves — restarts, failover, reconciliation — so
      > humans handle the novel failures, not the routine ones.
    * [SRE](https://sre.google/) [contextual]
      > Operations as a software problem: engineers automate away toil and error budgets decide
      > when to ship versus stabilize. Google's free SRE books define the discipline.
    * [SLOs](https://sre.google/sre-book/service-level-objectives/) [foundation]
      > Pick the reliability level users actually need, measure it, and spend the error budget
      > deliberately — SLOs turn 'is it reliable enough?' into an engineering decision.
      * [SLIs](https://sre.google/workbook/implementing-slos/) [foundation]
        > Measure user-visible success, latency, freshness, correctness, or durability with
        > service-level indicators that have precise event, population, and aggregation rules.
      * [Error budgets](https://sre.google/workbook/error-budget-policy/) [foundation]
        > Use the permitted unreliability to balance delivery and stability. Agree in advance
        > what action the team takes when the budget is at risk or exhausted.
    * [Capacity & performance engineering](https://sre.google/workbook/managing-load/) [foundation]
      > Forecast demand, measure saturation, test limits, and preserve headroom. Performance is a
      > design constraint and an operational responsibility, not a late optimization.
    * [Chaos engineering](https://principlesofchaos.org/) [advanced]
      > Inject failure on purpose, in controlled experiments, before production does it for you
      > at 3 a.m. — confidence in resilience is earned, not assumed.
    * [Service ownership & on-call](https://sre.google/sre-book/being-on-call/) [foundation]
      > Give every production service an accountable team, support expectations, escalation
      > path, and sustainable on-call rotation. Ownership must include authority to improve it.
    * [Runbooks](https://sre.google/workbook/on-call/) [foundation]
      > Link actionable diagnosis, mitigation, communication, and escalation guidance from each
      > alert. Test runbooks during exercises and update them after incidents.
    * [Incident response](https://sre.google/sre-book/managing-incidents/) [foundation]
      > When production breaks, structure beats heroics: clear roles, one incident commander,
      > calm communication. Practice the choreography before you need it.
    * [Blameless postmortems](https://sre.google/sre-book/postmortem-culture/) [foundation]
      > After every incident, fix the system rather than the person: blame buries the
      > information you need most. Google's postmortem culture chapter shows how.
    * [Backup and restore](https://sre.google/sre-book/data-integrity/) [foundation]
      > A backup you have never restored is a hope, not a plan: keep isolated, immutable copies
      > of the data that matters and rehearse the restore path until it is boring.
    * [Disaster recovery](https://learn.microsoft.com/en-us/azure/well-architected/reliability/disaster-recovery) [foundation]
      > Define RTOs and RPOs from business impact, design recovery for infrastructure, data,
      > identity, and dependencies, and run realistic recovery exercises on a schedule.
  * [Security](https://owasp.org/) [foundation]
    > Security is a property of the whole pipeline, not a final gate: shift it left into design,
    > dependencies, and deployment. OWASP is the community hub for all of it.
    * [Secure development lifecycle](https://csrc.nist.gov/projects/ssdf) [foundation]
      > Prepare the organization, protect source and build environments, produce secure
      > software, and respond to vulnerabilities through one risk-based development framework.
      * [Security requirements](https://cheatsheetseries.owasp.org/cheatsheets/Abuse_Case_Cheat_Sheet.html) [foundation]
        > Turn the risks and obligations identified during discovery into verifiable controls
        > and abuse cases; track important decisions with the rest of the requirements.
      * [Application security controls](https://owasp.org/www-project-application-security-verification-standard/) [foundation]
        > Design and verify authentication, authorization, session management, input handling,
        > output encoding, cryptography, and error handling at the required assurance level.
      * [Data protection & privacy](https://www.nist.gov/privacy-framework) [foundation]
        > Classify data, minimize collection and retention, encrypt it appropriately, restrict
        > access, and make deletion and consent requirements part of the design.
      * [Secure coding & review](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/) [foundation]
        > Train engineers for the risks in their stack, use approved security patterns, and
        > review high-risk code paths with appropriate expertise.
      * [Vulnerability response](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html) [foundation]
        > Provide a reporting channel, triage by exploitability and impact, patch within defined
        > targets, notify affected parties, and learn from recurring root causes.
    * [Penetration testing](https://owasp.org/www-project-web-security-testing-guide/) [contextual]
      > Invite the attack before attackers do: regular authorized probes find what reviews and
      > scanners miss. OWASP's testing guide is the playbook.
    * [Vulnerability scanning](https://owasp.org/www-community/Vulnerability_Scanning_Tools) [foundation]
      > Continuously scan code, dependencies, and images in the pipeline — known CVEs are the
      > cheapest vulnerabilities you will ever fix, if you find them first.
    * [Secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) [foundation]
      > No credentials in code, config, or chat: store secrets in a vault, rotate them
      > routinely, and audit access — one leaked key can undo everything else here.
    * [Supply chain security](https://slsa.dev/) [foundation]
      > Your build is only as trustworthy as its least trustworthy dependency: SLSA's levels
      > harden the path from source to artifact against tampering.
    * [SBOM](https://www.cisa.gov/sbom) [foundation]
      > Keep an ingredient list for every artifact — when the next Log4Shell lands, you want to
      > answer 'are we affected?' in minutes, not weeks.
    * [Zero trust](https://csrc.nist.gov/pubs/sp/800/207/final) [contextual]
      > Never trust by network location: authenticate and authorize every access explicitly, as
      > if the perimeter were already breached — NIST 800-207 is the reference architecture.
  * [Observability](https://opentelemetry.io/docs/concepts/observability-primer/#what-is-observability) [foundation]
    > Use telemetry and investigation tools to infer relevant internal conditions from system
    > outputs. Design signals around user journeys and diagnostic questions, not data volume.
    * [Metrics collection](https://opentelemetry.io/docs/concepts/signals/metrics/) [foundation]
      > Aggregated measurements power dashboards, alerts, and capacity planning — capture them
      > consistently and they become the system's vital signs.
    * [Monitoring & alerting](https://sre.google/sre-book/monitoring-distributed-systems/) [foundation]
      > Watch the four golden signals and alert on user-visible symptoms, not causes — a page
      > should always mean a human decision is needed right now.
    * [Distributed tracing](https://opentelemetry.io/docs/concepts/signals/traces/) [contextual]
      > One request, every hop: traces turn 'something is slow somewhere' into 'this call, in
      > this service, this long'.
    * [Structured logging](https://opentelemetry.io/docs/concepts/signals/logs/) [foundation]
      > Log events as structured data, correlated with traces — grep gives way to queries, and
      > debugging distributed systems stops being archaeology.
    * [Continuous profiling](https://www.cncf.io/blog/2022/05/31/what-is-continuous-profiling/) [advanced]
      > Correlate production resource profiles with traces, metrics, and logs when code-level
      > CPU, memory, allocation, or lock behavior cannot be diagnosed from other signals.
  * [Continuous improvement](https://itrevolution.com/articles/the-three-ways-principles-underpinning-devops/) [foundation]
    > Delivery creates evidence. Use it to improve the product and the system instead of ending
    > the learning cycle at deployment.
    * [Outcome reviews](https://martinfowler.com/bliki/OutcomeOverOutput.html) [foundation]
      > Compare adoption, user outcomes, quality, cost, and risk with the measures defined during
      > discovery. Change or retire work that does not produce the intended result.
    * [Retrospectives](https://www.scrum.org/resources/what-is-a-sprint-retrospective) [foundation]
      > Inspect how the team works at a useful cadence, choose a small improvement, assign an
      > owner, and verify whether the change helped.
    * [Operational feedback](https://sre.google/workbook/eliminating-toil/) [foundation]
      > Feed incidents, support requests, performance, security findings, and toil into product
      > and technical priorities alongside feature demand.

## Keep ++**sweeping**++ :sparkles:

Use these definitions as a shared vocabulary, and adapt each practice to the
product's risk, scale, and operating context.
© János Veres · [MIT License](https://opensource.org/license/mit)

*[Technology scouting]: Technology scouting identifies and evaluates emerging technologies.
*[Psychological safety]: A shared belief that the team is safe for interpersonal risk-taking.
*[Design systems]: A shared library of components, tokens, and guidelines that keeps product UI consistent.
*[Impact mapping]: A planning technique connecting deliverables to the outcomes and actors they serve.
*[Developer Experience]: The experience developers have while using or working on products.
*[Instrumentation]: Application code must emit signals such as traces, metrics, and logs.
*[Progressive delivery]: Progressive delivery gives granular control over how releases reach users.
*[Docs-as-Code]: Documentation managed with the same tools and processes as source code.
*[Testability]: The degree to which a software artifact supports testing.
*[Test pyramid]: Many fast unit tests, fewer integration tests, and a handful of end-to-end tests.
*[Refactoring]: Improving the internal structure of code without changing its observable behavior.
*[Team Topologies]: Organizing teams and their interactions for a fast flow of change.
*[TDD]: Test-driven development.
*[Deployability]: The ability to deploy software predictably and acceptably.
*[DoD]: Definition of Done.
*[Branching strategy]: How a team organizes, merges, and releases branches of code.
*[Self-healing]: Systems detecting and remediating issues without human intervention.
*[Chaos engineering]: Building confidence in a system's resilience by experimenting with injected failures.
*[SRE]: Site Reliability Engineering.
*[DevOps]: Collaboration between development and operations.
*[DevSecOps]: Development, security, and operations.
*[Reliability]: The ability of a system to meet its stated behavior over a specified period and conditions.
*[Observability]: The ability to infer relevant internal conditions from the outputs a system produces.
*[Infrastructure as code]: Infrastructure managed and provisioned through machine-readable definitions.
*[ADRs]: Architecture Decision Records capture the context and consequences of significant design choices.
*[Threat modeling]: Systematically identifying what can go wrong in a design before it is built.
*[Accessibility]: Building products usable by people with the widest range of abilities.
*[Merge queues]: Queues that validate every merge against the latest main before it lands.
*[Contract testing]: Verifying that services honor the expectations their consumers depend on.
*[Coding agents]: AI agents that plan, edit, run, and verify code changes under engineer supervision.
*[Context engineering]: Curating the instructions, tools, and knowledge an AI agent works from.
*[Spec-driven development]: Writing a precise specification that guides and constrains AI-assisted implementation.
*[DORA metrics]: Five measures of software-delivery throughput and instability.
*[FinOps]: Managing and optimizing cloud spend as a shared engineering discipline.
*[GitOps]: Operating infrastructure through declarative definitions continuously reconciled from Git.
*[Platform engineering]: Product-managed internal platforms offering golden paths for delivery teams.
*[SLOs]: Service Level Objectives, reliability targets backed by error budgets.
*[SLIs]: Service Level Indicators, precise measures of service behavior from a user's perspective.
*[Error budgets]: The amount of unreliability permitted by an SLO during its measurement window.
*[Incident response]: Coordinated detection, mitigation, and communication when production misbehaves.
*[Zero trust]: Never trust by network location; authenticate and authorize every access explicitly.
*[Green operations]: Running software to minimize its energy use and carbon footprint.
*[Blameless postmortems]: Learning from incidents without blaming the people involved.
*[Supply chain security]: Protecting the integrity of dependencies, builds, and released artifacts.
*[SBOM]: Software Bill of Materials, an inventory of every component in a build artifact.
*[Structured logging]: Emitting logs as queryable structured events rather than free text.
*[Product analytics]: Measuring product behavior and outcomes against explicit success criteria.
*[Customer feedback]: Evidence gathered directly and indirectly from the people a product serves.
*[Functional requirements]: Observable behavior that users or dependent systems need.
*[Quality attributes]: Measurable constraints such as reliability, performance, security, and usability.
*[NFRs]: Non-functional requirements, the traditional name for quality attributes.
*[Acceptance criteria]: Observable examples that determine whether a requirement is satisfied.
*[Traceability]: Connections among requirements, decisions, tests, releases, and evidence.
*[Quality engineering]: Building quality into design, development, verification, and operation.
*[Configuration management]: Controlling environment-specific settings independently from code.
*[Artifact provenance]: Verifiable information about the source and process that produced an artifact.
*[Database evolution]: Changing schemas and data safely while application versions coexist.
*[Release verification]: Automated checks that establish whether a deployed release is healthy.
*[Rollback & roll-forward]: Complementary strategies for recovering from a harmful release.
*[Dependency management]: Inventorying, evaluating, updating, and retiring third-party components.
*[Accessibility testing]: Evaluating whether people with disabilities can use the product.
*[Security testing]: Combining automated and human checks to verify security controls.
*[Runbooks]: Actionable operational guidance linked to alerts and known failure scenarios.
*[RTOs]: Recovery Time Objectives, the target time for restoring an interrupted capability.
*[RPOs]: Recovery Point Objectives, the acceptable amount of data loss measured in time.
*[Disaster recovery]: Restoring critical services, data, identity, and dependencies after disruption.
*[Secure development lifecycle]: Integrating security requirements and verification throughout delivery.
*[Application security controls]: Controls for identity, access, input, output, data, and error handling.
*[Vulnerability response]: Reporting, triaging, remediating, and learning from vulnerabilities.
*[Continuous profiling]: Repeatedly measuring code-level resource consumption in production.
*[Continuous improvement]: Using product and operational evidence to improve the next cycle of work.
