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
  },

  {
    id: "saas-web-app",
    name: "SaaS Web App",
    description: "Browser users through CDN, gateway, app tier, cache, database, and observability.",
    category: "Application",
    difficulty: "Beginner",
    tags: ["saas", "web", "cache", "observability"],
    summary: "A presentation-ready web application baseline with clear cache and database cost drivers.",
    nodes: [
      { id:"n1", type:"users", position:{x:60,y:240}, data:{defId:"users", props:{userCount:250000, requestsPerUser:2, label:"Customers"}} },
      { id:"n2", type:"cdn", position:{x:300,y:240}, data:{defId:"cdn", props:{capacity:1000000, cacheHitRate:70, cost:120, label:"CDN"}} },
      { id:"n3", type:"apigateway", position:{x:540,y:240}, data:{defId:"apigateway", props:{capacity:600000, authType:"JWT", cost:260, label:"API Gateway"}} },
      { id:"n4", type:"appserver", position:{x:780,y:160}, data:{defId:"appserver", props:{capacity:220000, runtime:"Node.js", workers:16, cost:480, label:"Web/API App"}} },
      { id:"n5", type:"cache", position:{x:1020,y:160}, data:{defId:"cache", props:{capacity:500000, type:"Redis", hitRate:85, memoryGB:32, cost:360, label:"Redis Cache"}} },
      { id:"n6", type:"database", position:{x:1020,y:340}, data:{defId:"database", props:{capacity:180000, type:"PostgreSQL", readReplicas:2, storageGB:1024, cost:900, label:"Primary DB"}} },
      { id:"n7", type:"appinsights", position:{x:780,y:360}, data:{defId:"appinsights", props:{capacity:100000, samplingRate:20, cost:150, label:"Telemetry"}} }
    ],
    edges: [
      {id:"e1",source:"n1",target:"n2",animated:true},{id:"e2",source:"n2",target:"n3",animated:true},{id:"e3",source:"n3",target:"n4",animated:true},
      {id:"e4",source:"n4",target:"n5",animated:true,trafficPct:70},{id:"e5",source:"n4",target:"n6",animated:true,trafficPct:30},{id:"e6",source:"n4",target:"n7",animated:true}
    ]
  },

  {
    id: "event-streaming",
    name: "Event Streaming Platform",
    description: "Product events through webhook ingestion, Kafka, stream processing, lake storage, and query.",
    category: "Data",
    difficulty: "Intermediate",
    tags: ["kafka", "flink", "lakehouse", "events"],
    summary: "Shows high-volume event flow, retention, partitions, and processing capacity.",
    nodes: [
      { id:"n1", type:"eventsource", position:{x:60,y:260}, data:{defId:"eventsource", props:{eventRate:250000, label:"Product Events"}} },
      { id:"n2", type:"taskhook", position:{x:300,y:260}, data:{defId:"taskhook", props:{capacity:300000, trigger:"Webhook", retries:3, label:"Ingestion Hook"}} },
      { id:"n3", type:"kafkatopic", position:{x:540,y:260}, data:{defId:"kafkatopic", props:{capacity:500000, partitions:240, replicationFactor:3, retentionDays:7, label:"events.raw"}} },
      { id:"n4", type:"streamprocessor", position:{x:780,y:260}, data:{defId:"streamprocessor", props:{capacity:450000, engine:"Flink", parallelism:128, checkpointSeconds:30, label:"Flink Processor"}} },
      { id:"n5", type:"objectstorage", position:{x:1020,y:160}, data:{defId:"objectstorage", props:{capacity:500000, storageTB:180, cost:420, label:"Object Storage"}} },
      { id:"n6", type:"queryengine", position:{x:1260,y:160}, data:{defId:"queryengine", props:{capacity:120000, engine:"Trino", concurrency:80, cost:520, label:"Query Engine"}} },
      { id:"n7", type:"appinsights", position:{x:780,y:420}, data:{defId:"appinsights", props:{capacity:100000, samplingRate:10, label:"Pipeline Metrics"}} }
    ],
    edges: [
      {id:"e1",source:"n1",target:"n2",animated:true},{id:"e2",source:"n2",target:"n3",animated:true},{id:"e3",source:"n3",target:"n4",animated:true},
      {id:"e4",source:"n4",target:"n5",animated:true},{id:"e5",source:"n5",target:"n6",animated:true},{id:"e6",source:"n4",target:"n7",animated:true}
    ]
  },

  {
    id: "multi-region-ha",
    name: "Multi-Region HA",
    description: "Global traffic manager with active-active regional stacks and replicated data.",
    category: "Reliability",
    difficulty: "Advanced",
    tags: ["multi-region", "ha", "failover", "replication"],
    summary: "A resilient architecture starter for discussing capacity, failover, and data replication cost.",
    nodes: [
      { id:"n1", type:"users", position:{x:60,y:280}, data:{defId:"users", props:{userCount:800000, requestsPerUser:1, label:"Global Users"}} },
      { id:"n2", type:"cdn", position:{x:300,y:280}, data:{defId:"cdn", props:{capacity:1200000, cacheHitRate:65, cost:300, label:"Global Edge"}} },
      { id:"n3", type:"loadbalancer", position:{x:540,y:160}, data:{defId:"loadbalancer", props:{capacity:450000, algorithm:"Geo", cost:180, label:"US LB"}} },
      { id:"n4", type:"loadbalancer", position:{x:540,y:400}, data:{defId:"loadbalancer", props:{capacity:450000, algorithm:"Geo", cost:180, label:"EU LB"}} },
      { id:"n5", type:"appserver", position:{x:780,y:160}, data:{defId:"appserver", props:{capacity:350000, runtime:"Go", autoScale:true, maxReplicas:8, cost:700, label:"US App"}} },
      { id:"n6", type:"appserver", position:{x:780,y:400}, data:{defId:"appserver", props:{capacity:350000, runtime:"Go", autoScale:true, maxReplicas:8, cost:700, label:"EU App"}} },
      { id:"n7", type:"database", position:{x:1040,y:280}, data:{defId:"database", props:{capacity:700000, type:"PostgreSQL Global", readReplicas:3, cost:1800, label:"Global Database"}} }
    ],
    edges: [
      {id:"e1",source:"n1",target:"n2",animated:true},{id:"e2",source:"n2",target:"n3",animated:true,trafficPct:55},{id:"e3",source:"n2",target:"n4",animated:true,trafficPct:45},
      {id:"e4",source:"n3",target:"n5",animated:true},{id:"e5",source:"n4",target:"n6",animated:true},{id:"e6",source:"n5",target:"n7",animated:true},{id:"e7",source:"n6",target:"n7",animated:true}
    ]
  },

  {
    id: "lakehouse",
    name: "Lakehouse Analytics",
    description: "Object storage, open table format, metastore, quality gates, and Trino query serving.",
    category: "Data",
    difficulty: "Intermediate",
    tags: ["lakehouse", "iceberg", "trino", "quality"],
    summary: "A compact lakehouse starter focused on storage, catalog, compaction, and query cost drivers.",
    nodes: [
      { id:"n1", type:"objectstorage", position:{x:80,y:220}, data:{defId:"objectstorage", props:{capacity:300000, storageTB:250, cost:600, label:"Object Storage"}} },
      { id:"n2", type:"tableformat", position:{x:330,y:220}, data:{defId:"tableformat", props:{capacity:300000, format:"Apache Iceberg", compaction:true, cost:120, label:"Iceberg Tables"}} },
      { id:"n3", type:"metastore", position:{x:580,y:120}, data:{defId:"metastore", props:{capacity:120000, catalog:"Hive Metastore", schemas:80, lineage:true, cost:160, label:"Catalog"}} },
      { id:"n4", type:"dataquality", position:{x:580,y:320}, data:{defId:"dataquality", props:{capacity:150000, tool:"Great Expectations", checks:220, cost:140, label:"Quality Gates"}} },
      { id:"n5", type:"queryengine", position:{x:830,y:220}, data:{defId:"queryengine", props:{capacity:200000, engine:"Trino", concurrency:120, cacheEnabled:true, cost:950, label:"Trino Query"}} },
      { id:"n6", type:"warehouse", position:{x:1080,y:220}, data:{defId:"warehouse", props:{capacity:160000, platform:"BI Warehouse", computeSize:"Large", concurrency:80, cost:1200, label:"Analytics"}} }
    ],
    edges: [
      {id:"e1",source:"n1",target:"n2",animated:true},{id:"e2",source:"n2",target:"n3",animated:true},{id:"e3",source:"n2",target:"n4",animated:true},{id:"e4",source:"n3",target:"n5",animated:true},{id:"e5",source:"n4",target:"n5",animated:true},{id:"e6",source:"n5",target:"n6",animated:true}
    ]
  },

  {
    id: "ai-rag-system",
    name: "AI / RAG System",
    description: "User questions retrieve context from object storage/search before calling model-serving APIs.",
    category: "AI",
    difficulty: "Intermediate",
    tags: ["rag", "ai", "search", "object-storage"],
    summary: "A practical RAG starter using existing generic app, search, storage, and telemetry components.",
    nodes: [
      { id:"n1", type:"users", position:{x:60,y:260}, data:{defId:"users", props:{userCount:50000, requestsPerUser:3, label:"Analysts"}} },
      { id:"n2", type:"apigateway", position:{x:300,y:260}, data:{defId:"apigateway", props:{capacity:200000, authType:"OAuth", cost:180, label:"AI API"}} },
      { id:"n3", type:"appserver", position:{x:540,y:180}, data:{defId:"appserver", props:{capacity:120000, runtime:"Python", workers:24, cost:900, label:"RAG Orchestrator"}} },
      { id:"n4", type:"searchengine", position:{x:780,y:180}, data:{defId:"searchengine", props:{capacity:160000, engine:"Vector Search", shards:12, cost:850, label:"Vector Search"}} },
      { id:"n5", type:"objectstorage", position:{x:780,y:360}, data:{defId:"objectstorage", props:{capacity:200000, storageTB:40, cost:110, label:"Document Store"}} },
      { id:"n6", type:"appserver", position:{x:1020,y:260}, data:{defId:"appserver", props:{capacity:90000, runtime:"Model API", workers:16, cost:2200, label:"LLM Endpoint"}} },
      { id:"n7", type:"appinsights", position:{x:540,y:420}, data:{defId:"appinsights", props:{capacity:50000, samplingRate:100, label:"Prompt Telemetry"}} }
    ],
    edges: [
      {id:"e1",source:"n1",target:"n2",animated:true},{id:"e2",source:"n2",target:"n3",animated:true},{id:"e3",source:"n3",target:"n4",animated:true,trafficPct:45},
      {id:"e4",source:"n3",target:"n5",animated:true,trafficPct:20},{id:"e5",source:"n3",target:"n6",animated:true,trafficPct:35},{id:"e6",source:"n3",target:"n7",animated:true}
    ]
  },

  {
    id: "kubernetes-microservices",
    name: "Kubernetes Microservices",
    description: "Ingress, gateway, pods, queue, cache, database, autoscaling, logs, and metrics.",
    category: "Platform",
    difficulty: "Intermediate",
    tags: ["kubernetes", "microservices", "autoscaling", "queue"],
    summary: "A cloud-native system starter with scale controls and observability already modeled.",
    nodes: [
      { id:"n1", type:"users", position:{x:60,y:300}, data:{defId:"users", props:{userCount:300000, requestsPerUser:2, label:"Users"}} },
      { id:"n2", type:"apigateway", position:{x:300,y:300}, data:{defId:"apigateway", props:{capacity:700000, authType:"JWT", label:"Ingress Gateway"}} },
      { id:"n3", type:"pod", position:{x:540,y:160}, data:{defId:"pod", props:{capacity:180000, replicas:6, cpuCores:12, memoryGB:48, cost:600, label:"Orders Pods"}} },
      { id:"n4", type:"pod", position:{x:540,y:300}, data:{defId:"pod", props:{capacity:180000, replicas:6, cpuCores:12, memoryGB:48, cost:600, label:"Catalog Pods"}} },
      { id:"n5", type:"pod", position:{x:540,y:440}, data:{defId:"pod", props:{capacity:120000, replicas:4, cpuCores:8, memoryGB:32, cost:400, label:"Notification Pods"}} },
      { id:"n6", type:"cache", position:{x:780,y:300}, data:{defId:"cache", props:{capacity:300000, hitRate:78, memoryGB:64, cost:520, label:"Redis Cluster"}} },
      { id:"n7", type:"queue", position:{x:780,y:440}, data:{defId:"queue", props:{capacity:500000, cost:240, label:"Work Queue"}} },
      { id:"n8", type:"database", position:{x:1020,y:300}, data:{defId:"database", props:{capacity:280000, type:"PostgreSQL", readReplicas:2, cost:1100, label:"Service DB"}} },
      { id:"n9", type:"autoscaler", position:{x:540,y:20}, data:{defId:"autoscaler", props:{scaleUpThreshold:70, maxReplicas:20, label:"HPA"}} },
      { id:"n10", type:"logging", position:{x:1020,y:480}, data:{defId:"logging", props:{capacity:200000, ingestGBDay:120, retentionDays:30, cost:450, label:"Logs"}} }
    ],
    edges: [
      {id:"e1",source:"n1",target:"n2",animated:true},{id:"e2",source:"n2",target:"n3",animated:true},{id:"e3",source:"n2",target:"n4",animated:true},{id:"e4",source:"n2",target:"n5",animated:true},
      {id:"e5",source:"n3",target:"n6",animated:true},{id:"e6",source:"n4",target:"n6",animated:true},{id:"e7",source:"n5",target:"n7",animated:true},{id:"e8",source:"n6",target:"n8",animated:true},
      {id:"e9",source:"n9",target:"n3",animated:false,style:{strokeDasharray:"5,5"}},{id:"e10",source:"n9",target:"n4",animated:false,style:{strokeDasharray:"5,5"}},{id:"e11",source:"n3",target:"n10",animated:true}
    ]
  }
].map(example => ({
  category: 'General',
  difficulty: 'Beginner',
  tags: [],
  summary: example.description,
  ...example,
}));
