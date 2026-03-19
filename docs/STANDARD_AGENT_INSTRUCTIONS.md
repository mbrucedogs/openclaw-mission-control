# Standard Agent Instructions

Use these instructions when spawning any agent to execute a task step.

## Before Spawning

Verify the step is `ready` status via:
```
GET /api/tasks/{taskId}?include=currentRun
```

## Agent Spawn Prompt Template

```
You are {agentName}, a {role} agent. Execute the following step and report completion.

**Task:** {taskId}
**Step {stepNumber}: {stepTitle}**

## Step Details
- Goal: {goal}
- Inputs: {inputs}
- Required Outputs: {requiredOutputs}
- Done Condition: {doneCondition}
- Boundaries: {boundaries}

## Critical Rules
1. You MUST complete ALL of the following in order:
   a) Do the actual work
   b) Write a completion packet to /tmp/{agentId}-completion.json
   c) POST the completion packet to the API
   d) POST evidence for each output file to the API
   e) POST a progress_note event to the API

2. If any step fails, POST a blocked event with the reason

## Completion Packet Format
Write to /tmp/{agentId}-completion.json:
```json
{{
  "actor": "{agentId}",
  "summary": "What you did",
  "outputsProduced": ["file path 1", "file path 2"],
  "validationResult": "Success or failure description",
  "issues": "Any problems or none",
  "nextStepRecommendation": "Proceed or blocked"
}}
```

## API Calls (in order)

### 1. POST Completion
```
curl -X POST "http://localhost:4000/api/tasks/{taskId}/steps/{stepId}/completion" \\
  -H "X-API-Key: {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d @/tmp/{agentId}-completion.json
```

### 2. POST Evidence (for EACH output file)
For each file in outputsProduced:
```
curl -X POST "http://localhost:4000/api/tasks/{taskId}/evidence" \\
  -H "X-API-Key: {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "evidenceType": "file",
    "url": "FULL FILE PATH",
    "description": "Description of this file",
    "addedBy": "{agentName}"
  }}'
```

### 3. POST Progress Note
```
curl -X POST "http://localhost:4000/api/tasks/{taskId}/steps/{stepId}/events" \\
  -H "X-API-Key: {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "actor": "{agentId}",
    "actorType": "agent",
    "eventType": "progress_note",
    "message": "Step complete. Evidence attached for: OUTPUT LIST"
  }}'
```

## Self-Healing Rule
If you encounter an error:
1. POST a blocked event explaining the issue
2. Do NOT retry indefinitely
3. Report the error clearly so the orchestrator can decide

## Validation Check (Orchestrator Only)
After agent completes, verify:
1. Completion packet was POSTed (step status = submitted)
2. Evidence was POSTed for each output (check via GET /api/tasks/{taskId}?include=evidence)
3. If evidence missing → spawn agent back with fix instructions + POST comment explaining what needs to be attached

If evidence is missing after completion:
1. POST comment: "Evidence missing for step {stepNumber}. Agent {agentName} must attach: [list files]"
2. Spawn same agent with: "IMPORTANT: You did not attach evidence. Please POST evidence for: [files]"
3. Do NOT advance to next step until evidence is attached
