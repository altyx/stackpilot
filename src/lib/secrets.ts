/** Shown in place of a value that looks like a credential. */
export const MASK = '••••••••';

/**
 * Names that usually carry a credential. Deliberately broad ("key" also
 * matches KEYCLOAK_URL): hiding one harmless value costs a tap, showing one
 * password on a phone screen in a train does not.
 */
const SENSITIVE_NAME = /(pass(word|wd)?|pwd|secret|token|key|credential|private)/i;

export function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME.test(name);
}

/**
 * One `KEY=value` or `KEY: value` line, as Compose writes environment
 * variables in list or map form, with an optional leading `-` and quotes.
 */
const ASSIGNMENT = /^(\s*-?\s*["']?)([A-Za-z_][A-Za-z0-9_.-]*)(["']?\s*[:=]\s*)(\S.*)$/;

export interface MaskedText {
  text: string;
  /** Number of lines whose value was replaced. */
  masked: number;
}

/**
 * Hides the values of credential-looking assignments in a Compose file,
 * line by line: no YAML parsing, so the layout stays as the author wrote
 * it, and a `secrets:` section header (no value) is left alone.
 */
export function maskSensitiveLines(content: string): MaskedText {
  let masked = 0;
  const text = content
    .split('\n')
    .map((line) => {
      const match = ASSIGNMENT.exec(line);
      if (!match || !isSensitiveName(match[2])) return line;
      masked += 1;
      return `${match[1]}${match[2]}${match[3]}${MASK}`;
    })
    .join('\n');
  return { text, masked };
}
