# NestJS (Backend) Style Guide

## General Guidelines

- Follow the principles of clean code.
- Use TypeScript for all backend development.
- Ensure all code is properly linted and formatted using the project's configuration.

## Project Structure

- Organize code into modules, each representing a specific domain or feature.
- Use the `src` directory for all application code.
- Place shared resources in a `shared` or `common` module.

## DTOs (Data Transfer Objects)

- Use DTOs for data validation and transformation.
- Define DTOs in the `dto` directory within the respective module.
- Use class-validator decorators for validation.

## Validation

- Use `class-validator` for validating incoming data.
- Always validate data at the controller level.

## Error Handling

- Use custom exceptions for specific error cases.
- Return meaningful error messages to the client.
- Log errors using the project's logging service.

## Testing

- Write unit tests for all services and controllers.
- Use integration tests to verify module interactions.
- Follow the Arrange-Act-Assert pattern in tests.

## CI/CD

- Ensure all tests pass before merging code.
- Use linting and formatting checks in the CI pipeline.
- Automate deployments using the project's CI/CD tools.

## Configuration Files

- Store configuration in environment variables.
- Use a configuration service to access environment variables.
- Avoid hardcoding sensitive information in the codebase.