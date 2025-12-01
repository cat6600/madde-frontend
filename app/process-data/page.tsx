"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  Table,
  Card,
  Typography,
  message,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Text, Title } = Typography;
const { Option } = Select;

interface ProcessOrder {
  id: number;
  company_name: string;
  quote_date: string;
  category: string;
  product_name: string;
  quantity: number;
  unit_manufacturing_cost: number;
  total_quote_price: number;
  status: string;   // 견적중 / 제작중 / 납품완료 / 미진행
}

interface ProcessTracking {
  id: number;
  order_id: number;
  product_volume_cm3?: number | null;
  printing_time_hr?: number | null;
  bed_density?: number | null;
  note?: string | null;
}

export default function ProcessDataPage() {
  const [activeTab, setActiveTab] = useState<string>("status");
  const [orders, setOrders] = useState<ProcessOrder[]>([]);
  const [trackings, setTrackings] = useState<ProcessTracking[]>([]);
  const [loading, setLoading] = useState(false);

  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingForm] = Form.useForm();
  const [editingTracking, setEditingTracking] =
    useState<ProcessTracking | null>(null);

  // -----------------------------
  // 데이터 로딩
  // -----------------------------
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, trackingRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/process/orders`),
        axios.get(`${API_BASE_URL}/process/trackings`),
      ]);

      // 공정 데이터는 "제작중" 주문만 표시
      const inProgress = ordersRes.data.filter(
        (o: ProcessOrder) => o.status === "제작중"
      );

      setOrders(inProgress);
      setTrackings(trackingRes.data);
    } catch (e) {
      message.error("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 진행중 주문 매핑
  const orderMap = useMemo(() => {
    const map = new Map<number, ProcessOrder>();
    orders.forEach((o) => map.set(o.id, o));
    return map;
  }, [orders]);

  // Tracking 중 제작중 주문만 보이게
  const visibleTrackings = useMemo(
    () => trackings.filter((t) => orderMap.has(t.order_id)),
    [trackings, orderMap]
  );

  // -----------------------------
  // Tracking 모달
  // -----------------------------
  const openTrackingModal = (record?: ProcessTracking) => {
    if (record) {
      setEditingTracking(record);
      trackingForm.setFieldsValue({ ...record });
    } else {
      setEditingTracking(null);
      trackingForm.resetFields();
    }
    setTrackingModalOpen(true);
  };

  const submitTracking = async () => {
    try {
      const values = await trackingForm.validateFields();

      const payload = {
        order_id: values.order_id,
        product_volume_cm3: values.product_volume_cm3 ?? null,
        printing_time_hr: values.printing_time_hr ?? null,
        bed_density: values.bed_density ?? null,
        note: values.note || null,
      };

      if (editingTracking) {
        await axios.put(
          `${API_BASE_URL}/process/trackings/${editingTracking.id}`,
          payload
        );
      } else {
        await axios.post(`${API_BASE_URL}/process/trackings`, payload);
      }

      message.success("추적 데이터가 저장되었습니다.");
      setTrackingModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (!err?.errorFields) {
        message.error("저장 실패");
      }
    }
  };

  // -----------------------------
  // Tracking 삭제
  // -----------------------------
  const deleteTracking = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/process/trackings/${id}`);
      message.success("삭제되었습니다.");
      fetchData();
    } catch {
      message.error("삭제 실패");
    }
  };

  // -----------------------------
  // 테이블 컬럼
  // -----------------------------
  const trackingColumns: ColumnsType<ProcessTracking> = [
    { title: "Order ID", dataIndex: "order_id" },
    {
      title: "업체명 / 품명",
      key: "info",
      render: (_, record) => {
        const o = orderMap.get(record.order_id);
        if (!o) return <Text type="secondary">연결된 주문 없음</Text>;
        return (
          <>
            <div>{o.company_name}</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {o.product_name}
            </div>
          </>
        );
      },
    },
    { title: "제품 부피(cm³)", dataIndex: "product_volume_cm3" },
    { title: "프린팅 시간(hr)", dataIndex: "printing_time_hr" },
    { title: "베드 밀도", dataIndex: "bed_density" },
    { title: "비고", dataIndex: "note" },
    {
      title: "관리",
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => openTrackingModal(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="삭제하시겠습니까?"
            onConfirm={() => deleteTracking(record.id)}
          >
            <Button type="link" size="small" danger>
              삭제
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  // -----------------------------
  // 렌더
  // -----------------------------
  return (
    <AppLayout>
      <Title level={3}>공정 데이터</Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: "status", label: "공정 현황" },
          { key: "raw", label: "Raw Data" },
        ]}
      />

      {activeTab === "status" && (
        <Card title="제작중(Order Status='제작중') 공정 데이터" loading={loading}>
          <Button
            type="primary"
            style={{ marginBottom: 16 }}
            onClick={() => {
              if (orders.length === 0) {
                message.warning("제작중 주문이 없습니다.");
                return;
              }
              openTrackingModal();
            }}
          >
            공정 데이터 추가
          </Button>

          <Table
            rowKey="id"
            columns={trackingColumns}
            dataSource={visibleTrackings}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}

      {activeTab === "raw" && (
        <Card title="공정 Raw Tracking 전체">
          <Table
            rowKey="id"
            columns={trackingColumns}
            dataSource={trackings}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}

      {/* 모달 */}
      <Modal
        title={editingTracking ? "공정 데이터 수정" : "공정 데이터 추가"}
        open={trackingModalOpen}
        onCancel={() => setTrackingModalOpen(false)}
        onOk={submitTracking}
        okText="저장"
      >
        <Form form={trackingForm} layout="vertical">
          <Form.Item
            label="주문 선택"
            name="order_id"
            rules={[{ required: true }]}
          >
            <Select>
              {orders.map((o) => (
                <Option key={o.id} value={o.id}>
                  {o.company_name} / {o.product_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="제품 부피(cm³)" name="product_volume_cm3">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="프린팅 시간(hr)" name="printing_time_hr">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="베드 밀도" name="bed_density">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="비고" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
}
