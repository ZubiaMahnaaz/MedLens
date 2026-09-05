# Stage 1: Build the React Client
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Install Production Server Dependencies
FROM node:20-slim AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Stage 3: Production Runner Container
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy server dependencies and source code
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/package.json
COPY server/src ./server/src
COPY server/sample_reports ./server/sample_reports

# Copy compiled frontend SPA
COPY --from=client-builder /app/client/dist ./client/dist

# Cloud Run defaults
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/src/index.js"]
