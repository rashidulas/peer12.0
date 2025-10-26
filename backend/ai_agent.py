import os, json
import logging
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
logger = logging.getLogger("NetAgent")

# Optional Composio import
try:
    from composio import Composio
    COMPOSIO_AVAILABLE = True
except ImportError:
    COMPOSIO_AVAILABLE = False
    logger.warning("Composio SDK not available")

def analyze_logs():
    log_file = os.path.join(os.path.dirname(__file__), "telemetry_log.json")

    if not os.path.exists(log_file):
        return {"error": "No telemetry data yet. Please run the client first."}

    with open(log_file, "r") as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]

    if not lines:
        return {"error": "No telemetry entries found."}

    try:
        records = [json.loads(line) for line in lines[-20:]]
    except Exception as e:
        return {"error": f"Error parsing telemetry: {e}"}

    valid = [r for r in records if r["latency"] < 9000]
    avg_latency = sum(r["latency"] for r in valid) / len(valid) if valid else 9999
    avg_loss = sum(r["packetLoss"] for r in records) / len(records)

    prompt = f"""
    You are NetAgent analyzing real network telemetry.
    Average latency: {avg_latency:.2f} ms
    Average packet loss: {avg_loss:.2f}
    Predict if a connection drop is likely and give a one-sentence recommendation.
    """

    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    return {
        "avg_latency_ms": round(avg_latency, 2),
        "avg_packet_loss": round(avg_loss, 2),
        "claude_recommendation": msg.content[0].text.strip()
    }


def trigger_incident_response(alert_reason: str, telemetry_data: dict) -> dict:
    """
    Multi-step incident response workflow:
    1. Send email alert via Gmail
    2. Create Jira ticket for tracking
    3. Send Slack notification to team
    
    Args:
        alert_reason: Description of the alert/incident
        telemetry_data: Network telemetry data (latency, packet loss, etc.)
    
    Returns:
        dict: Results of each action (email, jira, slack)
    """
    if not COMPOSIO_AVAILABLE:
        return {"error": "Composio SDK not available"}
    
    # Get configuration from environment
    composio_api_key = os.getenv("COMPOSIO_API_KEY")
    composio_entity_id = os.getenv("COMPOSIO_ENTITY_ID", "netagent-default")
    alert_email_to = os.getenv("ALERT_EMAIL_TO")
    jira_project_key = os.getenv("JIRA_PROJECT_KEY", "NET")  # Default project key
    slack_channel = os.getenv("SLACK_CHANNEL", "#connectivity-alerts")  # Default channel
    
    if not composio_api_key:
        return {"error": "COMPOSIO_API_KEY not configured"}
    
    results = {
        "email": {"status": "skipped", "reason": "not configured"},
        "jira": {"status": "skipped", "reason": "not configured"},
        "slack": {"status": "skipped", "reason": "not configured"},
        "timestamp": telemetry_data.get("timestamp", "N/A")
    }
    
    try:
        composio_client = Composio(api_key=composio_api_key)
        
        # Extract telemetry details
        avg_latency = telemetry_data.get("avg_latency_ms", "N/A")
        avg_loss = telemetry_data.get("avg_packet_loss", "N/A")
        device_id = telemetry_data.get("deviceId", "unknown")
        location = telemetry_data.get("location", "N/A")
        
        # Incident details for all integrations
        incident_title = f"Network Alert: {alert_reason.split(':')[0]}"
        
        claude_rec = telemetry_data.get('claude_recommendation', '')
        
        incident_description = f"""
**Network Issue Detected**

**Alert Reason:** {alert_reason}

**Telemetry Data:**
- Average Latency: {avg_latency} ms
- Average Packet Loss: {avg_loss}%
- Device ID: {device_id}
- Location: {location}
- Timestamp: {telemetry_data.get('timestamp', 'N/A')}

**AI Recommendation:**
{claude_rec if claude_rec else 'Analysis pending...'}

**Action Required:**
Please investigate the network conditions and take corrective action if necessary.
"""
        
        # Step 1: Send Email Alert
        if alert_email_to:
            try:
                logger.info(f"Step 1/3: Sending email alert to {alert_email_to}...")
                email_result = composio_client.tools.execute(
                    slug="GMAIL_SEND_EMAIL",
                    arguments={
                        "recipient_email": alert_email_to,
                        "subject": incident_title,
                        "body": incident_description,
                    },
                    user_id=composio_entity_id,
                    dangerously_skip_version_check=True
                )
                
                results["email"] = {
                    "status": "success",
                    "recipient": alert_email_to,
                    "result": email_result
                }
                logger.info(f"✅ Email alert sent successfully")
                
            except Exception as e:
                logger.error(f"❌ Email alert failed: {e}")
                results["email"] = {
                    "status": "error",
                    "error": str(e)
                }
        
        # Step 2: Create Jira Ticket
        try:
            logger.info(f"Step 2/3: Creating Jira ticket in project {jira_project_key}...")
            
            # Try to create Jira ticket with common issue type
            # Note: If "Task" doesn't work, check your Jira project settings for available issue types
            issue_type = os.getenv("JIRA_ISSUE_TYPE", "Task")  # Most projects have "Task"
            
            jira_result = composio_client.tools.execute(
                slug="JIRA_CREATE_ISSUE",
                arguments={
                    "project_key": jira_project_key,
                    "summary": incident_title,
                    "description": incident_description,
                    "issue_type": issue_type,
                    "priority": "High" if avg_latency > 500 or avg_loss > 0.10 else "Medium"
                },
                user_id=composio_entity_id,
                dangerously_skip_version_check=True
            )
            
            # Extract ticket key and URL from result
            # Composio returns the data in a nested structure
            ticket_key = "N/A"
            ticket_url = "N/A"
            
            if isinstance(jira_result, dict):
                # Check if data exists in the response
                data = jira_result.get("data", {})
                if isinstance(data, dict):
                    ticket_key = data.get("key", "N/A")
                    # Use browser_url if available, otherwise construct it
                    ticket_url = data.get("browser_url", "N/A")
                    if ticket_url == "N/A" and ticket_key != "N/A":
                        # Fallback: construct URL from key
                        ticket_url = f"https://your-domain.atlassian.net/browse/{ticket_key}"
            
            results["jira"] = {
                "status": "success",
                "ticket_key": ticket_key,
                "ticket_url": ticket_url,
                "result": jira_result
            }
            logger.info(f"✅ Jira ticket created: {ticket_key}")
            
        except Exception as e:
            logger.error(f"❌ Jira ticket creation failed: {e}")
            results["jira"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Step 3: Send Slack Notification
        try:
            logger.info(f"Step 3/3: Sending Slack notification to {slack_channel}...")
            
            # Build Slack message with ticket link if available
            slack_message = f"""🚨 *{incident_title}*

*Alert:* {alert_reason}

*Metrics:*
• Latency: {avg_latency} ms
• Packet Loss: {avg_loss}%
• Device: {device_id}
• Location: {location}

*Status:* Investigating"""
            
            # Add Jira ticket link if created
            if results["jira"]["status"] == "success":
                ticket_key = results["jira"]["ticket_key"]
                ticket_url = results["jira"]["ticket_url"]
                slack_message += f"\n\n*Jira Ticket:* <{ticket_url}|{ticket_key}>"
            
            slack_result = composio_client.tools.execute(
                slug="SLACK_SEND_MESSAGE",
                arguments={
                    "channel": slack_channel,
                    "text": slack_message,
                },
                user_id=composio_entity_id,
                dangerously_skip_version_check=True
            )
            
            results["slack"] = {
                "status": "success",
                "channel": slack_channel,
                "result": slack_result
            }
            logger.info(f"✅ Slack notification sent successfully")
            
        except Exception as e:
            logger.error(f"❌ Slack notification failed: {e}")
            results["slack"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Summary
        success_count = sum(1 for r in [results["email"], results["jira"], results["slack"]] 
                          if r["status"] == "success")
        total_count = 3
        
        results["summary"] = {
            "success_count": success_count,
            "total_count": total_count,
            "success_rate": f"{success_count}/{total_count}",
            "message": f"Incident response completed: {success_count}/{total_count} actions successful"
        }
        
        logger.info(f"Incident response workflow completed: {success_count}/{total_count} successful")
        
    except Exception as e:
        logger.error(f"Incident response workflow failed: {e}")
        results["error"] = str(e)
    
    return results
