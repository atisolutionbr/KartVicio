FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node base44/entities ./base44/entities
COPY package.json ./
RUN mkdir -p private-data/uploads && chown -R node:node private-data
USER node
EXPOSE 6300
CMD ["node","server/index.mjs"]
