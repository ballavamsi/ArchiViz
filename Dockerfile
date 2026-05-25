# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Minifies and obfuscates the client JS/CSS into dist/
FROM node:22-alpine AS builder

WORKDIR /app

# Install devDependencies (terser, cleancss, javascript-obfuscator)
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build static assets (outputs to dist/)
# Build env vars are injected at deploy time via fly secrets or --build-arg
ARG SUPABASE_URL=""
ARG SUPABASE_ANON_KEY=""
ARG SIGNALING_URL=""
ENV SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
    SIGNALING_URL=$SIGNALING_URL

RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# Lean image — only what server.mjs needs at runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy only what the server needs at runtime:
#   - server.mjs        (HTTP server + API routes)
#   - src/              (components.js, rules.js — imported by /api routes)
#   - dist/             (minified static assets served to the browser)
COPY --from=builder /app/server.mjs  ./server.mjs
COPY --from=builder /app/src/        ./src/
COPY --from=builder /app/dist/       ./dist/

# No npm install needed at runtime — server.mjs only uses Node built-ins
# (node:http, node:fs, node:path, node:url) and optional Supabase REST via fetch.

EXPOSE 8080

ENV PORT=8080 \
    NODE_ENV=production

CMD ["node", "server.mjs"]
