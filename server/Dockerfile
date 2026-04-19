FROM cgr.dev/chainguard/node:latest-dev AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package*.json ./
EXPOSE 4000
CMD ["src/server.js"]
