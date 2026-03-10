FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat bash

FROM base AS builder
COPY package*.json ./
RUN npm install --only=production
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint
EXPOSE 4000
ENTRYPOINT ["docker-entrypoint"]
CMD ["node", "dist/main"]
