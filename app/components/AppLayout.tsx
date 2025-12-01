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
  SettingOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 🔒 뷰어가 접근하면 안 되는 페이지들 (요청대로 유지)
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

  // ================================
  // 로그인 여부 체크
  // ================================
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

  // ================================
  // 뷰어의 직접 주소 입력 차단
  // ================================
  useEffect(() => {
    if (!role) return;
    if (role === "viewer" && ADMIN_ONLY_PATHS.includes(pathname)) {
      message.warning("뷰어 권한으로는 해당 페이지에 접근할 수 없습니다.");
      router.replace("/dashboard");
    }
  }, [role, pathname, router]);

  // 로딩 화면
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

  if (!role) return null;

  // ================================
  // 사이드바 메뉴 구성
  // ================================
  const selectedKey =
    pathname === "/" ? "/dashboard" : pathname.split("?")[0];

  // 원본 메뉴 구조 (group + children)
  const menuItems: any[] = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "대시보드",
    },
    {
      type: "group",
      label: "영업·제작",
      children: [
        {
          key: "/production",
          icon: <BarChartOutlined />,
          label: "제작 및 매출 현황",
        },
        {
          key: "/process-data",
          icon: <SettingOutlined />,
          label: "공정 데이터",
          // ✅ 이제 뷰어도 접근 가능 (adminOnly 삭제)
        },
      ],
    },
    {
      type: "group",
      label: "R&D·과제",
      children: [
        {
          key: "/research",
          icon: <ExperimentOutlined />,
          label: "연구 데이터",
        },
        {
          key: "/projects",
          icon: <ProjectOutlined />,
          label: "과제 현황",
          adminOnly: true,
        },
        {
          key: "/ip",
          icon: <BulbOutlined />,
          label: "인증/IP 현황",
        },
      ],
    },
    {
      type: "group",
      label: "재무·자산",
      children: [
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
      ],
    },
    {
      type: "group",
      label: "자료·IR",
      children: [
        {
          key: "/ir",
          icon: <FileImageOutlined />,
          label: "IR/마케팅 자료",
        },
      ],
    },
  ];

  // 뷰어는 adminOnly 메뉴 비활성화(disabled) - group 포함 재귀 변환
  const mapMenuItemsForAntd = (items: any[]): any[] =>
    items.map((item) => {
      if (item.type === "group" && item.children) {
        return {
          ...item,
          children: mapMenuItemsForAntd(item.children),
        };
      }
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        disabled: role === "viewer" && item.adminOnly === true,
      };
    });

  const antMenuItems = mapMenuItemsForAntd(menuItems);

  // ================================
  // 메뉴 클릭
  // ================================
  const handleMenuClick = (key: string) => {
    // group은 key 없음, children만 있음 → 여기까지 안 들어옴
    // children item만 처리
    // adminOnly 체크
    const findTarget = (items: any[]): any | undefined => {
      for (const it of items) {
        if (it.type === "group" && it.children) {
          const found = findTarget(it.children);
          if (found) return found;
        } else if (it.key === key) {
          return it;
        }
      }
      return undefined;
    };

    const target = findTarget(menuItems);

    if (role === "viewer" && target?.adminOnly) {
      message.warning("뷰어 권한으로는 접근할 수 없습니다.");
      return;
    }

    router.push(key);
  };

  // ================================
  // 로그아웃
  // ================================
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("role");
    }
    router.push("/login");
  };

  // ================================
  // 화면 렌더
  // ================================
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {/* 상단 로고/타이틀 */}
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
              {role === "admin" ? "관리자(Admin)" : "뷰어(Viewer)"}
            </Text>
          )}
        </div>

        {/* 메뉴 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={antMenuItems}
          onClick={({ key }) => handleMenuClick(key as string)}
          style={{ flex: 1 }}
        />

        {/* 로그아웃 버튼 */}
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

            {/* 뷰어 하단 안내 */}
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
                일부 메뉴는 뷰어 권한으로 접근이 제한됩니다.
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
