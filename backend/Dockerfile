FROM node:26-alpine AS base
MAINTAINER Cloudburst
WORKDIR /usr/src/app

FROM base AS installer

RUN mkdir -p /temp/development
RUN mkdir -p /temp/production

COPY package.json package-lock.json /temp/development/
COPY package.json package-lock.json /temp/production/

WORKDIR /temp/development
RUN npm install --save-dev

WORKDIR /temp/production
RUN npm install

FROM base AS builder

COPY --from=installer /temp/development/node_modules node_modules
COPY ./src src
COPY ./tsconfig.json .

RUN npm install -g typescript

RUN tsc

FROM base AS release
ENV NODE_ENV="production"

COPY --from=installer /temp/production/node_modules node_modules
COPY --from=builder /usr/src/app/dist .
COPY ./data /data

ENTRYPOINT ["node", "index.js"]