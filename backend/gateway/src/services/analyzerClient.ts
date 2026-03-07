import axios from "axios";

const analyzerBaseUrl = process.env.ANALYZER_URL ?? "http://localhost:5000";

type StructureRequest = {
  files: Array<{ path: string; content: string }>;
};

export async function requestStructureAnalysis(payload: StructureRequest) {
  const { data } = await axios.post(`${analyzerBaseUrl}/analyzer/structure`, payload, {
    timeout: 60_000,
  });
  return data;
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

