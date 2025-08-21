// server/bootstrap-ipv4.ts
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
