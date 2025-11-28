"use client";

import { Layout, Menu, Typography, Tag, message } from "antd";
import {
  DashboardOutlined,
  ExperimentOutlined,
  BulbOutlined,
  FileImageOutlined,
  DatabaseOutlined,
  FundOutlined,
  ProjectOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 뷰어가 접근하면 안 되는 페이지들
const ADMIN_ONLY_PATHS = ["/finance", "/assets", "/projects"];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<"admin" | "viewer" | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 로그인 여부 체크
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedRole = localStorage.getItem("role") as
      | "admin"
      | "viewer"
      | null;

    if (!storedRole) {
      setRole(null);
      setCheckingAuth(false);
      router.push("/login");
      return;
    }

    setRole(storedRole);
    setCheckingAuth(false);
  }, [router]);

  // 뷰어의 직접 주소 입력 접근 막기
  useEffect(() => {
    if (!role) return;
    if (role === "viewer" && ADMIN_ONLY_PATHS.includes(pathname)) {
      message.warning("뷰어 권한으로는 해당 페이지에 접근할 수 없습니다.");
      router.replace("/dashboard");
    }
  }, [role, pathname, router]);

  // 권한 확인 중이면 간단한 로딩
  if (checkingAuth) {
    return (
      <Layout
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text>접근 권한 확인 중…</Text>
      </Layout>
    );
  }

  // 로그인 안 됐으면 아무것도 렌더X (이미 /login으로 보냄)
  if (!role) {
    return null;
  }

  const selectedKey =
    pathname === "/" ? "/dashboard" : pathname.split("?")[0];

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "대시보드",
    },
    {
      key: "/research",
      icon: <ExperimentOutlined />,
      label: "연구 데이터",
    },
    {
      key: "/ip",
      icon: <BulbOutlined />,
      label: "인증/IP 현황",
    },
    {
      key: "/ir",
      icon: <FileImageOutlined />,
      label: "IR/마케팅 자료",
    },
    {
      key: "/finance",
      icon: <FundOutlined />,
      label: "재무 현황",
      adminOnly: true,
    },
    {
      key: "/assets",
      icon: <DatabaseOutlined />,
      label: "현물 현황",
      adminOnly: true,
    },
    {
      key: "/projects",
      icon: <ProjectOutlined />,
      label: "과제 현황",
      adminOnly: true,
    },
  ];

  // 뷰어도 메뉴는 보이되, adminOnly 메뉴는 회색(disabled)
  const antMenuItems = menuItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    disabled: role === "viewer" && item.adminOnly === true,
  }));

  const handleMenuClick = (key: string) => {
    const target = menuItems.find((m) => m.key === key);
    if (role === "viewer" && target?.adminOnly) {
      message.warning("뷰어 권한으로는 해당 메뉴에 접근할 수 없습니다.");
      return;
    }
    router.push(key);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("role");
    }
    router.push("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {/* 상단 타이틀 */}
        <div
          style={{
            height: 64,
            padding: collapsed ? "16px 8px" : "16px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            color: "white",
          }}
        >
          <Text strong style={{ color: "white", fontSize: 16 }}>
            {collapsed ? "통합" : "통합 관리 시스템"}
          </Text>
          {!collapsed && (
            <Text style={{ color: "#d9d9d9", fontSize: 12 }}>
              뷰어 {role === "viewer" ? "Viewer" : "Admin"}
            </Text>
          )}
        </div>

        {/* 메뉴 영역 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={antMenuItems}
          onClick={({ key }) => handleMenuClick(key as string)}
          style={{ flex: 1 }}
        />

        {/* 하단 로그아웃 버튼 */}
        <div
          style={{
            padding: collapsed ? "8px" : "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            onClick={handleLogout}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#ffffff",
              padding: collapsed ? "8px 10px" : "8px 12px",
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLDivElement).style.background =
                "rgba(255,255,255,0.12)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "none";
            }}
          >
            <LogoutOutlined />
            {!collapsed && <span>로그아웃</span>}
          </div>
        </div>
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Text strong>회사 통합 관리 시스템</Text>
          <Tag color={role === "admin" ? "purple" : "blue"}>
            {role === "admin" ? "관리자" : "뷰어"}
          </Tag>
        </Header>

        <Content style={{ padding: 24, background: "#f5f5f5" }}>
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              background: "#fff",
              padding: 24,
              borderRadius: 16,
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            {children}

            {/* 뷰어 안내 바 */}
            {role === "viewer" && (
              <div
                style={{
                  marginTop: 24,
                  padding: 12,
                  borderRadius: 8,
                  background: "#FFF7E6",
                  border: "1px solid #FFE7BA",
                  color: "#AD6800",
                  fontSize: 12,
                }}
              >
                일부 메뉴는 뷰어 권한으로 접근이 제한됩니다. 전체 데이터
                접근이 필요한 경우 관리자에게 문의하세요.
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
