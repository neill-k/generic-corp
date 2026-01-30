import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket.js";

export function useSocketEvent<T>(event: string, handler: (data: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const callback = (data: T) => handlerRef.current(data);

    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, [event]);
}
