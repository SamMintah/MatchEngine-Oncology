# Project Rules and Guidelines

This steering file contains rules and standards for this project. Kiro will follow these guidelines when working on code.

## Code Style

- Use consistent indentation (2 spaces for JS/TS, 4 spaces for Python)
- Follow language-specific naming conventions (camelCase for JS/TS, snake_case for Python)
- Keep functions small and focused on a single responsibility
- Write descriptive variable and function names

## Documentation

- Add comments for complex logic or non-obvious code
- Keep README.md up to date with setup instructions
- Document public APIs and exported functions
- Document AI usage: For AI-generated code (e.g., from Kiro), add comments explaining what prompt was used, why you accepted/rejected output, and any manual tweaks (e.g., // Prompt: 'Generate NLP parser for free-text input'; Tweaked to add error handling for edge cases).

## Testing

- Write tests for new features and bug fixes
- Ensure tests pass before committing code
- Aim for meaningful test coverage, not just high percentages
- For AI/ML features: Write unit tests for edge cases (e.g., messy input parsing, matching accuracy on synthetic data). Use mocks for APIs (e.g., ClinicalTrials.gov) to avoid real calls in tests.

## Git Practices

- Write clear, descriptive commit messages
- Keep commits focused on a single change
- Review changes before committing
- Tie commits to thinking process: Include what AI tool/prompt was used (e.g., 'Init frontend: Generated with Kiro prompt for BetterTStack setup; Reviewed for security').

## Dependencies

- Keep dependencies up to date
- Avoid adding unnecessary dependencies
- Document why specific dependencies are needed
- For AI/ML deps: Prefer lightweight JS libs (e.g., Vercel AI SDK over heavy Python if possible); Justify (e.g., 'Hugging Face for embeddings because it handles medical terms well via UMLS integration').

## Security

- Never commit sensitive data (API keys, passwords, tokens)
- Validate and sanitize user inputs
- Follow security best practices for the tech stack
- For AI inputs: Sanitize free-text to prevent prompt injection; Use mock data only—no real patient info.

---

## Code Style (Airbnb-based)

### Naming Conventions
- **camelCase**: variables, functions (`userName`, `isActive`, `getUserById`)
- **PascalCase**: components, types, interfaces, classes (`UserProfile`, `HeatStressData`)
- **UPPER_SNAKE_CASE**: constants (`MAX_TEMPERATURE`, `API_BASE_URL`)
- **kebab-case**: file names (`heat-stress-calculator.ts`, `user-profile.tsx`)
- **Boolean prefixes**: `is`, `has`, `can`, `should` (`isLoading`, `hasAccess`)

### Variables & Declarations
- Use `const` by default, `let` only when reassignment needed
- Never use `var`
- One declaration per variable
- Group `const` declarations, then `let`
- Prefix unused variables with `_` (`const [first, _second, third] = array`)

### Functions
- Arrow functions for callbacks and simple functions
- Implicit return for single expressions: `const double = (n: number) => n * 2`
- Default parameters over manual checks
- Rest parameters over `arguments`
- Never reassign parameters

### Objects & Arrays
- Object shorthand: `{ name, age }` not `{ name: name, age: age }`
- Destructuring for cleaner code
- Spread operator for copying: `{ ...original }`
- Array methods over loops: `.map()`, `.filter()`, `.reduce()`

### Strings
- Single quotes for strings: `'hello'`
- Template literals for interpolation: `` `Hello, ${name}` ``
- Template literals for multiline strings
- Never use `eval()`

### Async/Await
- Prefer `async/await` over `.then()` chains
- Always handle errors with `try/catch`
- Use `Promise.all()` for parallel operations
- Don't await in loops when operations can be parallelized
- Always return or await promises (no floating promises)

### Comparison & Conditionals
- Strict equality: `===` and `!==` (never `==` or `!=`)
- Truthiness shortcuts for booleans and existence checks
- Be explicit for numbers that could be 0: `if (count !== 0)`
- Simple ternaries only, use if/else for complex logic
- Optional chaining: `user?.profile?.name`

### Modules & Imports
- Named exports over default exports
- Import order: 1) Node built-ins, 2) External packages, 3) Internal (@/), 4) Relative
- No duplicate imports from same path
- Group imports from same package

### TypeScript
- `interface` for object shapes, `type` for unions/intersections
- Avoid `any`, use `unknown` for truly unknown types
- Explicit return types for public APIs and exported functions
- Use `readonly` for immutable data
- Prefer nullish coalescing `??` over `||` when appropriate
- String unions over enums: `type Role = 'admin' | 'user' | 'guest'`

## AI/ML Specific Rules
- Model Integration: Use Vercel AI SDK for LLM calls; For embeddings/ML, prefer JS-friendly libs (e.g., @huggingface/inference over full Python if possible) to keep stack simple.
- Explainability: For ML ranking (e.g., scikit-learn via backend), implement simple explainers (e.g., feature importance) and document in code.
- Data Handling: Use synthetic/mock data only; Standardize terms with UMLS/SNOMED where possible.
- Efficiency: Optimize for inference time (e.g., cache API responses); Test for accuracy on mocks (aim 80%+).

## Deployment Rules
- Deploy early and often to Vercel for testing (or AWS if integrating with Kiro ecosystem).
- Use environment variables for configs (e.g., API endpoints).
- Ensure app is responsive (mobile-first if possible, per spec).