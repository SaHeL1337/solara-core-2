FROM node:22.22.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install -g npm@11.8.0
RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]
