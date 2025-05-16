# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app code
COPY . .

# Expose the port if needed (Camunda workers usually connect out)
EXPOSE 5005

# Start the app
CMD [ "node", "app.js" ]
