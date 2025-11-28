"use client";
import { Row, Col, Card, Typography } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";

const { Title } = Typography;

export default function DashboardPage() {
  const [stats, setStats] = useState({
    researchCount: 0,
    ipCount: 0,
    irCount: 0,
    projectCount: 0,
    totalLabor: 0,
    totalMachine: 0,
  });

  const fetchStats = async () => {
    try {
      const [r, i, ir, p, a] = await Promise.all([
        axios.get(`${API_BASE_URL}/research`),
        axios.get(`${API_BASE_URL}/ip`),
        axios.get(`${API_BASE_URL}/ir`),
        axios.get(`${API_BASE_URL}/projects`),
        axios.get(`${API_BASE_URL}/assets`),
      ]);

      const assets = a.data || {};
      const totalLabor = assets.personnel_salary_total ?? 0;
      const totalMachine = assets.equipment_acquisition_total ?? 0;

      setStats({
        researchCount: r.data.length,
        ipCount: i.data.length,
        irCount: ir.data.length,
        projectCount: p.data.length,
        totalLabor,
        totalMachine,
      });
    } catch (e) {
      console.log("데이터 불러오기 실패", e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AppLayout>
      <Title level={3}>🏢 회사 통합 관리 대시보드</Title>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}><Card title="🔬 연구 데이터">{stats.researchCount}건</Card></Col>
        <Col span={8}><Card title="📘 IP 현황">{stats.ipCount}건</Card></Col>
        <Col span={8}><Card title="📂 IR 자료">{stats.irCount}건</Card></Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}><Card title="🏗️ 과제 수">{stats.projectCount}건</Card></Col>
        <Col span={8}><Card title="💰 총 인건비">{stats.totalLabor.toLocaleString()}천 원</Card></Col>
        <Col span={8}><Card title="⚙️ 장비 가치">{stats.totalMachine.toLocaleString()}천 원</Card></Col>
      </Row>
    </AppLayout>
  );
}
