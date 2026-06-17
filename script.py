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
  name: Editor
---

{content}
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(file_content)
    log(f"Saved draft to {file_path}")
    return file_path

def split_and_send_telegram(bot_token, chat_id, text, reply_markup=None):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    max_len = 3800

    def send_with_fallback(payload, chunk_index=0):
        # 1. Try sending with Markdown
        res = requests.post(url, json=payload)
        if res.status_code == 200:
            return res.json()

        log(f"Telegram Markdown parse failed (chunk {chunk_index}): {res.text}. Trying HTML parsing...")
        
        # 2. Try HTML parse mode
        html_payload = payload.copy()
        html_payload["parse_mode"] = "HTML"
        res = requests.post(url, json=html_payload)
        if res.status_code == 200:
            return res.json()

        log(f"Telegram HTML parse failed (chunk {chunk_index}): {res.text}. Sending as plain text...")
        
        # 3. Fallback to raw plain text (removes formatting, guaranteed delivery)
        plain_payload = payload.copy()
        plain_payload.pop("parse_mode", None)
        # Simple scrub to clean any stray formatting cues from plain text
        res = requests.post(url, json=plain_payload)
        log(f"Telegram raw delivery (chunk {chunk_index}) status: {res.status_code}")
        return res.json()
    
    if len(text) <= max_len:
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "reply_markup": reply_markup
        }
        return send_with_fallback(payload, 0)
    
    # Split the message into chunks
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
        
    # Send all but the last chunk
    for i, chunk in enumerate(chunks[:-1]):
        payload = {
            "chat_id": chat_id,
            "text": f"{chunk}\n\n*(Continued in next message...)*",
            "parse_mode": "Markdown"
        }
        send_with_fallback(payload, i + 1)
        
    # Send the final chunk with buttons
    payload = {
        "chat_id": chat_id,
        "text": chunks[-1],
        "parse_mode": "Markdown",
        "reply_markup": reply_markup
    }
    return send_with_fallback(payload, len(chunks))

def clean_gemini_markdown(text):
    text = text.strip()
    # Strip any potential fenced code blocks that LLMs sometimes generate
    if text.startswith("```markdown"):
        text = text[11:].strip()
    elif text.startswith("```yaml"):
        text = text[7:].strip()
    elif text.startswith("```"):
        text = text[3:].strip()
        
    if text.endswith("```"):
        text = text[:-3].strip()
    return text

def save_markdown_draft(slug, full_text):
    os.makedirs("posts", exist_ok=True)
    file_path = os.path.join("posts", f"{slug}.md")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(full_text)
    log(f"Saved complete markdown draft to {file_path}")
    return file_path

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
    
    # We do NOT use structured JSON schemas here because it conflicts with search grounding!
    # Instead, we request standard YAML front-matter directly in the markdown response.
    
    import re
    
    if action == "edit" and target_slug:
        log(f"MODE: Editing existing draft '{target_slug}' with feedback")
        file_path = os.path.join("posts", f"{target_slug}.md")
        
        if not os.path.exists(file_path):
            log(f"ERROR: Target draft '{file_path}' not found. Defaulting to new generation mode.")
            action = "generate"
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                previous_full_text = f.read()
            
            prompt = f"""You are an expert game development editor. You are editing a weekly newsletter draft.

Here is the current draft of the newsletter (including its YAML front-matter metadata):
{previous_full_text}

The user has requested the following changes/feedback:
"{feedback}"

Apply these modifications precisely. Maintain the engaging Sunday newsletter format, professional tone, all original hyperlinks, and the EXACT YAML front-matter structure at the top (updating the title/excerpt in the front-matter if appropriate, but keeping draft: true and the slug value exactly as '{target_slug}').

You MUST format your entire response as a single valid Markdown document containing front-matter metadata at the very top. Do NOT wrap your entire response in markdown block quotes (like ```markdown ... ```). Start your response directly with the YAML delimiter ---.
"""
            
            log("Calling Gemini with Search Grounding to apply edits...")
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[{"google_search": {}}],
                        temperature=0.2
                    ),
                )
                
                cleaned_text = clean_gemini_markdown(response.text)
                
                # Extract meta-details using regex for Telegram presentation
                title_match = re.search(r"title:\s*\"?([^\n\"]+)\"?", cleaned_text)
                title = title_match.group(1) if title_match else "Weekly Game Dev Roundup"
                
                excerpt_match = re.search(r"excerpt:\s*\"?([^\n\"]+)\"?", cleaned_text)
                excerpt = excerpt_match.group(1) if excerpt_match else ""
                
                slug = target_slug # Force overwrite target
                content_parts = cleaned_text.split("---", 2)
                content_only = content_parts[2].strip() if len(content_parts) >= 3 else cleaned_text
                
            except Exception as e:
                log(f"Gemini edit API failure: {e}")
                sys.exit(1)
                
    else:
        log("MODE: Generating a new on-demand newsletter")
        current_date = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
        prompt = f"""You are an expert game development researcher and editor.
Conduct deep web research on major game development breakthroughs, software engine updates (Unity, Unreal Engine, Godot), indie game showcases, and industry news that occurred over the past 7 days (prior to today). 

Compile this into a highly structured, engaging Sunday newsletter format. Ensure all original hyperlinks to source material are strictly retained.

You MUST format your entire response as a single valid Markdown document containing front-matter metadata at the very top. Do NOT wrap your entire response in markdown block quotes (like ```markdown ... ```). Start your response directly with the YAML delimiter ---.

Format your response EXACTLY like this:
---
title: "A catchy and professional title for the game dev newsletter"
excerpt: "A short, 1-2 sentence compelling summary of this edition"
date: "{current_date}"
draft: true
author:
  name: "Editor"
slug: "lowercase-hyphen-separated-url-slug"
---

# Your newsletter content starts here...
Use subheadings, bullet points, bold text, and source hyperlinks.
"""
        
        log("Calling Gemini with Search Grounding to conduct web research...")
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[{"google_search": {}}],
                    temperature=0.4
                ),
            )
            
            cleaned_text = clean_gemini_markdown(response.text)
            
            # Extract meta-details using regex
            title_match = re.search(r"title:\s*\"?([^\n\"]+)\"?", cleaned_text)
            title = title_match.group(1) if title_match else "The Weekly Game Dev Roundup"
            
            excerpt_match = re.search(r"excerpt:\s*\"?([^\n\"]+)\"?", cleaned_text)
            excerpt = excerpt_match.group(1) if excerpt_match else ""
            
            slug_match = re.search(r"slug:\s*\"?([a-zA-Z0-9_-]+)\"?", cleaned_text)
            slug = slug_match.group(1).lower() if slug_match else f"newsletter-{datetime.datetime.now().strftime('%Y-%m-%d')}"
            
            content_parts = cleaned_text.split("---", 2)
            content_only = content_parts[2].strip() if len(content_parts) >= 3 else cleaned_text
            
        except Exception as e:
            log(f"Gemini generation API failure: {e}")
            sys.exit(1)
            
    # Save the complete raw markdown text directly to posts (it includes front-matter natively!)
    save_markdown_draft(slug, cleaned_text)
    
    # Format the preview message to send to Telegram
    telegram_text = f"""🤖 *AI Game Dev Newsletter Draft Ready!*

*Title:* {title}
*Excerpt:* {excerpt}
*Slug:* `{slug}`

---
*DRAFT CONTENT:*

{content_only}
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
