# Single-service image: simulator + cloud backend + edge agent + dashboard.
# For Railway / Fly.io / any container host. Host injects PORT; the backend binds
# it and serves the built dashboard same-origin.
FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY web/package*.json ./web/
RUN npm --prefix web install

COPY . .
RUN npm --prefix web run build

ENV NODE_ENV=production
ENV FLEET_SIZE=24
EXPOSE 8787
CMD ["npm", "start"]
