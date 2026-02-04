import { Outlet } from "@tanstack/react-router";
import { Layout } from "../components/Layout.js";
import { OrgProvider } from "../components/OrgProvider.js";

export function RootLayout() {
  return (
    <OrgProvider>
      <Layout>
        <Outlet />
      </Layout>
    </OrgProvider>
  );
}
