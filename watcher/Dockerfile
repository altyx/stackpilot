FROM node:22-alpine

# The service has no npm dependency: it only uses Node's native fetch.
WORKDIR /app
COPY watch.mjs ./

USER node

CMD ["node", "watch.mjs"]
