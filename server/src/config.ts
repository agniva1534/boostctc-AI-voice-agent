import "dotenv/config";

export const config = {
  provider: "openai" as const,

  analyzer: {
    model: "gpt-4o-mini",
    fallbackModel: null as string | null,
    temperature: 0,
    maxRetries: 2,
    historyTurns: 3,
  },

  speaker: {
    model: "gpt-4o",
    fallbackModel: "gpt-4o-mini" as string | null,
    temperature: 0.65,
    maxRetries: 1,
    historyTurns: 3,
  },

  summary: {
    model: "gpt-4o-mini",
    fallbackModel: null as string | null,
    temperature: 0.3,
    summarizeEveryNTurns: 10,
    summarizeOnPhaseTransition: true,
  },

  transitions: {
    minConfidence: 0.7,
  },

  limits: {
    globalMaxTurns: 30,
    conversationTimeoutSeconds: 3600,
  },

  errorTolerance: {
    consecutiveErrorThreshold: 3,
    escalationAction: "terminate" as const,
  },

  phaseRedirect: {
    maxAttempts: 2,
  },

  entityDefaults: {
    maxEntities: 5,
  },

  rag: {
    model: "text-embedding-3-small",
    topK: 4,
    chunkSize: 500,
  },

  fallbackMessages: {
    first_turn:
      "Hey! I'm Mira, BoostCTC's voice assistant. Happy to help you learn about our platform. What brings you here today?",
    standard:
      "Sorry, I didn't quite catch that. Could you say that again?",
    phase_transition:
      "Great — let me make sure I'm pointing you in the right direction.",
    clarification:
      "Just to make sure I understand — could you tell me a bit more about that?",
    entity_transition:
      "Interesting — let me focus on that for a second.",
    termination:
      "It was great chatting! Feel free to come back anytime. Take care!",
  },

  resumption: {
    enabled: true,
    ttlSeconds: 3600,
  },

  hooks: {
    preConversation: null as null,
    midPipeline: null as null,
    postCompletion: null as null,
    preResumption: null as null,
  },

  phases: {
    // New visitor phases
    defaultPhaseNewVisitor: "engagement_greeting",
    // Returning user phases
    defaultPhaseReturningUser: "returning_welcome",
  },
} as const;

export const env = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  vapiPrivateKey: process.env.VAPI_PRIVATE_KEY ?? "",
  vapiPublicKey: process.env.VAPI_PUBLIC_KEY ?? "",
  vapiServerUrl: process.env.VAPI_SERVER_URL ?? "http://localhost:3000",
  vapiAssistantNewId: process.env.VAPI_ASSISTANT_NEW_ID ?? "",
  vapiAssistantReturningId: process.env.VAPI_ASSISTANT_RETURNING_ID ?? "",
  port: parseInt(process.env.PORT ?? "3000", 10),
  langchainTracingV2: process.env.LANGCHAIN_TRACING_V2 === "true",
  langchainProject: process.env.LANGCHAIN_PROJECT ?? "boostctc-voice",
};
