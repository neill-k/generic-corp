/**
 * SSRF validation for MCP server URIs.
 *
 * Stdio protocol URIs are local commands and bypass URL validation.
 * SSE and HTTP protocol URIs are parsed as URLs and checked against
 * private/reserved IP ranges.
 */
export function validateMcpUri(
  uri: string,
  protocol?: string,
): { valid: boolean; error?: string } {
  // stdio is a local command, not a URL — always allowed
  if (protocol === "stdio") {
    return { valid: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return { valid: false, error: "Invalid URL" };
  }

  const hostname = parsed.hostname;

  // Reject localhost aliases
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return { valid: false, error: "Private IP ranges are not allowed" };
  }

  // Check for private IP ranges (IPv4)
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );
  if (ipv4Match) {
    const octets = [
      parseInt(ipv4Match[1]!, 10),
      parseInt(ipv4Match[2]!, 10),
      parseInt(ipv4Match[3]!, 10),
      parseInt(ipv4Match[4]!, 10),
    ];

    // 10.0.0.0/8
    if (octets[0] === 10) {
      return { valid: false, error: "Private IP ranges are not allowed" };
    }

    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) {
      return { valid: false, error: "Private IP ranges are not allowed" };
    }

    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) {
      return { valid: false, error: "Private IP ranges are not allowed" };
    }
  }

  return { valid: true };
}
