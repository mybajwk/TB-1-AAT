FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN apk add --no-cache openssl
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3003

CMD ["node", "index.js"]
