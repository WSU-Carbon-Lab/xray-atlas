ARG NODE_VERSION=22

# Use an official Node.js runtime as a parent image
FROM node:${NODE_VERSION}-alpine AS base

# Set the working directory
WORKDIR /app

# Install dependencies no cache
COPY package*.json ./
RUN npm cache clean --force
RUN npm install next@latest
RUN npm install --no-cache

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Set the command to run the development server
CMD ["npm", "run", "dev"]
