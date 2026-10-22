// Asserções mínimas (sem dependência externa).
export function assert(cond: unknown, msg = "asserção falhou"): asserts cond {
  if (!cond) throw new Error(msg);
}
export function assertEquals(actual: unknown, expected: unknown, msg = ""): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`esperado ${e}, veio ${a}${msg ? " — " + msg : ""}`);
}
