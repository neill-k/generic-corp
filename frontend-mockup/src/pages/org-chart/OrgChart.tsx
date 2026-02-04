import AppLayout from "../../components/AppLayout";
import { ChevronDown, ChevronRight, Locate, PanelLeftClose, Plus, Minus, Maximize } from "lucide-react";

const treeItems = [
  { name: "Sarah Chen", role: "CEO", color: "var(--red-primary)", level: 0, expanded: true, isParent: true, fontWeight: "600" },
  { name: "Marcus Rivera", role: undefined, color: "#4CAF50", level: 1, expanded: true, isParent: true, fontWeight: "500" },
  { name: "Emily Park", role: undefined, color: "#4CAF50", level: 2, expanded: false, isParent: false, fontWeight: "normal" },
  { name: "Jake Morrison", role: undefined, color: "#FF9800", level: 2, expanded: false, isParent: false, fontWeight: "normal" },
  { name: "Priya Sharma", role: undefined, color: "#4CAF50", level: 1, expanded: false, isParent: true, fontWeight: "500" },
  { name: "David Kim", role: undefined, color: "#4CAF50", level: 1, expanded: false, isParent: true, fontWeight: "500" },
];

function OrgNodeCard({
  initials,
  name,
  role,
  statusColor,
  avatarBg,
  avatarSize = 36,
  fontSize = 13,
  initFontSize = 12,
  isCeo = false,
  width = 240,
}: {
  initials: string;
  name: string;
  role: string;
  statusColor: string;
  avatarBg: string;
  avatarSize?: number;
  fontSize?: number;
  initFontSize?: number;
  isCeo?: boolean;
  width?: number;
}) {
  return (
    <div
      className="flex items-center bg-white"
      style={{
        width,
        height: isCeo ? 72 : 68,
        borderRadius: 10,
        padding: "0 " + (isCeo ? 20 : 16) + "px",
        gap: isCeo ? 16 : 14,
        border: isCeo ? "2px solid var(--red-primary)" : "1px solid var(--border-light)",
        boxShadow: isCeo
          ? "0 2px 12px rgba(0,0,0,0.063)"
          : "0 2px 8px rgba(0,0,0,0.031)",
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize,
          backgroundColor: avatarBg,
        }}
      >
        <span className="text-white font-semibold font-ui" style={{ fontSize: initFontSize }}>
          {initials}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span
          className="font-ui truncate"
          style={{
            fontSize,
            fontWeight: isCeo ? 600 : 500,
            color: "var(--black-primary)",
          }}
        >
          {name}
        </span>
        <span className="font-mono text-[10px] text-[var(--gray-500)]">{role}</span>
      </div>
      <div
        className="rounded-full shrink-0"
        style={{
          width: 8,
          height: 8,
          backgroundColor: statusColor,
        }}
      />
    </div>
  );
}

function LeafNodeCard({
  initials,
  name,
  role,
  statusColor,
}: {
  initials: string;
  name: string;
  role: string;
  statusColor: string;
}) {
  return (
    <div
      className="flex items-center bg-white"
      style={{
        width: 220,
        height: 64,
        borderRadius: 10,
        padding: "0 14px",
        gap: 12,
        border: "1px solid var(--border-light)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.024)",
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 rounded-full"
        style={{ width: 32, height: 32, backgroundColor: "#E8E8E8" }}
      >
        <span className="font-ui text-[11px] font-semibold text-[var(--gray-600)]">
          {initials}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-ui text-xs font-medium text-[var(--black-primary)] truncate">{name}</span>
        <span className="font-mono text-[9px] text-[var(--gray-500)]">{role}</span>
      </div>
      <div
        className="rounded-full shrink-0"
        style={{ width: 7, height: 7, backgroundColor: statusColor }}
      />
    </div>
  );
}

export default function OrgChart() {
  return (
    <AppLayout>
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center shrink-0 px-8"
          style={{
            height: 64,
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[var(--red-primary)]" />
            <h1 className="font-ui text-xl font-semibold text-[var(--black-primary)]">
              Org Chart
            </h1>
          </div>
        </div>

        {/* Body: Tree Panel + Flow Canvas */}
        <div className="flex flex-1 min-h-0">
          {/* Org Tree Panel */}
          <div
            className="flex flex-col shrink-0 h-full"
            style={{
              width: 240,
              borderRight: "1px solid var(--border-light)",
            }}
          >
            {/* Tree Header */}
            <div
              className="flex items-center justify-between shrink-0 px-5"
              style={{
                height: 48,
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <span className="font-ui text-[13px] font-medium text-[var(--gray-600)]">
                Org Tree
              </span>
              <PanelLeftClose size={16} className="text-[var(--gray-500)]" />
            </div>

            {/* Tree List */}
            <div className="flex-1 overflow-y-auto py-3">
              {treeItems.map((item, i) => {
                const paddingLeft = item.level === 0 ? 16 : item.level === 1 ? 36 : 60;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between w-full"
                    style={{
                      height: item.isParent ? 36 : 32,
                      paddingLeft,
                      paddingRight: 16,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {item.isParent && (
                        item.expanded ? (
                          <ChevronDown size={14} className="text-[var(--gray-500)]" />
                        ) : (
                          <ChevronRight size={14} className="text-[var(--gray-500)]" />
                        )
                      )}
                      <div
                        className="rounded-full"
                        style={{
                          width: item.isParent ? 6 : 5,
                          height: item.isParent ? 6 : 5,
                          backgroundColor: item.color,
                        }}
                      />
                      <span
                        className="font-ui text-xs"
                        style={{
                          fontWeight: item.fontWeight,
                          color: item.level === 2 ? "var(--gray-dark)" : "var(--black-primary)",
                        }}
                      >
                        {item.name}
                      </span>
                      {item.role && (
                        <span className="font-mono text-[10px] text-[var(--gray-500)]">
                          {item.role}
                        </span>
                      )}
                    </div>
                    <Locate size={14} className="text-[var(--gray-300)]" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flow Canvas */}
          <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: "#FAFAFA" }}>
            {/* Org Chart Nodes */}
            <div className="absolute inset-0">
              {/* CEO Node */}
              <div className="absolute" style={{ left: 350, top: 60 }}>
                <OrgNodeCard
                  initials="SC"
                  name="Sarah Chen"
                  role="Chief Executive Officer"
                  statusColor="var(--red-primary)"
                  avatarBg="var(--red-primary)"
                  avatarSize={40}
                  fontSize={13}
                  initFontSize={13}
                  isCeo
                  width={260}
                />
              </div>

              {/* Edge: CEO down */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 479, top: 134, width: 2, height: 48 }} />
              {/* Edge: Horizontal bar */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 179, top: 182, width: 600, height: 2 }} />
              {/* Edge: Down left */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 179, top: 182, width: 2, height: 58 }} />
              {/* Edge: Down center */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 479, top: 182, width: 2, height: 58 }} />
              {/* Edge: Down right */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 779, top: 182, width: 2, height: 58 }} />

              {/* VP Engineering */}
              <div className="absolute" style={{ left: 60, top: 240 }}>
                <OrgNodeCard
                  initials="MR"
                  name="Marcus Rivera"
                  role="VP Engineering"
                  statusColor="#4CAF50"
                  avatarBg="var(--black-primary)"
                />
              </div>

              {/* VP Product */}
              <div className="absolute" style={{ left: 360, top: 240 }}>
                <OrgNodeCard
                  initials="PS"
                  name="Priya Sharma"
                  role="VP Product"
                  statusColor="#4CAF50"
                  avatarBg="var(--black-primary)"
                />
              </div>

              {/* VP Operations */}
              <div className="absolute" style={{ left: 660, top: 240 }}>
                <OrgNodeCard
                  initials="DK"
                  name="David Kim"
                  role="VP Operations"
                  statusColor="#4CAF50"
                  avatarBg="var(--black-primary)"
                />
              </div>

              {/* Edges from VP Engineering */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 179, top: 308, width: 2, height: 30 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 109, top: 338, width: 120, height: 2 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 109, top: 338, width: 2, height: 92 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 229, top: 338, width: 2, height: 182 }} />

              {/* Edges from VP Product */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 479, top: 308, width: 2, height: 30 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 419, top: 338, width: 120, height: 2 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 419, top: 338, width: 2, height: 92 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 539, top: 338, width: 2, height: 182 }} />

              {/* Edges from VP Operations */}
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 779, top: 308, width: 2, height: 30 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 729, top: 338, width: 120, height: 2 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 729, top: 338, width: 2, height: 92 }} />
              <div className="absolute bg-[var(--gray-300)]" style={{ left: 849, top: 338, width: 2, height: 182 }} />

              {/* Leaf nodes - Engineering */}
              <div className="absolute" style={{ left: 0, top: 430 }}>
                <LeafNodeCard initials="EP" name="Emily Park" role="Sr. Engineer" statusColor="#4CAF50" />
              </div>
              <div className="absolute" style={{ left: 120, top: 520 }}>
                <LeafNodeCard initials="JM" name="Jake Morrison" role="Engineer" statusColor="#FF9800" />
              </div>

              {/* Leaf nodes - Product */}
              <div className="absolute" style={{ left: 310, top: 430 }}>
                <LeafNodeCard initials="AJ" name="Aisha Johnson" role="Product Manager" statusColor="#4CAF50" />
              </div>
              <div className="absolute" style={{ left: 430, top: 520 }}>
                <LeafNodeCard initials="TZ" name="Tom Zhang" role="Designer" statusColor="#4CAF50" />
              </div>

              {/* Leaf nodes - Operations */}
              <div className="absolute" style={{ left: 620, top: 430 }}>
                <LeafNodeCard initials="LN" name="Lisa Nguyen" role="Ops Lead" statusColor="#4CAF50" />
              </div>
              <div className="absolute" style={{ left: 740, top: 520 }}>
                <LeafNodeCard initials="RC" name="Ryan Cooper" role="Analyst" statusColor="#4CAF50" />
              </div>
            </div>

            {/* Zoom Controls */}
            <div
              className="absolute flex flex-col bg-white rounded-lg"
              style={{
                right: 60,
                top: 20,
                width: 36,
                border: "1px solid var(--border-light)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.063)",
              }}
            >
              <button
                className="flex items-center justify-center"
                style={{ height: 36, borderBottom: "1px solid var(--border-light)" }}
              >
                <Plus size={16} className="text-[var(--gray-600)]" />
              </button>
              <button
                className="flex items-center justify-center"
                style={{ height: 36, borderBottom: "1px solid var(--border-light)" }}
              >
                <Minus size={16} className="text-[var(--gray-600)]" />
              </button>
              <button className="flex items-center justify-center" style={{ height: 36 }}>
                <Maximize size={16} className="text-[var(--gray-600)]" />
              </button>
            </div>

            {/* Minimap */}
            <div
              className="absolute bg-white rounded-lg"
              style={{
                right: 164,
                bottom: 84,
                width: 140,
                height: 90,
                border: "1px solid var(--border-light)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.063)",
              }}
            >
              <div
                className="absolute"
                style={{
                  left: 20,
                  top: 10,
                  width: 80,
                  height: 50,
                  borderRadius: 2,
                  backgroundColor: "#E5393510",
                  border: "1px solid var(--red-primary)",
                }}
              />
              <div className="absolute rounded-full bg-[var(--gray-300)]" style={{ left: 55, top: 18, width: 4, height: 4 }} />
              <div className="absolute rounded-full bg-[var(--gray-300)]" style={{ left: 30, top: 38, width: 3, height: 3 }} />
              <div className="absolute rounded-full bg-[var(--gray-300)]" style={{ left: 55, top: 38, width: 3, height: 3 }} />
              <div className="absolute rounded-full bg-[var(--gray-300)]" style={{ left: 80, top: 38, width: 3, height: 3 }} />
            </div>

            {/* Canvas Info Bar */}
            <div
              className="absolute flex items-center bg-white rounded-md"
              style={{
                left: 20,
                bottom: 14,
                gap: 16,
                padding: "0 16px",
                height: 32,
                border: "1px solid var(--border-light)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.031)",
              }}
            >
              <span className="font-mono text-[10px] text-[var(--gray-500)]">9 nodes</span>
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--gray-300)]" />
              <span className="font-mono text-[10px] text-[var(--gray-500)]">8 edges</span>
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--gray-300)]" />
              <span className="font-mono text-[10px] text-[var(--gray-500)]">100%</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
