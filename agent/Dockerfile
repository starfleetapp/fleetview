# FleetView edge agent — one container per site, pointed at the local dish.
# Build context = repo root:  docker build -f agent/Dockerfile -t fleetview-agent .
FROM node:24-alpine
WORKDIR /app

# Only the agent's runtime deps (pure-JS gRPC, no native build).
RUN npm install --no-save @grpc/grpc-js@^1.12.5 @grpc/proto-loader@^0.7.13

COPY proto ./proto
COPY shared ./shared
COPY agent ./agent

# Point at the real dish and your cloud at runtime:
#   docker run -e DISH_ADDR=192.168.100.1:9200 -e SITE_TOKEN=flv_xxx \
#              -e CLOUD_INGEST_URL=https://cloud.example.com/ingest fleetview-agent
ENV DISH_ADDR=192.168.100.1:9200
ENV CLOUD_INGEST_URL=https://cloud.example.com/ingest

CMD ["node", "--disable-warning=ExperimentalWarning", "agent/agent.js"]
