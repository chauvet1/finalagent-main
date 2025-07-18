## Code Quality & Architecture Rules

**Always write production-ready code** - Every line should be maintainable, readable, and follow established patterns. No shortcuts or "quick fixes" that create technical debt.

**Implement proper error handling** - Include try-catch blocks, input validation, and graceful failure modes. Never assume inputs are valid or operations will succeed.

**Follow SOLID principles** - Single responsibility, open/closed, Liskov substitution, interface segregation, and dependency inversion should guide all design decisions.

**Use meaningful naming conventions** - Variables, functions, and classes should clearly express their purpose. Avoid abbreviations and cryptic names.

## Data Integration Rules

**Connect to real data sources** - Always integrate with actual APIs, databases, or file systems rather than creating placeholder data.

**Implement proper data validation** - Validate all external data inputs and handle edge cases like missing fields, malformed responses, or network failures.

**Use environment-specific configurations** - Implement proper config management for different environments (dev, staging, production) without hardcoded values.

**Handle data transformations properly** - When processing real data, implement robust parsing, filtering, and transformation logic that accounts for data inconsistencies.

## Testing & Reliability Rules

**Write comprehensive tests** - Include unit tests, integration tests, and end-to-end tests that work with real data scenarios when possible.

**Implement proper logging** - Add structured logging for debugging, monitoring, and troubleshooting in production environments.

**Design for scalability** - Consider performance implications, memory usage, and concurrent access patterns from the start.

**Plan for monitoring** - Include health checks, metrics collection, and alerting capabilities in your implementations.

## Development Process Rules

**Research before implementing** - Always investigate existing solutions, libraries, and best practices before writing custom code.

**Document thoroughly** - Include clear README files, API documentation, and inline comments explaining complex business logic.

**Consider security implications** - Implement proper authentication, authorization, input sanitization, and data protection measures.

**Design APIs thoughtfully** - Create consistent, RESTful APIs with proper status codes, error responses, and versioning strategies.

## Integration & Deployment Rules

**Use proper dependency management** - Specify exact versions, handle dependency conflicts, and maintain clean package manifests.

**Implement CI/CD considerations** - Write code that works well with automated testing, building, and deployment pipelines.

**Plan for configuration management** - Use environment variables, config files, or external configuration services rather than hardcoded values.

**Consider backwards compatibility** - When updating existing systems, ensure changes don't break existing integrations or data flows.
