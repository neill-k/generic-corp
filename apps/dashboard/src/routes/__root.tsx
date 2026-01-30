import { Outlet } from "@tanstack/react-router";
import { Layout } from "../components/Layout.js";

export function RootLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
