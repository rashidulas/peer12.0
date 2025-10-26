"""
Chroma Vector Store for Network Health Tracking
Stores telemetry as embeddings for similarity search and zone clustering
"""
import chromadb
from chromadb.config import Settings
import json
import logging
from typing import List, Dict, Any
import datetime as dt

logger = logging.getLogger("NetAgent")

class NetworkHealthStore:
    def __init__(self, persist_directory: str = "./chroma_data", use_cloud: bool = False):
        """Initialize Chroma client and collection"""
        try:
            if use_cloud:
                # Use Chroma Cloud
                import os
                chroma_api_key = os.getenv("CHROMA_API_KEY")
                chroma_host = os.getenv("CHROMA_HOST", "https://api.trychroma.com")
                
                if not chroma_api_key:
                    logger.warning("CHROMA_API_KEY not found, falling back to local")
                    self.client = chromadb.PersistentClient(path=persist_directory)
                else:
                    # Use Chroma Cloud with proper authentication
                    try:
                        # Set required environment variables for Chroma Cloud
                        import os
                        os.environ["CHROMA_API_KEY"] = chroma_api_key
                        os.environ["CHROMA_CLIENT_TYPE"] = "cloud"
                        os.environ["CHROMA_TENANT"] = "atiqur_ar_9575"  # Your tenant ID from dashboard
                        os.environ["CHROMA_DATABASE"] = "peer-12.0"  # Database name from your dashboard
                        
                        # Use the simple HttpClient for Chroma Cloud
                        self.client = chromadb.HttpClient(
                            host=chroma_host,
                            port=443,
                            settings=chromadb.Settings(
                                chroma_api_impl="chromadb.api.fastapi.FastAPI",
                                chroma_server_host=chroma_host,
                                chroma_server_http_port=443,
                                chroma_server_ssl_enabled=True
                            )
                        )
                        logger.info(f"Connected to Chroma Cloud at {chroma_host}:443")
                    except Exception as cloud_error:
                        logger.warning(f"Chroma Cloud connection failed: {cloud_error}, falling back to local")
                        self.client = chromadb.PersistentClient(path=persist_directory)
            else:
                # Use local PersistentClient
                self.client = chromadb.PersistentClient(path=persist_directory)
            
            # Get or create collection for network health
            self.collection = self.client.get_or_create_collection(
                name="network_health",
                metadata={"description": "Network telemetry embeddings for zone clustering"}
            )
            count = self.collection.count() if callable(self.collection.count) else self.collection.count
            logger.info(f"Chroma initialized: {count} existing records")
        except Exception as e:
            logger.error(f"Failed to initialize Chroma: {e}")
            self.client = None
            self.collection = None
    
    def add_telemetry(self, device_id: str, latency: float, packet_loss: float, metadata: Dict[str, Any] = None):
        """Add telemetry snapshot as a vector"""
        if not self.collection:
            return False
        
        try:
            # Create a simple embedding: [latency_normalized, packet_loss_normalized, timestamp_factor]
            # Normalize to 0-1 range for better clustering
            latency_norm = min(latency / 1000.0, 1.0)  # Normalize latency (0-1000ms → 0-1)
            packet_loss_norm = min(packet_loss, 1.0)   # Already 0-1
            
            # Time factor for temporal clustering (hour of day: 0-1)
            now = dt.datetime.utcnow()
            time_factor = (now.hour * 60 + now.minute) / 1440.0  # 0-1 for time of day
            
            # Simple 3D embedding
            embedding = [latency_norm, packet_loss_norm, time_factor]
            
            # Metadata for filtering and display
            meta = {
                "device_id": device_id,
                "latency": latency,
                "packet_loss": packet_loss,
                "timestamp": now.isoformat(),
                "health_score": self._calculate_health_score(latency, packet_loss)
            }
            if metadata:
                meta.update(metadata)
            
            # Generate unique ID
            doc_id = f"{device_id}_{now.timestamp()}"
            
            # Add to collection
            self.collection.add(
                embeddings=[embedding],
                documents=[json.dumps(meta)],
                metadatas=[meta],
                ids=[doc_id]
            )
            
            logger.debug(f"Added telemetry to Chroma: {device_id} (total: {self.collection.count()})")
            return True
        except Exception as e:
            logger.error(f"Failed to add telemetry to Chroma: {e}")
            return False
    
    def get_health_zones(self, num_zones: int = 10) -> List[Dict[str, Any]]:
        """Get recent health zones for heatmap visualization"""
        if not self.collection:
            return []
        
        try:
            count = self.collection.count() if callable(self.collection.count) else self.collection.count
            if count == 0:
                return []
            
            # Use query with a "center" embedding to get diverse results
            center_embedding = [0.3, 0.05, 0.5]  # Mid-range health
            
            results = self.collection.query(
                query_embeddings=[center_embedding],
                n_results=min(num_zones, count),
                include=["metadatas", "embeddings"]
            )
            
            logger.info(f"Query results keys: {results.keys() if results else 'None'}")
            
            if not results:
                logger.warning("Chroma query returned None")
                return []
            
            # Chroma query returns nested lists: {'metadatas': [[{...}, {...}]], 'embeddings': [[[...], [...]]]}
            metadatas = results.get('metadatas', [[]])[0] if results.get('metadatas') else []
            embeddings = results.get('embeddings', [[]])[0] if results.get('embeddings') else []
            
            logger.info(f"Metadatas type: {type(metadatas)}, length: {len(metadatas) if metadatas else 0}")
            
            if not metadatas:
                logger.warning(f"Chroma has {count} items but query returned no metadatas")
                return []
            
            zones = []
            for i, metadata in enumerate(metadatas):
                # Safely get embedding (check length, not truthiness - numpy arrays fail on 'if array')
                embedding = [0, 0, 0]
                if len(embeddings) > 0 and i < len(embeddings):
                    emb = embeddings[i]
                    if hasattr(emb, 'tolist'):
                        embedding = emb.tolist()
                    elif isinstance(emb, list):
                        embedding = emb
                
                zones.append({
                    "device_id": metadata.get("device_id", "unknown"),
                    "latency": float(metadata.get("latency", 0)),
                    "packet_loss": float(metadata.get("packet_loss", 0)),
                    "health_score": float(metadata.get("health_score", 100)),
                    "timestamp": metadata.get("timestamp", ""),
                    "embedding": embedding,
                    "color": self._get_health_color(float(metadata.get("health_score", 100))),
                    "location": metadata.get("location"),
                    "ssid": metadata.get("ssid"),
                    "bssid": metadata.get("bssid")
                })
            
            logger.info(f"Returning {len(zones)} health zones from Chroma")
            return zones
        except Exception as e:
            logger.error(f"Failed to query health zones: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def find_similar_conditions(self, latency: float, packet_loss: float, n_results: int = 5) -> List[Dict[str, Any]]:
        """Find devices with similar network conditions using vector similarity"""
        if not self.collection:
            return []
        
        try:
            # Create query embedding
            latency_norm = min(latency / 1000.0, 1.0)
            packet_loss_norm = min(packet_loss, 1.0)
            now = dt.datetime.utcnow()
            time_factor = (now.hour * 60 + now.minute) / 1440.0
            
            query_embedding = [latency_norm, packet_loss_norm, time_factor]
            
            # Query similar vectors
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=["metadatas", "distances"]
            )
            
            if not results or not results['metadatas']:
                return []
            
            similar = []
            for i, metadata in enumerate(results['metadatas'][0]):
                distance = results['distances'][0][i] if results['distances'] else 0
                
                similar.append({
                    "device_id": metadata.get("device_id", "unknown"),
                    "latency": metadata.get("latency", 0),
                    "packet_loss": metadata.get("packet_loss", 0),
                    "health_score": metadata.get("health_score", 100),
                    "similarity": 1.0 - min(distance, 1.0)  # Convert distance to similarity
                })
            
            return similar
        except Exception as e:
            logger.error(f"Failed to find similar conditions: {e}")
            return []
    
    def _calculate_health_score(self, latency: float, packet_loss: float) -> float:
        """Calculate health score (0-100) based on latency and packet loss"""
        # Perfect: 100, Critical: 0
        latency_score = max(0, 100 - (latency / 10))  # 1000ms = 0 score
        packet_loss_score = max(0, 100 - (packet_loss * 500))  # 20% loss = 0 score
        
        # Weighted average (latency 60%, packet loss 40%)
        return (latency_score * 0.6 + packet_loss_score * 0.4)
    
    def _get_health_color(self, health_score: float) -> str:
        """Convert health score to hex color (red → yellow → green)"""
        if health_score >= 80:
            return "#22c55e"  # Green
        elif health_score >= 60:
            return "#84cc16"  # Light green
        elif health_score >= 40:
            return "#eab308"  # Yellow
        elif health_score >= 20:
            return "#f97316"  # Orange
        else:
            return "#ef4444"  # Red
    
    def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        if not self.collection:
            return {"status": "disabled", "count": 0}
        
        try:
            count = self.collection.count() if callable(self.collection.count) else self.collection.count
            return {
                "status": "active",
                "count": count,
                "name": self.collection.name
            }
        except Exception as e:
            logger.error(f"Failed to get Chroma stats: {e}")
            return {"status": "error", "error": str(e)}


# Global instance - set use_cloud=True to use Chroma Cloud
chroma_store = NetworkHealthStore(use_cloud=True)

