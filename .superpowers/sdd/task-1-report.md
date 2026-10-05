# Task 1 Report: 添加依赖

## Status: DONE

## Commits
- `251b35596e2ba971fc821a9261c62ec7e3325797` — build: add Spring Security and jjwt dependencies

## Test result
- `mvn dependency:resolve -q` completed with **BUILD SUCCESS** (no errors, no warnings)

## Details
- **Modified:** `blog/backend/pom.xml`
- **Added 4 dependencies:**
  1. `spring-boot-starter-security` (version managed by Spring Boot BOM 3.5.0)
  2. `jjwt-api` 0.12.6
  3. `jjwt-impl` 0.12.6 (runtime scope)
  4. `jjwt-jackson` 0.12.6 (runtime scope)
- Inserted after `spring-boot-starter-test`, before `</dependencies>`
- No other files changed
