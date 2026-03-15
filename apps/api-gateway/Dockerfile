FROM node:20-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install
RUN npm run db:generate --workspace=@platform/database
RUN npm run build --workspace=api-gateway

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/package.json ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api-gateway/package.json ./apps/api-gateway/

EXPOSE 3000
CMD ["node", "dist/main.js"]
