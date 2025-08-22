// server/bootstrap-ipv4.ts
import dns from "dns";
import net from "net";

// Preferisci IPv4 (evita AAAA/IPv6)
dns.setDefaultResultOrder("ipv4first");

// Happy Eyeballs: fallback automatico a IPv4 se IPv6 non è raggiungibile (Node 20.11+)
try {
  // @ts-ignore
  net.setDefaultAutoSelectFamily?.(true);
  // @ts-ignore
  net.setDefaultAutoSelectFamilyAttemptTimeout?.(100);
} catch {
  // ok se non supportato dalla tua versione di Node
}
