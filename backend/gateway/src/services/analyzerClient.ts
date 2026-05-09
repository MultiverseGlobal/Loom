import axios from "axios";
import { UniversalProjectGraph } from "../schemas/upg.schema.js";

const analyzerBaseUrl = process.env.ANALYZER_URL ?? "http://localhost:5000";

type StructureRequest = {
  files: Array<{ path: string; content: string }>;
};

export async function requestStructureAnalysis(payload: StructureRequest): Promise<UniversalProjectGraph> {
  const { data } = await axios.post(`${analyzerBaseUrl}/analyzer/structure`, payload, {
    timeout: 60_000,
  });
  return data;
}

export async function* requestBlueprintStream(payload: any): AsyncGenerator<any> {
  const response = await axios.post(`${analyzerBaseUrl}/analyzer/blueprint/generate/stream`, payload, {
    responseType: 'stream',
    timeout: 120_000,
  });

  for await (const chunk of response.data) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        yield JSON.parse(line);
      } catch (e) {
        console.error('[AnalyzerClient] Failed to parse stream chunk:', line);
      }
    }
  }
}

type DependencyRequest = {
  files: Array<{ path: string; content: string }>;
  packageManagerHint?: string;
};

export async function requestDependencyInference(payload: DependencyRequest) {
  const { data } = await axios.post(`${analyzerBaseUrl}/analyzer/dependencies`, payload, {
    timeout: 60_000,
  });
  return data;
}

type RefactorRequest = {
  files: Array<{ path: string; content: string }>;
};

export async function requestRefactorSuggestions(payload: RefactorRequest) {
  const { data } = await axios.post(`${analyzerBaseUrl}/analyzer/refactor`, payload, {
    timeout: 60_000,
  });
  return data;
}

type GenerateRequest = {
  prompt: string;
  framework?: string;
};

export async function generateUI(payload: GenerateRequest) {
  const { data } = await axios.post(`${analyzerBaseUrl}/analyzer/generate`, payload, {
    timeout: 60_000,
  });
  return data;
}

