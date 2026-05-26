const S = (paths) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS = {
  users:          S(`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
  deviceapp:      S(`<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="3"/>`),
  eventsource:    S(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`),
  textnote:       S(`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`),
  vm:             S(`<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`),
  pod:            S(`<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`),
  appserver:      S(`<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6" stroke-width="3"/><line x1="6" y1="18" x2="6.01" y2="18" stroke-width="3"/>`),
  loadbalancer:   S(`<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`),
  database:       S(`<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`),
  cache:          S(`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`),
  queue:          S(`<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`),
  cdn:            S(`<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`),
  autoscaler:     S(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`),
  taskscheduler:  S(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`),
  apigateway:     S(`<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/><path d="M3 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" opacity=".5"/><path d="M3 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" opacity=".5"/>`),
  firewall:       S(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`),
  cdcsource:      S(`<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v4c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 9v4c0 1.66 4 3 9 3"/><path d="M15 16l2 2 4-4"/>`),
  debezium:       S(`<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>`),
  kafkatopic:     S(`<path d="M12 2v20"/><path d="M2 7h5l5 5-5 5H2"/><path d="M22 7h-5l-5 5 5 5h5"/>`),
  streamprocessor: S(`<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/>`),
  streamwindow:   S(`<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>`),
  taskhook:       S(`<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`),
  datalake:       S(`<path d="M12 22a8 8 0 0 1-8-8c0-5 8-14 8-14s8 9 8 14a8 8 0 0 1-8 8z"/>`),
  warehouse:      S(`<rect x="2" y="7" width="20" height="14" rx="1"/><path d="M16 21V7"/><path d="M8 21V7"/><path d="M2 12h20"/><polyline points="3 3 12 2 21 3"/>`),
  objectstorage:  S(`<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>`),
  tableformat:    S(`<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>`),
  metastore:      S(`<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`),
  batchprocessor: S(`<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`),
  queryengine:    S(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>`),
  orchestrator:   S(`<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>`),
  dataquality:    S(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>`),
  appinsights:    S(`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`),
  logging:        S(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>`),

  // ── New components ──────────────────────────────────────────────────────
  serverless:     S(`<path d="M4 4l4 8 4-4 4 8"/><line x1="2" y1="20" x2="22" y2="20"/><circle cx="4" cy="20" r="1.5" fill="currentColor"/><circle cx="22" cy="20" r="1.5" fill="currentColor"/>`),
  vpn:            S(`<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="13" r="2"/><line x1="12" y1="15" x2="12" y2="17"/>`),
  dns:            S(`<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 8h8M8 12h6M8 16h4"/>`),
  filestore:      S(`<path d="M3 3h18v18H3z" rx="2"/><path d="M3 9h18"/><path d="M7 3l-4 6"/><path d="M17 3l4 6"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/>`),
  blockstorage:   S(`<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="12" r="2"/><line x1="12" y1="8" x2="20" y2="8"/><line x1="12" y1="12" x2="20" y2="12"/><line x1="12" y1="16" x2="20" y2="16"/>`),
  secretsmanager: S(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/>`),
  identityprovider: S(`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>`),
  waf:            S(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>`),
  eventbus:       S(`<rect x="2" y="8" width="20" height="8" rx="2"/><circle cx="7"  cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="17" cy="12" r="1.5" fill="currentColor"/><line x1="7" y1="8" x2="7" y2="5"/><line x1="12" y1="8" x2="12" y2="5"/><line x1="17" y1="8" x2="17" y2="5"/><line x1="7" y1="16" x2="7" y2="19"/><line x1="12" y1="16" x2="12" y2="19"/><line x1="17" y1="16" x2="17" y2="19"/>`),
  pubsub:         S(`<circle cx="12" cy="12" r="3"/><path d="M2 12h7M15 12h7"/><path d="M6.3 6.3l3.5 3.5M14.2 14.2l3.5 3.5M17.7 6.3l-3.5 3.5M9.8 14.2l-3.5 3.5"/>`),
  mlmodel:        S(`<circle cx="12" cy="5" r="3"/><circle cx="4"  cy="19" r="3"/><circle cx="20" cy="19" r="3"/><line x1="12" y1="8"  x2="4.8"  y2="16.2"/><line x1="12" y1="8"  x2="19.2" y2="16.2"/><line x1="6.8" y1="18" x2="17.2" y2="18"/>`),
  vectordb:       S(`<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M9 12l2 2 4-4"/>`),
  alerting:       S(`<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="12" y1="2" x2="12" y2="5"/>`),
  tracing:        S(`<circle cx="5"  cy="5"  r="2"/><circle cx="19" cy="5"  r="2"/><circle cx="12" cy="19" r="2"/><path d="M7 5h10"/><path d="M6.5 7l-1.5 9.5"/><path d="M17.5 7l1.5 9.5"/><line x1="10.5" y1="17" x2="6" y2="7"/><line x1="13.5" y1="17" x2="18" y2="7"/>`),

  // ── Iteration 3 new components ──────────────────────────────────────────────
  searchengine:   S(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>`),
  emailsms:       S(`<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`),
  bgworker:       S(`<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3.5"/>`),
  graphqlapi:     S(`<polygon points="12 2 19 6.5 19 17.5 12 22 5 17.5 5 6.5 12 2"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="5" y1="6.5" x2="9.5" y2="9.5"/><line x1="14.5" y1="14.5" x2="19" y2="17.5"/><line x1="19" y1="6.5" x2="14.5" y2="9.5"/><line x1="9.5" y1="14.5" x2="5" y2="17.5"/>`),
  websocket:      S(`<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20" stroke-width="3"/>`),
  ratelimiter:    S(`<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/><circle cx="19" cy="18" r="3"/><line x1="19" y1="15" x2="19" y2="12"/>`)
};

const CAT_ICONS = {
  all:           S(`<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.3-6.7-2.1 2.1M8.4 15.6l-2.1 2.1m0-11.4 2.1 2.1m7.2 7.2 2.1 2.1"/>`),
  source:        S(`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`),
  compute:       S(`<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`),
  network:       S(`<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><line x1="7" y1="12" x2="17" y2="6.5"/><line x1="7" y1="12" x2="17" y2="17.5"/>`),
  storage:       S(`<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`),
  data:          S(`<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`),
  messaging:     S(`<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`),
  ops:           S(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`),
  observability: S(`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`),
  security:      S(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`),
  annotation:    S(`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`),
  ai:            S(`<circle cx="12" cy="5" r="3"/><circle cx="4" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><line x1="12" y1="8" x2="4.8" y2="16.2"/><line x1="12" y1="8" x2="19.2" y2="16.2"/><line x1="6.8" y1="18" x2="17.2" y2="18"/>`)
};

export const COMPONENT_DEFS = [
  {
    id: "users",
    name: "Users",
    icon: ICONS.users,
    category: "source",
    color: "#8b5cf6",
    description: "Human or account population. Can represent requests, sessions, or event-producing users.",
    defaults: { userCount: 100, requestsPerUser: 1, label: "Users" },
    properties: [
      { key: "userCount", label: "User Count", type: "number", min: 1, max: 10000000000 },
      { key: "requestsPerUser", label: "Events/User/s", type: "number", min: 0.001, max: 100000, step: 0.1 },
      { key: "label", label: "Label", type: "text" }
    ],
    behaviors: ["traffic_source"]
  },
  {
    id: "deviceapp",
    name: "Device / App",
    icon: ICONS.deviceapp,
    category: "source",
    color: "#22c55e",
    description: "Client app, SDK, IoT device, browser, or mobile app that emits product/user events.",
    defaults: { capacity: 1000000000, platform: "Mobile App", eventsPerInput: 4, batchingMs: 1000, offlineBuffer: true, cost: 0, label: "Device / App" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Emit Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "platform", label: "Platform", type: "select", options: ["Mobile App","Web App","IoT Device","SDK","Browser","POS Terminal"] },
      { key: "eventsPerInput", label: "Events per Input", type: "number", min: 0.001, max: 100000, step: 0.1 },
      { key: "batchingMs", label: "Batch Window (ms)", type: "number", min: 0, max: 86400000 },
      { key: "offlineBuffer", label: "Offline Buffer", type: "boolean" },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "event_emitter"]
  },
  {
    id: "eventsource",
    name: "Event Source",
    icon: ICONS.eventsource,
    category: "source",
    color: "#f97316",
    description: "Synthetic, business, or product event source measured directly in events per second.",
    defaults: { eventRate: 1000000, eventType: "User Activity", payloadKB: 2, label: "Event Source" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "eventRate", label: "Event Rate (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "eventType", label: "Event Type", type: "select", options: ["User Activity","Clickstream","Telemetry","IoT Reading","Audit Event","Payment Event","Custom"] },
      { key: "payloadKB", label: "Payload (KB)", type: "number", min: 0.001, max: 100000, step: 0.1 }
    ],
    behaviors: ["traffic_source", "event_source"]
  },
  {
    id: "textnote",
    name: "Text Note",
    icon: ICONS.textnote,
    category: "annotation",
    color: "#facc15",
    description: "Whiteboard annotation for assumptions, constraints, TODOs, SLAs, or design notes.",
    defaults: { label: "Note", text: "Write architecture notes here...", tone: "Neutral" },
    properties: [
      { key: "label", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "tone", label: "Tone", type: "select", options: ["Neutral","Decision","Risk","TODO","SLA"] }
    ],
    behaviors: ["annotation"],
    size: { w: 240, h: 128 }
  },
  {
    id: "vm",
    name: "Virtual Machine",
    icon: ICONS.vm,
    category: "compute",
    color: "#3b82f6",
    description: "General-purpose compute. Handles incoming requests up to its capacity.",
    defaults: { capacity: 2000, cpu: "2 vCPU", memory: "4 GB", os: "Linux", latencyMs: 50, errorRate: 0, region: "us-east-1", cost: 70, label: "VM", autoScale: false, scaleUpAt: 80, maxReplicas: 5 },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 100000 },
      { key: "cpu", label: "CPU", type: "select", options: ["1 vCPU","2 vCPU","4 vCPU","8 vCPU","16 vCPU","32 vCPU"] },
      { key: "memory", label: "Memory", type: "select", options: ["512 MB","1 GB","2 GB","4 GB","8 GB","16 GB","32 GB","64 GB"] },
      { key: "os", label: "OS", type: "select", options: ["Linux","Windows","FreeBSD"] },
      { key: "latencyMs", label: "Base Latency (ms)", type: "number", min: 1, max: 60000 },
      { key: "errorRate", label: "Error Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
      { key: "region", label: "Region", type: "select", options: ["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","ap-northeast-1","global"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    scaleProps: [
      { key: "autoScale", label: "Enable Auto Scaling", type: "boolean" },
      { key: "scaleUpAt", label: "Scale Up At (%)", type: "number", min: 10, max: 100 },
      { key: "maxReplicas", label: "Max Replicas", type: "number", min: 1, max: 100 }
    ],
    behaviors: ["accepts_traffic", "scalable"]
  },
  {
    id: "pod",
    name: "Pod / Container",
    icon: ICONS.pod,
    category: "compute",
    color: "#06b6d4",
    description: "Kubernetes pod or Docker container. Lightweight compute unit.",
    defaults: { capacity: 1000, image: "app:latest", cpuRequest: "250m", memoryRequest: "512Mi", latencyMs: 20, errorRate: 0, region: "us-east-1", cost: 18, label: "Pod", autoScale: false, scaleUpAt: 80, maxReplicas: 10 },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 10000 },
      { key: "image", label: "Container Image", type: "text" },
      { key: "cpuRequest", label: "CPU Request", type: "select", options: ["50m","100m","250m","500m","1000m","2000m"] },
      { key: "memoryRequest", label: "Memory Request", type: "select", options: ["64Mi","128Mi","256Mi","512Mi","1Gi","2Gi","4Gi"] },
      { key: "latencyMs", label: "Base Latency (ms)", type: "number", min: 1, max: 60000 },
      { key: "errorRate", label: "Error Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
      { key: "region", label: "Region", type: "select", options: ["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","ap-northeast-1","global"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    scaleProps: [
      { key: "autoScale", label: "Enable Auto Scaling", type: "boolean" },
      { key: "scaleUpAt", label: "Scale Up At (%)", type: "number", min: 10, max: 100 },
      { key: "maxReplicas", label: "Max Replicas", type: "number", min: 1, max: 100 }
    ],
    behaviors: ["accepts_traffic", "scalable"]
  },
  {
    id: "appserver",
    name: "App Server",
    icon: ICONS.appserver,
    category: "compute",
    color: "#10b981",
    description: "Application server (Node.js, Java, Python, etc).",
    defaults: { capacity: 5000, runtime: "Node.js", version: "20", workers: 4, port: 3000, latencyMs: 50, errorRate: 0, region: "us-east-1", cost: 34, label: "App Server", autoScale: false, scaleUpAt: 80, maxReplicas: 10 },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 50000 },
      { key: "runtime", label: "Runtime", type: "select", options: ["Node.js","Python","Java","Go","Ruby","PHP",".NET"] },
      { key: "version", label: "Version", type: "text" },
      { key: "workers", label: "Worker Threads", type: "number", min: 1, max: 256 },
      { key: "port", label: "Port", type: "number", min: 1, max: 65535 },
      { key: "latencyMs", label: "Base Latency (ms)", type: "number", min: 1, max: 60000 },
      { key: "errorRate", label: "Error Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
      { key: "region", label: "Region", type: "select", options: ["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","ap-northeast-1","global"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    scaleProps: [
      { key: "autoScale", label: "Enable Auto Scaling", type: "boolean" },
      { key: "scaleUpAt", label: "Scale Up At (%)", type: "number", min: 10, max: 100 },
      { key: "maxReplicas", label: "Max Replicas", type: "number", min: 1, max: 100 }
    ],
    behaviors: ["accepts_traffic", "scalable"]
  },
  {
    id: "loadbalancer",
    name: "Load Balancer",
    icon: ICONS.loadbalancer,
    category: "network",
    color: "#f59e0b",
    description: "Distributes traffic evenly across downstream nodes. Reduces load per instance.",
    defaults: { capacity: 50000, algorithm: "Round Robin", healthCheck: true, stickySession: false, cost: 22, label: "Load Balancer" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Throughput (req/s)", type: "number", min: 100, max: 10000000 },
      { key: "algorithm", label: "Algorithm", type: "select", options: ["Round Robin","Least Connections","IP Hash","Random","Weighted"] },
      { key: "healthCheck", label: "Health Check", type: "boolean" },
      { key: "stickySession", label: "Sticky Sessions", type: "boolean" },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["splits_traffic"]
  },
  {
    id: "database",
    name: "Database",
    icon: ICONS.database,
    category: "storage",
    color: "#ef4444",
    description: "Relational or NoSQL data store. Add Read Replicas to scale reads. Cost based on RDS db.r6g.large (2 vCPU / 16 GB).",
    defaults: { capacity: 5000, type: "PostgreSQL", cpu: "2 vCPU", storage: "100 GB", maxConnections: 200, replication: "None", readReplicas: 0, latencyMs: 10, errorRate: 0, region: "us-east-1", cost: 220, label: "Database" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "type", label: "Type", type: "select", options: ["PostgreSQL","MySQL","MongoDB","Redis","DynamoDB","Cassandra","SQLite","CockroachDB"] },
      { key: "cpu", label: "vCPU", type: "select", options: ["1 vCPU","2 vCPU","4 vCPU","8 vCPU","16 vCPU","32 vCPU"] },
      { key: "storage", label: "Storage", type: "select", options: ["10 GB","50 GB","100 GB","500 GB","1 TB","5 TB","10 TB"] },
      { key: "capacity", label: "Write Capacity (req/s)", type: "number", min: 1, max: 100000 },
      { key: "maxConnections", label: "Max Connections", type: "number", min: 1, max: 10000 },
      { key: "replication", label: "Replication", type: "select", options: ["None","Read Replica","Multi-Region","Synchronous"] },
      { key: "readReplicas", label: "Read Replicas (count)", type: "number", min: 0, max: 10 },
      { key: "latencyMs", label: "Avg Query Latency (ms)", type: "number", min: 1, max: 10000 },
      { key: "errorRate", label: "Error Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
      { key: "region", label: "Region", type: "select", options: ["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","ap-northeast-1","global"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "cache",
    name: "Cache",
    icon: ICONS.cache,
    category: "storage",
    color: "#f97316",
    description: "In-memory cache. Serves hot data without hitting the database. Cost based on ElastiCache r6g.large (2 vCPU / 13 GB).",
    defaults: { capacity: 25000, type: "Redis", memory: "13 GB", ttl: 300, hitRate: 80, latencyMs: 1, errorRate: 0, cost: 108, label: "Cache" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 500000 },
      { key: "type", label: "Type", type: "select", options: ["Redis","Memcached","Hazelcast","Varnish"] },
      { key: "memory", label: "Memory", type: "select", options: ["256 MB","512 MB","1 GB","2 GB","4 GB","8 GB","16 GB"] },
      { key: "ttl", label: "TTL (seconds)", type: "number", min: 0 },
      { key: "hitRate", label: "Cache Hit Rate (%)", type: "number", min: 0, max: 100 },
      { key: "latencyMs", label: "Avg Latency (ms)", type: "number", min: 0.1, max: 1000, step: 0.1 },
      { key: "errorRate", label: "Error Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "queue",
    name: "Message Queue",
    icon: ICONS.queue,
    category: "messaging",
    color: "#a855f7",
    description: "Async queue decouples producers from consumers. Buffers traffic spikes.",
    defaults: { capacity: 10000, type: "SQS", maxMessages: 1000000, ttl: 86400, consumers: 4, cost: 8, label: "Queue" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (msg/s)", type: "number", min: 1, max: 1000000 },
      { key: "type", label: "Type", type: "select", options: ["RabbitMQ","Kafka","SQS","Redis Pub/Sub","NATS","ActiveMQ"] },
      { key: "maxMessages", label: "Max Queue Depth", type: "number", min: 100 },
      { key: "ttl", label: "Message TTL (s)", type: "number", min: 0 },
      { key: "consumers", label: "Consumers", type: "number", min: 1, max: 1000 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "buffers_traffic"]
  },
  {
    id: "cdn",
    name: "CDN",
    icon: ICONS.cdn,
    category: "network",
    color: "#14b8a6",
    description: "Content Delivery Network. Caches static assets at edge PoPs.",
    defaults: { capacity: 100000, provider: "CloudFront", cacheHitRate: 85, regions: 10, cost: 15, label: "CDN" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 100, max: 10000000 },
      { key: "provider", label: "Provider", type: "select", options: ["CloudFront","Cloudflare","Fastly","Akamai","Azure CDN"] },
      { key: "cacheHitRate", label: "Cache Hit Rate (%)", type: "number", min: 0, max: 100 },
      { key: "regions", label: "Edge Regions", type: "number", min: 1, max: 200 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["splits_traffic", "caches"]
  },
  {
    id: "autoscaler",
    name: "Auto Scaler",
    icon: ICONS.autoscaler,
    category: "ops",
    color: "#84cc16",
    description: "Connects to a compute node and automatically scales it under load.",
    defaults: { scaleUpThreshold: 80, scaleDownThreshold: 30, minReplicas: 1, maxReplicas: 10, label: "Auto Scaler" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "scaleUpThreshold", label: "Scale Up At (%)", type: "number", min: 1, max: 100 },
      { key: "scaleDownThreshold", label: "Scale Down At (%)", type: "number", min: 0, max: 100 },
      { key: "minReplicas", label: "Min Replicas", type: "number", min: 1, max: 100 },
      { key: "maxReplicas", label: "Max Replicas", type: "number", min: 1, max: 1000 }
    ],
    behaviors: ["autoscales"]
  },
  {
    id: "taskscheduler",
    name: "Task Scheduler",
    icon: ICONS.taskscheduler,
    category: "ops",
    color: "#06b6d4",
    description: "Cron, timer, dataset, or event-based scheduler for jobs, tasks, and recurring pipeline triggers.",
    defaults: { capacity: 100000, scheduleMode: "Cron", frequency: "Every 5 minutes", timezone: "UTC", maxConcurrency: 50, catchup: false, label: "Task Scheduler" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Trigger Capacity (tasks/hour)", type: "number", min: 1, max: 1000000000 },
      { key: "scheduleMode", label: "Schedule Mode", type: "select", options: ["Cron","Fixed Rate","Event Based","Dataset Based","Manual","Continuous"] },
      { key: "frequency", label: "Frequency / Cron", type: "text" },
      { key: "timezone", label: "Timezone", type: "select", options: ["UTC","Local","America/New_York","Europe/London","Asia/Kolkata","Asia/Singapore"] },
      { key: "maxConcurrency", label: "Max Concurrency", type: "number", min: 1, max: 100000 },
      { key: "catchup", label: "Backfill / Catchup", type: "boolean" }
    ],
    behaviors: ["accepts_traffic", "schedules"]
  },
  {
    id: "apigateway",
    name: "API Gateway",
    icon: ICONS.apigateway,
    category: "network",
    color: "#ec4899",
    description: "Entry point. Handles auth, rate-limiting, routing to microservices.",
    defaults: { capacity: 10000, type: "AWS API Gateway", rateLimit: 1000, authType: "JWT", timeout: 30000, cost: 35, label: "API Gateway" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 500000 },
      { key: "type", label: "Type", type: "select", options: ["Kong","AWS API Gateway","Nginx","Traefik","Envoy","Istio"] },
      { key: "rateLimit", label: "Rate Limit (req/s)", type: "number", min: 0 },
      { key: "authType", label: "Auth Type", type: "select", options: ["None","JWT","OAuth2","API Key","mTLS"] },
      { key: "timeout", label: "Timeout (ms)", type: "number", min: 0 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "splits_traffic"]
  },
  {
    id: "firewall",
    name: "Firewall / WAF",
    icon: ICONS.firewall,
    category: "security",
    color: "#64748b",
    description: "Web Application Firewall. Filters malicious traffic.",
    defaults: { capacity: 50000, type: "WAF", blockRate: 5, rules: 100, cost: 60, label: "Firewall" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 5000000 },
      { key: "type", label: "Type", type: "select", options: ["WAF","Network Firewall","Cloud Armor","ModSecurity","Cloudflare WAF"] },
      { key: "blockRate", label: "Block Rate (%)", type: "number", min: 0, max: 100 },
      { key: "rules", label: "Active Rules", type: "number", min: 0 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "filters_traffic"]
  },
  {
    id: "cdcsource",
    name: "CDC Source DB",
    icon: ICONS.cdcsource,
    category: "data",
    color: "#22c55e",
    description: "Operational database used as a change-data-capture source.",
    defaults: { capacity: 5000, engine: "PostgreSQL", tables: 12, changeRate: 1000, retentionHours: 24, cost: 220, label: "Source DB" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Change Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "engine", label: "Engine", type: "select", options: ["PostgreSQL","MySQL","SQL Server","Oracle","MongoDB","DynamoDB"] },
      { key: "tables", label: "Captured Tables", type: "number", min: 1, max: 10000 },
      { key: "changeRate", label: "Change Rate (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "retentionHours", label: "Log Retention (hours)", type: "number", min: 1, max: 720 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["traffic_source", "cdc_source"]
  },
  {
    id: "debezium",
    name: "Debezium Connector",
    icon: ICONS.debezium,
    category: "data",
    color: "#0ea5e9",
    description: "CDC connector that reads database logs and publishes change events.",
    defaults: { capacity: 4000, connectorType: "Postgres", tasks: 2, snapshotMode: "Initial", heartbeatSeconds: 30, cost: 100, label: "Debezium" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Throughput (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "connectorType", label: "Connector", type: "select", options: ["Postgres","MySQL","SQL Server","Oracle","MongoDB","Db2"] },
      { key: "tasks", label: "Connector Tasks", type: "number", min: 1, max: 128 },
      { key: "snapshotMode", label: "Snapshot Mode", type: "select", options: ["Initial","Never","Schema Only","Incremental"] },
      { key: "heartbeatSeconds", label: "Heartbeat (seconds)", type: "number", min: 1, max: 3600 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "cdc_connector"]
  },
  {
    id: "kafkatopic",
    name: "Kafka Topic",
    icon: ICONS.kafkatopic,
    category: "messaging",
    color: "#f59e0b",
    description: "Partitioned event stream for pub/sub and replay.",
    defaults: { capacity: 20000, partitions: 12, replicationFactor: 3, retentionDays: 7, cleanupPolicy: "delete", cost: 440, label: "Kafka Topic" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Topic Throughput (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "partitions", label: "Partitions", type: "number", min: 1, max: 10000 },
      { key: "replicationFactor", label: "Replication Factor", type: "number", min: 1, max: 7 },
      { key: "retentionDays", label: "Retention (days)", type: "number", min: 1, max: 365 },
      { key: "cleanupPolicy", label: "Cleanup Policy", type: "select", options: ["delete","compact","compact,delete"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "buffers_traffic", "event_stream"]
  },
  {
    id: "streamprocessor",
    name: "Stream Processor",
    icon: ICONS.streamprocessor,
    category: "data",
    color: "#06b6d4",
    description: "Flink/Spark/Kafka Streams job for enrichment, joins, windows, and routing.",
    defaults: { capacity: 12000, engine: "Flink", parallelism: 8, checkpointSeconds: 60, stateBackend: "RocksDB", triggerMode: "Event Time", cost: 640, label: "Stream Processor" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Processing Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "engine", label: "Engine", type: "select", options: ["Flink","Spark Structured Streaming","Kafka Streams","ksqlDB","Beam"] },
      { key: "parallelism", label: "Parallelism", type: "number", min: 1, max: 10000 },
      { key: "checkpointSeconds", label: "Checkpoint Interval (s)", type: "number", min: 1, max: 3600 },
      { key: "stateBackend", label: "State Backend", type: "select", options: ["RocksDB","Memory","EmbeddedRocksDB","S3"] },
      { key: "triggerMode", label: "Trigger Mode", type: "select", options: ["Event Time","Processing Time","Continuous","Micro-batch"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "transforms_stream"]
  },
  {
    id: "streamwindow",
    name: "Stream Window",
    icon: ICONS.streamwindow,
    category: "data",
    color: "#38bdf8",
    description: "Event-time or processing-time windowing for aggregations, joins, watermarks, and late data.",
    defaults: { capacity: 50000000, windowType: "Tumbling", windowSize: "5 minutes", slideEvery: "1 minute", allowedLateness: "10 minutes", watermark: "Event Time", label: "Window" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Window Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "windowType", label: "Window Type", type: "select", options: ["Tumbling","Sliding","Session","Global","Hop"] },
      { key: "windowSize", label: "Window Size", type: "text" },
      { key: "slideEvery", label: "Slide Every", type: "text" },
      { key: "allowedLateness", label: "Allowed Lateness", type: "text" },
      { key: "watermark", label: "Watermark", type: "select", options: ["Event Time","Processing Time","Ingestion Time","Custom"] }
    ],
    behaviors: ["accepts_traffic", "windowing"]
  },
  {
    id: "taskhook",
    name: "Hook / Webhook",
    icon: ICONS.taskhook,
    category: "ops",
    color: "#a855f7",
    description: "Event hook, webhook, callback, trigger, or integration endpoint.",
    defaults: { capacity: 100000, trigger: "Webhook", delivery: "At least once", retries: 3, timeoutMs: 30000, label: "Hook" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Trigger Capacity (events/s)", type: "number", min: 1, max: 1000000000 },
      { key: "trigger", label: "Trigger", type: "select", options: ["Webhook","Event Grid","Callback","Kafka Consumer","Pub/Sub Push","S3/Object Event","Database Trigger"] },
      { key: "delivery", label: "Delivery", type: "select", options: ["At least once","At most once","Exactly once","Best effort"] },
      { key: "retries", label: "Retries", type: "number", min: 0, max: 1000 },
      { key: "timeoutMs", label: "Timeout (ms)", type: "number", min: 1, max: 3600000 }
    ],
    behaviors: ["accepts_traffic", "event_hook"]
  },
  {
    id: "datalake",
    name: "Data Lake",
    icon: ICONS.datalake,
    category: "data",
    color: "#14b8a6",
    description: "Object storage landing zone for raw/bronze/silver data.",
    defaults: { capacity: 50000, format: "Parquet", tableFormat: "Iceberg", storageTB: 10, cost: 265, label: "Data Lake" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Ingest Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "format", label: "File Format", type: "select", options: ["Parquet","Avro","JSON","ORC","Delta"] },
      { key: "tableFormat", label: "Table Format", type: "select", options: ["Iceberg","Delta Lake","Hudi","Hive"] },
      { key: "storageTB", label: "Storage (TB)", type: "number", min: 1, max: 100000 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "stores_data"]
  },
  {
    id: "warehouse",
    name: "Data Warehouse",
    icon: ICONS.warehouse,
    category: "data",
    color: "#6366f1",
    description: "Analytical warehouse serving BI and reporting workloads.",
    defaults: { capacity: 15000, platform: "Snowflake", computeSize: "Medium", concurrency: 20, cost: 700, label: "Warehouse" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Load Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "platform", label: "Platform", type: "select", options: ["Snowflake","BigQuery","Redshift","Synapse","Databricks SQL"] },
      { key: "computeSize", label: "Compute Size", type: "select", options: ["Small","Medium","Large","XLarge","2XLarge"] },
      { key: "concurrency", label: "Query Concurrency", type: "number", min: 1, max: 10000 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "analytics_sink"]
  },
  {
    id: "objectstorage",
    name: "Object Storage",
    icon: ICONS.objectstorage,
    category: "data",
    color: "#0f766e",
    description: "Cloud object storage such as S3, ADLS, GCS. S3 pricing: $0.023/GB storage + $0.0004/1K GETs + $0.005/1K PUTs. 50 TB ≈ $1,178/mo storage alone.",
    defaults: { capacity: 100000, provider: "Amazon S3", storageTB: 50, durability: "11 nines", versioning: true, cost: 1178, label: "Object Storage" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Write Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "provider", label: "Provider", type: "select", options: ["Generic Object Storage","Amazon S3","Azure ADLS Gen2","Google Cloud Storage","MinIO","Ceph"] },
      { key: "storageTB", label: "Storage (TB)", type: "number", min: 1, max: 1000000 },
      { key: "durability", label: "Durability", type: "select", options: ["Standard","11 nines","Zone Redundant","Geo Redundant"] },
      { key: "versioning", label: "Versioning", type: "boolean" },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "stores_data", "object_storage"]
  },
  {
    id: "tableformat",
    name: "Lake Table Format",
    icon: ICONS.tableformat,
    category: "data",
    color: "#38bdf8",
    description: "Open table layer for ACID, schema evolution, time travel, and incremental reads.",
    defaults: { capacity: 80000, format: "Apache Iceberg", compaction: true, snapshotRetentionDays: 14, cost: 60, label: "Table Format" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Commit Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "format", label: "Format", type: "select", options: ["Apache Iceberg","Apache Hudi","Delta Lake","Hive Tables"] },
      { key: "compaction", label: "Compaction Enabled", type: "boolean" },
      { key: "snapshotRetentionDays", label: "Snapshot Retention (days)", type: "number", min: 1, max: 3650 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "table_format"]
  },
  {
    id: "metastore",
    name: "Data Catalog",
    icon: ICONS.metastore,
    category: "data",
    color: "#8b5cf6",
    description: "Catalog/metastore for schemas, table metadata, lineage, and governance.",
    defaults: { capacity: 20000, catalog: "AWS Glue", schemas: 50, lineage: true, cost: 30, label: "Data Catalog" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Metadata Capacity (ops/s)", type: "number", min: 1, max: 1000000 },
      { key: "catalog", label: "Catalog", type: "select", options: ["Hive Metastore","AWS Glue","Unity Catalog","Apache Polaris","DataHub","OpenMetadata"] },
      { key: "schemas", label: "Schemas / Tables", type: "number", min: 1, max: 1000000 },
      { key: "lineage", label: "Lineage Enabled", type: "boolean" },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "metadata_service"]
  },
  {
    id: "batchprocessor",
    name: "Batch Processor",
    icon: ICONS.batchprocessor,
    category: "data",
    color: "#f97316",
    description: "Batch compute such as Apache Spark, Databricks Jobs, EMR, or dataflow jobs.",
    defaults: { capacity: 30000, engine: "Apache Spark", workers: 10, schedule: "Hourly", cost: 700, label: "Batch Processor" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Processing Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "engine", label: "Engine", type: "select", options: ["Apache Spark","Databricks Jobs","EMR","Google Dataflow","Azure Synapse Spark","Ray"] },
      { key: "workers", label: "Workers", type: "number", min: 1, max: 10000 },
      { key: "schedule", label: "Schedule", type: "select", options: ["Streaming","Hourly","Daily","Weekly","On Demand"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "batch_compute"]
  },
  {
    id: "queryengine",
    name: "Query Engine",
    icon: ICONS.queryengine,
    category: "data",
    color: "#eab308",
    description: "SQL/query layer over lakehouse and warehouse data.",
    defaults: { capacity: 10000, engine: "Trino", concurrency: 25, cacheEnabled: true, cost: 240, label: "Query Engine" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Query Capacity (queries/hour)", type: "number", min: 1, max: 10000000 },
      { key: "engine", label: "Engine", type: "select", options: ["Trino","Presto","Athena","BigQuery","Databricks SQL","Dremio","Starburst"] },
      { key: "concurrency", label: "Concurrency", type: "number", min: 1, max: 10000 },
      { key: "cacheEnabled", label: "Result Cache", type: "boolean" },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "query_engine"]
  },
  {
    id: "orchestrator",
    name: "Orchestrator",
    icon: ICONS.orchestrator,
    category: "ops",
    color: "#ec4899",
    description: "Workflow scheduler/orchestrator for data pipelines and dependency control.",
    defaults: { capacity: 5000, tool: "Airflow", dags: 25, retryPolicy: "3 retries", scheduleMode: "Cron", cost: 380, label: "Orchestrator" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Task Capacity (tasks/hour)", type: "number", min: 1, max: 1000000 },
      { key: "tool", label: "Tool", type: "select", options: ["Airflow","Dagster","Prefect","Argo Workflows","Azure Data Factory","Step Functions"] },
      { key: "dags", label: "Pipelines / DAGs", type: "number", min: 1, max: 100000 },
      { key: "retryPolicy", label: "Retry Policy", type: "text" },
      { key: "scheduleMode", label: "Schedule Mode", type: "select", options: ["Cron","Event Based","Dataset Based","Manual","Continuous"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "orchestrates"]
  },
  {
    id: "dataquality",
    name: "Data Quality",
    icon: ICONS.dataquality,
    category: "data",
    color: "#84cc16",
    description: "Validation, freshness checks, contracts, anomaly detection, and profiling.",
    defaults: { capacity: 25000, tool: "Great Expectations", checks: 120, failurePolicy: "Quarantine", cost: 150, label: "Data Quality" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Validation Capacity (rows/s)", type: "number", min: 1, max: 50000000 },
      { key: "tool", label: "Tool", type: "select", options: ["Great Expectations","Soda","Deequ","dbt Tests","Monte Carlo","Custom"] },
      { key: "checks", label: "Checks", type: "number", min: 1, max: 100000 },
      { key: "failurePolicy", label: "Failure Policy", type: "select", options: ["Alert","Quarantine","Block Publish","Warn Only"] },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "validates_data"]
  },
  {
    id: "appinsights",
    name: "App Insights",
    icon: ICONS.appinsights,
    category: "observability",
    color: "#3b82f6",
    description: "Application performance monitoring, metrics, traces, dependency maps, and alerts.",
    defaults: { capacity: 100000, provider: "Azure Application Insights", samplingRate: 100, retentionDays: 90, alertRules: 5, cost: 75, label: "App Insights" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Telemetry Capacity (events/s)", type: "number", min: 1, max: 1000000000000 },
      { key: "provider", label: "Provider", type: "select", options: ["Azure Application Insights","Datadog APM","New Relic","Grafana Tempo","OpenTelemetry Collector"] },
      { key: "samplingRate", label: "Sampling Rate (%)", type: "number", min: 1, max: 100 },
      { key: "retentionDays", label: "Retention (days)", type: "number", min: 1, max: 3650 },
      { key: "alertRules", label: "Alert Rules", type: "number", min: 0, max: 10000 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "observability_sink"]
  },
  {
    id: "logging",
    name: "Log Analytics",
    icon: ICONS.logging,
    category: "observability",
    color: "#64748b",
    description: "Centralized logs, search, retention, and operational audit trails.",
    defaults: { capacity: 80000, platform: "Elastic", ingestGBDay: 10, retentionDays: 30, cost: 250, label: "Log Analytics" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Log Capacity (events/s)", type: "number", min: 1, max: 10000000 },
      { key: "platform", label: "Platform", type: "select", options: ["Elastic","Splunk","Azure Log Analytics","CloudWatch Logs","Loki"] },
      { key: "ingestGBDay", label: "Ingest (GB/day)", type: "number", min: 1, max: 100000 },
      { key: "retentionDays", label: "Retention (days)", type: "number", min: 1, max: 3650 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "observability_sink"]
  },

  // ── Compute ───────────────────────────────────────────────────────────────
  {
    id: "serverless",
    name: "Serverless Function",
    icon: ICONS.serverless,
    category: "compute",
    color: "#f59e0b",
    description: "Event-driven function. AWS Lambda, Azure Functions, GCP Cloud Functions. Auto-scales to zero.",
    defaults: { capacity: 3000, memoryMB: 512, timeoutSec: 30, concurrency: 1000, avgLatencyMs: 100, executions: 1000000, runtime: "Node.js", cost: 0, label: "Serverless Fn" },
    properties: [
      { key: "label",          label: "Label",              type: "text" },
      { key: "capacity",       label: "Max Req/s",          type: "number", min: 1, max: 1000000 },
      { key: "memoryMB",       label: "Memory (MB)",        type: "number", min: 128, max: 10240 },
      { key: "timeoutSec",     label: "Timeout (s)",        type: "number", min: 1, max: 900 },
      { key: "concurrency",    label: "Max Concurrency",    type: "number", min: 1, max: 100000 },
      { key: "avgLatencyMs",   label: "Avg Latency (ms)",   type: "number", min: 1, max: 30000 },
      { key: "executions",     label: "Executions/mo",      type: "number", min: 0, max: 1000000000000 },
      { key: "runtime",        label: "Runtime",            type: "select", options: ["Node.js","Python","Go","Java","Ruby",".NET"] },
      { key: "cost",           label: "Cost ($/mo)",        type: "number", min: 0 }
    ],
    scaleProps: [
      { key: "autoScale",   label: "Auto Scale",   type: "checkbox" },
      { key: "maxReplicas", label: "Max Replicas", type: "number", min: 1, max: 1000 }
    ],
    behaviors: ["accepts_traffic", "autoscalable"]
  },

  // ── Network ───────────────────────────────────────────────────────────────
  {
    id: "vpn",
    name: "VPN Gateway",
    icon: ICONS.vpn,
    category: "network",
    color: "#0ea5e9",
    description: "Encrypted tunnel between on-prem and cloud. AWS Site-to-Site VPN, Azure VPN Gateway, Direct Connect.",
    defaults: { capacity: 5000, bandwidth: "1 Gbps", protocol: "IPSec", cost: 150, label: "VPN Gateway" },
    properties: [
      { key: "label",     label: "Label",         type: "text" },
      { key: "capacity",  label: "Throughput (req/s)", type: "number", min: 1, max: 1000000 },
      { key: "bandwidth", label: "Bandwidth",     type: "select", options: ["100 Mbps","500 Mbps","1 Gbps","10 Gbps"] },
      { key: "protocol",  label: "Protocol",      type: "select", options: ["IPSec","SSL/TLS","WireGuard","AWS Direct Connect"] },
      { key: "cost",      label: "Cost ($/mo)",   type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "dns",
    name: "DNS",
    icon: ICONS.dns,
    category: "network",
    color: "#38bdf8",
    description: "Domain resolution and traffic routing. Route 53, Cloudflare DNS, Azure DNS.",
    defaults: { capacity: 10000, provider: "Route 53", ttl: 300, cost: 5, label: "DNS" },
    properties: [
      { key: "label",    label: "Label",        type: "text" },
      { key: "capacity", label: "Queries/s",    type: "number", min: 1, max: 100000000 },
      { key: "provider", label: "Provider",     type: "select", options: ["Route 53","Cloudflare","Azure DNS","Google Cloud DNS"] },
      { key: "ttl",      label: "TTL (s)",      type: "number", min: 0, max: 86400 },
      { key: "cost",     label: "Cost ($/mo)",  type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  {
    id: "filestore",
    name: "File Storage",
    icon: ICONS.filestore,
    category: "storage",
    color: "#fb923c",
    description: "Shared file system. AWS EFS, Azure Files, Google Filestore. NFS/SMB protocol.",
    defaults: { capacity: 5000, sizeGB: 100, protocol: "NFS", throughputMBs: 100, cost: 30, label: "File Storage" },
    properties: [
      { key: "label",          label: "Label",          type: "text" },
      { key: "capacity",       label: "IOPS",           type: "number", min: 1, max: 1000000 },
      { key: "sizeGB",         label: "Size (GB)",      type: "number", min: 1, max: 1000000 },
      { key: "protocol",       label: "Protocol",       type: "select", options: ["NFS","SMB","CIFS"] },
      { key: "throughputMBs",  label: "Throughput (MB/s)", type: "number", min: 1, max: 10000 },
      { key: "cost",           label: "Cost ($/mo)",    type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "blockstorage",
    name: "Block Storage",
    icon: ICONS.blockstorage,
    category: "storage",
    color: "#94a3b8",
    description: "Persistent block-level volumes. AWS EBS, Azure Managed Disk, GCP Persistent Disk.",
    defaults: { capacity: 16000, sizeGB: 100, volumeType: "SSD", iops: 3000, cost: 10, label: "Block Storage" },
    properties: [
      { key: "label",      label: "Label",        type: "text" },
      { key: "capacity",   label: "IOPS",         type: "number", min: 1, max: 256000 },
      { key: "sizeGB",     label: "Size (GB)",    type: "number", min: 1, max: 65536 },
      { key: "volumeType", label: "Type",         type: "select", options: ["SSD (gp3)","SSD (io2)","HDD (st1)","HDD (sc1)"] },
      { key: "iops",       label: "Provisioned IOPS", type: "number", min: 100, max: 256000 },
      { key: "cost",       label: "Cost ($/mo)",  type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "secretsmanager",
    name: "Secrets Manager",
    icon: ICONS.secretsmanager,
    category: "storage",
    color: "#f43f5e",
    description: "Encrypted secret storage and rotation. AWS Secrets Manager, HashiCorp Vault, Azure Key Vault.",
    defaults: { capacity: 10000, provider: "AWS Secrets Manager", autoRotate: true, cost: 5, label: "Secrets Manager" },
    properties: [
      { key: "label",      label: "Label",        type: "text" },
      { key: "capacity",   label: "Requests/s",   type: "number", min: 1, max: 100000 },
      { key: "provider",   label: "Provider",     type: "select", options: ["AWS Secrets Manager","HashiCorp Vault","Azure Key Vault","GCP Secret Manager"] },
      { key: "autoRotate", label: "Auto Rotate",  type: "checkbox" },
      { key: "cost",       label: "Cost ($/mo)",  type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },

  // ── Identity & Auth ───────────────────────────────────────────────────────
  {
    id: "identityprovider",
    name: "Identity Provider",
    icon: ICONS.identityprovider,
    category: "security",
    color: "#a78bfa",
    description: "Authentication & authorization. Auth0, AWS Cognito, Okta, Azure AD. OAuth2/OIDC/SAML.",
    defaults: { capacity: 5000, provider: "Auth0", protocol: "OAuth2/OIDC", mfa: true, cost: 23, label: "Identity Provider" },
    properties: [
      { key: "label",    label: "Label",      type: "text" },
      { key: "capacity", label: "Auth Req/s", type: "number", min: 1, max: 1000000 },
      { key: "provider", label: "Provider",   type: "select", options: ["Auth0","AWS Cognito","Okta","Azure AD","Keycloak","Firebase Auth"] },
      { key: "protocol", label: "Protocol",   type: "select", options: ["OAuth2/OIDC","SAML 2.0","LDAP","Social Login"] },
      { key: "mfa",      label: "MFA",        type: "checkbox" },
      { key: "cost",     label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "waf",
    name: "WAF",
    icon: ICONS.waf,
    category: "security",
    color: "#34d399",
    description: "Web Application Firewall. Filters malicious HTTP traffic. AWS WAF, Azure WAF, Cloudflare.",
    defaults: { capacity: 50000, blockRate: 5, provider: "AWS WAF", cost: 60, label: "WAF" },
    properties: [
      { key: "label",     label: "Label",         type: "text" },
      { key: "capacity",  label: "Req/s",         type: "number", min: 1, max: 10000000 },
      { key: "blockRate", label: "Block Rate (%)", type: "number", min: 0, max: 100 },
      { key: "provider",  label: "Provider",      type: "select", options: ["AWS WAF","Azure WAF","Cloudflare WAF","ModSecurity"] },
      { key: "cost",      label: "Cost ($/mo)",   type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },

  // ── Messaging ─────────────────────────────────────────────────────────────
  {
    id: "eventbus",
    name: "Event Bus",
    icon: ICONS.eventbus,
    category: "messaging",
    color: "#06b6d4",
    description: "Managed event routing. AWS EventBridge, Azure Event Grid. Fan-out events to multiple targets.",
    defaults: { capacity: 10000, provider: "AWS EventBridge", rules: 10, cost: 1, label: "Event Bus" },
    properties: [
      { key: "label",    label: "Label",       type: "text" },
      { key: "capacity", label: "Events/s",    type: "number", min: 1, max: 10000000 },
      { key: "provider", label: "Provider",    type: "select", options: ["AWS EventBridge","Azure Event Grid","Google Eventarc","Kafka"] },
      { key: "rules",    label: "Rules",       type: "number", min: 1, max: 2000 },
      { key: "cost",     label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "pubsub",
    name: "Pub/Sub",
    icon: ICONS.pubsub,
    category: "messaging",
    color: "#e879f9",
    description: "Publish-subscribe messaging. Google Pub/Sub, AWS SNS, Azure Service Bus Topics.",
    defaults: { capacity: 10000, provider: "Google Pub/Sub", topics: 5, subscribers: 10, cost: 10, label: "Pub/Sub" },
    properties: [
      { key: "label",       label: "Label",       type: "text" },
      { key: "capacity",    label: "Messages/s",  type: "number", min: 1, max: 100000000 },
      { key: "provider",    label: "Provider",    type: "select", options: ["Google Pub/Sub","AWS SNS","Azure Service Bus","Redis Pub/Sub"] },
      { key: "topics",      label: "Topics",      type: "number", min: 1, max: 10000 },
      { key: "subscribers", label: "Subscribers", type: "number", min: 1, max: 10000 },
      { key: "cost",        label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },

  // ── AI / ML ───────────────────────────────────────────────────────────────
  {
    id: "mlmodel",
    name: "ML Model",
    icon: ICONS.mlmodel,
    category: "ai",
    color: "#c084fc",
    description: "ML inference endpoint. AWS SageMaker, Vertex AI, Azure ML, Hugging Face, Ollama.",
    defaults: { capacity: 500, framework: "PyTorch", inferenceType: "Real-time", latencyMs: 200, gpuEnabled: false, cost: 100, label: "ML Model" },
    properties: [
      { key: "label",         label: "Label",          type: "text" },
      { key: "capacity",      label: "Req/s",          type: "number", min: 1, max: 100000 },
      { key: "framework",     label: "Framework",      type: "select", options: ["PyTorch","TensorFlow","ONNX","JAX","Scikit-learn"] },
      { key: "inferenceType", label: "Inference",      type: "select", options: ["Real-time","Batch","Async","Streaming"] },
      { key: "latencyMs",     label: "Latency (ms)",   type: "number", min: 1, max: 60000 },
      { key: "gpuEnabled",    label: "GPU",            type: "checkbox" },
      { key: "autoScale",     label: "Auto Scale",     type: "checkbox" },
      { key: "cost",          label: "Cost ($/mo)",    type: "number", min: 0 }
    ],
    scaleProps: [
      { key: "autoScale",   label: "Auto Scale",   type: "checkbox" },
      { key: "maxReplicas", label: "Max Replicas", type: "number", min: 1, max: 100 }
    ],
    behaviors: ["accepts_traffic", "autoscalable"]
  },
  {
    id: "vectordb",
    name: "Vector DB",
    icon: ICONS.vectordb,
    category: "storage",
    color: "#818cf8",
    description: "High-dimensional vector storage for embeddings and semantic search. Pinecone, Weaviate, pgvector, Qdrant.",
    defaults: { capacity: 2000, dimensions: 1536, indexType: "HNSW", provider: "Pinecone", cost: 70, label: "Vector DB" },
    properties: [
      { key: "label",      label: "Label",        type: "text" },
      { key: "capacity",   label: "Queries/s",    type: "number", min: 1, max: 100000 },
      { key: "dimensions", label: "Dimensions",   type: "number", min: 64, max: 65536 },
      { key: "indexType",  label: "Index Type",   type: "select", options: ["HNSW","IVF","LSH","Flat"] },
      { key: "provider",   label: "Provider",     type: "select", options: ["Pinecone","Weaviate","Qdrant","pgvector","Chroma","Milvus"] },
      { key: "cost",       label: "Cost ($/mo)",  type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },

  // ── Observability ─────────────────────────────────────────────────────────
  {
    id: "alerting",
    name: "Alerting",
    icon: ICONS.alerting,
    category: "observability",
    color: "#fb7185",
    description: "Alert routing and on-call management. PagerDuty, OpsGenie, CloudWatch Alarms, Grafana Alerts.",
    defaults: { capacity: 10000, provider: "PagerDuty", channels: "Slack, Email", alertRules: 20, cost: 30, label: "Alerting" },
    properties: [
      { key: "label",      label: "Label",        type: "text" },
      { key: "capacity",   label: "Events/s",     type: "number", min: 1, max: 1000000 },
      { key: "provider",   label: "Provider",     type: "select", options: ["PagerDuty","OpsGenie","VictorOps","CloudWatch Alarms","Grafana Alerts"] },
      { key: "channels",   label: "Channels",     type: "text" },
      { key: "alertRules", label: "Alert Rules",  type: "number", min: 1, max: 10000 },
      { key: "cost",       label: "Cost ($/mo)",  type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "observability_sink"]
  },
  {
    id: "tracing",
    name: "Distributed Tracing",
    icon: ICONS.tracing,
    category: "observability",
    color: "#2dd4bf",
    description: "End-to-end request tracing. Jaeger, Zipkin, AWS X-Ray, Tempo, OpenTelemetry.",
    defaults: { capacity: 20000, provider: "Jaeger", samplingRate: 10, retentionDays: 7, cost: 40, label: "Tracing" },
    properties: [
      { key: "label",         label: "Label",           type: "text" },
      { key: "capacity",      label: "Spans/s",         type: "number", min: 1, max: 10000000 },
      { key: "provider",      label: "Provider",        type: "select", options: ["Jaeger","Zipkin","AWS X-Ray","Grafana Tempo","OpenTelemetry"] },
      { key: "samplingRate",  label: "Sampling Rate (%)", type: "number", min: 1, max: 100 },
      { key: "retentionDays", label: "Retention (days)", type: "number", min: 1, max: 365 },
      { key: "cost",          label: "Cost ($/mo)",     type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "observability_sink"]
  },

  // ── Iteration 3: New integration / compute components ─────────────────────
  {
    id: "searchengine",
    name: "Search Engine",
    icon: ICONS.searchengine,
    category: "storage",
    color: "#f59e0b",
    description: "Full-text and vector search. Elasticsearch, OpenSearch, Typesense, Meilisearch, Solr.",
    defaults: { capacity: 5000, provider: "Elasticsearch", indices: 10, shards: 3, replicas: 1, latencyMs: 20, errorRate: 0, cost: 150, label: "Search Engine" },
    properties: [
      { key: "label",     label: "Label",         type: "text" },
      { key: "capacity",  label: "Queries/s",     type: "number", min: 1, max: 500000 },
      { key: "provider",  label: "Provider",      type: "select", options: ["Elasticsearch","OpenSearch","Typesense","Meilisearch","Solr","Algolia"] },
      { key: "indices",   label: "Indices",       type: "number", min: 1, max: 1000 },
      { key: "shards",    label: "Shards",        type: "number", min: 1, max: 100 },
      { key: "replicas",  label: "Replicas",      type: "number", min: 0, max: 10 },
      { key: "latencyMs", label: "Avg Latency (ms)", type: "number", min: 1, max: 10000 },
      { key: "errorRate", label: "Error Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
      { key: "cost",      label: "Cost ($/mo)",   type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "emailsms",
    name: "Email / SMS",
    icon: ICONS.emailsms,
    category: "messaging",
    color: "#ec4899",
    description: "Transactional email and SMS delivery. SendGrid, AWS SES, Twilio, Mailgun, Postmark.",
    defaults: { capacity: 10000, provider: "SendGrid", type: "Email", throughput: 100, cost: 20, label: "Email / SMS" },
    properties: [
      { key: "label",      label: "Label",       type: "text" },
      { key: "capacity",   label: "Sends/s",     type: "number", min: 1, max: 10000000 },
      { key: "provider",   label: "Provider",    type: "select", options: ["SendGrid","AWS SES","Twilio","Mailgun","Postmark","Vonage"] },
      { key: "type",       label: "Type",        type: "select", options: ["Email","SMS","Push","WhatsApp","Multi-channel"] },
      { key: "throughput", label: "Batch Size",  type: "number", min: 1, max: 100000 },
      { key: "cost",       label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "bgworker",
    name: "Background Worker",
    icon: ICONS.bgworker,
    category: "compute",
    color: "#84cc16",
    description: "Async job processor. Celery, Sidekiq, BullMQ, Temporal, AWS SQS worker.",
    defaults: { capacity: 500, cpu: "2 vCPU", memory: "4 GB", concurrency: 10, retries: 3, latencyMs: 500, errorRate: 0, region: "us-east-1", cost: 35, label: "BG Worker" },
    properties: [
      { key: "label",       label: "Label",          type: "text" },
      { key: "capacity",    label: "Jobs/s",          type: "number", min: 1, max: 100000 },
      { key: "cpu",         label: "CPU",             type: "select", options: ["1 vCPU","2 vCPU","4 vCPU","8 vCPU"] },
      { key: "memory",      label: "Memory",          type: "select", options: ["512 MB","1 GB","2 GB","4 GB","8 GB","16 GB"] },
      { key: "concurrency", label: "Concurrency",     type: "number", min: 1, max: 10000 },
      { key: "retries",     label: "Max Retries",     type: "number", min: 0, max: 10 },
      { key: "latencyMs",   label: "Avg Job Time (ms)", type: "number", min: 1, max: 3600000 },
      { key: "errorRate",   label: "Error Rate (%)",  type: "number", min: 0, max: 100, step: 0.1 },
      { key: "region",      label: "Region",          type: "select", options: ["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","global"] },
      { key: "cost",        label: "Cost ($/mo)",     type: "number", min: 0 }
    ],
    scaleProps: [
      { key: "autoScale",   label: "Enable Auto Scaling", type: "boolean" },
      { key: "scaleUpAt",   label: "Scale Up At (%)",     type: "number", min: 10, max: 100 },
      { key: "maxReplicas", label: "Max Workers",          type: "number", min: 1, max: 100 }
    ],
    behaviors: ["accepts_traffic", "scalable"]
  },
  {
    id: "graphqlapi",
    name: "GraphQL API",
    icon: ICONS.graphqlapi,
    category: "network",
    color: "#e879f9",
    description: "GraphQL query layer with subscriptions and schema federation. Apollo Server, Hasura, StepZen.",
    defaults: { capacity: 5000, engine: "Apollo Server", federation: false, subscriptions: true, latencyMs: 30, errorRate: 0, cost: 50, label: "GraphQL API" },
    properties: [
      { key: "label",          label: "Label",            type: "text" },
      { key: "capacity",       label: "Queries/s",        type: "number", min: 1, max: 100000 },
      { key: "engine",         label: "Engine",           type: "select", options: ["Apollo Server","Hasura","StepZen","Pothos","GraphQL Yoga","Mercurius"] },
      { key: "federation",     label: "Federation",       type: "boolean" },
      { key: "subscriptions",  label: "Subscriptions",    type: "boolean" },
      { key: "latencyMs",      label: "Avg Latency (ms)", type: "number", min: 1, max: 10000 },
      { key: "errorRate",      label: "Error Rate (%)",   type: "number", min: 0, max: 100, step: 0.1 },
      { key: "cost",           label: "Cost ($/mo)",      type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "websocket",
    name: "WebSocket Gateway",
    icon: ICONS.websocket,
    category: "network",
    color: "#06b6d4",
    description: "Persistent bidirectional real-time connections. Socket.IO, AWS API Gateway WebSocket, Ably, Pusher.",
    defaults: { capacity: 100000, maxConnections: 10000, provider: "Socket.IO", latencyMs: 5, errorRate: 0, cost: 40, label: "WebSocket GW" },
    properties: [
      { key: "label",          label: "Label",              type: "text" },
      { key: "capacity",       label: "Messages/s",         type: "number", min: 1, max: 10000000 },
      { key: "maxConnections", label: "Max Connections",    type: "number", min: 100, max: 10000000 },
      { key: "provider",       label: "Provider",           type: "select", options: ["Socket.IO","AWS API GW WS","Ably","Pusher","Centrifugo","Soketi"] },
      { key: "latencyMs",      label: "Avg Latency (ms)",   type: "number", min: 1, max: 1000 },
      { key: "errorRate",      label: "Error Rate (%)",     type: "number", min: 0, max: 100, step: 0.1 },
      { key: "cost",           label: "Cost ($/mo)",        type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "ratelimiter",
    name: "Rate Limiter",
    icon: ICONS.ratelimiter,
    category: "network",
    color: "#f97316",
    description: "Request throttling and DDoS/abuse protection. Kong, AWS WAF, NGINX rate limiting, Cloudflare.",
    defaults: { capacity: 100000, rateLimit: 1000, window: "1s", algorithm: "Token Bucket", rejectionRate: 5, cost: 30, label: "Rate Limiter" },
    properties: [
      { key: "label",         label: "Label",            type: "text" },
      { key: "capacity",      label: "Max Req/s",        type: "number", min: 1, max: 100000000 },
      { key: "rateLimit",     label: "Per-IP Limit/s",   type: "number", min: 1, max: 1000000 },
      { key: "window",        label: "Window",           type: "select", options: ["100ms","1s","10s","1m","1h"] },
      { key: "algorithm",     label: "Algorithm",        type: "select", options: ["Token Bucket","Leaky Bucket","Fixed Window","Sliding Window","Concurrency"] },
      { key: "rejectionRate", label: "Rejection Rate (%)", type: "number", min: 0, max: 100 },
      { key: "cost",          label: "Cost ($/mo)",      type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  }
];

export const CATEGORIES = [
  { id: "all",           label: "All",            icon: CAT_ICONS.all },
  { id: "source",        label: "Source",         icon: CAT_ICONS.source },
  { id: "compute",       label: "Compute",        icon: CAT_ICONS.compute },
  { id: "network",       label: "Network",        icon: CAT_ICONS.network },
  { id: "storage",       label: "Storage",        icon: CAT_ICONS.storage },
  { id: "data",          label: "Data",           icon: CAT_ICONS.data },
  { id: "messaging",     label: "Messaging",      icon: CAT_ICONS.messaging },
  { id: "ops",           label: "Ops",            icon: CAT_ICONS.ops },
  { id: "observability", label: "Observability",  icon: CAT_ICONS.observability },
  { id: "security",      label: "Security",       icon: CAT_ICONS.security },
  { id: "ai",            label: "AI / ML",        icon: CAT_ICONS.ai },
  { id: "annotation",    label: "Notes",          icon: CAT_ICONS.annotation }
];
