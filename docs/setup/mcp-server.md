# MCP Server Setup Guide

This guide will help you set up Model Context Protocol (MCP) servers for use with Cursor.

## What is MCP?

Model Context Protocol (MCP) allows AI assistants to connect to external tools and data sources. MCP servers provide standardized interfaces for accessing databases, file systems, APIs, and more.

## Prerequisites

- Node.js installed (you already have this)
- Cursor IDE
- API keys for services you want to use

## Setup Steps

### 1. Configure MCP Servers

The main configuration file is located at `.cursor/mcp.json`. This file defines which MCP servers to enable and how to connect to them.

### 2. Recommended MCP Servers for Your Project

Based on your Next.js + Supabase setup, here are useful MCP servers:

#### A. Filesystem MCP (Recommended)

**Purpose**: Access project files and directories

**Setup**:

1. Edit `.cursor/mcp.json`
2. Update the `filesystem` server path to your project directory:
   ```json
   "filesystem": {
     "command": "npx",
     "args": [
       "-y",
       "@modelcontextprotocol/server-filesystem",
       "C:\\Users\\bruce\\my-app"
     ]
   }
   ```

#### B. PostgreSQL MCP (Recommended for Supabase)

**Purpose**: Direct database access for queries and schema inspection

**Setup**:

1. Get your Supabase connection string:
   - Go to Supabase Dashboard → Settings → Database
   - Find "Connection string" → "URI" tab
   - Copy the connection string (format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`)

2. Update `.cursor/mcp.json`:

   ```json
   "postgres": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-postgres"],
     "env": {
       "POSTGRES_CONNECTION_STRING": "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
     }
   }
   ```

3. **Security Note**: Replace `[YOUR-PASSWORD]` with your actual database password. Consider using environment variables or Cursor's secure storage.

#### C. GitHub MCP (Optional)

**Purpose**: Access GitHub repositories, issues, PRs

**Setup**:

1. Create a GitHub Personal Access Token:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope

2. Update `.cursor/mcp.json`:
   ```json
   "github": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-github"],
     "env": {
       "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
     }
   }
   ```

#### D. Brave Search MCP (Optional)

**Purpose**: Web search capabilities

**Setup**:

1. Get Brave Search API key:
   - Visit https://brave.com/search/api/
   - Sign up and get your API key

2. Update `.cursor/mcp.json`:
   ```json
   "brave-search": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-brave-search"],
     "env": {
       "BRAVE_API_KEY": "your-api-key-here"
     }
   }
   ```

### 3. Using Environment Variables (Recommended)

For security, use environment variables instead of hardcoding credentials:

1. Create `.cursor/.env` file (add to `.gitignore`):

   ```env
   POSTGRES_CONNECTION_STRING=postgresql://postgres:password@db.ref.supabase.co:5432/postgres
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GITHUB_PERSONAL_ACCESS_TOKEN=your-github-token
   BRAVE_API_KEY=your-brave-api-key
   ```

2. Update `.cursor/mcp.json` to reference env vars:
   ```json
   "postgres": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-postgres"],
     "env": {
       "POSTGRES_CONNECTION_STRING": "${POSTGRES_CONNECTION_STRING}"
     }
   }
   ```

### 4. Minimal Configuration (Start Here)

If you want to start simple, here's a minimal `.cursor/mcp.json` with just filesystem access:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\bruce\\my-app"]
    }
  }
}
```

### 5. Restart Cursor

After configuring MCP servers:

1. Save `.cursor/mcp.json`
2. Restart Cursor IDE
3. MCP servers will be available in the AI assistant

## Available MCP Servers

### Official MCP Servers

- **Filesystem**: `@modelcontextprotocol/server-filesystem`
- **PostgreSQL**: `@modelcontextprotocol/server-postgres`
- **GitHub**: `@modelcontextprotocol/server-github`
- **Brave Search**: `@modelcontextprotocol/server-brave-search`

### Community MCP Servers

- **Supabase**: `@supabase/mcp-server-supabase` (if available)
- **Slack**: `@modelcontextprotocol/server-slack`
- **Google Drive**: `@modelcontextprotocol/server-gdrive`

## Testing Your Setup

1. Open Cursor
2. Start a chat with the AI assistant
3. Try commands like:
   - "List files in the src directory"
   - "Query the task_templates table"
   - "Search for information about Next.js App Router"

## Troubleshooting

### MCP Server Not Starting

- Check that Node.js is installed: `node --version`
- Verify the command paths in `mcp.json`
- Check Cursor's logs for errors

### Connection Issues

- Verify API keys and connection strings
- Check network connectivity
- Ensure credentials are correct

### Filesystem Access Denied

- Update the filesystem path to an absolute path
- Ensure the path exists and is accessible
- Check file permissions

## Security Best Practices

1. **Never commit credentials**: Add `.cursor/.env` to `.gitignore`
2. **Use environment variables**: Store sensitive data in env vars
3. **Limit filesystem access**: Only grant access to necessary directories
4. **Rotate API keys**: Regularly update your API keys
5. **Review permissions**: Grant minimal required permissions

## Next Steps

1. Start with the filesystem MCP server
2. Add PostgreSQL MCP for database access
3. Experiment with other servers as needed
4. Customize based on your workflow

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Cursor MCP Setup](https://docs.cursor.com/mcp)
- [MCP Server List](https://github.com/modelcontextprotocol/servers)

---

**Note**: The `.cursor/mcp.json` file is already created in your project. Edit it with your actual credentials and paths.
