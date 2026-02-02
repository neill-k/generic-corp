import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/chat/Chat";
import ChatConversation from "./pages/chat/ChatConversation";
import OrgChart from "./pages/org-chart/OrgChart";
import OrgChartAgentDetail from "./pages/org-chart/OrgChartAgentDetail";
import OrgChartStatus from "./pages/org-chart/OrgChartStatus";
import OrgChartTaskHistory from "./pages/org-chart/OrgChartTaskHistory";
import OrgChartContext from "./pages/org-chart/OrgChartContext";
import OrgChartMessage from "./pages/org-chart/OrgChartMessage";
import OrgChartConfig from "./pages/org-chart/OrgChartConfig";
import Board from "./pages/Board";
import Settings from "./pages/settings/Settings";
import SettingsSkills from "./pages/settings/SettingsSkills";
import SettingsMcpServers from "./pages/settings/SettingsMcpServers";
import SettingsAgents from "./pages/settings/SettingsAgents";
import SettingsBilling from "./pages/settings/SettingsBilling";
import SettingsSecurity from "./pages/settings/SettingsSecurity";
import SettingsNotifications from "./pages/settings/SettingsNotifications";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/chat/conversation" element={<ChatConversation />} />
      <Route path="/org-chart" element={<OrgChart />} />
      <Route path="/org-chart/agent" element={<OrgChartAgentDetail />} />
      <Route path="/org-chart/agent/status" element={<OrgChartStatus />} />
      <Route path="/org-chart/agent/tasks" element={<OrgChartTaskHistory />} />
      <Route path="/org-chart/agent/context" element={<OrgChartContext />} />
      <Route path="/org-chart/agent/messages" element={<OrgChartMessage />} />
      <Route path="/org-chart/agent/config" element={<OrgChartConfig />} />
      <Route path="/board" element={<Board />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/skills" element={<SettingsSkills />} />
      <Route path="/settings/mcp-servers" element={<SettingsMcpServers />} />
      <Route path="/settings/agents" element={<SettingsAgents />} />
      <Route path="/settings/billing" element={<SettingsBilling />} />
      <Route path="/settings/security" element={<SettingsSecurity />} />
      <Route path="/settings/notifications" element={<SettingsNotifications />} />
    </Routes>
  );
}
