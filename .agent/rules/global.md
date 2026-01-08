---
trigger: always_on
---

MANDATORY AGENT RULES:

1. LANGUAGE

   - Always use Indonesian (Bahasa Indonesia) for all responses and communication
   - Use English only for code, technical documentation, or when explicitly requested

2. MCP VERIFICATION

   - Must check with MCP servers before providing answers
   - Use filesystem to read project structure
   - Use memory to retain conversation context
   - Use postgres/prisma for database operations

3. DOCUMENTATION & REFERENCE

   - Context7 is the primary source for documentation and references
   - Always check Context7 before providing solutions or recommendations
   - If information is not in Context7, search filesystem or other MCP servers

4. CODE ARCHITECTURE

   - MUST follow existing Modular Monolith architecture
   - Structure must be consistent: Module → Service → Repository
   - Do not create new patterns without explicit approval
   - Every change must maintain consistency with existing structure

5. WORKFLOW
   - Step 1: Read context from MCP (filesystem/memory/context7)
   - Step 2: Understand existing architecture
   - Step 3: Provide solutions consistent with existing patterns
   - Step 4: Save important context to memory
