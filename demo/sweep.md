---
roadmap:
  theme:
    preset: fun
  background:
    enabled: true
    seed: sweep
    density: 0.55
    size: 0.8
    animated: 1.5
---

# Sweep — Software Engineering ++_Essential Practices_++ :broom:

:boom: **SWEEP** keeps your engineering clean: a practical path to better ++**quality**++ at ++**higher speed**++. It all starts with ++**learning**++ and ++**critical thinking**++.

* :one: Discovery & Design
*:beginner: [Product discovery](https://www.svpg.com/product-discovery/) is **crucial** to success. Involve your customers and key stakeholders — discovery decides ==_what_== to create.*
  + [Domain Discovery](https://www.infoq.com/articles/architecture-modernization-domain-driven-discovery/)
    > Before designing anything, learn the business terrain: which domains exist, where their
    > boundaries run, and which ones differentiate you. InfoQ's field guide shows how to run
    > this discovery.
    * [Capability mapping](https://microservices.io/patterns/decomposition/decompose-by-business-capability.html) [personal recommendation]
      > Name what the business must be able to do, independent of any system — those
      > capabilities become candidate module and team boundaries. Richardson's pattern shows the
      > technique.
    * [Context mapping](https://www.infoq.com/articles/ddd-contextmapping/) [recommended]
      > Your domains will overlap and translate badly at the seams; map the bounded contexts and
      > their relationships early, because every seam is a future integration contract.
    * [Event storming](https://www.eventstorming.com/) [recommended]
      > The fastest way to get engineers and domain experts sharing one picture: a wall, sticky
      > notes, and the domain's events in order. Run one before committing to a design.
  * [Product Design](https://www.nngroup.com/articles/design-thinking/)
    > Shape what you build around evidence from users, not opinions in meetings. Design
    > thinking's cycle — empathize, define, ideate, prototype, test — is the loop to
    > internalize.
    * [UI/UX prototyping](https://www.figma.com/) [recommended]
      > Test the flow while it is still cheap to change: a clickable Figma prototype answers
      > usability questions no spec ever will, days before code exists.
    * [User story mapping](https://www.jpattonassociates.com/story-mapping/) [recommended]
      > Flat backlogs hide the product; arrange stories along the user's journey instead, so
      > releases slice into thin end-to-end walking skeletons. Jeff Patton invented the
      > technique.
    * [Impact mapping](https://www.impactmapping.org/) [insightful]
      > Tie every deliverable to an actor and the behavior change you expect from them —
      > features that map to no impact are cut before they cost anything.
    * [Design Sprint](https://designsprintkit.withgoogle.com)
      > When a question is worth a quarter's roadmap, spend five days instead: prototype and
      > test with real customers before you commit the team.
    * [Design systems](https://www.designsystems.com/) [recommended]
      > One shared library of components and tokens keeps every screen consistent and every new
      > feature faster than the last — invest once, reuse everywhere.
    * [Accessibility](https://www.w3.org/WAI/standards-guidelines/wcag/) [recommended]
      > Design it in from the first wireframe — retrofitting is expensive and usually wrong.
      > WCAG is the bar; meeting it improves the product for everyone.
  * [Technical Design](https://martinfowler.com/architecture/)
    > Decide the shapes that are expensive to change — boundaries, data ownership, communication
    > — and postpone everything else. Fowler's guide frames which decisions deserve the effort.
    * [Visual communication](https://c4model.com/) [recommended]
      > An architecture nobody can see is an architecture nobody can critique. C4's four zoom
      > levels give the team one drawing convention from birds-eye to code.
    * [Technology scouting](https://www.thoughtworks.com/radar)
      > Watch the landscape deliberately instead of adopting whatever trends: assess, trial,
      > adopt, hold. The ThoughtWorks Radar models the discipline twice a year.
    * [API design-first](https://www.infoq.com/articles/design-first-api-development/) [personal recommendation]
      > Agree the contract before writing the implementation: consumers review it, mocks unblock
      > parallel work, and the API ends up shaped by its users rather than your database.
    * [ADRs](https://adr.github.io/) [recommended]
      > Future maintainers will ask why — answer them now, in a one-page record per significant
      > decision, with the context and the trade-offs that drove it.
    * [Threat modeling](https://owasp.org/www-community/Threat_Modeling) [recommended]
      > Ask what can go wrong while the design is still on the whiteboard: attackers, assets,
      > entry points. Fixing a flaw here costs a meeting; in production it costs an incident.
  * Team Spirit [insightful]
    * [Psychological safety](https://rework.withgoogle.com/en/guides/understanding-team-effectiveness) [insightful]
      > Google's Project Aristotle found it to be the strongest predictor of team effectiveness:
      > people must be safe to ask, dissent, and admit mistakes — build this before process.
    * [Empowerment](https://www.svpg.com/empowered-product-teams/) [personal favourite]
      > Give teams problems to solve, not features to build — empowered teams discover
      > solutions; feature factories just ship output. Cagan's essay is the reference argument.
    * [Ownership](https://www.scrum.org/resources/blog/how-can-agile-leaders-create-right-context-ownership) [recommended]
      > Ownership is created by context, not demanded: teams that hold their product end to end
      > make better decisions than teams executing someone else's ticket queue.
    * [Accountability](https://www.scrum.org/resources/blog/accountability-quality-agile) [recommended]
      > The counterpart of autonomy: a professional team holds itself to its own definition of
      > done and answers for outcomes, not activity.
    * [Aligned objectives](https://www.svpg.com/team-objectives-overview/) [personal favourite]
      > Autonomous teams still need one direction: outcome-based objectives, assigned with
      > context, keep ten empowered teams from pulling in ten directions.

* :two: Development & Delivery
*:beginner: [Software Engineers](https://en.wikipedia.org/wiki/Software_engineering) strive for better **quality** and embrace practices like [Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/) and [the 12-Factor App](https://12factor.net/). Engineering decisions drive ==_how_== to create.*
  * [Developer Experience](https://developerexperience.io/articles/good-developer-experience) [personal recommendation]
    > Fast feedback, low cognitive load, clear golden paths — DevEx is the compound interest of
    > delivery: every friction you remove pays out on every change forever after.
  * [DevOps](https://martinfowler.com/bliki/DevOpsCulture.html) [recommended]
    > You build it, you run it: shared responsibility between development and operations is the
    > cultural foundation everything else in this chapter stands on.
  * [Team Topologies](https://teamtopologies.com/) [insightful]
    > Organize teams for fast flow: stream-aligned teams own value end to end, platform and
    > enabling teams reduce their load, and interaction modes are chosen deliberately.
  * [QA](https://www.istqb.org/) [insightful]
    > Quality is engineered, not inspected in at the end — but a shared testing vocabulary and
    > discipline still matter; ISTQB provides the common language.
  * [Code review](https://google.github.io/eng-practices/review/) [recommended]
    > Every change gets a second pair of eyes — for correctness, but equally for shared
    > ownership and knowledge spread. Google's practices show how to review without stalling
    > flow.
  * [Branching strategy](https://martinfowler.com/articles/branching-patterns.html) [recommended]
    > How you branch decides how often you integrate, and integration frequency drives delivery
    > performance more than almost anything — choose a strategy, don't inherit one.
    * [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/)
      > The heavyweight classic: release and hotfix branches for versioned, multi-release
      > products. Even its author now points most teams to trunk-based instead.
    * [Trunk-based](https://trunkbaseddevelopment.com/) [recommended]
      > Everyone integrates to one branch at least daily, behind flags when needed — small
      > merges, no long-lived divergence, and the foundation CI/CD actually requires.
  * [CI/CD](https://continuousdelivery.com/)
    > Make releasing boring: every commit builds, tests, and can deploy through one automated
    > pipeline, so shipping is a routine decision rather than an event.
    * [Commit semantics](https://www.conventionalcommits.org/en/v1.0.0/) [recommended]
      > Structured commit messages (feat:, fix:, breaking) turn history into data — changelogs
      > and releases generate themselves.
    * [Feature flags](https://martinfowler.com/articles/feature-toggles.html) [recommended]
      > Decouple deploy from release: unfinished work ships dark, risky changes roll out
      > gradually, and rollback is a toggle. Budget for flag cleanup or they become debt.
    * [Merge queues](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
      > At scale, green PRs still break main when they land together; a merge queue validates
      > each merge against the latest main before it lands, keeping trunk always releasable.
  * FRs
  * [NFRs](https://en.wikipedia.org/wiki/Non-functional_requirement)
    > Performance, security, operability — the qualities that shape the architecture more than
    > any feature does. Make them explicit and testable, or they silently become 'slow and
    > down'.
  * DoR
  * [DoD](https://www.scrum.org/resources/blog/walking-through-definition-done)
    > One shared answer to 'is it actually done?' — tested, reviewed, documented, deployed.
    > Without it, every done means something different.
  * SCM
    * [Git](https://git-scm.com) [personal recommendation]
      > The substrate of modern delivery; learn it beyond commit and push — history surgery,
      > bisect, and reflog pay for themselves the first bad week.
  * [Progressive delivery](https://launchdarkly.com/blog/what-is-progressive-delivery-all-about/)
    > Release to 1% before 100%: canaries, rings, and targeting contain the blast radius of
    > every change, with metrics deciding each next step.

  * [Architecture patterns](https://en.wikipedia.org/wiki/Architectural_pattern)
    > Layers, events, microservices — patterns are a vocabulary of trade-offs, not badges; know
    > them well enough to pick the boring one that fits.
  * [Coding conventions](https://en.wikipedia.org/wiki/Coding_conventions) [recommended]
    > Consistency is a team feature: shared conventions make every file feel familiar and free
    > reviews to discuss substance instead of style.
    * [Linting](https://en.wikipedia.org/wiki/Lint_(software))
      > Machines catch the mechanical bugs and smells before humans ever look — a linter in the
      > pipeline is the cheapest reviewer you will ever hire.
    * [Formatting](https://editorconfig.org/)
      > Automate style entirely out of discussion: one formatter config in the repo
      > (EditorConfig at minimum) and no human ever argues whitespace again.
    * [Coding style](https://google.github.io/styleguide/)
      > Where conventions need judgment — naming, idioms, structure — write them down. Google's
      > public style guides show what battle-tested guidance looks like.
  * [Refactoring](https://refactoring.com/) [recommended]
    > Improve structure in small, behavior-preserving steps as part of daily work — not as a
    > big-bang project you must ask permission for. Fowler's catalog names the moves.
  * Versioning
    * [Semver](https://semver.org/) [recommended]
      > MAJOR.MINOR.PATCH is a promise to your consumers about what may break; version numbers
      > become contracts instead of marketing.
  * [Instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/) [insightful]
    > Telemetry is a feature you build, not an agent you bolt on: emit spans, metrics, and logs
    > from your own code at the source, and chapter three becomes possible.
    * [OpenTelemetry](https://opentelemetry.io/) :telescope: [personal recommendation]
      > The vendor-neutral standard for every signal — instrument once, point it at any backend,
      > and never rewrite telemetry when tooling changes.
  * [Docs-as-Code](https://www.writethedocs.org/guide/docs-as-code/) [recommended]
    > Docs live where code lives: versioned, reviewed in PRs, published by the pipeline — the
    > only documentation that stays true is the kind that ships with the change.
    * [Markdown](https://www.markdownguide.org/) [personal favourite]
      > The lingua franca of docs-as-code: plain text that diffs, reviews, and renders
      > everywhere.
  * [Testability](https://martinfowler.com/testing/) [recommended]
    > Design code so it can be tested — seams, injectable dependencies, honest boundaries;
    > testability pressure is design feedback, not overhead.
    * [TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
      > Red, green, refactor: writing the test first forces the design conversation before the
      > implementation hardens, and leaves a regression net behind.
    * [Contract testing](https://docs.pact.io/)
      > Verify that each service honours what its consumers actually depend on — catching
      > integration breaks in seconds without spinning up the whole stack.
    * [Test pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) [recommended]
      > Many fast unit tests, fewer integration tests, a handful end-to-end — invert it and you
      > get slow, flaky suites nobody trusts. Vocke's article is the practical guide.
  * [Deployability](https://www.sei.cmu.edu/blog/two-categories-of-architecture-patterns-for-deployability/) [recommended]
    > Architect so any component can deploy independently and safely — deployability is a design
    > property you build in, not an ops problem you discover later.
  * AI-assisted engineering [insightful]
    > The defining shift since 2023: agents plan, edit, and verify code under
    > engineer supervision. Start here after your delivery flow is solid.
    * [Coding agents](https://martinfowler.com/articles/exploring-gen-ai.html) [personal recommendation]
      > The 2023-onward shift: agents plan, edit, and verify code under your supervision. Treat
      > them as capable pairs whose work you review, and learn their failure modes.
    * [Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) [recommended]
      > An agent is only as good as what it can see: curate the instructions, tools, and
      > knowledge in its context deliberately — this is the new craft of working with AI.
    * [Spec-driven development](https://github.com/github/spec-kit)
      > Write the specification precisely enough to constrain an agent, then let implementation
      > flow from it — GitHub's Spec Kit turns the idea into a working method.
  * [DORA metrics](https://dora.dev/) [recommended]
    > Four numbers — deployment frequency, lead time, change failure rate, time to restore —
    > that measure your delivery system honestly and tell you which capability to improve next.

* :three: Deployment & Operations
*:beginner: High-quality software can ship frequently and safely — and stay ==_running_==. [DevSecOps](https://www.redhat.com/en/topics/devops/what-is-devsecops) provides continuous delivery and deployment capabilities by bringing development, security, and operations together.*
  + [Infrastructure](https://aws.amazon.com/architecture/well-architected/)
    > Run on foundations you can reason about: the Well-Architected pillars — operations,
    > security, reliability, performance, cost, sustainability — are the checklist for this
    > whole column.
    * [Monitoring & alerting](https://sre.google/sre-book/monitoring-distributed-systems/)
      > Watch the four golden signals and alert on user-visible symptoms, not causes — a page
      > should always mean a human decision is needed right now.
    * [Infra-as-code](https://martinfowler.com/bliki/InfrastructureAsCode.html) [recommended]
      > Infrastructure belongs in version control like everything else: reviewed, repeatable,
      > and rebuildable from scratch — console clicks are unrecorded outages waiting to happen.
    * [GitOps](https://opengitops.dev/) [recommended]
      > Declare the desired state in Git and let controllers continuously reconcile reality to
      > it — deployments become pull requests, and drift fixes itself.
    * [Platform engineering](https://platformengineering.org/) [insightful]
      > Pave the golden path: an internal platform, run as a product, lets stream teams ship
      > without each reinventing infrastructure — and without ticket-ops in between.
    * [Auto-scaling](https://en.wikipedia.org/wiki/Autoscaling) [personal recommendation]
      > Match capacity to demand automatically, in both directions — paying for idle peak
      > capacity is as unnecessary as falling over at the real peak.
    * [FinOps](https://www.finops.org/) [recommended]
      > Cloud spend is an engineering signal: give teams visibility and ownership of their cost,
      > and efficiency becomes part of design instead of a finance escalation.
    * [Green operations](https://greensoftware.foundation/) [insightful]
      > Carbon is the next budget: carbon-aware scheduling and energy-efficient design are
      > becoming table stakes — the Green Software Foundation collects the patterns.
  * [Reliability](https://learn.microsoft.com/en-us/azure/well-architected/reliability/design-patterns)
    > Assume everything fails and design for it: retries with backoff, bulkheads, circuit
    > breakers — Microsoft's pattern catalog is a practical menu.
    * [SRE](https://sre.google/) [recommended]
      > Operations as a software problem: engineers automate away toil and error budgets decide
      > when to ship versus stabilize. Google's free SRE books define the discipline.
    * [SLOs](https://sre.google/sre-book/service-level-objectives/) [recommended]
      > Pick the reliability level users actually need, measure it, and spend the error budget
      > deliberately — SLOs turn 'is it reliable enough?' into an engineering decision.
    * Self-healing [recommended]
      > Prefer systems that remediate themselves — restarts, failover, reconciliation — so
      > humans handle the novel failures, not the routine ones.
    * [Chaos engineering](https://principlesofchaos.org/) [personal recommendation]
      > Inject failure on purpose, in controlled experiments, before production does it for you
      > at 3 a.m. — confidence in resilience is earned, not assumed.
    * [Incident response](https://sre.google/sre-book/managing-incidents/) [recommended]
      > When production breaks, structure beats heroics: clear roles, one incident commander,
      > calm communication. Practice the choreography before you need it.
    * [Blameless postmortems](https://sre.google/sre-book/postmortem-culture/) [recommended]
      > After every incident, fix the system rather than the person: blame buries the
      > information you need most. Google's postmortem culture chapter shows how.
    * [Backup and restore](https://learn.microsoft.com/en-us/azure/well-architected/reliability/disaster-recovery)
      > A backup you have never restored is a hope, not a plan: define recovery time and point
      > objectives, then rehearse the restore path until it is boring.
  * [Security](https://owasp.org/)
    > Security is a property of the whole pipeline, not a final gate: shift it left into design,
    > dependencies, and deployment. OWASP is the community hub for all of it.
    * [Zero trust](https://csrc.nist.gov/pubs/sp/800/207/final) [insightful]
      > Never trust by network location: authenticate and authorize every access explicitly, as
      > if the perimeter were already breached — NIST 800-207 is the reference architecture.
    * [Penetration testing](https://owasp.org/www-project-web-security-testing-guide/)
      > Invite the attack before attackers do: regular authorized probes find what reviews and
      > scanners miss. OWASP's testing guide is the playbook.
    * [Vulnerability scanning](https://owasp.org/www-community/Vulnerability_Scanning_Tools) [recommended]
      > Continuously scan code, dependencies, and images in the pipeline — known CVEs are the
      > cheapest vulnerabilities you will ever fix, if you find them first.
    * [Secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) [recommended]
      > No credentials in code, config, or chat: store secrets in a vault, rotate them
      > routinely, and audit access — one leaked key can undo everything else here.
    * [Supply chain security](https://slsa.dev/) [recommended]
      > Your build is only as trustworthy as its least trustworthy dependency: SLSA's levels
      > harden the path from source to artifact against tampering.
    * [SBOM](https://www.cisa.gov/sbom)
      > Keep an ingredient list for every artifact — when the next Log4Shell lands, you want to
      > answer 'are we affected?' in minutes, not weeks.
  * [Observability](https://opentelemetry.io/docs/concepts/observability-primer/#what-is-observability) [insightful]
    > Instrumented signals from chapter two pay off here: understand any system state from the
    > outside, without shipping new code to ask the question.
    * [Metrics capturing](https://opentelemetry.io/docs/concepts/signals/metrics/) [recommended]
      > Aggregated measurements power dashboards, alerts, and capacity planning — capture them
      > consistently and they become the system's vital signs.
    * [Distributed tracing](https://opentelemetry.io/docs/concepts/signals/traces/) [recommended]
      > One request, every hop: traces turn 'something is slow somewhere' into 'this call, in
      > this service, this long'.
    * [Structured logging](https://opentelemetry.io/docs/concepts/signals/logs/) [recommended]
      > Log events as structured data, correlated with traces — grep gives way to queries, and
      > debugging distributed systems stops being archaeology.

## Keep ++**sweeping**++ :sparkles:

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
*[FRs]: Functional requirements.
*[NFRs]: Non-functional requirements.
*[DoR]: Definition of Ready.
*[DoD]: Definition of Done.
*[SCM]: Source Code Management.
*[Branching strategy]: How a team organizes, merges, and releases branches of code.
*[Self-healing]: Systems detecting and remediating issues without human intervention.
*[Chaos engineering]: Building confidence in a system's resilience by experimenting with injected failures.
*[SRE]: Site Reliability Engineering.
*[DevOps]: Collaboration between development and operations.
*[DevSecOps]: Development, security, and operations.
*[Reliability]: The ability of a system to perform consistently under expected conditions.
*[Observability]: Observability lets us understand a system from the outside without knowing its inner workings.
*[Infra-as-code]: Infrastructure managed and provisioned through machine-readable definition files.
*[ADRs]: Architecture Decision Records capture the context and consequences of significant design choices.
*[Threat modeling]: Systematically identifying what can go wrong in a design before it is built.
*[Accessibility]: Building products usable by people with the widest range of abilities.
*[Merge queues]: Queues that validate every merge against the latest main before it lands.
*[Contract testing]: Verifying that services honour the expectations their consumers depend on.
*[Coding agents]: AI agents that plan, edit, run, and verify code changes under engineer supervision.
*[Context engineering]: Curating the instructions, tools, and knowledge an AI agent works from.
*[Spec-driven development]: Writing a precise specification that guides and constrains AI-assisted implementation.
*[DORA metrics]: Deployment frequency, lead time, change failure rate, and time to restore.
*[FinOps]: Managing and optimizing cloud spend as a shared engineering discipline.
*[GitOps]: Operating infrastructure through declarative definitions continuously reconciled from Git.
*[Platform engineering]: Product-managed internal platforms offering golden paths for delivery teams.
*[SLOs]: Service Level Objectives, reliability targets backed by error budgets.
*[Incident response]: Coordinated detection, mitigation, and communication when production misbehaves.
*[Zero trust]: Never trust by network location; authenticate and authorize every access explicitly.
*[Green operations]: Running software to minimize its energy use and carbon footprint.
*[Blameless postmortems]: Learning from incidents without blaming the people involved.
*[Supply chain security]: Protecting the integrity of dependencies, builds, and released artifacts.
*[SBOM]: Software Bill of Materials, an inventory of every component in a build artifact.
*[Structured logging]: Emitting logs as queryable structured events rather than free text.
