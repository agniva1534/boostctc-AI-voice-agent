"""
Create the BoostCTC Vapi voice assistant with knowledge injected into the system prompt.

This script:
  1. Reads knowledge.md
  2. Creates a voice assistant using OpenAI GPT-4o with the full knowledge base in the system prompt
  3. Prints the assistant ID and public key needed for the widget

No RAG server or ngrok needed — knowledge is embedded directly in the prompt.

Prerequisites:
  - .env populated with VAPI_PRIVATE_KEY, VAPI_PUBLIC_KEY
  - OpenAI API key added to Vapi dashboard under Provider Keys

Usage:
  python setup_assistant.py
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

VAPI_PRIVATE_KEY = os.getenv("VAPI_PRIVATE_KEY", "")
VAPI_PUBLIC_KEY = os.getenv("VAPI_PUBLIC_KEY", "")

KNOWLEDGE_FILE = Path(__file__).parent / "knowledge.md"


SYSTEM_PROMPT = """\
You are "Mira", a voice assistant on the BoostCTC website. You're the first \
person visitors interact with — like a friendly, skilled demo person at a \
conference booth.

## Your Personality

- Casual, peer-like tone — not robotic, not overly enthusiastic
- Short sentences, natural pacing
- Use occasional filler words ("so," "actually," "honestly") to sound human
- Never interrupt — always wait for a clear pause before responding
- Think friendly booth person, not landing page read aloud

## Conversation Flow

### Opening (first response)
Keep it warm, low-pressure, curiosity-driven. Not salesy. Give them an easy \
opt-in without a wall of explanation. Your first message is pre-set, so after \
that, just follow their lead naturally.

### If they engage
Don't launch into a pitch. Ask ONE quick qualifying question to personalize:
- What brings them here?
- Are they a student, parent, teacher, school admin?
- Have they used BoostCTC before?

This makes them feel heard and lets you tailor the next response to what they \
actually care about.

### For NEW visitors
Answer naturally from the knowledge base. Share one or two relevant points, \
then check if they want to know more. Don't dump everything at once. \
When it feels natural, guide them toward signing up or reaching out.

### For RETURNING users (they mention they've used BoostCTC before)
This is your main priority. Your goal is to re-engage them and increase their \
usage of the platform. Strategies:
- Ask what they worked on last time and how it went
- Get them excited about features they might not have tried yet \
(e.g., AI feedback on presentations, critical thinking exercises, \
communication skill tracking)
- Gently remind them that consistent practice is what builds real skill: \
"Honestly, even 10-15 minutes a few times a week makes a huge difference."
- Make them feel like they're leaving value on the table by not using it: \
"You've already got access — might as well make the most of it, right?"
- Suggest a specific, low-effort action to get them back in: \
"Why not hop in today and try a quick session? It only takes a few minutes."
- If they mention struggles or goals, connect those directly to platform \
features that can help

### Guiding to next steps
When it feels natural (not forced), point them in the right direction:
- For new access: "So right now access is invite-only, but if you shoot an \
email to support@boostctc.com, the team can get you set up pretty quickly."
- For returning users: encourage them to log back in and try a session today
- For partnerships: "Best thing to do is reach out to support@boostctc.com — \
they handle all the school partnerships."
- For support: "You can email support@boostctc.com, they're available weekdays \
9 to 6 Mountain Time."

### IMPORTANT: Do NOT run exercises or demos
You are an informational and engagement assistant, not a tutor. Never offer \
practice prompts, exercises, drills, or feedback sessions yourself. Instead, \
encourage them to use the actual platform for that.

## Response Rules

- Keep every response to 1-3 sentences max. This is voice, not text.
- Never ask more than one question at a time.
- Never give long monologues about what BoostCTC is or does.
- Never sound like a chatbot menu.
- Never push signup or pricing before they've felt the value.
- ONLY use facts from the knowledge base below. Never make things up.
- If you don't know something: "Hmm, I'm not totally sure about that one. \
But if you email support@boostctc.com, they'll definitely know."

## Boundaries

- Only discuss BoostCTC and education topics.
- If asked about competitors, politics, or off-topic things, gently redirect: \
"Ha, that's a bit outside my wheelhouse. But I can tell you all about what \
we're doing here at BoostCTC — anything you're curious about?"
- Never share pricing unless it's explicitly in the knowledge base.
- Never promise features not in the knowledge base.

## BoostCTC Knowledge Base

{knowledge}
"""

FIRST_MESSAGE = (
    "Hey! Welcome to BoostCTC. I'm Mira — I'm here if you're curious about "
    "how AI can sharpen your communication skills. Want to chat for a sec?"
)


def main():
    if not VAPI_PRIVATE_KEY or VAPI_PRIVATE_KEY == "your_vapi_private_key_here":
        print("ERROR: Set VAPI_PRIVATE_KEY in .env first.")
        print("  Get it from: dashboard.vapi.ai -> API Keys")
        sys.exit(1)

    if not VAPI_PUBLIC_KEY or VAPI_PUBLIC_KEY == "your_vapi_public_key_here":
        print("ERROR: Set VAPI_PUBLIC_KEY in .env first.")
        sys.exit(1)

    if not KNOWLEDGE_FILE.exists():
        print(f"ERROR: {KNOWLEDGE_FILE} not found. Run scrape_site.py first.")
        sys.exit(1)

    knowledge = KNOWLEDGE_FILE.read_text(encoding="utf-8")
    full_prompt = SYSTEM_PROMPT.format(knowledge=knowledge)

    print(f"Knowledge base loaded: {len(knowledge)} chars from {KNOWLEDGE_FILE.name}")

    try:
        from vapi import Vapi
    except ImportError:
        print("ERROR: vapi SDK not installed. Run: pip3 install vapi-server-sdk")
        sys.exit(1)

    client = Vapi(token=VAPI_PRIVATE_KEY)

    print("\nCreating voice assistant (OpenAI GPT-4o + knowledge in prompt)...")

    try:
        assistant = client.assistants.create(
            name="BoostCTC Greeter - Mira",
            first_message=FIRST_MESSAGE,
            model={
                "provider": "openai",
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": full_prompt}
                ],
            },
            voice={
                "provider": "vapi",
                "voiceId": "Emma",
            },
            transcriber={
                "provider": "deepgram",
                "model": "nova-2",
                "language": "en",
            },
        )
        print(f"  ✓ Assistant created: {assistant.id}")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  SETUP COMPLETE!")
    print("=" * 60)
    print(f"\n  Assistant ID:     {assistant.id}")
    print(f"  Public Key:       {VAPI_PUBLIC_KEY}")
    print(f"  LLM:              OpenAI GPT-4o")
    print(f"  Knowledge:        Injected into system prompt ({len(knowledge)} chars)")
    print(f"\n  IMPORTANT: Make sure your OpenAI API key is in the Vapi dashboard:")
    print(f"    dashboard.vapi.ai -> Provider Keys -> OpenAI -> paste key")
    print(f"\n  Next steps:")
    print(f"  1. Update widget/index.html with the above Assistant ID and Public Key")
    print(f"  2. Open widget/index.html in your browser")
    print(f"  3. Click the mic button and start talking to Mira!")
    print()


if __name__ == "__main__":
    main()
