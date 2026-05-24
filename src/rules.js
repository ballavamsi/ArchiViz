export const ARCH_RULES = {
  users: ["deviceapp", "cdn", "firewall", "apigateway", "loadbalancer", "appserver", "vm", "pod", "appinsights", "logging"],
  deviceapp: ["taskhook", "apigateway", "kafkatopic", "queue", "streamprocessor", "appinsights", "logging"],
  eventsource: ["taskhook", "kafkatopic", "queue", "streamprocessor", "appinsights", "logging"],
  cdn: ["firewall", "apigateway", "loadbalancer", "appserver"],
  firewall: ["apigateway", "loadbalancer", "appserver", "vm", "pod"],
  apigateway: ["loadbalancer", "appserver", "vm", "pod", "queue", "appinsights", "logging"],
  loadbalancer: ["appserver", "vm", "pod"],
  appserver: ["cache", "database", "queue", "apigateway", "appinsights", "logging", "kafkatopic"],
  vm: ["cache", "database", "queue", "loadbalancer", "appinsights", "logging", "kafkatopic"],
  pod: ["cache", "database", "queue", "loadbalancer", "appinsights", "logging", "kafkatopic"],
  cache: ["database", "appinsights", "logging"],
  queue: ["appserver", "vm", "pod", "streamprocessor", "appinsights", "logging"],
  database: ["debezium", "appinsights", "logging"],
  autoscaler: ["appserver", "vm", "pod"],
  taskscheduler: ["taskhook", "orchestrator", "batchprocessor", "streamprocessor", "dataquality", "queryengine", "objectstorage", "tableformat", "appinsights", "logging"],
  taskhook: ["apigateway", "queue", "kafkatopic", "streamprocessor", "orchestrator", "appserver", "logging", "appinsights"],
  cdcsource: ["debezium", "appinsights", "logging"],
  debezium: ["kafkatopic", "logging", "appinsights"],
  kafkatopic: ["streamprocessor", "streamwindow", "datalake", "objectstorage", "tableformat", "warehouse", "logging", "appinsights"],
  streamprocessor: ["streamwindow", "kafkatopic", "datalake", "objectstorage", "tableformat", "warehouse", "dataquality", "appinsights", "logging"],
  streamwindow: ["streamprocessor", "kafkatopic", "datalake", "objectstorage", "tableformat", "warehouse", "dataquality", "appinsights", "logging"],
  datalake: ["objectstorage", "tableformat", "metastore", "warehouse", "streamprocessor", "batchprocessor", "queryengine", "dataquality", "appinsights", "logging"],
  objectstorage: ["tableformat", "metastore", "batchprocessor", "queryengine", "dataquality", "datalake", "warehouse", "appinsights", "logging"],
  tableformat: ["metastore", "batchprocessor", "queryengine", "dataquality", "warehouse", "appinsights", "logging"],
  metastore: ["queryengine", "batchprocessor", "warehouse", "appinsights", "logging"],
  batchprocessor: ["objectstorage", "tableformat", "datalake", "warehouse", "dataquality", "appinsights", "logging"],
  queryengine: ["warehouse", "appinsights", "logging"],
  dataquality: ["warehouse", "datalake", "objectstorage", "appinsights", "logging"],
  orchestrator: ["debezium", "streamprocessor", "batchprocessor", "dataquality", "queryengine", "appinsights", "logging"],
  warehouse: ["queryengine", "appinsights", "logging"],
  appinsights: [],
  logging: [],
  textnote: []
};

export function validateConnection(sourceDef, targetDef) {
  if (!sourceDef || !targetDef) return { ok: false, message: "Unknown component type." };
  const allowed = ARCH_RULES[sourceDef] || [];
  if (allowed.includes(targetDef)) return { ok: true };
  if (targetDef === "autoscaler" && ["appserver", "vm", "pod"].includes(sourceDef)) {
    return { ok: true, dashed: true };
  }
  return {
    ok: false,
    message: `${sourceDef} should not connect directly to ${targetDef}. Add an API Gateway, Load Balancer, Cache, or Queue between them.`
  };
}
