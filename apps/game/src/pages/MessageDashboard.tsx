import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface MessageData {
  id: string;
  fromAgentName: string;
  toAgentName: string;
  subject: string;
  body: string;
  type: string;
  status: string;
  category: string;
  summary: string;
  createdAt: string;
}

interface Stats {
  totalMessages: number;
  messagesByCategory: Record<string, number>;
  messagesByType: Record<string, number>;
  messagesByStatus: Record<string, number>;
  agentStats: Record<
    string,
    { sent: number; received: number; categories: Record<string, number> }
  >;
  dateRange: {
    earliest: number;
    latest: number;
  };
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
];

export function MessageDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState<
    Array<{ date: string; count: number }>
  >([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statsRes = await fetch("/api/messages/stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      const messagesRes = await fetch("/api/messages/all");
      const messagesData = await messagesRes.json();
      setMessages(messagesData);

      // Generate timeline data (hourly)
      generateTimeline(messagesData);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setLoading(false);
    }
  };

  const generateTimeline = (msgs: MessageData[]) => {
    const timeline: Record<string, number> = {};

    msgs.forEach((msg) => {
      const date = new Date(msg.createdAt);
      const key = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      timeline[key] = (timeline[key] || 0) + 1;
    });

    const sorted = Object.entries(timeline)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, count }))
      .slice(-30); // Last 30 days

    setTimelineData(sorted);
  };

  if (loading || !stats) {
    return <div className="p-8">Loading message analytics...</div>;
  }

  const categoryData = Object.entries(stats.messagesByCategory).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  const statusData = Object.entries(stats.messagesByStatus).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  const agentData = Object.entries(stats.agentStats)
    .map(([name, data]) => ({
      name,
      sent: data.sent,
      received: data.received,
      total: data.sent + data.received,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Communication matrix (agent heatmap)
  const agentNames = Object.keys(stats.agentStats)
    .sort(
      (a, b) =>
        (stats.agentStats[b].sent + stats.agentStats[b].received) -
        (stats.agentStats[a].sent + stats.agentStats[a].received)
    )
    .slice(0, 8);

  const communicationMatrix: Record<string, Record<string, number>> = {};
  agentNames.forEach((agent) => {
    communicationMatrix[agent] = {};
    agentNames.forEach((target) => {
      communicationMatrix[agent][target] = 0;
    });
  });

  messages.forEach((msg) => {
    if (
      communicationMatrix[msg.fromAgentName] &&
      communicationMatrix[msg.fromAgentName][msg.toAgentName] !== undefined
    ) {
      communicationMatrix[msg.fromAgentName][msg.toAgentName]++;
    }
  });

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Message Analytics Dashboard
          </h1>
          <p className="text-slate-300">
            Analysis of {stats.totalMessages.toLocaleString()} messages across{" "}
            {Object.keys(stats.agentStats).length} agents
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-slate-400 text-sm mb-2">Total Messages</div>
            <div className="text-3xl font-bold text-white">
              {stats.totalMessages.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-slate-400 text-sm mb-2">Active Agents</div>
            <div className="text-3xl font-bold text-white">
              {Object.keys(stats.agentStats).length}
            </div>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-slate-400 text-sm mb-2">Read Rate</div>
            <div className="text-3xl font-bold text-white">
              {(
                ((stats.messagesByStatus.read || 0) / stats.totalMessages) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-slate-400 text-sm mb-2">Most Common</div>
            <div className="text-2xl font-bold text-white">
              {
                Object.entries(stats.messagesByCategory).sort(
                  (a, b) => b[1] - a[1]
                )[0][0]
              }
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Message Timeline */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <h2 className="text-xl font-semibold text-white mb-4">
              Message Timeline (Last 30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <h2 className="text-xl font-semibold text-white mb-4">
              Messages by Category
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name}: ${((value / stats.totalMessages) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Agents */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 col-span-1">
            <h2 className="text-xl font-semibold text-white mb-4">
              Top Agents by Volume
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="sent" stackId="a" fill="#8884d8" />
                <Bar dataKey="received" stackId="a" fill="#82ca9d" />
                <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Message Status */}
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 col-span-1">
            <h2 className="text-xl font-semibold text-white mb-4">
              Message Status
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="value" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Communication Heatmap */}
        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
          <h2 className="text-xl font-semibold text-white mb-4">
            Agent Communication Matrix (Top 8 Agents)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left p-3 text-slate-300">From / To</th>
                  {agentNames.map((name) => (
                    <th key={name} className="text-center p-3 text-slate-300">
                      <div className="max-w-16 truncate text-xs">{name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentNames.map((fromAgent) => (
                  <tr key={fromAgent} className="border-b border-slate-600">
                    <td className="p-3 text-slate-300 font-semibold text-xs max-w-40 truncate">
                      {fromAgent}
                    </td>
                    {agentNames.map((toAgent) => {
                      const count = communicationMatrix[fromAgent][toAgent];
                      const maxCount = Math.max(
                        ...Object.values(communicationMatrix).flatMap((row) =>
                          Object.values(row)
                        )
                      );
                      const intensity = maxCount > 0 ? count / maxCount : 0;
                      const bgColor = `rgba(136, 132, 216, ${intensity * 0.8})`;

                      return (
                        <td
                          key={`${fromAgent}-${toAgent}`}
                          className="text-center p-2"
                          style={{ backgroundColor: bgColor }}
                        >
                          <span className="text-slate-100 text-xs font-semibold">
                            {count}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Export Info */}
        <div className="mt-8 bg-slate-700 rounded-lg p-6 border border-slate-600">
          <h2 className="text-xl font-semibold text-white mb-2">
            Data Export Available
          </h2>
          <p className="text-slate-300 mb-4">
            Full analysis data has been exported to the following files in the
            project root:
          </p>
          <ul className="text-slate-300 space-y-2 text-sm font-mono">
            <li>
              📊 <span className="text-blue-400">messages-analysis.csv</span> -
              Categorized messages for spreadsheet analysis
            </li>
            <li>
              📈 <span className="text-blue-400">messages-data.json</span> -
              Complete message data with categorization
            </li>
            <li>
              📉 <span className="text-blue-400">messages-stats.json</span> -
              Aggregated statistics and summaries
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
