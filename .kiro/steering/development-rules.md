# Development Rules & Best Practices

## Critical Configuration

### Supabase Project ID (MANDATORY)

**ALWAYS use this project ID for ALL Supabase MCP operations:**

```
project_id: hogzjapnkvsihvvbgcdb
```

This is the ONLY valid Supabase project for this workspace. Never use any other project ID.

When calling any Supabase MCP tool, always use:
- `mcp_supabase_list_tables` with `project_id: "hogzjapnkvsihvvbgcdb"`
- `mcp_supabase_execute_sql` with `project_id: "hogzjapnkvsihvvbgcdb"`
- `mcp_supabase_apply_migration` with `project_id: "hogzjapnkvsihvvbgcdb"`
- `mcp_supabase_get_logs` with `project_id: "hogzjapnkvsihvvbgcdb"`
- Any other Supabase MCP tool with `project_id: "hogzjapnkvsihvvbgcdb"`

## Critical Rules

### Database Management

**NEVER generate SQL migration files manually.** This project has MCP Supabase tools installed for database operations:
- Use `mcp_supabase_list_tables` to inspect database schema
- Use `mcp_supabase_execute_sql` for queries
- Use `mcp_supabase_apply_migration` for schema changes
- Always verify database state through MCP tools before making changes

### File Management

**NEVER create summary or documentation files** unless explicitly requested by the user. This includes:
- No README updates for completed work
- No CHANGELOG files
- No summary markdown files
- No documentation of changes made

These files create unnecessary clutter and flooding in the project workspace.

### Code Quality

**NO EMOJIS in code or responses:**
- Never use emojis in console.log statements
- Never use emojis in comments
- Never use emojis in error messages
- Never use emojis in AI responses
- Keep all code and communication professional

### Debugging Philosophy

**NO workarounds, bandages, or patches allowed:**
- Always debug to find the root cause
- Never apply temporary fixes
- Never use try-catch to hide errors without understanding them
- Use `mcp_sequential_thinking_sequentialthinking` tool for complex debugging
- Document the root cause and proper solution

## Problem-Solving Approach

When facing issues:

1. Use sequential thinking tool to break down the problem
2. Investigate root cause through MCP tools and diagnostics
3. Verify assumptions with actual data from database/logs
4. Implement proper solution, not workarounds
5. Test the fix thoroughly

## MCP Tools Usage

### Supabase Operations
- Check database schema before making changes
- Use MCP tools for all database queries and migrations
- Verify edge function deployments through MCP
- Check logs through `mcp_supabase_get_logs` when debugging

### Context7 Documentation
- Use `mcp_context7_resolve_library_id` to find library documentation
- Use `mcp_context7_query_docs` to read official documentation
- Always consult documentation for:
  - Library API usage and best practices
  - Framework-specific patterns
  - Integration guides
  - Troubleshooting common issues
- Prefer official documentation over assumptions

### Sequential Thinking
- Use for complex multi-step problems
- Use when debugging unclear issues
- Use when planning architectural changes
- Always think through implications before implementing

## Code Standards

### Console Logging
```typescript
// Good
console.log('User authenticated:', userId);
console.error('Payment failed:', error.message);

// Bad - NO EMOJIS
console.log('User authenticated! 🎉', userId);
console.error('Payment failed 😢:', error.message);
```

### Error Handling
```typescript
// Good - Understand and handle properly
try {
  await supabase.from('tickets').insert(data);
} catch (error) {
  console.error('Failed to insert ticket:', error);
  throw new Error('Ticket creation failed');
}

// Bad - Hiding errors
try {
  await supabase.from('tickets').insert(data);
} catch (error) {
  // Silent fail or generic workaround
}
```

### Database Operations
```typescript
// Good - Use MCP tools
// Let AI use mcp_supabase_execute_sql or mcp_supabase_list_tables

// Bad - Manual SQL file generation
// Creating .sql files manually without MCP verification
```

## Response Guidelines

When responding to users:
- Be professional and concise
- No emojis in any responses
- Focus on technical accuracy
- Explain root causes, not just solutions
- Reference MCP tools used for verification
