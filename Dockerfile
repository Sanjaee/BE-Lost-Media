# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy seluruh source code termasuk folder prisma
COPY . .

RUN npx prisma generate --schema=prisma/schema.prisma

EXPOSE 5000
CMD ["npm", "run", "dev"] 