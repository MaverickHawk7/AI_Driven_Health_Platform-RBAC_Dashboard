import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useWebSocket(userId: number | undefined) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!userId) return;

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "new_message") {
            // Refresh inbox and unread count immediately
            queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.messages.unread.path] });
          }

          if (msg.type === "message_status") {
            // Refresh sent messages
            queryClient.invalidateQueries({ queryKey: [api.messages.sent.path] });
            queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.messages.unread.path] });
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Reconnect after 3 seconds
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userId, queryClient]);
}
