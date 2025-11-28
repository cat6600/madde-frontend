"use client";

import { Layout, Menu } from "antd";
import {
  HomeOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  FundOutlined,
  TeamOutlined,
  DatabaseOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import React from "react";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "1", icon: <HomeOutlined />, label: "대시보드", path: "/dashboard" },
  { key: "2", icon: <ExperimentOutlined />, label: "연구 데이터", path: "/research" },
  { key: "3", icon: <FileSearchOutlined />, label: "IP 현황", path: "/ip" },
  { key: "4", icon: <FundOutlined />, label: "IR 자료", path: "/ir" },
  { key: "5", icon: <TeamOutlined />, label: "현물 현황", path: "/assets" },
  { key: "7", icon: <DollarOutlined />, label: "재무 현황", path: "/finance" },
  { key: "6", icon: <DatabaseOutlined />, label: "과제 지원 현황", path: "/projects" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // 현재 주소에 맞는 메뉴 선택
  const selectedKey =
    menuItems.find((item) =>
      pathname === "/"
        ? item.path === "/dashboard"
        : pathname.startsWith(item.path)
    )?.key ?? "1";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#FFF", borderRight: "1px solid #EEE" }}>
        <div
          style={{
            padding: 16,
            fontWeight: "bold",
            textAlign: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          통합 관리 시스템
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={(e) => {
            const selected = menuItems.find((i) => i.key === e.key);
            if (selected) router.push(selected.path);
          }}
        />
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
