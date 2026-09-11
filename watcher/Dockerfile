FROM node:22-alpine

# Le service n'a aucune dépendance npm : il n'utilise que le fetch natif de Node.
WORKDIR /app
COPY watch.mjs ./

USER node

CMD ["node", "watch.mjs"]
