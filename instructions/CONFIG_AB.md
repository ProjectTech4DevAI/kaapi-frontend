I need to implement a configuration drawer and A/B testing feature for a prompt version control system. Here's what needs to be built:

## Context
We have a React-based version control system for prompt templates (similar to Git). Users can commit prompts, create branches, view diffs, and merge. Now we need to add configuration management and A/B testing.

## Requirements

### 1. Configuration Drawer (Right Side, 420px width)

**Trigger:** Floating Action Button (FAB) - "⚙️" icon, bottom-right corner, 56x56px circle, blue background

**Drawer Structure:**
- Slides in from right when FAB clicked
- 3 tabs: "Current" | "History" | "A/B Test"
- Close button (X) top-right
- Boxshadow for depth

### 2. Current Config Tab

**Fields (top to bottom):**

1. **Config Name Selector**
   - Dropdown to select existing configs (shows: "Name (vX)")
   - "+ New" button next to it
   - If New clicked: show text input for new config name

2. **Provider Dropdown**
   - Options: OpenAI, Anthropic, Google
   - Default: openai

3. **Model Dropdown**
   - Options: gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo
   - Default: gpt-4o-mini

4. **Instructions Section**
   - Label: "Instructions" 
   - Button: "Use Current Prompt" (copies from main editor)
   - Textarea: multiline, monospace font, 120px min-height

5. **Temperature Slider**
   - Label: "Temperature: {value}"
   - Range: 0 to 1, step 0.1
   - Labels below: "Focused (0)" | "Balanced (0.5)" | "Creative (1)"

6. **Tools Section**
   - Label: "Tools" with "+ Add Tool" button
   - Each tool shows:
     - Type: File Search (hardcoded for now)
     - Input: Vector Store ID
     - Input: Max Results (number)
     - Remove button

7. **Commit Message**
   - Optional text input
   - Placeholder: "Describe this configuration..."

8. **Save Button**
   - Full width, green (#2da44e)
   - Text: "Save Configuration"

**Data Structure for Config:**
```javascript
{
  id: 'cfg1',
  name: 'Main Config',
  version: 1,
  timestamp: Date.now(),
  config_blob: {
    completion: {
      provider: 'openai',
      params: {
        model: 'gpt-4o-mini',
        instructions: '...',
        temperature: 0.7,
        tools: [
          {
            type: 'file_search',
            knowledge_base_ids: ['vs_abc123'],
            max_num_results: 20
          }
        ]
      }
    }
  },
  commitMessage: 'Optional message'
}
```

### 3. History Tab

**Display:**
- List of all saved configs (reverse chronological)
- Each card shows:
  - Config name (vX)
  - Model • temp: X
  - Timestamp (formatted like "2h ago", "3d ago")
  - Commit message (if exists, italicized)
- Click card to load that config into Current tab
- Active config highlighted

### 4. A/B Test Tab

**Variant Configuration:**
- Show 2 variants by default (A and B)
- Each variant card contains:
  - Header: "Variant A/B/C/D"
  - Config dropdown: Select from saved configs
  - Prompt dropdown: Select from commit history (show: "#ID: message (branch)")
  - Preview box (readonly): Shows model, temp, first line of prompt
- "+ Add Variant" button (max 4 variants)

**Test Input Section:**
- Label: "Test Input"
- Textarea for test prompt

**Run Test Button:**
- Full width, green
- Text: "▶ Run Test"
- Disabled if no test input

**Results Section (appears after running):**
- Card for each variant showing:
  - Variant name
  - Score (0.00-1.00 format)
  - Config name • Commit message
  - Latency in ms
- Highlight best performer with "🏆 Best: Variant X" in green box

**Test Simulation:**
```javascript
// For PoC, simulate API call:
await new Promise(resolve => setTimeout(resolve, 1500));
const score = 0.7 + Math.random() * 0.25;
const latency = 200 + Math.random() * 400;
```

### 5. State Management

**New State Variables Needed:**
```javascript
// Drawer
const [drawerOpen, setDrawerOpen] = useState(false);
const [drawerTab, setDrawerTab] = useState('config');

// Configs
const [configs, setConfigs] = useState([]);
const [selectedConfigId, setSelectedConfigId] = useState('');
const [configName, setConfigName] = useState('');
const [provider, setProvider] = useState('openai');
const [model, setModel] = useState('gpt-4o-mini');
const [instructions, setInstructions] = useState('');
const [temperature, setTemperature] = useState(0.7);
const [tools, setTools] = useState([]);
const [configCommitMsg, setConfigCommitMsg] = useState('');

// A/B Testing
const [variants, setVariants] = useState([
  { id: 'A', configId: '', commitId: '', name: 'Variant A' },
  { id: 'B', configId: '', commitId: '', name: 'Variant B' }
]);
const [testInput, setTestInput] = useState('');
const [testResults, setTestResults] = useState(null);
const [isRunningTest, setIsRunningTest] = useState(false);
```

### 6. Key Functions to Implement
```javascript
// Save new config version
const saveConfig = () => {
  // Validate config name exists
  // Create new config object with incremented version
  // Add to configs array
  // Show success alert
}

// Load existing config
const loadConfig = (configId) => {
  // Find config by ID
  // Populate all form fields
  // Set as selected config
}

// Add/remove/update tools
const addTool = () => { /* Add empty tool */ }
const removeTool = (index) => { /* Remove by index */ }
const updateTool = (index, field, value) => { /* Update specific field */ }

// Run A/B test
const runABTest = async () => {
  // Validate test input exists
  // Set loading state
  // Simulate API calls (1.5s delay)
  // Generate mock scores and latencies
  // Display results
}

// Manage variants
const addVariant = () => { /* Max 4 variants */ }
const updateVariant = (index, field, value) => { /* Update variant config */ }
```

### 7. UI/UX Details

**Colors:**

Use current B/W color scheme. Make sure the design system does not diverge. 

**Spacing:**
- Drawer padding: 20px
- Section spacing: 16px bottom margin
- Input padding: 8px
- Label font: 12px, weight 600

**Interactions:**
- FAB hover: scale(1.1) transform
- Drawer animation: slide in from right (can use conditional render for MVP)
- Close drawer on: X button click, overlay click (optional)

### 8. Integration Points

**With Existing System:**
- Access `currentContent` from main editor for "Use Current Prompt"
- Access `commits` array for A/B test prompt selection
- Add "▶ Run A/B Test" button in header (opens drawer to A/B tab)

### 9. Starting Point

If you have the existing version control code, add:
1. FAB button positioned fixed bottom-right
2. Conditional render of drawer when `drawerOpen === true`
3. Tab switching logic
4. Form fields with controlled inputs
5. A/B test variant management

The drawer should NOT affect the existing version control tree, editor, or diff views. It's purely additive.

## File Structure
- Single React component (or can split into sub-components)
- Keep all state in parent component for MVP
- No external dependencies beyond React

## Success Criteria
✅ FAB opens/closes drawer
✅ Can create and save configs with all fields
✅ Can load previous configs from history
✅ Can set up 2-4 A/B test variants
✅ Can run test and see simulated results
✅ Results show winner clearly
✅ "Use Current Prompt" syncs editor content
✅ UI is clean and uncluttered