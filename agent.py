"""
agent.py — AI Brain with tool-calling loop.
Handles: system prompt, Groq API, tool call detection/dispatch, history.
"""

import json
import re

from groq import Groq

from memory.db import (
    get_history, add_history, append_activity
)


# ── Available tools description for system prompt ──────────

TOOLS_SPEC = [
    {
        "name": "files",
        "description": "Manage local files. Use ~ for home directory (e.g., ~/Desktop) and . for current directory. Actions: create_file, read_file, move_file, delete_file, list_dir, create_dir",
        "actions": {
            "create_file": {"params": ["path", "content"], "desc": "Create a new local file"},
            "read_file": {"params": ["path"], "desc": "Read content of a local file"},
            "move_file": {"params": ["src", "dest"], "desc": "Move or rename a file"},
            "delete_file": {"params": ["path"], "desc": "Delete a file (ask user first)"},
            "list_dir": {"params": ["path"], "desc": "List files in a directory"},
            "create_dir": {"params": ["path"], "desc": "Create a new folder"},
        }
    },
]

SHORTCUT_HINTS = {
    "/files": "The user wants to manage local files. Use the files tool.",
    "/ask": "The user wants to ask questions. If a document is provided, answer based on it.",
}


def build_system_prompt():
    """Build the system prompt with tool descriptions."""
    tools_text = ""
    for tool in TOOLS_SPEC:
        tools_text += f"\n### {tool['name']}\n{tool['description']}\n"
        for action, info in tool["actions"].items():
            params = ", ".join(info["params"]) if info["params"] else "none"
            tools_text += f"  - **{action}** ({params}): {info['desc']}\n"

    return f"""You are Dadarzz Agent, a helpful AI assistant.
You can chat normally AND use tools when needed.

## Available Tools
{tools_text}

## How to Call Tools
When you need to use a tool, respond with ONLY a JSON object (no other text):
```json
{{
  "tool": "tool_name",
  "action": "action_name",
  "params": {{
    "param1": "value1"
  }}
}}
```

## Rules
1. If the user's request can be answered without tools, reply normally in plain text.
2. If the user's request requires a tool, respond with ONLY the JSON tool call.
3. After receiving a tool result, formulate a friendly human-readable response.
4. For file deletion, always confirm with the user before proceeding.
5. Use emoji sparingly to keep responses friendly 🤖
6. Be concise but helpful.
"""


def parse_tool_call(response_text):
    """Detect if the AI response is a JSON tool call or plain text.
    Returns parsed dict if tool call, None otherwise."""
    text = response_text.strip()

    # Try to find the first { and last }
    start_idx = text.find("{")
    end_idx = text.rfind("}")
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_str = text[start_idx:end_idx+1]
        try:
            data = json.loads(json_str)
            if "tool" in data and "action" in data:
                return data
        except json.JSONDecodeError:
            pass

    return None


def dispatch_tool(tool_call, user_id):
    """Route a tool call to the correct module and action."""
    tool_name = tool_call.get("tool", "")
    action = tool_call.get("action", "")
    params = tool_call.get("params", {})

    try:
        if tool_name == "files":
            from tools.files_tool import execute
            return execute(action, params, user_id)

        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})

    except Exception as e:
        return json.dumps({"error": f"Tool execution failed: {str(e)}"})


def load_history(user_id, limit=20):
    """Load conversation history as message dicts for Groq."""
    rows = get_history(user_id, limit)
    return [{"role": r["role"], "content": r["content"]} for r in rows]


def save_exchange(user_id, user_msg, ai_reply):
    """Save both sides of the conversation."""
    add_history(user_id, "user", user_msg)
    add_history(user_id, "assistant", ai_reply)


def test_api_key(api_key):
    """Test an API key with a quick Groq call. Returns {"ok": bool, "error": str}."""
    try:
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            messages=[{"role": "user", "content": "Say hello in one word."}],
            model="llama-3.3-70b-versatile",
            max_tokens=10,
        )
        return {"ok": True, "error": None}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def run(user_id, message, api_key, file_path=None):
    """Full agent execution loop."""
    client = Groq(api_key=api_key)
    system_prompt = build_system_prompt()

    # Check for shortcut commands
    shortcut_hint = ""
    for cmd, hint in SHORTCUT_HINTS.items():
        if message.lower().startswith(cmd):
            shortcut_hint = f"\n\n[System hint: {hint}]"
            break

    # Handle /ask with uploaded document
    doc_context = ""
    if file_path:
        doc_context = _extract_document(file_path)
        if doc_context:
            doc_context = f"\n\n[Document content for reference]:\n{doc_context[:8000]}"

    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(load_history(user_id))
    messages.append({
        "role": "user",
        "content": message + shortcut_hint + doc_context
    })

    try:
        # First AI call
        response = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            max_tokens=2048,
            temperature=0.7,
        )
        ai_text = response.choices[0].message.content

        # Check if it's a tool call
        tool_call = parse_tool_call(ai_text)

        if tool_call:
            # Log the tool call
            append_activity(
                user_id,
                f"tool_{tool_call['tool']}_{tool_call['action']}",
                json.dumps(tool_call.get("params", {}))[:200]
            )

            # Execute the tool
            tool_result = dispatch_tool(tool_call, user_id)

            # Feed result back to AI for human-readable response
            messages.append({"role": "assistant", "content": ai_text})
            messages.append({
                "role": "user",
                "content": f"[Tool result]: {tool_result}\n\nPlease give a friendly, human-readable summary of this result to the user."
            })

            response2 = client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                max_tokens=1024,
                temperature=0.7,
            )
            final_reply = response2.choices[0].message.content
        else:
            final_reply = ai_text

        # Save exchange
        save_exchange(user_id, message, final_reply)

        return final_reply

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate" in error_msg.lower():
            return "⚠️ Rate limit reached. Please wait a moment and try again."
        if "401" in error_msg or "auth" in error_msg.lower():
            return "🔑 API key error. Please check your key in Settings."
        return f"❌ Error: {error_msg}"


def _extract_document(file_path):
    """Extract text from a PDF or text file."""
    try:
        if file_path.lower().endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        else:
            # Plain text / other
            with open(file_path, "r", errors="ignore") as f:
                return f.read()
    except Exception as e:
        return f"[Could not read document: {e}]"
