#!/bin/bash

# Simple Start Script for Portal Application
# Handles the Docker build issues and ensures proper startup

set -e

echo "🚀 Portal Application - Simple Start"
echo ""

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed."
    echo "   Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cat > .env << EOF
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_USER=portal_user
DB_PASSWORD=secure_password_123
DB_NAME=portal_db
DB_ROOT_PASSWORD=root_password_456

# JWT Configuration
JWT_SECRET=super-secret-jwt-key-for-development-only-change-in-production
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=12
EOF
    echo "✅ Environment file created"
else
    echo "📄 Using existing .env file"
fi

# Clean up previous containers and images
echo "🧹 Cleaning up previous containers..."
docker-compose down --remove-orphans --volumes 2>/dev/null || true
docker system prune -f 2>/dev/null || true

# Create required directories
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p frontend/build
touch logs/.gitkeep

echo ""
echo "🏗️  Building containers (this may take a few minutes)..."

# Build database first
echo "   Building database..."
docker-compose up -d db

# Wait for database
echo "⏳ Waiting for database to be ready..."
for i in {1..60}; do
    if docker-compose exec -T db mysqladmin ping -h localhost -u root -p"root_password_456" --silent 2>/dev/null; then
        echo "✅ Database is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Database failed to start"
        docker-compose logs db
        exit 1
    fi
    echo "   Attempt $i/60..."
    sleep 2
done

# Build and start backend
echo "   Building backend..."
docker-compose up -d --build backend

# Wait for backend
echo "⏳ Waiting for backend to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Backend failed to start"
        echo "📋 Backend logs:"
        docker-compose logs backend
        exit 1
    fi
    echo "   Attempt $i/60..."
    sleep 3
done

# Initialize database using the new script
echo "🗄️  Initializing database..."
if docker-compose exec -T backend npm run migrate; then
    echo "✅ Database migration completed"
else
    echo "❌ Database migration failed"
    echo "📋 Migration logs:"
    docker-compose logs backend
    exit 1
fi

if docker-compose exec -T backend npm run seed; then
    echo "✅ Database seeding completed"
else
    echo "❌ Database seeding failed"
    echo "📋 Seeding logs:"  
    docker-compose logs backend
    exit 1
fi

# Build and start frontend
echo "   Building frontend..."
docker-compose up -d --build frontend

# Start adminer
echo "   Starting database admin..."
docker-compose up -d adminer

# Wait for frontend
echo "⏳ Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Frontend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Frontend is still starting (this is normal for React builds)"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 3
done

echo ""
echo "🎉 Portal Application is running!"
echo ""
echo "🌐 Access URLs:"
echo "   📱 Frontend:      http://localhost:3001"
echo "   🔗 Backend API:   http://localhost:3000"
echo "   🗄️  Database Admin: http://localhost:8080"
echo "      Server: db | User: portal_user | Pass: secure_password_123 | DB: portal_db"
echo ""
echo "👤 Demo Accounts:"
echo "   🔑 Admin: admin@portal.com / admin123"
echo "   👥 User:  user@portal.com / user123"
echo "   👥 User:  user2@portal.com / user456"
echo ""
echo "🔧 Useful Commands:"
echo "   docker-compose ps              # Check status"
echo "   docker-compose logs [service]  # View logs"
echo "   docker-compose down            # Stop all services"
echo "   docker-compose restart         # Restart all services"
echo ""

# Show container status
echo "📊 Container Status:"
docker-compose ps
echo ""

echo "✨ Startup complete!"
echo "💡 If frontend shows 'loading', wait a moment for React build to complete"