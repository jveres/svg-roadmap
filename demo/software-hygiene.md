---
roadmap:
  theme:
    preset: fun
  background:
    enabled: true
    seed: software-hygiene
    density: 0.55
    size: 0.8
    animated: 1.5
---

# Software Engineering ++_Hygiene_++ :soap:

:boom: **SwEH** is a practical engineering approach for producing better software ++**quality**++ at ++**faster speed**++. It all starts by ++**learning**++ and ++**critical thinking**++.

* :one: Discovery & Design
*:beginner: Product discovery is **crucial** to success. Involve your customers and your key people. [Product Owners](https://www.scrum.org/resources/what-is-a-product-owner) decide about ==_what_== to create.*
  + [Domain Discovery](https://www.infoq.com/articles/architecture-modernization-domain-driven-discovery/)
    * [Capability mapping](https://microservices.io/patterns/decomposition/decompose-by-business-capability.html) [personal recommendation]
    * [Context mapping](https://www.infoq.com/articles/ddd-contextmapping/) [recommended]
    * [Event storming](https://www.eventstorming.com/) [recommended]
  * Product Design
    * [UI/UX prototyping](https://figma.com/) [recommended]
    * [User story mapping](https://www.agilealliance.org/glossary/storymap) [recommended]
    * [Design Sprint](https://designsprintkit.withgoogle.com)
    * [Accessibility](https://www.w3.org/WAI/standards-guidelines/wcag/) [recommended]
  * Technical Design
    * [Visual Communication](https://c4model.com/) [recommended]
    * Technology scouting
    * [API design-first](https://www.infoq.com/articles/design-first-api-development/) [personal recommendation]
    * [ADRs](https://adr.github.io/) [recommended]
    * [Threat modeling](https://owasp.org/www-community/Threat_Modeling) [recommended]
  * Team Spirit [insightful]
    * [Empowerment](https://www.svpg.com/empowered-product-teams/) [personal favourite]
    * [Ownership](https://www.scrum.org/resources/blog/how-can-agile-leaders-create-right-context-ownership) [recommended]
    * [Accountability](https://www.scrum.org/resources/blog/accountability-quality-agile) [recommended]
    * [Aligned objectives](https://www.svpg.com/team-objectives-overview/) [personal favourite]

* :two: Development & Delivery
*:beginner: [Software Engineers](https://en.wikipedia.org/wiki/Software_engineering) strive for better **quality** and favour things like [Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/) and [12factors](https://12factor.net/). Engineering decisions drive ==_how_== to create.*
  * [Developer Experience](https://developerexperience.io/articles/good-developer-experience) [personal recommendation]
  * [DevOps](https://martinfowler.com/bliki/DevOpsCulture.html) [recommended]
  * [QA](https://github.com/jveres/diagen-QA) [insightful]
  * [Code review](https://google.github.io/eng-practices/review/) [recommended]
  * Branching strategy [recommended]
    * GitFlow
    * Trunk-based [recommended]
  * CI/CD
    * [Commit semantics](https://www.conventionalcommits.org/en/v1.0.0/) [recommended]
    * [Feature flags](https://martinfowler.com/articles/feature-toggles.html) [recommended]
    * Merge queues
  * FRs
  * NFRs
  * DoR
  * DoD
  * SCM
    * [Git](https://git-scm.com) [personal recommendation]
  * Progressive delivery

  * [Architecture patterns](https://en.wikipedia.org/wiki/Architectural_pattern)
  * [Coding conventions](https://en.wikipedia.org/wiki/Coding_conventions) [recommended]
    * Linting
    * Formatting
    * Coding Style
  * Version Control
    * [Semver](https://semver.org/) [recommended]
  * Instrumentation [insightful]
    * [OpenTelemetry](https://opentelemetry.io/) :telescope: [personal recommendation]
  * Docs-as-Code [recommended]
    * [Markdown](https://www.markdownguide.org/) [personal favourite]
  * Testability [recommended]
    * [TDD](https://en.wikipedia.org/wiki/Test-driven_development)
    * [Contract testing](https://docs.pact.io/)
  * [Deployability](https://insights.sei.cmu.edu/blog/two-categories-of-architecture-patterns-for-deployability/) [recommended]
  * AI-assisted engineering [insightful]
    > The defining shift since 2023: agents plan, edit, and verify code under
    > engineer supervision. Start here after your delivery flow is solid.
    * [Coding agents](https://martinfowler.com/articles/exploring-gen-ai.html) [personal recommendation]
    * [Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) [recommended]
    * Spec-driven development
  * [DORA metrics](https://dora.dev/) [recommended]

* :three: Deployment & Operations
*:beginner: High quality software can be shipped more frequently. [DevSecOps](https://www.redhat.com/en/topics/devops/what-is-devsecops) provides continuous delivery and deployment capabilities by bringing developers and IT operations close together.*
  + Infrastructure
    * Monitoring & alerting
    * Infra-as-code [recommended]
    * [GitOps](https://opengitops.dev/) [recommended]
    * [Platform engineering](https://platformengineering.org/) [insightful]
    * Auto-scaling [personal recommendation]
    * FinOps [recommended]
  * [Reliability](https://learn.microsoft.com/en-us/azure/well-architected/resiliency/reliability-patterns)
    * SRE [recommended]
    * [SLOs](https://sre.google/sre-book/service-level-objectives/) [recommended]
    * Self-healing [recommended]
    * Chaos testing [personal recommendation]
    * [Blameless postmortems](https://sre.google/sre-book/postmortem-culture/) [recommended]
    * Backup and restore
  * Security
    * Penetration testing
    * Vulnerability scanning [recommended]
    * Secrets management [recommended]
    * [Supply chain security](https://slsa.dev/) [recommended]
    * [SBOM](https://www.cisa.gov/sbom)
  * [Observability](https://opentelemetry.io/docs/concepts/observability-primer/#what-is-observability) [insightful]
    * Metrics capturing [recommended]
    * Distributed tracing [recommended]
    * Structured logging [recommended]

## Keep ++**improving**++ :recycle:

*[Technology scouting]: Technology scouting identifies and evaluates emerging technology.
*[Developer Experience]: The experience developers have while using or working on products.
*[Instrumentation]: Application code must emit signals such as traces, metrics, and logs.
*[Progressive delivery]: Progressive delivery allows granular control over software delivery.
*[Docs-as-Code]: Documentation managed with the same tools and processes as source code.
*[Testability]: The degree to which a software artifact supports testing.
*[TDD]: Test-driven development.
*[Deployability]: The ability to deploy software predictably and acceptably.
*[FRs]: Functional requirements.
*[NFRs]: Non-functional requirements.
*[DoR]: Definition of Ready.
*[DoD]: Definition of Done.
*[SCM]: Source Code Management.
*[Branching strategy]: A branching strategy is the strategy that software development teams adopt when writing, merging, and deploying code.
*[Self-healing]: Systems detecting and remediating issues without human intervention.
*[Chaos testing]: A disciplined approach to testing system integrity by proactively simulating failures.
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
*[DORA metrics]: Deployment frequency, lead time, change-fail rate, and time to restore.
*[GitOps]: Operating infrastructure through declarative definitions continuously reconciled from Git.
*[Platform engineering]: Product-managed internal platforms offering golden paths for delivery teams.
*[SLOs]: Service Level Objectives, reliability targets backed by error budgets.
*[Blameless postmortems]: Learning from incidents without blaming the people involved.
*[Supply chain security]: Protecting the integrity of dependencies, builds, and released artifacts.
*[SBOM]: Software Bill of Materials, an inventory of every component in a build artifact.
*[Structured logging]: Emitting logs as queryable structured events rather than free text.
