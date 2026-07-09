FROM node:26-alpine AS base
MAINTAINER Cloudburst
WORKDIR /usr/src/app

FROM base AS installer

RUN mkdir -p /temp/packages

COPY package.json package-lock.json /temp/packages/

WORKDIR /temp/packages
RUN npm install --save-dev

FROM base AS builder

COPY . .
COPY --from=installer /temp/packages/node_modules node_modules

RUN npm install -g typescript

RUN npm run build

FROM base AS release
ENV NODE_ENV="production"

COPY --from=builder /usr/src/app/node_modules node_modules
COPY --from=builder /usr/src/app/build .

ENTRYPOINT ["node", "index.js"]