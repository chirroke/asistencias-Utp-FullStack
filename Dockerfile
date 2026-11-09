# Build the Spring Boot API without bundling the React application.
FROM maven:3.9.9-eclipse-temurin-17 AS spring-build
WORKDIR /workspace
COPY backend-spring/ ./backend-spring/
RUN mvn -B -DskipTests -f backend-spring/pom.xml package

# Render supplies PORT at runtime; render-start.sh also builds the JDBC URL
# from the DB_* variables supplied by the Render PostgreSQL service.
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=spring-build /workspace/backend-spring/target/asistencia-utp-0.1.0.jar /app/app.jar
COPY backend-spring/render-start.sh /app/start.sh
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60"
EXPOSE 10000
ENTRYPOINT ["sh", "/app/start.sh"]
