---
roadmap:
  theme:
    preset: pro
---

# AI ++_Architect_++ :robot:

:sparkles: An **AI Architect** designs systems that put ++**foundation models**++ to work — reliably, safely, and at ++**sustainable cost**++. Learn the ++**fundamentals**++, design the ++**system**++, then run it in ++**production**++.

* :one: Foundations
*:beginner: Architecture decisions start with model ==_capabilities_== and ==_limits_==. Understand how [transformers](https://arxiv.org/abs/1706.03762) behave before designing around them.*
  + Model Landscape
    * [LLMs](https://en.wikipedia.org/wiki/Large_language_model) [recommended]
    * [Embeddings](https://en.wikipedia.org/wiki/Sentence_embedding) [recommended]
    * Multimodal models
    * Reasoning models [insightful]
  * Working with Models
    * [Prompt engineering](https://www.promptingguide.ai/) [recommended]
    * Structured output [personal recommendation]
    * Sampling parameters
    * Fine-tuning vs prompting [insightful]
  * Core Concepts
    * Context windows
    * [Tokenization](https://en.wikipedia.org/wiki/Large_language_model#Tokenization)
    * [Scaling laws](https://arxiv.org/abs/2001.08361) [insightful]
    * Hallucination
  * Responsible AI [insightful]
    * [Alignment](https://en.wikipedia.org/wiki/AI_alignment)
    * Bias & fairness
    * [Model cards](https://arxiv.org/abs/1810.03993) [recommended]

* :two: System Design
*:beginner: Most value comes from **composition**: grounding models in your data, giving them tools, and checking their work. [Simple, composable patterns](https://www.anthropic.com/engineering/building-effective-agents) beat frameworks.*
  * [RAG](https://arxiv.org/abs/2005.11401) [personal recommendation]
    * [Chunking strategies](https://www.pinecone.io/learn/chunking-strategies/) [recommended]
    * Hybrid search
    * Reranking [recommended]
  * Agents [insightful]
    * [Tool use](https://modelcontextprotocol.io/docs/concepts/tools) [recommended]
    * [MCP](https://modelcontextprotocol.io) [personal recommendation]
    * Multi-agent patterns
  * Orchestration
    * Workflow patterns [recommended]
    * Human-in-the-loop

  * Memory
    * [Vector stores](https://en.wikipedia.org/wiki/Vector_database) [recommended]
    * Session state
  * Guardrails [recommended]
    * Input validation
    * Output filtering
  * Evals [personal recommendation]
    * Golden datasets [recommended]
    * [LLM-as-judge](https://arxiv.org/abs/2306.05685)
    * Regression suites [recommended]

* :three: Production & Operations
*:beginner: Treat model behaviour as a **production concern**: route, cache, observe, and defend. [OWASP for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/) catalogues what can go wrong.*
  + Serving
    * Model routing [recommended]
    * [Prompt caching](https://www.anthropic.com/news/prompt-caching) [personal recommendation]
    * Rate limiting
    * Fallbacks [recommended]
  * Cost Engineering
    * Token budgeting [recommended]
    * Batching
    * [Distillation](https://en.wikipedia.org/wiki/Knowledge_distillation)
    * Right-sizing models [insightful]
  * Safety & Governance
    * Red teaming [recommended]
    * PII handling [recommended]
    * Audit trails
  * AI Observability [insightful]
    * Trace capture [recommended]
    * Quality monitoring
    * Drift detection

## Keep ++**shipping**++ :rocket:

*[LLMs]: Large Language Models.
*[Multimodal models]: Models that accept and produce combinations of text, images, and audio.
*[Reasoning models]: Models that spend extra inference-time compute thinking before answering.
*[Structured output]: Constraining model responses to a schema such as JSON or typed tool calls.
*[Sampling parameters]: Settings such as temperature and top-p that shape response randomness.
*[Context windows]: The maximum number of tokens a model can attend to in one request.
*[Hallucination]: Confident model output that is not grounded in facts or sources.
*[RAG]: Retrieval-Augmented Generation.
*[Hybrid search]: Combining keyword and semantic retrieval for better recall.
*[Reranking]: Reordering retrieved candidates with a stronger model before generation.
*[MCP]: Model Context Protocol, an open standard for connecting AI applications to tools and data.
*[Agents]: Systems where a model directs its own tool use in a loop toward a goal.
*[Human-in-the-loop]: Workflow checkpoints where a person reviews or approves model actions.
*[Guardrails]: Automated checks that constrain model inputs and outputs.
*[Evals]: Systematic measurement of model and system quality against defined criteria.
*[Golden datasets]: Curated input-output pairs that anchor quality measurement.
*[LLM-as-judge]: Using a strong model to grade the outputs of another model.
*[Model routing]: Sending each request to the cheapest model that can handle it.
*[Token budgeting]: Tracking and capping token spend per feature or tenant.
*[Distillation]: Training a smaller model to imitate a larger one.
*[Red teaming]: Adversarial testing that probes a system for unsafe behaviour.
*[PII]: Personally Identifiable Information.
*[Drift detection]: Noticing when input patterns or output quality change over time.
*[Trace capture]: Recording full request, tool, and response chains for later analysis.
