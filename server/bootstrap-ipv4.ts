// server/bootstrap-net.ts
import dns from "dns";
import net from "net";

// 1) Preferisci IPv4 nei resolve
dns.setDefaultResultOrder("ipv4first");

// 2) Happy Eyeballs: se arriva IPv6 non raggiungibile, fallback veloce a IPv4
// (richiede Node >= 18.13/20.x)
net.setDefaultAutoSelectFamily(true);
net.setDefaultAutoSelectFamilyAttemptTimeout(100);
