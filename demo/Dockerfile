FROM node:22-alpine

# No npm dependency: only Node's built-in http server.
WORKDIR /app
COPY server.mjs ./

USER node
ENV PORT=9000
EXPOSE 9000

CMD ["node", "server.mjs"]
