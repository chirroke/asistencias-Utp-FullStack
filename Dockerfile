# Build the React app first; Spring Boot serves its dist folder from the same URL.
FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Package Spring Boot together with the compiled React files.
FROM maven:3.9.9-eclipse-temurin-17 AS spring-build
WORKDIR /workspace
COPY backend-spring/ ./backend-spring/
COPY --from=frontend-build /workspace/frontend/dist ./frontend/dist
RUN mvn -B -DskipTests -f backend-spring/pom.xml package

# Small runtime image. Render supplies PORT at runtime.
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=spring-build /workspace/backend-spring/target/asistencia-utp-0.1.0.jar /app/app.jar
COPY backend-spring/render-start.sh /app/start.sh
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60"
EXPOSE 10000
ENTRYPOINT ["sh", "/app/start.sh"]
