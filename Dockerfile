# Use an official Node.js runtime as a parent image
FROM node:22-alpine AS base

# Set the working directory
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Set the command to run the development server
CMD ["npm", "run", "dev"]
