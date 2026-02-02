export const VAULT_PLACEHOLDER_REGEX = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

export interface VaultResolutionResult {
  resolved: string;
  placeholdersFound: number;
  placeholdersResolved: number;
  unresolved: string[];
}

export function findPlaceholders(text: string): string[] {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(VAULT_PLACEHOLDER_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      matches.add(match[1]);
    }
  }
  return [...matches];
}

export function containsPlaceholders(text: string): boolean {
  return new RegExp(VAULT_PLACEHOLDER_REGEX.source).test(text);
}
