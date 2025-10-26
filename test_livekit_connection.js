#!/usr/bin/env node

// Simple test script to check LiveKit connection stability
const fetch = require("node-fetch");

async function testLiveKitConnection() {
  console.log("🧪 Testing LiveKit Connection Stability...\n");

  const apiBase = "http://127.0.0.1:8000";
  let connectionCount = 0;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < 10; i++) {
    try {
      console.log(`Test ${i + 1}/10: Requesting LiveKit token...`);

      const response = await fetch(
        `${apiBase}/token?identity=test-${Date.now()}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.url) {
          successCount++;
          console.log(`✅ Success: Got token and URL`);
        } else {
          errorCount++;
          console.log(`❌ Error: Missing token or URL in response`);
        }
      } else {
        errorCount++;
        console.log(`❌ Error: HTTP ${response.status}`);
      }

      connectionCount++;

      // Wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      errorCount++;
      console.log(`❌ Error: ${error.message}`);
    }
  }

  console.log("\n📊 Test Results:");
  console.log(`Total requests: ${connectionCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(
    `Success rate: ${((successCount / connectionCount) * 100).toFixed(1)}%`
  );

  if (successCount === connectionCount) {
    console.log("\n🎉 All tests passed! LiveKit token generation is stable.");
  } else {
    console.log("\n⚠️  Some tests failed. Check backend logs for issues.");
  }
}

// Run the test
testLiveKitConnection().catch(console.error);
