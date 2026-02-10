# Knowledge Base & AI Assistant Guide

## Follow-Up Questions ✅

**Yes, users can ask follow-up questions!** The AI assistant maintains conversation context.

### How It Works:

- The conversation history includes the **last 10 messages** (user + assistant)
- Each message sent includes previous context
- The AI can reference earlier parts of the conversation
- Context persists throughout the chat session

### Example Conversation Flow:

```
User: "How do I create a task?"
Assistant: "To create a task, go to Templates..."
User: "Can I assign it to multiple people?"
Assistant: "Yes, when creating the task configuration..."
User: "What about scheduling?"
Assistant: "You can schedule it daily, weekly..."
```

The assistant remembers the conversation is about task creation throughout.

---

## Knowledge Base Content

### Current Knowledge Base Structure

The knowledge base is organized by **category** and **subcategory**:

#### Categories:

- `app_help` - How to use Checkly features
- `food_safety` - UK food safety regulations
- `fire_safety` - Fire safety compliance
- `health_safety` - Health & safety regulations
- `sop_guidance` - Creating SOPs
- `ra_guidance` - Creating Risk Assessments
- `troubleshooting` - Fixing problems

---

## Current Content (seed_knowledge_base_app_help.sql)

### ✅ Already Included:

1. **Task Management**
   - How tasks work (templates → configurations → instances)
   - Completing tasks
   - Task statuses
   - Troubleshooting missing tasks

2. **SOPs**
   - What SOPs are
   - Creating SOPs
   - SOP templates

3. **Risk Assessments**
   - What Risk Assessments are
   - Creating Risk Assessments
   - 5-step process

4. **Troubleshooting**
   - Common issues
   - Can't complete tasks
   - Missing tasks

---

## New Content Available (seed_knowledge_base_expanded_features.sql)

### 📋 New Knowledge Base Entries:

#### 1. **Assets & PPM Management**

- Understanding Assets in Checkly
- PPM (Planned Preventive Maintenance) Schedules
- Creating Contractor Callouts

#### 2. **Incidents**

- Reporting an Incident
- Staff Sickness Reporting
- Customer Complaints
- Food Poisoning

#### 3. **Attendance**

- Clock In and Clock Out
- Shift management
- Task visibility based on clock status

#### 4. **Organization & Settings**

- Managing Your Organization
- User Roles and Permissions (Admin/Manager/Staff)
- Site management

#### 5. **Reports**

- Generating EHO Reports
- Compliance documentation
- Export functionality

#### 6. **Library System**

- Requesting New Library Items
- Template requests
- SOP requests

#### 7. **Temperature Monitoring**

- Best practices
- Required temperatures
- What to do if out of range

---

## Adding New Content to Knowledge Base

### To Add the New Content:

1. **Run the new seed file:**

```sql
-- In Supabase SQL Editor or via migration
\i supabase/sql/seed_knowledge_base_expanded_features.sql
```

2. **Or apply via migration:**

```bash
# Create a new migration file
supabase migration new seed_expanded_knowledge_base
# Copy the SQL content
# Apply migration
supabase db push
```

---

## Suggestions for Additional Content

### Priority Additions:

1. **Contractor Management**
   - Adding contractors
   - Assigning to assets
   - Managing contractor contacts

2. **Training Records**
   - Logging training
   - Training certificates
   - Training schedules

3. **Notifications & Alerts**
   - How notifications work
   - Alert types
   - Managing notification preferences

4. **Shift Handovers**
   - Creating handover notes
   - Viewing previous shifts
   - Important information to include

5. **Digital Signatures**
   - When signatures are required
   - How to sign
   - Legal requirements

6. **Photo Evidence**
   - Best practices for photos
   - Photo requirements
   - Troubleshooting photo uploads

7. **Advanced Task Features**
   - Repeatable fields (multi-unit tasks)
   - Conditional fields
   - Task dependencies

8. **Compliance Templates**
   - What's in the template library
   - How to use pre-built templates
   - Customizing templates

9. **Reports & Analytics**
   - Viewing completion rates
   - Compliance scores
   - Exporting data

10. **Mobile App** (when available)
    - Mobile-specific features
    - Offline mode
    - Mobile task completion

---

## Knowledge Base Search Strategy

The AI assistant uses **PostgreSQL full-text search** to find relevant content:

1. **Question Categorization**: Automatically detects category based on keywords
2. **Text Search**: Searches title, content, and tags
3. **Relevance Ranking**: Results ranked by relevance
4. **Context Building**: Relevant docs sent to AI with conversation history

### Search Keywords:

- Category-specific: `food_safety`, `fire_safety`, `app_help`, etc.
- Subcategory: `tasks`, `sop`, `assets`, `incidents`, etc.
- Tags: Multiple tags for flexible searching

---

## Best Practices for Adding Content

### When Creating Knowledge Base Entries:

1. **Use Clear Titles**: Make titles question-like or descriptive
   - ✅ "How Tasks Work in Checkly"
   - ❌ "Tasks"

2. **Detailed Content**: Include step-by-step instructions
   - What it is
   - Why it matters
   - How to do it
   - Common issues/tips

3. **Rich Tags**: Add multiple relevant tags
   - Feature names
   - Common questions
   - Related terms
   - Troubleshooting keywords

4. **Appropriate Category**: Use the right category for better search

5. **Real Examples**: Include real-world examples when possible

6. **Compliance Info**: For compliance topics, cite regulations

---

## Testing the Knowledge Base

### Test Questions to Try:

1. **Task Management:**
   - "How do tasks work?"
   - "My task isn't showing, what do I do?"
   - "How do I complete a task?"

2. **Assets:**
   - "How do I add an asset?"
   - "What is PPM?"
   - "How do I create a callout?"

3. **Incidents:**
   - "How do I report an incident?"
   - "What should I do if a staff member is sick?"

4. **Follow-up Questions:**
   - "Can you explain that in more detail?"
   - "What about for multiple sites?"
   - "How often should I do that?"

---

## Maintenance

### Regular Updates Needed:

- **New Features**: Add content when new features launch
- **User Feedback**: Add content based on common questions
- **Compliance Updates**: Update when regulations change
- **Bug Fixes**: Update troubleshooting content

### Review Schedule:

- Monthly: Review common questions
- Quarterly: Update compliance content
- After Releases: Add new feature documentation

---

## Technical Details

### Database Structure:

- **Table**: `knowledge_base`
- **Full-text Search**: Uses `search_vector` column (tsvector)
- **RLS**: Row-level security enabled
- **Indexes**: Optimized for fast searching

### API Integration:

- **Endpoint**: `/api/assistant/chat`
- **Search**: PostgreSQL full-text search
- **Context**: Last 10 messages maintained
- **Model**: Claude Haiku (configurable)

---

## Next Steps

1. ✅ Review the new seed file content
2. ✅ Apply the expanded knowledge base SQL
3. ✅ Test with follow-up questions
4. ✅ Monitor user questions for gaps
5. ✅ Add content based on feedback

---

_Last Updated: Based on current codebase as of latest commit_
