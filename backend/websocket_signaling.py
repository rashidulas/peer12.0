#!/usr/bin/env python3
"""
WebSocket signaling server for real multi-device P2P mesh networking
This enables devices on the same network to discover and connect to each other
"""

import asyncio
import json
import logging
import os
from typing import Dict, Set, Optional
import websockets
from websockets.server import WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSocketSignalingServer:
    def __init__(self, host="0.0.0.0", port=8765):
        self.host = host
        self.port = port
        self.rooms: Dict[str, Set[WebSocketServerProtocol]] = {}
        self.peer_info: Dict[WebSocketServerProtocol, dict] = {}
        self.offers: Dict[str, dict] = {}  # Store offers for WebRTC handshake
        self.answers: Dict[str, dict] = {}  # Store answers for WebRTC handshake
        self.ice_candidates: Dict[str, list] = {}  # Store ICE candidates
    
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
            "connected_at": asyncio.get_event_loop().time(),
            "ip_address": websocket.remote_address[0] if websocket.remote_address else "unknown"
        }
        
        logger.info(f"Peer {peer_id} joined room {room_id} from {self.peer_info[websocket]['ip_address']}")
        
        # Notify other peers in the room about new peer
        await self.notify_peers_in_room(room_id, {
            "type": "peer_joined",
            "peer_id": peer_id,
            "peer_count": len(self.rooms[room_id]),
            "ip_address": self.peer_info[websocket]['ip_address']
        }, exclude=websocket)
        
        # Send list of existing peers to new peer
        existing_peers = []
        for ws, info in self.peer_info.items():
            if ws in self.rooms[room_id] and ws != websocket:
                existing_peers.append({
                    "peer_id": info["peer_id"],
                    "ip_address": info["ip_address"]
                })
        
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
        
        # Clean up stored offers/answers/candidates
        if peer_id in self.offers:
            del self.offers[peer_id]
        if peer_id in self.answers:
            del self.answers[peer_id]
        if peer_id in self.ice_candidates:
            del self.ice_candidates[peer_id]
        
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
        
        # Create a copy of the set to avoid "Set changed size during iteration" error
        peers_to_notify = list(self.rooms[room_id])
        
        for websocket in peers_to_notify:
            if websocket == exclude:
                continue
            
            try:
                await websocket.send(message_str)
            except ConnectionClosed:
                disconnected.add(websocket)
        
        # Clean up disconnected peers
        for ws in disconnected:
            await self.unregister_peer(ws)
    
    async def handle_peer_message(self, websocket: WebSocketServerProtocol, message: dict):
        """Handle messages from peers"""
        message_type = message.get("type")
        peer_id = self.peer_info.get(websocket, {}).get("peer_id", "unknown")
        
        if message_type == "join":
            await self.register_peer(websocket, message)
        
        elif message_type == "offer":
            # Store and forward WebRTC offer
            target_peer = message.get("target")
            offer_data = message.get("offer")
            
            if target_peer and offer_data:
                self.offers[peer_id] = {
                    "offer": offer_data,
                    "target": target_peer,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
                await self.forward_to_peer(target_peer, {
                    "type": "offer",
                    "from": peer_id,
                    "offer": offer_data
                })
                logger.info(f"Forwarded offer from {peer_id} to {target_peer}")
        
        elif message_type == "answer":
            # Store and forward WebRTC answer
            target_peer = message.get("target")
            answer_data = message.get("answer")
            
            if target_peer and answer_data:
                self.answers[peer_id] = {
                    "answer": answer_data,
                    "target": target_peer,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
                await self.forward_to_peer(target_peer, {
                    "type": "answer",
                    "from": peer_id,
                    "answer": answer_data
                })
                logger.info(f"Forwarded answer from {peer_id} to {target_peer}")
        
        elif message_type == "ice_candidate":
            # Store and forward ICE candidate
            target_peer = message.get("target")
            candidate_data = message.get("candidate")
            
            if target_peer and candidate_data:
                if peer_id not in self.ice_candidates:
                    self.ice_candidates[peer_id] = []
                self.ice_candidates[peer_id].append({
                    "candidate": candidate_data,
                    "target": target_peer,
                    "timestamp": asyncio.get_event_loop().time()
                })
                
                await self.forward_to_peer(target_peer, {
                    "type": "ice_candidate",
                    "from": peer_id,
                    "candidate": candidate_data
                })
                logger.info(f"Forwarded ICE candidate from {peer_id} to {target_peer}")
        
        elif message_type == "ping":
            # Respond to ping
            await websocket.send(json.dumps({
                "type": "pong",
                "timestamp": asyncio.get_event_loop().time()
            }))
        
        elif message_type == "get_offers":
            # Send stored offers for this peer
            target_peer = message.get("target")
            if target_peer and target_peer in self.offers:
                await websocket.send(json.dumps({
                    "type": "stored_offer",
                    "offer": self.offers[target_peer]["offer"],
                    "from": target_peer
                }))
        
        elif message_type == "get_answers":
            # Send stored answers for this peer
            target_peer = message.get("target")
            if target_peer and target_peer in self.answers:
                await websocket.send(json.dumps({
                    "type": "stored_answer",
                    "answer": self.answers[target_peer]["answer"],
                    "from": target_peer
                }))
        
        elif message_type == "get_ice_candidates":
            # Send stored ICE candidates for this peer
            target_peer = message.get("target")
            if target_peer and target_peer in self.ice_candidates:
                await websocket.send(json.dumps({
                    "type": "stored_ice_candidates",
                    "candidates": self.ice_candidates[target_peer],
                    "from": target_peer
                }))
    
    async def forward_to_peer(self, target_peer_id: str, message: dict):
        """Forward message to specific peer"""
        for websocket, info in self.peer_info.items():
            if info["peer_id"] == target_peer_id:
                try:
                    await websocket.send(json.dumps(message))
                    return True
                except ConnectionClosed:
                    await self.unregister_peer(websocket)
                break
        return False
    
    async def handle_client(self, websocket: WebSocketServerProtocol):
        """Handle new client connection"""
        client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
        logger.info(f"New client connected from {client_ip}")
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_peer_message(websocket, data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from {client_ip}: {message}")
                except Exception as e:
                    logger.error(f"Error handling message from {client_ip}: {e}")
        
        except ConnectionClosed:
            logger.info(f"Client disconnected: {client_ip}")
        finally:
            await self.unregister_peer(websocket)

async def main():
    """Start the WebSocket signaling server"""
    server = WebSocketSignalingServer()
    
    logger.info(f"Starting P2P WebSocket signaling server on ws://{server.host}:{server.port}")
    logger.info("This enables real multi-device P2P mesh networking!")
    
    async with websockets.serve(server.handle_client, server.host, server.port):
        logger.info("WebSocket signaling server running...")
        logger.info("Devices can now discover and connect to each other!")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down WebSocket signaling server...")
