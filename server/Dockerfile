# Stage 1: Build
FROM node:24-slim AS build
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npm run build

# Stage 2: Runtime (production deps only)
FROM node:24-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
