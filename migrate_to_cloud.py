#!/usr/bin/env python3
"""
Migrate local Chroma data to Chroma Cloud
"""
import os
import sys
import chromadb
from chromadb.config import Settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_to_cloud():
    """Migrate local Chroma data to cloud"""
    
    # Check if cloud credentials are set
    chroma_api_key = os.getenv("CHROMA_API_KEY")
    chroma_host = os.getenv("CHROMA_HOST", "https://api.trychroma.com")
    
    if not chroma_api_key:
        logger.error("CHROMA_API_KEY environment variable not set!")
        logger.info("Please set your Chroma Cloud API key:")
        logger.info("export CHROMA_API_KEY=your_api_key_here")
        return False
    
    try:
        # Connect to local Chroma
        logger.info("Connecting to local Chroma...")
        local_client = chromadb.PersistentClient(path="./chroma_data")
        
        # Connect to Chroma Cloud
        logger.info("Connecting to Chroma Cloud...")
        cloud_client = chromadb.HttpClient(
            host=chroma_host,
            port=443,
            settings=chromadb.Settings(
                chroma_api_impl="chromadb.api.fastapi.FastAPI",
                chroma_server_host=chroma_host,
                chroma_server_http_port=443,
                chroma_server_ssl_enabled=True
            )
        )
        # Set the API key for authentication
        cloud_client._api_key = chroma_api_key
        
        # Get local collection
        try:
            local_collection = local_client.get_collection("network_health")
            local_count = local_collection.count()
            logger.info(f"Found {local_count} records in local collection")
        except Exception as e:
            logger.error(f"Could not access local collection: {e}")
            return False
        
        if local_count == 0:
            logger.info("No data to migrate")
            return True
        
        # Get or create cloud collection
        cloud_collection = cloud_client.get_or_create_collection(
            name="network_health",
            metadata={"description": "Network telemetry embeddings for zone clustering"}
        )
        
        # Get all data from local collection
        logger.info("Fetching data from local collection...")
        results = local_collection.get(include=["embeddings", "metadatas", "documents"])
        
        if not results or not results.get('ids'):
            logger.info("No data found in local collection")
            return True
        
        # Upload to cloud in batches
        batch_size = 100
        total_records = len(results['ids'])
        logger.info(f"Migrating {total_records} records to cloud...")
        
        for i in range(0, total_records, batch_size):
            batch_end = min(i + batch_size, total_records)
            batch_ids = results['ids'][i:batch_end]
            batch_embeddings = results['embeddings'][i:batch_end]
            batch_metadatas = results['metadatas'][i:batch_end]
            batch_documents = results['documents'][i:batch_end]
            
            cloud_collection.add(
                ids=batch_ids,
                embeddings=batch_embeddings,
                metadatas=batch_metadatas,
                documents=batch_documents
            )
            
            logger.info(f"Migrated batch {i//batch_size + 1}: {batch_end - i} records")
        
        # Verify migration
        cloud_count = cloud_collection.count()
        logger.info(f"Migration complete! Cloud collection now has {cloud_count} records")
        
        if cloud_count == local_count:
            logger.info("✅ Migration successful - all records transferred")
        else:
            logger.warning(f"⚠️ Record count mismatch: local={local_count}, cloud={cloud_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = migrate_to_cloud()
    sys.exit(0 if success else 1)
