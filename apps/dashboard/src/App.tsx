import { useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { router } from "./router.js";
import { queryClient } from "./lib/query-client.js";
import { getSocket } from "./lib/socket.js";
import { useSocketStore } from "./store/socket-store.js";

export function App() {
  const setConnected = useSocketStore((s) => s.setConnected);

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [setConnected]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
