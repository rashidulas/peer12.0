#!/usr/bin/env python3
"""
Simple WebSocket signaling server for P2P mesh network peer discovery
This helps peers find each other without needing external services
"""

import asyncio
import json
import logging
from typing import Dict, Set
import websockets
from websockets.server import WebSocketServerProtocol

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SignalingServer:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocketServerProtocol]] = {}
        self.peer_info: Dict[WebSocketServerProtocol, dict] = {}
    
    async def register_peer(self, websocket: WebSocketServerProtocol, peer_data: dict):
        """Register a new peer in a room"""
        room_id = peer_data.get("room", "default")
        peer_id = peer_data.get("peer_id", f"peer-{id(websocket)}")
        
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        
        self.rooms[room_id].add(websocket)
        self.peer_info[websocket] = {
            "peer_id": peer_id,
            "room": room_id,
            "connected_at": asyncio.get_event_loop().time()
        }
        
        logger.info(f"Peer {peer_id} joined room {room_id}")
        
        # Notify other peers in the room
        await self.notify_peers_in_room(room_id, {
            "type": "peer_joined",
            "peer_id": peer_id,
            "peer_count": len(self.rooms[room_id])
        }, exclude=websocket)
        
        # Send list of existing peers to new peer
        existing_peers = [
            info["peer_id"] for ws, info in self.peer_info.items()
            if ws in self.rooms[room_id] and ws != websocket
        ]
        
        await websocket.send(json.dumps({
            "type": "peer_list",
            "peers": existing_peers,
            "peer_count": len(self.rooms[room_id])
        }))
    
    async def unregister_peer(self, websocket: WebSocketServerProtocol):
        """Unregister a peer"""
        if websocket not in self.peer_info:
            return
        
        peer_info = self.peer_info[websocket]
        room_id = peer_info["room"]
        peer_id = peer_info["peer_id"]
        
        # Remove from room
        if room_id in self.rooms:
            self.rooms[room_id].discard(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        
        # Remove peer info
        del self.peer_info[websocket]
        
        logger.info(f"Peer {peer_id} left room {room_id}")
        
        # Notify other peers
        await self.notify_peers_in_room(room_id, {
            "type": "peer_left",
            "peer_id": peer_id,
            "peer_count": len(self.rooms.get(room_id, set()))
        })
    
    async def notify_peers_in_room(self, room_id: str, message: dict, exclude: WebSocketServerProtocol = None):
        """Send message to all peers in a room"""
        if room_id not in self.rooms:
            return
        
        message_str = json.dumps(message)
        disconnected = set()
        
        for websocket in self.rooms[room_id]:
            if websocket == exclude:
                continue
            
            try:
                await websocket.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
        
        # Clean up disconnected peers
        for ws in disconnected:
            await self.unregister_peer(ws)
    
    async def handle_peer_message(self, websocket: WebSocketServerProtocol, message: dict):
        """Handle messages from peers"""
        message_type = message.get("type")
        
        if message_type == "join":
            await self.register_peer(websocket, message)
        
        elif message_type == "offer":
            # Forward WebRTC offer to target peer
            target_peer = message.get("target")
            if target_peer:
                await self.forward_to_peer(target_peer, {
                    "type": "offer",
                    "from": self.peer_info[websocket]["peer_id"],
                    "offer": message.get("offer")
                })
        
        elif message_type == "answer":
            # Forward WebRTC answer to target peer
            target_peer = message.get("target")
            if target_peer:
                await self.forward_to_peer(target_peer, {
                    "type": "answer",
                    "from": self.peer_info[websocket]["peer_id"],
                    "answer": message.get("answer")
                })
        
        elif message_type == "ice_candidate":
            # Forward ICE candidate to target peer
            target_peer = message.get("target")
            if target_peer:
                await self.forward_to_peer(target_peer, {
                    "type": "ice_candidate",
                    "from": self.peer_info[websocket]["peer_id"],
                    "candidate": message.get("candidate")
                })
        
        elif message_type == "ping":
            # Respond to ping
            await websocket.send(json.dumps({
                "type": "pong",
                "timestamp": asyncio.get_event_loop().time()
            }))
    
    async def forward_to_peer(self, target_peer_id: str, message: dict):
        """Forward message to specific peer"""
        for websocket, info in self.peer_info.items():
            if info["peer_id"] == target_peer_id:
                try:
                    await websocket.send(json.dumps(message))
                    return
                except websockets.exceptions.ConnectionClosed:
                    await self.unregister_peer(websocket)
                break
    
    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Handle new client connection"""
        logger.info(f"New client connected: {websocket.remote_address}")
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_peer_message(websocket, data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from {websocket.remote_address}: {message}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
        
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {websocket.remote_address}")
        finally:
            await self.unregister_peer(websocket)

async def main():
    """Start the signaling server"""
    server = SignalingServer()
    
    logger.info("Starting P2P signaling server on ws://localhost:8765")
    
    async with websockets.serve(server.handle_client, "localhost", 8765):
        logger.info("Signaling server running...")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down signaling server...")
