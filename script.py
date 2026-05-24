import os
import sys
import json
import datetime
import requests
from google import genai
from google.genai import types

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

# Simple YAML and Markdown front-matter parser to avoid heavy external dependencies
def parse_front_matter(file_path):
    if not os.path.exists(file_path):
        return {}, ""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if not content.startswith("---"):
        return {}, content
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    
    yaml_part = parts[1]
    body_part = parts[2].strip()
    
    metadata = {}
    for line in yaml_part.strip().split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            metadata[k.strip()] = v.strip().strip('"').strip("'")
            
    return metadata, body_part

def save_draft(slug, title, excerpt, content):
    os.makedirs("posts", exist_ok=True)
    file_path = os.path.join("posts", f"{slug}.md")
    
    current_date = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    # Construct the file with front-matter
    file_content = f"""---
title: "{title}"
excerpt: "{excerpt}"
date: "{current_date}"
draft: true
author:
  name: AI Editor
---

{content}
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(file_content)
    log(f"Saved draft to {file_path}")
    return file_path

def split_and_send_telegram(bot_token, chat_id, text, reply_markup=None):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    
    # Telegram max character limit is 4096. We split at 3800 to be safe.
    max_len = 3800
    if len(text) <= max_len:
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "reply_markup": reply_markup
        }
        res = requests.post(url, json=payload)
        log(f"Telegram response: {res.status_code}")
        return res.json()
    
    # Split the message into chunks, trying to break at newlines
    chunks = []
    current_chunk = ""
    for line in text.split("\n"):
        if len(current_chunk) + len(line) + 1 > max_len:
            chunks.append(current_chunk)
            current_chunk = line
        else:
            if current_chunk:
                current_chunk += "\n" + line
            else:
                current_chunk = line
    if current_chunk:
        chunks.append(current_chunk)
        
    # Send all but the last chunk without reply_markup
    for i, chunk in enumerate(chunks[:-1]):
        payload = {
            "chat_id": chat_id,
            "text": f"{chunk}\n\n*(Continued in next message...)*",
            "parse_mode": "Markdown"
        }
        requests.post(url, json=payload)
        
    # Send the final chunk with the interactive buttons
    payload = {
        "chat_id": chat_id,
        "text": chunks[-1],
        "parse_mode": "Markdown",
        "reply_markup": reply_markup
    }
    res = requests.post(url, json=payload)
    log(f"Telegram final chunk response: {res.status_code}")
    return res.json()

def main():
    log("Starting AI Game Dev Newsletter Python Engine")
    
    # Load configuration
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_MY_CHAT_ID")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    
    # Read action context from repository dispatch parameters (passed via env vars in workflow)
    action = os.environ.get("DISPATCH_ACTION", "generate").lower()  # 'generate' or 'edit'
    feedback = os.environ.get("DISPATCH_FEEDBACK", "")
    target_slug = os.environ.get("DISPATCH_SLUG", "")
    
    if not bot_token or not chat_id or not gemini_api_key:
        log("ERROR: Missing required environment variables (TELEGRAM_BOT_TOKEN, TELEGRAM_MY_CHAT_ID, GEMINI_API_KEY)")
        sys.exit(1)
        
    # Initialize the Gemini SDK
    client = genai.Client(api_key=gemini_api_key)
    
    # Define structured schema for JSON output
    newsletter_schema = {
        "type": "OBJECT",
        "properties": {
            "title": {"type": "STRING", "description": "Catchy title for the game dev newsletter"},
            "excerpt": {"type": "STRING", "description": "Short 1-2 sentence summary"},
            "slug": {"type": "STRING", "description": "URL friendly slug based on title (lowercase, hyphens)"},
            "content": {"type": "STRING", "description": "Full newsletter article content in markdown format, retaining sources"}
        },
        "required": ["title", "excerpt", "slug", "content"]
    }
    
    if action == "edit" and target_slug:
        log(f"MODE: Editing existing draft '{target_slug}' with feedback")
        file_path = os.path.join("posts", f"{target_slug}.md")
        
        if not os.path.exists(file_path):
            log(f"ERROR: Target draft '{file_path}' not found. Defaulting to new generation mode.")
            action = "generate"
        else:
            metadata, content = parse_front_matter(file_path)
            title = metadata.get("title", "Game Dev Weekly Roundup")
            excerpt = metadata.get("excerpt", "")
            
            prompt = f"""You are an expert game development editor. You are editing a weekly newsletter draft.

Here is the current draft details:
---
TITLE: {title}
EXCERPT: {excerpt}
SLUG: {target_slug}
CONTENT:
{content}
---

The user has provided the following edit feedback:
"{feedback}"

Apply these modifications precisely. Retain all original source hyperlinks and keep the format engaging, professional, and reader-focused.
"""
            
            log("Calling Gemini with Search Grounding to apply edits...")
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[{"google_search": {}}],
                        response_mime_type="application/json",
                        response_schema=newsletter_schema,
                        temperature=0.2
                    ),
                )
                
                result = json.loads(response.text)
                title = result.get("title", title)
                excerpt = result.get("excerpt", excerpt)
                content = result.get("content", content)
                slug = target_slug # Keep original slug to overwrite file cleanly
                
            except Exception as e:
                log(f"Gemini edit API failure: {e}")
                sys.exit(1)
                
    else:
        log("MODE: Generating a new on-demand newsletter")
        current_date = datetime.datetime.now().strftime("%B %d, %Y")
        
        prompt = f"""Conduct deep web research on major game development breakthroughs, software engine updates (Unity, Unreal Engine, Godot), indie game showcases, and industry news that occurred over the past 7 days (prior to today {current_date}). 

Compile this into a highly structured, engaging Sunday newsletter format. Ensure all original hyperlinks to source material are strictly retained.

Include sections for:
1. Major Engine Updates (Unity, Unreal Engine, Godot, etc.)
2. Next-Gen Tech & AI in Game Dev
3. Indie Spotlight (notable releases, demos, or showcases)
4. Industry & Community News
"""
        
        log("Calling Gemini with Search Grounding to conduct web research...")
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[{"google_search": {}}],
                    response_mime_type="application/json",
                    response_schema=newsletter_schema,
                    temperature=0.4
                ),
            )
            
            result = json.loads(response.text)
            title = result.get("title", "The Weekly Game Dev Roundup")
            excerpt = result.get("excerpt", "")
            content = result.get("content", "")
            slug = result.get("slug", f"newsletter-{datetime.datetime.now().strftime('%Y-%m-%d')}")
            
        except Exception as e:
            log(f"Gemini generation API failure: {e}")
            sys.exit(1)
            
    # Save the updated or newly generated draft post
    save_draft(slug, title, excerpt, content)
    
    # Format the message to send to Telegram
    telegram_text = f"""🤖 *AI Game Dev Newsletter Draft Ready!*

*Title:* {title}
*Excerpt:* {excerpt}
*Slug:* `{slug}`

---
*DRAFT CONTENT:*

{content}
"""
    
    # Inline Buttons
    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "✅ Yes, Publish It", "callback_data": f"publish:{slug}"},
                {"text": "📝 Edit Draft", "callback_data": f"edit:{slug}"}
            ]
        ]
    }
    
    log("Sending draft to Telegram...")
    split_and_send_telegram(bot_token, chat_id, telegram_text, reply_markup)
    log("Done!")

if __name__ == "__main__":
    main()
