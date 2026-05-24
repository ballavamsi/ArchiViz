// Example architecture templates

export const EXAMPLES = [
  {
    id: "simple-web",
    name: "Simple Web App",
    description: "Basic 3-tier: Users → App Server → Database",
    nodes: [
      { id: "n1", type: "users",     position: { x: 80,  y: 200 }, data: { defId: "users",     props: { userCount: 100,  requestsPerUser: 1, label: "Users" } } },
      { id: "n2", type: "appserver", position: { x: 350, y: 200 }, data: { defId: "appserver", props: { capacity: 300, runtime: "Node.js", workers: 4, cost: 40, label: "App Server" } } },
      { id: "n3", type: "database",  position: { x: 620, y: 200 }, data: { defId: "database",  props: { capacity: 1000, type: "PostgreSQL", cost: 80, label: "Database" } } }
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3", animated: true }
    ]
  },

  {
    id: "load-balanced",
    name: "Load Balanced Web",
    description: "Users → Load Balancer → 2× App Servers → Database",
    nodes: [
      { id: "n1", type: "users",        position: { x: 60,  y: 250 }, data: { defId: "users",        props: { userCount: 500, requestsPerUser: 1, label: "Users" } } },
      { id: "n2", type: "loadbalancer", position: { x: 280, y: 250 }, data: { defId: "loadbalancer", props: { algorithm: "Round Robin", cost: 20, label: "Load Balancer" } } },
      { id: "n3", type: "appserver",    position: { x: 520, y: 130 }, data: { defId: "appserver",    props: { capacity: 300, runtime: "Node.js", cost: 40, label: "App Server 1" } } },
      { id: "n4", type: "appserver",    position: { x: 520, y: 370 }, data: { defId: "appserver",    props: { capacity: 300, runtime: "Node.js", cost: 40, label: "App Server 2" } } },
      { id: "n5", type: "database",     position: { x: 760, y: 250 }, data: { defId: "database",     props: { capacity: 1000, type: "PostgreSQL", cost: 80, label: "Database" } } }
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3", animated: true },
      { id: "e3", source: "n2", target: "n4", animated: true },
      { id: "e4", source: "n3", target: "n5", animated: true },
      { id: "e5", source: "n4", target: "n5", animated: true }
    ]
  },

  {
    id: "auto-scaled",
    name: "Auto-Scaled App",
    description: "With Auto-Scaler watching the app server",
    nodes: [
      { id: "n1", type: "users",        position: { x: 60,  y: 250 }, data: { defId: "users",        props: { userCount: 200, requestsPerUser: 1, label: "Users" } } },
      { id: "n2", type: "loadbalancer", position: { x: 280, y: 250 }, data: { defId: "loadbalancer", props: { algorithm: "Round Robin", cost: 20, label: "Load Balancer" } } },
      { id: "n3", type: "appserver",    position: { x: 520, y: 250 }, data: { defId: "appserver",    props: { capacity: 300, runtime: "Node.js", cost: 40, label: "App Server" } } },
      { id: "n4", type: "autoscaler",   position: { x: 520, y: 60  }, data: { defId: "autoscaler",   props: { scaleUpThreshold: 80, minReplicas: 1, maxReplicas: 5, label: "Auto Scaler" } } },
      { id: "n5", type: "database",     position: { x: 760, y: 250 }, data: { defId: "database",     props: { capacity: 1000, type: "PostgreSQL", cost: 80, label: "Database" } } }
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3", animated: true },
      { id: "e3", source: "n4", target: "n3", animated: false, style: { strokeDasharray: "5,5" } },
      { id: "e4", source: "n3", target: "n5", animated: true }
    ]
  },

  {
    id: "cdn-cache",
    name: "CDN + Cache Layer",
    description: "CDN offloads static, Cache reduces DB hits",
    nodes: [
      { id: "n1", type: "users",        position: { x: 60,  y: 250 }, data: { defId: "users",        props: { userCount: 1000, requestsPerUser: 2, label: "Users" } } },
      { id: "n2", type: "cdn",          position: { x: 260, y: 250 }, data: { defId: "cdn",          props: { capacity: 100000, cacheHitRate: 70, cost: 15, label: "CDN" } } },
      { id: "n3", type: "loadbalancer", position: { x: 470, y: 250 }, data: { defId: "loadbalancer", props: { algorithm: "Round Robin", cost: 20, label: "Load Balancer" } } },
      { id: "n4", type: "appserver",    position: { x: 680, y: 130 }, data: { defId: "appserver",    props: { capacity: 300, runtime: "Node.js", cost: 40, label: "App Server 1" } } },
      { id: "n5", type: "appserver",    position: { x: 680, y: 370 }, data: { defId: "appserver",    props: { capacity: 300, runtime: "Node.js", cost: 40, label: "App Server 2" } } },
      { id: "n6", type: "cache",        position: { x: 880, y: 130 }, data: { defId: "cache",        props: { capacity: 5000, type: "Redis", hitRate: 80, cost: 25, label: "Redis Cache" } } },
      { id: "n7", type: "database",     position: { x: 880, y: 370 }, data: { defId: "database",     props: { capacity: 1000, type: "PostgreSQL", cost: 80, label: "Database" } } }
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3", animated: true },
      { id: "e3", source: "n3", target: "n4", animated: true },
      { id: "e4", source: "n3", target: "n5", animated: true },
      { id: "e5", source: "n4", target: "n6", animated: true },
      { id: "e6", source: "n5", target: "n6", animated: true },
      { id: "e7", source: "n6", target: "n7", animated: true }
    ]
  },

  {
    id: "microservices",
    name: "Microservices",
    description: "API Gateway routes to independent microservices with shared DB",
    nodes: [
      { id: "n1", type: "users",      position: { x: 60,  y: 300 }, data: { defId: "users",      props: { userCount: 500, requestsPerUser: 2, label: "Users" } } },
      { id: "n2", type: "apigateway", position: { x: 280, y: 300 }, data: { defId: "apigateway", props: { capacity: 5000, type: "Kong", authType: "JWT", cost: 35, label: "API Gateway" } } },
      { id: "n3", type: "appserver",  position: { x: 520, y: 140 }, data: { defId: "appserver",  props: { capacity: 200, runtime: "Node.js", cost: 30, label: "Auth Service" } } },
      { id: "n4", type: "appserver",  position: { x: 520, y: 300 }, data: { defId: "appserver",  props: { capacity: 200, runtime: "Python", cost: 30, label: "Order Service" } } },
      { id: "n5", type: "appserver",  position: { x: 520, y: 460 }, data: { defId: "appserver",  props: { capacity: 200, runtime: "Go", cost: 30, label: "Notif Service" } } },
      { id: "n6", type: "queue",      position: { x: 760, y: 460 }, data: { defId: "queue",      props: { capacity: 10000, type: "RabbitMQ", cost: 30, label: "Message Queue" } } },
      { id: "n7", type: "database",   position: { x: 760, y: 250 }, data: { defId: "database",   props: { capacity: 1000, type: "PostgreSQL", cost: 80, label: "Main DB" } } }
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3", animated: true },
      { id: "e3", source: "n2", target: "n4", animated: true },
      { id: "e4", source: "n2", target: "n5", animated: true },
      { id: "e5", source: "n3", target: "n7", animated: true },
      { id: "e6", source: "n4", target: "n7", animated: true },
      { id: "e7", source: "n5", target: "n6", animated: true }
    ]
  },

  {
    id: "mobile-events",
    name: "Mobile Event Streaming",
    description: "Users → Device/App emits 4 events/s/user → Hook/API → Kafka → Window → Flink → Lakehouse",
    nodes: [
      { id: "n1", type: "users",           position: { x: 40,   y: 260 }, data: { defId: "users",           props: { userCount: 1300000000, requestsPerUser: 1, label: "1.3B Users" } } },
      { id: "n2", type: "deviceapp",       position: { x: 280,  y: 260 }, data: { defId: "deviceapp",       props: { capacity: 8000000000, platform: "Mobile App", eventsPerInput: 4, batchingMs: 1000, label: "Mobile App" } } },
      { id: "n3", type: "taskhook",        position: { x: 540,  y: 260 }, data: { defId: "taskhook",        props: { capacity: 6000000000, trigger: "Webhook", delivery: "At least once", retries: 5, label: "Ingestion Hook" } } },
      { id: "n4", type: "kafkatopic",      position: { x: 800,  y: 260 }, data: { defId: "kafkatopic",      props: { capacity: 7000000000, partitions: 12000, replicationFactor: 3, retentionDays: 3, label: "user.events" } } },
      { id: "n5", type: "streamwindow",    position: { x: 1060, y: 260 }, data: { defId: "streamwindow",    props: { capacity: 6000000000, windowType: "Sliding", windowSize: "5 minutes", slideEvery: "1 minute", allowedLateness: "10 minutes", label: "5m Sliding Window" } } },
      { id: "n6", type: "streamprocessor", position: { x: 1320, y: 260 }, data: { defId: "streamprocessor", props: { capacity: 6500000000, engine: "Flink", parallelism: 6000, checkpointSeconds: 30, triggerMode: "Event Time", label: "Flink Aggregation" } } },
      { id: "n7", type: "objectstorage",   position: { x: 1580, y: 120 }, data: { defId: "objectstorage",   props: { capacity: 9000000000, provider: "Generic Object Storage", storageTB: 1000, label: "Object Storage" } } },
      { id: "n8", type: "tableformat",     position: { x: 1820, y: 120 }, data: { defId: "tableformat",     props: { capacity: 9000000000, format: "Apache Iceberg", compaction: true, label: "Iceberg Tables" } } },
      { id: "n9", type: "appinsights",     position: { x: 1320, y: 40  }, data: { defId: "appinsights",     props: { capacity: 1000000000, provider: "OpenTelemetry Collector", samplingRate: 5, label: "Telemetry" } } },
      { id: "n10", type: "taskscheduler",  position: { x: 1060, y: 470 }, data: { defId: "taskscheduler",  props: { capacity: 100000, scheduleMode: "Dataset Based", frequency: "On new partition", maxConcurrency: 500, label: "Compaction Trigger" } } },
      { id: "n11", type: "textnote",       position: { x: 540,  y: 60  }, data: { defId: "textnote",       props: { label: "Assumption", tone: "Decision", text: "Users feed mobile sessions. The app emits 4 product events/sec/user; downstream labels show compact billion-scale flow." } } }
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3", animated: true },
      { id: "e3", source: "n3", target: "n4", animated: true },
      { id: "e4", source: "n4", target: "n5", animated: true },
      { id: "e5", source: "n5", target: "n6", animated: true },
      { id: "e6", source: "n6", target: "n7", animated: true },
      { id: "e7", source: "n7", target: "n8", animated: true },
      { id: "e8", source: "n6", target: "n9", animated: true },
      { id: "e9", source: "n10", target: "n8", animated: true }
    ]
  },

  {
    id: "cdc-streaming",
    name: "CDC Streaming Platform",
    description: "Source DB → Debezium → Kafka → Flink/Spark → Object Storage + Lakehouse + Observability",
    nodes: [
      { id: "n1",  type: "cdcsource",       position: { x: 60,   y: 260 }, data: { defId: "cdcsource",       props: { capacity: 6000, engine: "PostgreSQL", tables: 28, changeRate: 2500, label: "Orders DB" } } },
      { id: "n2",  type: "debezium",        position: { x: 300,  y: 260 }, data: { defId: "debezium",        props: { capacity: 5000, connectorType: "Postgres", tasks: 2, snapshotMode: "Initial", label: "Debezium CDC" } } },
      { id: "n3",  type: "kafkatopic",      position: { x: 560,  y: 170 }, data: { defId: "kafkatopic",      props: { capacity: 20000, partitions: 24, retentionDays: 7, label: "orders.raw" } } },
      { id: "n4",  type: "kafkatopic",      position: { x: 560,  y: 350 }, data: { defId: "kafkatopic",      props: { capacity: 20000, partitions: 12, retentionDays: 14, cleanupPolicy: "compact", label: "customers.raw" } } },
      { id: "n5",  type: "streamprocessor", position: { x: 830,  y: 260 }, data: { defId: "streamprocessor", props: { capacity: 12000, engine: "Flink", parallelism: 12, checkpointSeconds: 30, label: "Flink Enrichment" } } },
      { id: "n6",  type: "objectstorage",   position: { x: 1080, y: 120 }, data: { defId: "objectstorage",   props: { capacity: 50000, provider: "Generic Object Storage", storageTB: 50, label: "Object Storage" } } },
      { id: "n7",  type: "tableformat",     position: { x: 1320, y: 120 }, data: { defId: "tableformat",     props: { capacity: 50000, format: "Apache Hudi", compaction: true, label: "Hudi Tables" } } },
      { id: "n8",  type: "appinsights",     position: { x: 830,  y: 40  }, data: { defId: "appinsights",     props: { capacity: 100000, provider: "Azure Application Insights", samplingRate: 25, label: "Pipeline APM" } } },
      { id: "n9",  type: "logging",         position: { x: 830,  y: 520 }, data: { defId: "logging",         props: { capacity: 80000, platform: "Elastic", ingestGBDay: 80, retentionDays: 45, label: "Central Logs" } } },
      { id: "n10", type: "batchprocessor",  position: { x: 1080, y: 340 }, data: { defId: "batchprocessor",  props: { capacity: 30000, engine: "Apache Spark", workers: 16, schedule: "Hourly", label: "Spark Batch" } } },
      { id: "n11", type: "dataquality",     position: { x: 1320, y: 340 }, data: { defId: "dataquality",     props: { capacity: 25000, tool: "Great Expectations", checks: 180, failurePolicy: "Quarantine", label: "Quality Gates" } } },
      { id: "n12", type: "metastore",       position: { x: 1560, y: 120 }, data: { defId: "metastore",       props: { capacity: 20000, catalog: "Hive Metastore", schemas: 150, lineage: true, label: "Data Catalog" } } },
      { id: "n13", type: "queryengine",     position: { x: 1560, y: 340 }, data: { defId: "queryengine",     props: { capacity: 10000, engine: "Trino", concurrency: 35, cacheEnabled: true, label: "Trino Query" } } },
      { id: "n14", type: "warehouse",       position: { x: 1800, y: 250 }, data: { defId: "warehouse",       props: { capacity: 15000, platform: "Snowflake", computeSize: "Large", concurrency: 40, label: "Analytics Warehouse" } } },
      { id: "n15", type: "orchestrator",    position: { x: 1080, y: 520 }, data: { defId: "orchestrator",    props: { capacity: 5000, tool: "Airflow", dags: 35, label: "Airflow" } } }
    ],
    edges: [
      { id: "e1",  source: "n1", target: "n2", animated: true },
      { id: "e2",  source: "n2", target: "n3", animated: true },
      { id: "e3",  source: "n2", target: "n4", animated: true },
      { id: "e4",  source: "n3", target: "n5", animated: true },
      { id: "e5",  source: "n4", target: "n5", animated: true },
      { id: "e6",  source: "n5", target: "n6", animated: true },
      { id: "e7",  source: "n6", target: "n7", animated: true },
      { id: "e8",  source: "n2", target: "n8", animated: true },
      { id: "e9",  source: "n5", target: "n8", animated: true },
      { id: "e10", source: "n2", target: "n9", animated: true },
      { id: "e11", source: "n5", target: "n9", animated: true },
      { id: "e12", source: "n6", target: "n10", animated: true },
      { id: "e13", source: "n10", target: "n11", animated: true },
      { id: "e14", source: "n7", target: "n12", animated: true },
      { id: "e15", source: "n12", target: "n13", animated: true },
      { id: "e16", source: "n13", target: "n14", animated: true },
      { id: "e17", source: "n15", target: "n10", animated: true },
      { id: "e18", source: "n15", target: "n11", animated: true }
    ]
  }
];
