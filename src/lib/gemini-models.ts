export const ALLOWED_GEMINI_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-live-preview",
] as const;

export type GeminiModel = (typeof ALLOWED_GEMINI_MODELS)[number];

export const GEMINI_MODELS = {
  pro: "gemini-3.1-pro-preview",
  flashLite: "gemini-3.1-flash-lite-preview",
  flashLive: "gemini-3.1-flash-live-preview",
} as const satisfies Record<string, GeminiModel>;

export type GeminiUseCase = "classification" | "analysis" | "gap" | "profile" | "career" | "live";

export function selectGeminiModel(useCase: GeminiUseCase): GeminiModel {
  switch (useCase) {
    case "classification":
    case "gap":
    case "profile":
      return GEMINI_MODELS.flashLite;
    case "analysis":
    case "career":
      return GEMINI_MODELS.pro;
    case "live":
      return GEMINI_MODELS.flashLive;
    default: {
      const exhaustiveCheck: never = useCase;
      throw new Error(`Unsupported Gemini use case: ${String(exhaustiveCheck)}`);
    }
  }
}

