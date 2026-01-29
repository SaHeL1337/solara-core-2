FROM node:22.22.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install -g npm@11.8.0

COPY . .

EXPOSE 5173

CMD [ "npm", "run", "dev" ]
