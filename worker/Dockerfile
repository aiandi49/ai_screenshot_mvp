# Microsoft's official Playwright image already has Chromium + every OS-level
# library it needs (libnss3, libatk, fonts, etc.) — this sidesteps the most
# common "Chromium failed to launch" headaches on cloud hosts.
FROM mcr.microsoft.com/playwright:v1.47.2-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
