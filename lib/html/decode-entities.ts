const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
};

export function decodeHtmlEntities(input: string): string {
  if (!input) {
    return input;
  }

  let decoded = input;

  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );

  decoded = decoded.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCodePoint(parseInt(dec, 10)),
  );

  decoded = decoded.replace(
    /&([a-zA-Z]+);/g,
    (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
  );

  return decoded;
}
