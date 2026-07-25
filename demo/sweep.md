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
    > A field guide to discovering domains, subdomains, and boundaries when modernizing an
    > architecture.
    * [Capability mapping](https://microservices.io/patterns/decomposition/decompose-by-business-capability.html) [personal recommendation]
      > Chris Richardson's pattern: decompose a system by the business capabilities it must
      > provide.
    * [Context mapping](https://www.infoq.com/articles/ddd-contextmapping/) [recommended]
      > The DDD technique for mapping how bounded contexts — and the teams behind them — relate.
    * [Event storming](https://www.eventstorming.com/) [recommended]
      > Alberto Brandolini's workshop format: explore a whole domain by mapping its events on a
      > wall, together.
  * [Product Design](https://www.nngroup.com/articles/design-thinking/)
    > Nielsen Norman Group's primer on design thinking: empathize, define, ideate, prototype,
    > test.
    * [UI/UX prototyping](https://www.figma.com/) [recommended]
      > The de facto collaborative design tool: prototype and test flows before writing any
      > code.
    * [User story mapping](https://www.jpattonassociates.com/story-mapping/) [recommended]
      > Jeff Patton's technique for arranging stories along the user journey to see the whole
      > product.
    * [Impact mapping](https://www.impactmapping.org/) [insightful]
      > Gojko Adzic's planning technique: connect deliverables to actors, impacts, and business
      > goals.
    * [Design Sprint](https://designsprintkit.withgoogle.com)
      > Google Ventures' five-day process for answering critical questions by prototyping with
      > customers.
    * [Design systems](https://www.designsystems.com/) [recommended]
      > A guide collection on building and scaling shared component libraries, tokens, and
      > guidelines.
    * [Accessibility](https://www.w3.org/WAI/standards-guidelines/wcag/) [recommended]
      > The Web Content Accessibility Guidelines: the standard for products usable by everyone.
  * [Technical Design](https://martinfowler.com/architecture/)
    > Martin Fowler's guide to software architecture: what it is, and why the boring parts
    > matter.
    * [Visual communication](https://c4model.com/) [recommended]
      > Simon Brown's C4 model: context, containers, components, code — four zoom levels for
      > diagrams.
    * [Technology scouting](https://www.thoughtworks.com/radar)
      > ThoughtWorks' twice-yearly opinionated map of techniques, tools, platforms, and
      > languages.
    * [API design-first](https://www.infoq.com/articles/design-first-api-development/) [personal recommendation]
      > Why designing the API contract before implementing it produces better, consumer-friendly
      > APIs.
    * [ADRs](https://adr.github.io/) [recommended]
      > Architecture Decision Records: small documents capturing one decision, its context, and
      > consequences.
    * [Threat modeling](https://owasp.org/www-community/Threat_Modeling) [recommended]
      > OWASP's overview of structured ways to find what can go wrong in a design before it is
      > built.
  * Team Spirit [insightful]
    * [Psychological safety](https://rework.withgoogle.com/en/guides/understanding-team-effectiveness) [insightful]
      > Google's Project Aristotle found psychological safety to be the strongest predictor of
      > team effectiveness.
    * [Empowerment](https://www.svpg.com/empowered-product-teams/) [personal favourite]
      > Marty Cagan on empowered product teams: given problems to solve, not features to build.
    * [Ownership](https://www.scrum.org/resources/blog/how-can-agile-leaders-create-right-context-ownership) [recommended]
      > How leaders create the context in which teams genuinely own their product and process.
    * [Accountability](https://www.scrum.org/resources/blog/accountability-quality-agile) [recommended]
      > Accountability and quality go together: professional teams hold themselves to their own
      > definition of done.
    * [Aligned objectives](https://www.svpg.com/team-objectives-overview/) [personal favourite]
      > Team objectives done right: outcome-based goals assigned to empowered teams, not feature
      > lists.

* :two: Development & Delivery
*:beginner: [Software Engineers](https://en.wikipedia.org/wiki/Software_engineering) strive for better **quality** and embrace practices like [Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/) and [the 12-Factor App](https://12factor.net/). Engineering decisions drive ==_how_== to create.*
  * [Developer Experience](https://developerexperience.io/articles/good-developer-experience) [personal recommendation]
    > What good developer experience feels like: fast feedback, low cognitive load, clear golden
    > paths.
  * [DevOps](https://martinfowler.com/bliki/DevOpsCulture.html) [recommended]
    > Fowler on DevOps culture: shared responsibility and automation over wall-throwing silos.
  * [Team Topologies](https://teamtopologies.com/) [insightful]
    > Four team types and three interaction modes for organizing teams around a fast flow of
    > change.
  * [QA](https://www.istqb.org/) [insightful]
    > The international software testing qualification body: shared vocabulary, syllabi, and
    > certifications.
  * [Code review](https://google.github.io/eng-practices/review/) [recommended]
    > Google's engineering practices: how to do code review well, as author and as reviewer.
  * [Branching strategy](https://martinfowler.com/articles/branching-patterns.html) [recommended]
    > Fowler's catalog of branching patterns and the trade-offs behind integration frequency.
    * [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/)
      > The original Gitflow post — including the author's own note that trunk-based often fits
      > better today.
    * [Trunk-based](https://trunkbaseddevelopment.com/) [recommended]
      > One shared branch, short-lived feature branches, feature flags: the reference site for
      > trunk-based development.
  * [CI/CD](https://continuousdelivery.com/)
    > Jez Humble's home for continuous delivery: shipping reliably, repeatably, and at low risk.
    * [Commit semantics](https://www.conventionalcommits.org/en/v1.0.0/) [recommended]
      > A lightweight commit-message convention that both machines and humans can parse.
    * [Feature flags](https://martinfowler.com/articles/feature-toggles.html) [recommended]
      > Pete Hodgson's definitive guide to feature toggles: categories, dynamics, and hygiene.
    * [Merge queues](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
      > GitHub's merge queue validates every pull request against the latest main before it
      > lands.
  * FRs
  * [NFRs](https://en.wikipedia.org/wiki/Non-functional_requirement)
    > Non-functional requirements: the quality attributes — performance, security, operability —
    > that shape design.
  * DoR
  * [DoD](https://www.scrum.org/resources/blog/walking-through-definition-done)
    > A walkthrough of crafting a Definition of Done that a team can actually honor.
  * SCM
    * [Git](https://git-scm.com) [personal recommendation]
      > The distributed version control system underneath nearly everything; docs plus the free
      > Pro Git book.
  * [Progressive delivery](https://launchdarkly.com/blog/what-is-progressive-delivery-all-about/)
    > Rolling changes out gradually with canaries, rings, and targeting instead of big-bang
    > releases.

  * [Architecture patterns](https://en.wikipedia.org/wiki/Architectural_pattern)
    > A catalog of reusable solutions to recurring architecture problems, from layers to
    > microservices.
  * [Coding conventions](https://en.wikipedia.org/wiki/Coding_conventions) [recommended]
    > Why shared conventions matter and what they typically cover, from naming to file layout.
    * [Linting](https://en.wikipedia.org/wiki/Lint_(software))
      > Static analysis that flags bugs, smells, and style violations before a human ever
      > reviews.
    * [Formatting](https://editorconfig.org/)
      > EditorConfig: one file that keeps whitespace and encoding consistent across every
      > editor.
    * [Coding style](https://google.github.io/styleguide/)
      > Google's public style guides for every major language, battle-tested at scale.
  * [Refactoring](https://refactoring.com/) [recommended]
    > Fowler's home for refactoring: improving design in small, behavior-preserving steps.
  * Versioning
    * [Semver](https://semver.org/) [recommended]
      > MAJOR.MINOR.PATCH: the versioning contract that tells consumers what a release may
      > break.
  * [Instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/) [insightful]
    > OpenTelemetry's guide to instrumenting your own services: spans, metrics, and logs at the
    > source.
    * [OpenTelemetry](https://opentelemetry.io/) :telescope: [personal recommendation]
      > The vendor-neutral standard for traces, metrics, and logs: one SDK, any backend.
  * [Docs-as-Code](https://www.writethedocs.org/guide/docs-as-code/) [recommended]
    > Write the Docs' guide: documentation in version control, reviewed and shipped like code.
    * [Markdown](https://www.markdownguide.org/) [personal favourite]
      > The reference guide for Markdown syntax and its extensions.
  * [Testability](https://martinfowler.com/testing/) [recommended]
    > Fowler's map of software testing: test shapes, doubles, and strategies in one place.
    * [TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
      > Red, green, refactor: Fowler's summary of test-driven development and its rhythm.
    * [Contract testing](https://docs.pact.io/)
      > Pact verifies that services honour the expectations their consumers depend on — without
      > full-stack tests.
    * [Test pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) [recommended]
      > The practical test pyramid: many fast unit tests, fewer integration tests, a handful
      > end-to-end.
  * [Deployability](https://www.sei.cmu.edu/blog/two-categories-of-architecture-patterns-for-deployability/) [recommended]
    > SEI on the architecture patterns that make software independently and safely deployable.
  * AI-assisted engineering [insightful]
    > The defining shift since 2023: agents plan, edit, and verify code under
    > engineer supervision. Start here after your delivery flow is solid.
    * [Coding agents](https://martinfowler.com/articles/exploring-gen-ai.html) [personal recommendation]
      > Fowler and colleagues' running memos on what actually works when building software with
      > GenAI.
    * [Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) [recommended]
      > Anthropic's guide to curating the instructions, tools, and knowledge that make agents
      > effective.
    * [Spec-driven development](https://github.com/github/spec-kit)
      > GitHub's Spec Kit: write an executable specification first, then let agents implement
      > against it.
  * [DORA metrics](https://dora.dev/) [recommended]
    > DORA's research program: the four keys, and the capabilities proven to improve them.

* :three: Deployment & Operations
*:beginner: High-quality software can ship frequently and safely — and stay ==_running_==. [DevSecOps](https://www.redhat.com/en/topics/devops/what-is-devsecops) provides continuous delivery and deployment capabilities by bringing development, security, and operations together.*
  + [Infrastructure](https://aws.amazon.com/architecture/well-architected/)
    > The Well-Architected pillars: operational excellence, security, reliability, performance,
    > cost, sustainability.
    * [Monitoring & alerting](https://sre.google/sre-book/monitoring-distributed-systems/)
      > The SRE book on monitoring: four golden signals, symptoms versus causes, alert on user
      > pain.
    * [Infra-as-code](https://martinfowler.com/bliki/InfrastructureAsCode.html) [recommended]
      > Fowler on defining infrastructure in versioned, testable code instead of console clicks.
    * [GitOps](https://opengitops.dev/) [recommended]
      > The four OpenGitOps principles: declarative, versioned, automatically pulled,
      > continuously reconciled.
    * [Platform engineering](https://platformengineering.org/) [insightful]
      > The community hub for internal developer platforms and the golden paths they pave.
    * [Auto-scaling](https://en.wikipedia.org/wiki/Autoscaling) [personal recommendation]
      > Matching capacity to demand automatically: scale out, scale in, scheduled or reactive.
    * [FinOps](https://www.finops.org/) [recommended]
      > The FinOps Foundation: practices for making cloud spend a shared engineering concern.
    * [Green operations](https://greensoftware.foundation/) [insightful]
      > The Green Software Foundation: standards and patterns for carbon-aware, energy-efficient
      > software.
  * [Reliability](https://learn.microsoft.com/en-us/azure/well-architected/reliability/design-patterns)
    > Microsoft's catalog of reliability design patterns: retries, bulkheads, circuit breakers,
    > and more.
    * [SRE](https://sre.google/) [recommended]
      > Google's Site Reliability Engineering hub: the books that defined the discipline, free
      > online.
    * [SLOs](https://sre.google/sre-book/service-level-objectives/) [recommended]
      > The SRE book chapter on service level objectives and the error budgets they fund.
    * Self-healing [recommended]
    * [Chaos engineering](https://principlesofchaos.org/) [personal recommendation]
      > The manifesto: build confidence by experimenting on a system under production-like
      > conditions.
    * [Incident response](https://sre.google/sre-book/managing-incidents/) [recommended]
      > The SRE book on managing incidents: clear roles, incident command, and calm
      > communication.
    * [Blameless postmortems](https://sre.google/sre-book/postmortem-culture/) [recommended]
      > The SRE book's case for postmortems that fix systems instead of blaming people.
    * [Backup and restore](https://learn.microsoft.com/en-us/azure/well-architected/reliability/disaster-recovery)
      > Designing for disaster recovery: recovery time and point objectives, and restore paths
      > you have tested.
  * [Security](https://owasp.org/)
    > OWASP: the open community behind the Top 10, the cheat sheet series, and the testing
    > guides.
    * [Zero trust](https://csrc.nist.gov/pubs/sp/800/207/final) [insightful]
      > NIST SP 800-207, the zero trust architecture reference: verify explicitly, never by
      > network location.
    * [Penetration testing](https://owasp.org/www-project-web-security-testing-guide/)
      > OWASP's Web Security Testing Guide: the standard playbook for probing web applications.
    * [Vulnerability scanning](https://owasp.org/www-community/Vulnerability_Scanning_Tools) [recommended]
      > OWASP's overview of vulnerability scanning tools and where they fit in the pipeline.
    * [Secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) [recommended]
      > OWASP's cheat sheet for storing, rotating, and auditing secrets properly.
    * [Supply chain security](https://slsa.dev/) [recommended]
      > SLSA: a maturity ladder for protecting artifacts all the way from source to deployment.
    * [SBOM](https://www.cisa.gov/sbom)
      > CISA on software bills of materials: an ingredient list for every build artifact.
  * [Observability](https://opentelemetry.io/docs/concepts/observability-primer/#what-is-observability) [insightful]
    > OpenTelemetry's primer: understanding a system from the outside, without shipping new code
    > to ask.
    * [Metrics capturing](https://opentelemetry.io/docs/concepts/signals/metrics/) [recommended]
      > OpenTelemetry metrics: aggregated measurements feeding dashboards, alerts, and trends.
    * [Distributed tracing](https://opentelemetry.io/docs/concepts/signals/traces/) [recommended]
      > OpenTelemetry traces: follow a single request across every service it touches.
    * [Structured logging](https://opentelemetry.io/docs/concepts/signals/logs/) [recommended]
      > OpenTelemetry logs: structured events correlated with the traces and metrics around
      > them.

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
