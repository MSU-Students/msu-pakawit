FROM node:20-alpine AS build
WORKDIR /app

# argon2 compiles native bindings during npm install on Alpine (no prebuild).
RUN apk add --no-cache python3 make g++ \
  && ln -sf /usr/bin/python3 /usr/bin/python
ENV PYTHON=/usr/bin/python3
ENV npm_config_nodedir=/usr/local

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

# Compiled argon2 bindings need libstdc++; keep the native toolchain out of runtime.
RUN apk add --no-cache libstdc++

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/package.json ./api/
COPY --from=build /app/api/dist ./api/dist

WORKDIR /app/api
EXPOSE 5000
CMD ["node", "dist/main"]
