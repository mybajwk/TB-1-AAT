FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3004

CMD [ "node", "index.js" ]
