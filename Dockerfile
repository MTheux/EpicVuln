FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Não setar NEXT_PUBLIC_API_URL para que o frontend
# detecte dinamicamente via window.location.hostname:9001
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
ENV PORT=9000
EXPOSE 9000
CMD ["npm", "start"]
