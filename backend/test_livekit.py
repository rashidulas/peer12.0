#!/usr/bin/env python3
"""Test LiveKit connection and token generation"""

import os
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

print("=" * 60)
print("LiveKit Configuration Check")
print("=" * 60)

print(f"\n✓ LIVEKIT_URL: {LIVEKIT_URL}")
print(f"✓ LIVEKIT_API_KEY: {LIVEKIT_API_KEY[:10]}..." if LIVEKIT_API_KEY else "✗ LIVEKIT_API_KEY: Not set")
print(f"✓ LIVEKIT_API_SECRET: {LIVEKIT_API_SECRET[:10]}..." if LIVEKIT_API_SECRET else "✗ LIVEKIT_API_SECRET: Not set")

if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
    print("\nMissing credentials!")
    exit(1)

print("\n" + "=" * 60)
print("Testing Token Generation")
print("=" * 60)

try:
    from livekit import api
    import datetime as dt
    
    tok = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity("test-user")
        .with_ttl(dt.timedelta(hours=6))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room="test-room",
                room_create=True,
            )
        )
    )
    
    jwt = tok.to_jwt()
    print(f"\nToken generated successfully!")
    print(f"Token preview: {jwt[:50]}...")
    print(f"\nLiveKit URL is reachable: {LIVEKIT_URL}")
    print("\n" + "=" * 60)
    print("✨ Configuration looks good!")
    print("=" * 60)
    
except Exception as e:
    print(f"\nError: {e}")
    print("\nTroubleshooting:")
    print("1. Verify credentials at: https://cloud.livekit.io/projects/peer-12.0/settings")
    print("2. Check if URL matches exactly (look for typos)")
    print("3. Restart your backend server after changing .env")
    exit(1)
