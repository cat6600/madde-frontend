"use client";

import { useEffect, useState } from "react";
import { Card, Table, Select, Typography, Row, Col, message } from "antd";
import { API_BASE_URL } from "../lib/api";

const { Title } = Typography;
const { Option } = Select;

export default function ProductionDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);

  // ================================
  // 1. 상단 KPI 가져오기
  // ================================
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sales/summary`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      message.error("매출 요약 데이터를 가져오지 못했습니다.");
    }
  };

  // ================================
  // 2. 제작/매출 현황 리스트 가져오기
  // ================================
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/process/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      message.error("제작 및 매출 현황을 불러오지 못했습니다.");
    }
  };

  // ================================
  // 3. 특정 주문 공정 데이터 가져오기
  // ================================
  const fetchTracking = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/process/trackings`);
      const all = await res.json();
      const item = all.find((x: any) => x.order_id === orderId);
      setTracking(item || null);
    } catch (err) {
      message.error("공정 정보를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchOrders();
  }, []);

  // ================================
  // 4. 상태 변경
  // ================================
  const updateStatus = async (order: any, newStatus: string) => {
    try {
      const payload = { ...order, status: newStatus };

      const res = await fetch(`${API_BASE_URL}/process/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      await fetchOrders();

      message.success(`상태가 '${newStatus}'로 변경되었습니다.`);
    } catch (err) {
      message.error("상태 변경 실패");
    }
  };

  // ================================
  // 테이블 컬럼
  // ================================
  const columns = [
    { title: "업체명", dataIndex: "company_name" },
    { title: "품명", dataIndex: "product_name" },
    { title: "수량", dataIndex: "quantity" },
    {
      title: "제조원가",
      dataIndex: "unit_manufacturing_cost",
      render: (v: number) => v?.toLocaleString() + "원",
    },
    {
      title: "견적가(총)",
      dataIndex: "total_quote_price",
      render: (v: number) => v?.toLocaleString() + "원",
    },
    {
      title: "마진율",
      dataIndex: "margin_rate",
      render: (v: number) => (v ? v.toFixed(1) + "%" : "-"),
    },
    {
      title: "상태",
      dataIndex: "status",
      render: (status: string, row: any) => (
        <Select
          value={status}
          style={{ width: 120 }}
          onChange={(v) => updateStatus(row, v)}
        >
          <Option value="견적중">견적중</Option>
          <Option value="제작중">제작중</Option>
          <Option value="납품완료">납품완료</Option>
          <Option value="미진행">미진행</Option>
        </Select>
      ),
    },
  ];

  // ================================
  // Render
  // ================================
  return (
    <div style={{ padding: "20px" }}>
      <Title level={2}>제작 및 매출 현황</Title>

      {/* -------- 상단 KPI -------- */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={6}>
            <Card title="전체 매출" bordered>
              <b>{summary.total_sales_all.toLocaleString()} 원</b>
            </Card>
          </Col>
          <Col span={6}>
            <Card title="올해 매출" bordered>
              <b>{summary.total_sales_year.toLocaleString()} 원</b>
            </Card>
          </Col>
          <Col span={6}>
            <Card title="이번 분기 매출" bordered>
              <b>{summary.total_sales_quarter.toLocaleString()} 원</b>
            </Card>
          </Col>
          <Col span={6}>
            <Card title="이번 달 매출" bordered>
              <b>{summary.total_sales_month.toLocaleString()} 원</b>
            </Card>
          </Col>
        </Row>
      )}

      {/* -------- 제작 및 매출 표 -------- */}
      <Card title="제작 · 매출 리스트">
        <Table
          rowKey="id"
          dataSource={orders}
          columns={columns}
          onRow={(record) => ({
            onClick: () => {
              setSelectedOrder(record);
              fetchTracking(record.id);
            },
          })}
        />
      </Card>

      {/* -------- 선택된 제품 공정 현황 -------- */}
      {selectedOrder && (
        <Card
          title={`선택된 제품 공정 현황 - ${selectedOrder.product_name}`}
          style={{ marginTop: 20 }}
        >
          {tracking ? (
            <div>
              <p>제품 부피: <b>{tracking.product_volume_cm3 ?? "-"}</b></p>
              <p>프린팅 시간: <b>{tracking.printing_time_hr ?? "-"}</b></p>
              <p>베드 밀도: <b>{tracking.bed_density ?? "-"}</b></p>
            </div>
          ) : (
            <p>공정 데이터가 없습니다.</p>
          )}
        </Card>
      )}
    </div>
  );
}
