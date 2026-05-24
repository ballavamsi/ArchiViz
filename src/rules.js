export const ARCH_RULES = {
  // Sources
  users:           ["deviceapp", "cdn", "firewall", "apigateway", "loadbalancer", "appserver", "vm", "pod", "appinsights", "logging"],
  deviceapp:       ["taskhook", "apigateway", "kafkatopic", "queue", "streamprocessor", "appinsights", "logging"],
  eventsource:     ["taskhook", "kafkatopic", "queue", "streamprocessor", "cdcsource", "appinsights", "logging"],

  // Network / edge tier
  cdn:             ["firewall", "apigateway", "loadbalancer", "appserver", "cache", "appinsights", "logging"],
  firewall:        ["apigateway", "loadbalancer", "appserver", "vm", "pod", "appinsights", "logging"],
  apigateway:      ["loadbalancer", "appserver", "vm", "pod", "queue", "cache", "database", "appinsights", "logging"],
  loadbalancer:    ["appserver", "vm", "pod", "database", "cache", "apigateway", "appinsights", "logging"],

  // Compute — allow microservice-to-microservice and all backend targets
  appserver:       ["appserver", "vm", "pod", "cache", "database", "queue", "loadbalancer", "apigateway", "appinsights", "logging", "kafkatopic", "objectstorage"],
  vm:              ["appserver", "vm", "pod", "cache", "database", "queue", "loadbalancer", "apigateway", "appinsights", "logging", "kafkatopic", "objectstorage"],
  pod:             ["appserver", "vm", "pod", "cache", "database", "queue", "loadbalancer", "apigateway", "appinsights", "logging", "kafkatopic", "objectstorage"],

  // Storage
  cache:           ["database", "appserver", "vm", "pod", "appinsights", "logging"],
  database:        ["database", "cache", "debezium", "cdcsource", "appinsights", "logging"],

  // Messaging
  queue:           ["appserver", "vm", "pod", "streamprocessor", "database", "cache", "appinsights", "logging"],

  // Ops
  autoscaler:      ["appserver", "vm", "pod", "loadbalancer"],
  taskscheduler:   ["taskhook", "orchestrator", "batchprocessor", "streamprocessor", "dataquality", "queryengine", "objectstorage", "tableformat", "appinsights", "logging"],
  taskhook:        ["apigateway", "queue", "kafkatopic", "streamprocessor", "orchestrator", "appserver", "vm", "pod", "logging", "appinsights"],

  // Data / CDC pipeline
  cdcsource:       ["debezium", "kafkatopic", "appinsights", "logging"],
  debezium:        ["kafkatopic", "streamprocessor", "logging", "appinsights"],
  kafkatopic:      ["streamprocessor", "streamwindow", "appserver", "vm", "pod", "datalake", "objectstorage", "tableformat", "warehouse", "logging", "appinsights"],
  streamprocessor: ["streamwindow", "kafkatopic", "datalake", "objectstorage", "tableformat", "warehouse", "database", "cache", "dataquality", "appinsights", "logging"],
  streamwindow:    ["streamprocessor", "kafkatopic", "datalake", "objectstorage", "tableformat", "warehouse", "dataquality", "appinsights", "logging"],
  datalake:        ["objectstorage", "tableformat", "metastore", "warehouse", "streamprocessor", "batchprocessor", "queryengine", "dataquality", "appinsights", "logging"],
  objectstorage:   ["tableformat", "metastore", "batchprocessor", "queryengine", "dataquality", "datalake", "warehouse", "appinsights", "logging"],
  tableformat:     ["metastore", "batchprocessor", "queryengine", "dataquality", "warehouse", "appinsights", "logging"],
  metastore:       ["queryengine", "batchprocessor", "warehouse", "appinsights", "logging"],
  batchprocessor:  ["objectstorage", "tableformat", "datalake", "warehouse", "database", "dataquality", "appinsights", "logging"],
  queryengine:     ["warehouse", "datalake", "objectstorage", "database", "appinsights", "logging"],
  dataquality:     ["warehouse", "datalake", "objectstorage", "appinsights", "logging"],
  orchestrator:    ["debezium", "streamprocessor", "batchprocessor", "dataquality", "queryengine", "taskscheduler", "appinsights", "logging"],
  warehouse:       ["queryengine", "objectstorage", "appinsights", "logging"],

  // Observability — sinks only
  appinsights:     ["logging"],
  logging:         [],
  textnote:        []
};

const CONNECT_HINTS = {
  'users→database':      'Users should not hit a database directly — route via an App Server or API Gateway.',
  'users→cache':         'Route user traffic through an App Server or API Gateway before hitting a Cache.',
  'cdn→database':        'CDN cannot talk to a database — add an App Server or API Gateway in between.',
  'appinsights→':        'App Insights is an observability sink — it does not send traffic downstream.',
  'logging→':            'Log Analytics is a sink — it does not send traffic downstream.',
  'queue→loadbalancer':  'Queues push to workers (App Server / Pod / VM), not to a Load Balancer.',
  'database→appserver':  'Databases do not initiate requests — use CDC / Debezium to capture changes.',
  'database→loadbalancer': 'Databases do not initiate requests — use CDC / Debezium to push change events.',
  'warehouse→appserver': 'Warehouses are analytics stores; connect to a Query Engine instead.',
};

export function validateConnection(sourceDef, targetDef) {
  if (!sourceDef || !targetDef) return { ok: false, message: 'Unknown component type.' };
  const allowed = ARCH_RULES[sourceDef] || [];
  if (allowed.includes(targetDef)) return { ok: true };
  if (targetDef === 'autoscaler' && ['appserver', 'vm', 'pod'].includes(sourceDef)) {
    return { ok: true, dashed: true };
  }
  // Look for a specific hint first, then fall back to generic
  const hint = CONNECT_HINTS[`${sourceDef}→${targetDef}`]
    || CONNECT_HINTS[`${sourceDef}→`]
    || CONNECT_HINTS[`→${targetDef}`]
    || null;
  return {
    ok: false,
    message: hint || `${sourceDef} → ${targetDef} is not a standard architecture pattern. Check if an intermediary (API Gateway, Load Balancer, Queue, or Cache) belongs between them.`
  };
}
