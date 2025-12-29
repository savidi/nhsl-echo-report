# Use Node.js as the base environment
FROM node:22-alpine

# 1. Install Chromium and dependencies manually
# Puppeteer needs these specific libraries to run in a Docker container
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# 2. Set Environment Variables
# Tell Puppeteer to skip installing its own Chrome (we use the one we just installed)
# And tell it exactly where the executable is located
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    
# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project files
COPY . .

# Expose the backend port (Assuming 3000, change if your server.js uses a different one)
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]