FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache wget

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS final
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["sh", "-c", "node src/utils/migrate.js && node src/app.js"]
