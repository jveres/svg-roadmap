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
  * Technical Design
    * [Visual Communication](https://c4model.com/) [recommended]
    * Technology scouting
    * [API design-first](https://www.infoq.com/articles/design-first-api-development/) [personal recommendation]
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
  * Branching strategy [recommended]
    * GitFlow [recommended]
    * Trunk-based [recommended]
  * CI/CD
    * [Commit semantics](https://www.conventionalcommits.org/en/v1.0.0/) [recommended]
    * [Feature flags](https://martinfowler.com/articles/feature-toggles.html) [recommended]
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
  * [Deployability](https://insights.sei.cmu.edu/blog/two-categories-of-architecture-patterns-for-deployability/) [recommended]

* :three: Deployment & Operations
*:beginner: High quality software can be shipped more frequently. [DevSecOps](https://www.redhat.com/en/topics/devops/what-is-devsecops) provides continuous delivery and deployment capabilities by bringing developers and IT operations close together.*
  + Infrastructure
    * Monitoring & alerting
    * Infra-as-code [recommended]
    * Auto-scaling [personal recommendation]
    * FinOps [recommended]
  * [Reliability](https://learn.microsoft.com/en-us/azure/well-architected/resiliency/reliability-patterns)
    * SRE [recommended]
    * Self-healing [recommended]
    * Chaos testing [personal recommendation]
    * Backup and restore
  * Security
    * Penetration testing
    * Vulnerability scanning [recommended]
    * Secrets management [recommended]
  * [Observability](https://opentelemetry.io/docs/concepts/observability-primer/#what-is-observability) [insightful]
    * Metrics capturing [recommended]
    * Distributed tracing [recommended]

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
