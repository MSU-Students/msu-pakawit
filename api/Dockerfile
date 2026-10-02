FROM node:20-alpine AS build
WORKDIR /app

# Copy monorepo root package.json and api package.json
COPY package.json ./
COPY api/package.json ./api/

# Install dependencies
RUN npm install --workspace=api

# Copy API source
COPY api/ ./api/

# Build NestJS app
WORKDIR /app/api
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/api/package.json ./api/
COPY --from=build /app/api/node_modules ./api/node_modules
COPY --from=build /app/api/dist ./api/dist

WORKDIR /app/api
EXPOSE 5000
CMD ["node", "dist/main"]
