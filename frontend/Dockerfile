FROM node:24-alpine AS builder
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install --save-dev

COPY .. .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /usr/src/app/build /usr/share/nginx/html
COPY configs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]