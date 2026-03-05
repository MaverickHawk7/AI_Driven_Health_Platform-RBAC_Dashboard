import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { log } from "./index";

// Map of userId → Set of active WebSocket connections
const clients = new Map<number, Set<WebSocket>>();

let wss: WebSocketServer | null = null;

export function setupWebSocket(httpServer: Server, sessionParser: (req: IncomingMessage, opts: any, cb: (err?: any) => void) => void) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    // Only handle /ws path
    if (req.url !== "/ws") return;

    sessionParser(req, {} as any, (err?: any) => {
      if (err) {
        socket.destroy();
        return;
      }

      const session = (req as any).session;
      const passport = session?.passport;
      const userId = passport?.user;

      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss!.handleUpgrade(req, socket, head, (ws) => {
        wss!.emit("connection", ws, req, userId);
      });
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, userId: number) => {
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);
    log(`WebSocket connected: user ${userId} (${clients.get(userId)!.size} connections)`, "ws");

    ws.on("close", () => {
      const userConns = clients.get(userId);
      if (userConns) {
        userConns.delete(ws);
        if (userConns.size === 0) clients.delete(userId);
      }
    });

    ws.on("error", () => {
      ws.close();
    });
  });

  log("WebSocket server ready on /ws", "ws");
}

/**
 * Send a typed event to a specific user (all their connections).
 */
export function sendToUser(userId: number, event: { type: string; data?: any }) {
  const conns = clients.get(userId);
  if (!conns) return;

  const payload = JSON.stringify(event);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Broadcast an event to all connected users.
 */
export function broadcast(event: { type: string; data?: any }) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  for (const conns of clients.values()) {
    for (const ws of conns) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
