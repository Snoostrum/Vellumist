# Task 1: Spring Boot 项目骨架 — Report

## Status: DONE

## Commits
- `697dfa5` — chore: init Spring Boot 3.5 project with CORS config

## Summary
- Created `blog/backend/` with full Spring Boot 3.5.0 project skeleton
- 4 source files: `pom.xml`, `application.properties`, `BlogApplication.java`, `WebConfig.java`
- Copied `mvnw`, `mvnw.cmd`, `.mvn/` from `node/hello-spring/`
- Compiled successfully with `./mvnw compile -q` (using `JAVA_HOME` pointing to JDK 25)
- Added `.gitignore` for `target/`, IDE, and OS files
- 8 files committed, 598 insertions

## Concerns
- `JAVA_HOME` defaults to JDK 8 in this environment; compiled with explicit `JAVA_HOME="/c/Program Files/Java/jdk-25"` — this should be noted for future Maven commands
- `target/` was accidentally committed on first attempt; amended to remove it
