# Config Management API Integration Instructions

## Overview
Integrate the Config Management APIs into an existing Next.js UI. The API manages LLM configurations with version control (similar to git commits for config changes).

## Base URL & Auth
- Base: `/api/v1/configs`
- Auth: Bearer token via `Authorization` header OR API key via `X-API-KEY` header

---

## API Endpoints

### 1. Configs (Parent Entity)

#### List Configs
```
GET /api/v1/configs/
Query: skip (default 0), limit (default 100, max 100)
Response: { success: boolean, data: ConfigPublic[], error?: string }
```

#### Create Config
```
POST /api/v1/configs/
Body: ConfigCreate
Response 201: { success: boolean, data: ConfigWithVersion }
```

#### Get Config
```
GET /api/v1/configs/{config_id}
Response: { success: boolean, data: ConfigPublic }
```

#### Update Config (metadata only)
```
PATCH /api/v1/configs/{config_id}
Body: ConfigUpdate
Response: { success: boolean, data: ConfigPublic }
```

#### Delete Config
```
DELETE /api/v1/configs/{config_id}
Response: { success: boolean, data: { message: string } }
```

### 2. Config Versions (Child Entity)

#### List Versions
```
GET /api/v1/configs/{config_id}/versions
Query: skip, limit
Response: { success: boolean, data: ConfigVersionItems[] }
```

#### Create Version
```
POST /api/v1/configs/{config_id}/versions
Body: ConfigVersionCreate
Response 201: { success: boolean, data: ConfigVersionPublic }
```

#### Get Specific Version
```
GET /api/v1/configs/{config_id}/versions/{version_number}
Response: { success: boolean, data: ConfigVersionPublic }
```

#### Delete Version
```
DELETE /api/v1/configs/{config_id}/versions/{version_number}
Response: { success: boolean, data: { message: string } }
```

---

## TypeScript Types

```typescript
// Request Types
interface ConfigCreate {
  name: string;                    // 1-128 chars, unique per project
  description?: string | null;     // max 512 chars
  config_blob: ConfigBlob;
  commit_message?: string | null;  // max 512 chars
}

interface ConfigUpdate {
  name?: string | null;            // 1-128 chars
  description?: string | null;     // max 512 chars
}

interface ConfigVersionCreate {
  config_blob: ConfigBlob;
  commit_message?: string | null;  // max 512 chars
}

interface ConfigBlob {
  completion: CompletionConfig;
}

interface CompletionConfig {
  provider: "openai";              // currently only "openai"
  params: Record<string, any>;     // provider-specific params (model, temperature, etc.)
}

// Response Types
interface ConfigPublic {
  id: string;                      // UUID
  name: string;
  description: string | null;
  project_id: number;
  inserted_at: string;             // ISO datetime
  updated_at: string;              // ISO datetime
}

interface ConfigWithVersion extends ConfigPublic {
  version: ConfigVersionPublic;
}

interface ConfigVersionPublic {
  id: string;                      // UUID
  config_id: string;               // UUID
  version: number;                 // starts at 1, auto-increments
  config_blob: Record<string, any>;
  commit_message: string | null;
  inserted_at: string;
  updated_at: string;
}

interface ConfigVersionItems {
  id: string;                      // UUID
  config_id: string;               // UUID
  version: number;
  commit_message: string | null;
  inserted_at: string;
  updated_at: string;
  // Note: config_blob excluded for list performance
}

interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  metadata?: Record<string, any> | null;
}
```

---

## Example config_blob

```json
{
  "completion": {
    "provider": "openai",
    "params": {
      "model": "gpt-4o-mini",
      "instructions": "You are a helpful assistant...",
      "temperature": 1,
      "tools": [
        {
          "type": "file_search",
          "knowledge_base_ids": ["vs_692d71f3f5708191b1c46525f3c1e196"],
          "max_num_results": 20
        }
      ]
    }
  }
}
```

---

## UI Implementation Notes

1. **Config List View**: Display name, description, updated_at. Click to view versions.

2. **Config Create Form**: 
   - name (required, unique)
   - description (optional)
   - config_blob JSON editor or structured form
   - commit_message (optional, for initial version)

3. **Version History View**: 
   - Show versions in descending order (newest first)
   - Display version number, commit_message, timestamps
   - Click version to view full config_blob

4. **Create New Version**:
   - Load current version's config_blob as starting point
   - Allow editing config_blob
   - Add commit_message to describe changes
   - Auto-increments version number

5. **Diff View** (optional enhancement):
   - Compare config_blob between versions
   - Highlight changes

6. **Error Handling**:
   - 422: Validation errors (check response.error)
   - Duplicate name error when creating config