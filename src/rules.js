export const ARCH_RULES = {
  // Sources
  users:           ["deviceapp", "cdn", "dns", "firewall", "waf", "apigateway", "loadbalancer", "appserver", "vm", "pod", "appinsights", "logging"],
  deviceapp:       ["taskhook", "apigateway", "kafkatopic", "queue", "streamprocessor", "appinsights", "logging"],
  eventsource:     ["taskhook", "kafkatopic", "queue", "streamprocessor", "cdcsource", "eventbus", "pubsub", "appinsights", "logging"],

  // Network / edge tier
  dns:             ["cdn", "firewall", "waf", "loadbalancer", "apigateway", "appinsights", "logging"],
  cdn:             ["firewall", "waf", "apigateway", "loadbalancer", "appserver", "cache", "appinsights", "logging"],
  firewall:        ["waf", "apigateway", "loadbalancer", "appserver", "vm", "pod", "appinsights", "logging"],
  waf:             ["apigateway", "loadbalancer", "appserver", "vm", "pod", "appinsights", "logging"],
  vpn:             ["appserver", "vm", "pod", "database", "loadbalancer", "filestore", "blockstorage", "appinsights", "logging"],
  apigateway:      ["loadbalancer", "appserver", "vm", "pod", "serverless", "queue", "cache", "database", "identityprovider", "appinsights", "logging"],
  loadbalancer:    ["appserver", "vm", "pod", "serverless", "database", "cache", "apigateway", "appinsights", "logging"],
  identityprovider:["apigateway", "appserver", "vm", "pod", "serverless", "logging", "appinsights"],

  // Compute — allow microservice-to-microservice and all backend targets
  appserver:       ["appserver", "vm", "pod", "serverless", "cache", "database", "vectordb", "queue", "eventbus", "pubsub", "loadbalancer", "apigateway", "appinsights", "logging", "kafkatopic", "objectstorage", "filestore", "blockstorage", "secretsmanager", "mlmodel", "tracing"],
  vm:              ["appserver", "vm", "pod", "serverless", "cache", "database", "vectordb", "queue", "eventbus", "pubsub", "loadbalancer", "apigateway", "appinsights", "logging", "kafkatopic", "objectstorage", "filestore", "blockstorage", "secretsmanager", "mlmodel", "tracing"],
  pod:             ["appserver", "vm", "pod", "serverless", "cache", "database", "vectordb", "queue", "eventbus", "pubsub", "loadbalancer", "apigateway", "appinsights", "logging", "kafkatopic", "objectstorage", "filestore", "blockstorage", "secretsmanager", "mlmodel", "tracing"],
  serverless:      ["database", "vectordb", "cache", "queue", "eventbus", "pubsub", "objectstorage", "filestore", "secretsmanager", "appserver", "vm", "pod", "serverless", "mlmodel", "appinsights", "logging", "kafkatopic", "tracing"],

  // Storage
  cache:           ["database", "appserver", "vm", "pod", "serverless", "appinsights", "logging"],
  database:        ["database", "cache", "debezium", "cdcsource", "appinsights", "logging"],
  vectordb:        ["mlmodel", "appserver", "vm", "pod", "serverless", "appinsights", "logging"],
  filestore:       ["appserver", "vm", "pod", "serverless", "appinsights", "logging"],
  blockstorage:    ["vm", "pod", "appserver", "appinsights", "logging"],
  secretsmanager:  ["appserver", "vm", "pod", "serverless", "database", "cache", "appinsights", "logging"],

  // Messaging
  queue:           ["appserver", "vm", "pod", "serverless", "streamprocessor", "database", "cache", "appinsights", "logging"],
  eventbus:        ["serverless", "appserver", "vm", "pod", "queue", "pubsub", "logging", "appinsights"],
  pubsub:          ["serverless", "appserver", "vm", "pod", "streamprocessor", "queue", "logging", "appinsights"],

  // Ops
  autoscaler:      ["appserver", "vm", "pod", "serverless", "loadbalancer"],
  taskscheduler:   ["taskhook", "orchestrator", "batchprocessor", "streamprocessor", "dataquality", "queryengine", "objectstorage", "tableformat", "serverless", "appinsights", "logging"],
  taskhook:        ["apigateway", "queue", "kafkatopic", "eventbus", "streamprocessor", "orchestrator", "appserver", "vm", "pod", "serverless", "logging", "appinsights"],

  // Data / CDC pipeline
  cdcsource:       ["debezium", "kafkatopic", "appinsights", "logging"],
  debezium:        ["kafkatopic", "streamprocessor", "logging", "appinsights"],
  kafkatopic:      ["streamprocessor", "streamwindow", "appserver", "vm", "pod", "serverless", "datalake", "objectstorage", "tableformat", "warehouse", "logging", "appinsights"],
  streamprocessor: ["streamwindow", "kafkatopic", "datalake", "objectstorage", "tableformat", "warehouse", "database", "cache", "dataquality", "appinsights", "logging"],
  streamwindow:    ["streamprocessor", "kafkatopic", "datalake", "objectstorage", "tableformat", "warehouse", "dataquality", "appinsights", "logging"],
  datalake:        ["objectstorage", "tableformat", "metastore", "warehouse", "streamprocessor", "batchprocessor", "queryengine", "dataquality", "mlmodel", "appinsights", "logging"],
  objectstorage:   ["tableformat", "metastore", "batchprocessor", "queryengine", "dataquality", "datalake", "warehouse", "mlmodel", "appinsights", "logging"],
  tableformat:     ["metastore", "batchprocessor", "queryengine", "dataquality", "warehouse", "appinsights", "logging"],
  metastore:       ["queryengine", "batchprocessor", "warehouse", "appinsights", "logging"],
  batchprocessor:  ["objectstorage", "tableformat", "datalake", "warehouse", "database", "dataquality", "appinsights", "logging"],
  queryengine:     ["warehouse", "datalake", "objectstorage", "database", "appinsights", "logging"],
  dataquality:     ["warehouse", "datalake", "objectstorage", "appinsights", "logging"],
  orchestrator:    ["debezium", "streamprocessor", "batchprocessor", "dataquality", "queryengine", "taskscheduler", "serverless", "appinsights", "logging"],
  warehouse:       ["queryengine", "objectstorage", "mlmodel", "appinsights", "logging"],

  // AI / ML
  mlmodel:         ["database", "vectordb", "cache", "objectstorage", "appinsights", "logging", "appserver", "serverless"],

  // Observability — sinks only
  appinsights:     ["logging", "alerting"],
  logging:         ["alerting"],
  alerting:        [],
  tracing:         ["logging", "appinsights", "alerting"],

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
  'users→vectordb':      'Users should not hit a Vector DB directly — route via an App Server, API Gateway, or Serverless Function.',
  'users→secretsmanager':'Users should not access Secrets Manager — only backend services should fetch secrets.',
  'dns→database':        'DNS does not connect to databases — route via CDN, Load Balancer, or API Gateway.',
  'alerting→':           'Alerting is a notification sink — it does not send traffic to other services.',
  'secretsmanager→':     'Secrets Manager provides credentials to services, not the other way. Connect from your compute layer.',
  '→identityprovider':   'Identity Provider sits in front of your API Gateway or App Server, not behind it.',
};

export function validateConnection(sourceDef, targetDef) {
  if (!sourceDef || !targetDef) return { ok: false, message: 'Unknown component type.' };
  const allowed = ARCH_RULES[sourceDef] || [];
  if (allowed.includes(targetDef)) return { ok: true };
  if (targetDef === 'autoscaler' && ['appserver', 'vm', 'pod', 'serverless', 'mlmodel'].includes(sourceDef)) {
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
