# Use Node.js as the base environment
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project files
COPY . .

# Expose the port Vite runs on (usually 5173)
EXPOSE 5173

# Start the application
# Note: We use --host to make it accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]