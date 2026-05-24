export const COMPONENT_DEFS = [
  {
    id: "users",
    name: "Users",
    icon: "👥",
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
    icon: "📱",
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
    icon: "✨",
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
    icon: "Aa",
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
    icon: "🖥️",
    category: "compute",
    color: "#3b82f6",
    description: "General-purpose compute. Handles incoming requests up to its capacity.",
    defaults: { capacity: 500, cpu: "2 vCPU", memory: "4 GB", os: "Linux", cost: 50, label: "VM", autoScale: false, scaleUpAt: 80, maxReplicas: 5 },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 100000 },
      { key: "cpu", label: "CPU", type: "select", options: ["1 vCPU","2 vCPU","4 vCPU","8 vCPU","16 vCPU","32 vCPU"] },
      { key: "memory", label: "Memory", type: "select", options: ["512 MB","1 GB","2 GB","4 GB","8 GB","16 GB","32 GB","64 GB"] },
      { key: "os", label: "OS", type: "select", options: ["Linux","Windows","FreeBSD"] },
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
    icon: "📦",
    category: "compute",
    color: "#06b6d4",
    description: "Kubernetes pod or Docker container. Lightweight compute unit.",
    defaults: { capacity: 200, image: "app:latest", cpuRequest: "100m", memoryRequest: "256Mi", cost: 10, label: "Pod", autoScale: false, scaleUpAt: 80, maxReplicas: 10 },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 10000 },
      { key: "image", label: "Container Image", type: "text" },
      { key: "cpuRequest", label: "CPU Request", type: "select", options: ["50m","100m","250m","500m","1000m","2000m"] },
      { key: "memoryRequest", label: "Memory Request", type: "select", options: ["64Mi","128Mi","256Mi","512Mi","1Gi","2Gi","4Gi"] },
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
    icon: "⚙️",
    category: "compute",
    color: "#10b981",
    description: "Application server (Node.js, Java, Python, etc).",
    defaults: { capacity: 300, runtime: "Node.js", version: "20", workers: 4, port: 3000, cost: 40, label: "App Server", autoScale: false, scaleUpAt: 80, maxReplicas: 5 },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 50000 },
      { key: "runtime", label: "Runtime", type: "select", options: ["Node.js","Python","Java","Go","Ruby","PHP",".NET"] },
      { key: "version", label: "Version", type: "text" },
      { key: "workers", label: "Worker Threads", type: "number", min: 1, max: 256 },
      { key: "port", label: "Port", type: "number", min: 1, max: 65535 },
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
    icon: "⚖️",
    category: "network",
    color: "#f59e0b",
    description: "Distributes traffic evenly across downstream nodes. Reduces load per instance.",
    defaults: { capacity: 50000, algorithm: "Round Robin", healthCheck: true, stickySession: false, cost: 20, label: "Load Balancer" },
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
    icon: "🗄️",
    category: "storage",
    color: "#ef4444",
    description: "Relational or NoSQL data store. Add Read Replicas to scale reads.",
    defaults: { capacity: 1000, type: "PostgreSQL", storage: "100 GB", maxConnections: 100, replication: "None", readReplicas: 0, cost: 80, label: "Database" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Write Capacity (req/s)", type: "number", min: 1, max: 100000 },
      { key: "type", label: "Type", type: "select", options: ["PostgreSQL","MySQL","MongoDB","Redis","DynamoDB","Cassandra","SQLite","CockroachDB"] },
      { key: "storage", label: "Storage", type: "select", options: ["10 GB","50 GB","100 GB","500 GB","1 TB","5 TB","10 TB"] },
      { key: "maxConnections", label: "Max Connections", type: "number", min: 1, max: 10000 },
      { key: "replication", label: "Replication", type: "select", options: ["None","Read Replica","Multi-Region","Synchronous"] },
      { key: "readReplicas", label: "Read Replicas (count)", type: "number", min: 0, max: 10 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "cache",
    name: "Cache",
    icon: "⚡",
    category: "storage",
    color: "#f97316",
    description: "In-memory cache. Serves hot data without hitting the database.",
    defaults: { capacity: 5000, type: "Redis", memory: "1 GB", ttl: 300, hitRate: 80, cost: 25, label: "Cache" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Capacity (req/s)", type: "number", min: 1, max: 500000 },
      { key: "type", label: "Type", type: "select", options: ["Redis","Memcached","Hazelcast","Varnish"] },
      { key: "memory", label: "Memory", type: "select", options: ["256 MB","512 MB","1 GB","2 GB","4 GB","8 GB","16 GB"] },
      { key: "ttl", label: "TTL (seconds)", type: "number", min: 0 },
      { key: "hitRate", label: "Cache Hit Rate (%)", type: "number", min: 0, max: 100 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic"]
  },
  {
    id: "queue",
    name: "Message Queue",
    icon: "📨",
    category: "messaging",
    color: "#a855f7",
    description: "Async queue decouples producers from consumers. Buffers traffic spikes.",
    defaults: { capacity: 10000, type: "RabbitMQ", maxMessages: 100000, ttl: 86400, consumers: 1, cost: 30, label: "Queue" },
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
    icon: "🌐",
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
    icon: "📈",
    category: "ops",
    color: "#84cc16",
    description: "Connects to a compute node and automatically scales it under load. Or use the Auto Scaling toggle inside any compute node's properties.",
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
    icon: "⏱️",
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
    icon: "🔀",
    category: "network",
    color: "#ec4899",
    description: "Entry point. Handles auth, rate-limiting, routing to microservices.",
    defaults: { capacity: 5000, type: "Kong", rateLimit: 1000, authType: "JWT", timeout: 30000, cost: 35, label: "API Gateway" },
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
    icon: "🛡️",
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
    icon: "🧾",
    category: "data",
    color: "#22c55e",
    description: "Operational database used as a change-data-capture source.",
    defaults: { capacity: 5000, engine: "PostgreSQL", tables: 12, changeRate: 1000, retentionHours: 24, cost: 120, label: "Source DB" },
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
    icon: "🔁",
    category: "data",
    color: "#0ea5e9",
    description: "CDC connector that reads database logs and publishes change events.",
    defaults: { capacity: 4000, connectorType: "Postgres", tasks: 1, snapshotMode: "Initial", heartbeatSeconds: 30, cost: 45, label: "Debezium" },
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
    icon: "🧵",
    category: "messaging",
    color: "#f59e0b",
    description: "Partitioned event stream for pub/sub and replay.",
    defaults: { capacity: 20000, partitions: 12, replicationFactor: 3, retentionDays: 7, cleanupPolicy: "delete", cost: 90, label: "Kafka Topic" },
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
    icon: "🌊",
    category: "data",
    color: "#06b6d4",
    description: "Flink/Spark/Kafka Streams job for enrichment, joins, windows, and routing.",
    defaults: { capacity: 12000, engine: "Flink", parallelism: 8, checkpointSeconds: 60, stateBackend: "RocksDB", triggerMode: "Event Time", cost: 180, label: "Stream Processor" },
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
    icon: "🪟",
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
    icon: "🪝",
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
    icon: "🪣",
    category: "data",
    color: "#14b8a6",
    description: "Object storage landing zone for raw/bronze/silver data.",
    defaults: { capacity: 50000, format: "Parquet", tableFormat: "Iceberg", storageTB: 10, cost: 220, label: "Data Lake" },
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
    icon: "🏛️",
    category: "data",
    color: "#6366f1",
    description: "Analytical warehouse serving BI and reporting workloads.",
    defaults: { capacity: 15000, platform: "Snowflake", computeSize: "Medium", concurrency: 20, cost: 450, label: "Warehouse" },
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
    icon: "🗂️",
    category: "data",
    color: "#0f766e",
    description: "Cloud object storage such as S3, ADLS, GCS, MinIO, or compatible blob storage.",
    defaults: { capacity: 100000, provider: "Generic Object Storage", storageTB: 50, durability: "11 nines", versioning: true, cost: 300, label: "Object Storage" },
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
    icon: "🧊",
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
    icon: "📚",
    category: "data",
    color: "#8b5cf6",
    description: "Catalog/metastore for schemas, table metadata, lineage, and governance.",
    defaults: { capacity: 20000, catalog: "Hive Metastore", schemas: 50, lineage: true, cost: 80, label: "Data Catalog" },
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
    icon: "⚙️",
    category: "data",
    color: "#f97316",
    description: "Batch compute such as Apache Spark, Databricks Jobs, EMR, or dataflow jobs.",
    defaults: { capacity: 30000, engine: "Apache Spark", workers: 10, schedule: "Hourly", cost: 350, label: "Batch Processor" },
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
    icon: "🔎",
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
    icon: "🕹️",
    category: "ops",
    color: "#ec4899",
    description: "Workflow scheduler/orchestrator for data pipelines and dependency control.",
    defaults: { capacity: 5000, tool: "Airflow", dags: 25, retryPolicy: "3 retries", scheduleMode: "Cron", cost: 70, label: "Orchestrator" },
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
    icon: "✅",
    category: "data",
    color: "#84cc16",
    description: "Validation, freshness checks, contracts, anomaly detection, and profiling.",
    defaults: { capacity: 25000, tool: "Great Expectations", checks: 120, failurePolicy: "Quarantine", cost: 55, label: "Data Quality" },
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
    icon: "📊",
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
    icon: "📜",
    category: "observability",
    color: "#64748b",
    description: "Centralized logs, search, retention, and operational audit trails.",
    defaults: { capacity: 80000, platform: "Elastic", ingestGBDay: 50, retentionDays: 30, cost: 150, label: "Log Analytics" },
    properties: [
      { key: "label", label: "Label", type: "text" },
      { key: "capacity", label: "Log Capacity (events/s)", type: "number", min: 1, max: 10000000 },
      { key: "platform", label: "Platform", type: "select", options: ["Elastic","Splunk","Azure Log Analytics","CloudWatch Logs","Loki"] },
      { key: "ingestGBDay", label: "Ingest (GB/day)", type: "number", min: 1, max: 100000 },
      { key: "retentionDays", label: "Retention (days)", type: "number", min: 1, max: 3650 },
      { key: "cost", label: "Cost ($/mo)", type: "number", min: 0 }
    ],
    behaviors: ["accepts_traffic", "observability_sink"]
  }
];

export const CATEGORIES = [
  { id: "all",      label: "All",       icon: "◈" },
  { id: "source",   label: "Source",    icon: "👥" },
  { id: "compute",  label: "Compute",   icon: "🖥️" },
  { id: "network",  label: "Network",   icon: "⚖️" },
  { id: "storage",  label: "Storage",   icon: "🗄️" },
  { id: "data",     label: "Data",      icon: "🧾" },
  { id: "messaging",label: "Messaging", icon: "📨" },
  { id: "ops",      label: "Ops",       icon: "📈" },
  { id: "observability", label: "Observability", icon: "📊" },
  { id: "security", label: "Security",  icon: "🛡️" },
  { id: "annotation", label: "Notes", icon: "Aa" }
];
