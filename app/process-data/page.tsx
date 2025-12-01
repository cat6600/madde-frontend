"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  Table,
  Card,
  Typography,
  Tag,
  Descriptions,
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

console.log("API_BASE_URL ===>", API_BASE_URL);


const { Title, Text } = Typography;
const { Option } = Select;

interface ProcessOrder {
  id: number;
  company_name: string;
  quote_date: string;
  category: string;
  product_name: string;
  quantity: number;
  unit_manufacturing_cost: number; // 전체 제조원가로 사용
  unit_quote_price: number;        // 개당 견적가
  total_quote_price: number;       // 전체 견적가
  status: string;
  actual_order_amount?: number | null;
  margin_rate?: number | null;
  related_file?: string | null;
}

interface ProcessOrderStatus {
  id: number;
  order_id: number;
  total_process_time_hours?: number | null;
  current_stage?: string | null;
  progress_percent?: number | null;
  current_detail?: string | null;
  priority?: string | null;
}

interface UnitCost {
  id: string;
  category: string;
  item_name: string;
  unit_price: number;
  unit: string;
  note?: string | null;
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

  // -----------------------------
  // 공정 주문 / 상태
  // -----------------------------
  const [orders, setOrders] = useState<ProcessOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProcessOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<ProcessOrderStatus | null>(
    null
  );

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderForm] = Form.useForm();
  const [orderFile, setOrderFile] = useState<File | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusForm] = Form.useForm();

  // -----------------------------
  // Raw Data
  // -----------------------------
  const [unitCosts, setUnitCosts] = useState<UnitCost[]>([]);
  const [trackings, setTrackings] = useState<ProcessTracking[]>([]);
  const [loadingRaw, setLoadingRaw] = useState(false);

  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingForm] = Form.useForm();
  const [editingTracking, setEditingTracking] = useState<ProcessTracking | null>(
    null
  );

  // -----------------------------
  // 데이터 로딩
  // -----------------------------
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await axios.get<ProcessOrder[]>(
        `${API_BASE_URL}/process/orders`
      );
      setOrders(res.data);
      if (selectedOrder) {
        const refreshed = res.data.find((o) => o.id === selectedOrder.id);
        if (!refreshed) {
          setSelectedOrder(null);
          setOrderStatus(null);
        } else {
          setSelectedOrder(refreshed);
          fetchOrderStatus(refreshed.id);
        }
      }
    } catch (err) {
      console.error(err);
      message.error("공정 견적/발주 데이터를 불러오지 못했습니다.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchOrderStatus = async (orderId: number) => {
    try {
      const res = await axios.get<ProcessOrderStatus[]>(
        `${API_BASE_URL}/process/orders/${orderId}/status`
      );
      setOrderStatus(res.data[0] ?? null);
    } catch (err) {
      console.error(err);
      setOrderStatus(null);
    }
  };

  const fetchRawData = async () => {
    try {
      setLoadingRaw(true);
      const [costRes, trackingRes] = await Promise.all([
        axios.get<UnitCost[]>(`${API_BASE_URL}/process/unit-costs`),
        axios.get<ProcessTracking[]>(`${API_BASE_URL}/process/trackings`),
      ]);
      setUnitCosts(costRes.data);
      setTrackings(trackingRes.data);
    } catch (err) {
      console.error(err);
      message.error("Raw data를 불러오지 못했습니다.");
    } finally {
      setLoadingRaw(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (activeTab === "raw") {
      fetchRawData();
    }
  }, [activeTab]);

  // -----------------------------
  // 진행중 주문 ↔ 추적 연동
  // -----------------------------
  const inProgressOrders = useMemo(
    () => orders.filter((o) => o.status === "진행중"),
    [orders]
  );

  const inProgressOrderMap = useMemo(() => {
    const map = new Map<number, ProcessOrder>();
    inProgressOrders.forEach((o) => map.set(o.id, o));
    return map;
  }, [inProgressOrders]);

  const visibleTrackings = useMemo(
    () => trackings.filter((t) => inProgressOrderMap.has(t.order_id)),
    [trackings, inProgressOrderMap]
  );

  // -----------------------------
  // 테이블 컬럼
  // -----------------------------
  const orderColumns: ColumnsType<ProcessOrder> = [
    {
      title: "업체명",
      dataIndex: "company_name",
      key: "company_name",
    },
    {
      title: "견적일",
      dataIndex: "quote_date",
      key: "quote_date",
    },
    {
      title: "구분",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "품명",
      dataIndex: "product_name",
      key: "product_name",
    },
    {
      title: "수량",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "제조원가(전체)",
      dataIndex: "unit_manufacturing_cost",
      key: "unit_manufacturing_cost",
      render: (v: number) => `${v.toLocaleString()} 원`,
    },
    {
      title: "개당 견적가",
      key: "unit_quote_price_calc",
      render: (_, record) => {
        const per =
          record.total_quote_price && record.quantity
            ? Math.round(record.total_quote_price / record.quantity)
            : 0;
        return `${per.toLocaleString()} 원`;
      },
    },
    {
      title: "전체 견적가",
      dataIndex: "total_quote_price",
      key: "total_quote_price",
      render: (v: number) => `${v.toLocaleString()} 원`,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color: string | undefined;
        if (status === "견적중") color = "processing";
        if (status === "진행중") color = "blue";
        if (status === "발주완료") color = "success";
        if (status === "미진행") color = "default";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "마진율",
      dataIndex: "margin_rate",
      key: "margin_rate",
      render: (v?: number) =>
        v != null ? `${v.toFixed(1)} %` : "-",
    },
  ];

  const unitCostColumns: ColumnsType<UnitCost> = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Category", dataIndex: "category", key: "category" },
    { title: "Item", dataIndex: "item_name", key: "item_name" },
    {
      title: "Unit Price",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (v: number) => v.toLocaleString(),
    },
    { title: "Unit", dataIndex: "unit", key: "unit" },
    { title: "비고", dataIndex: "note", key: "note" },
  ];

  const trackingColumns: ColumnsType<ProcessTracking> = [
    {
      title: "Order ID",
      dataIndex: "order_id",
      key: "order_id",
    },
    {
      title: "업체 / 품명 / 상태",
      key: "order_info",
      render: (_, record) => {
        const o = inProgressOrderMap.get(record.order_id);
        if (!o)
          return <Text type="secondary">연결된 진행중 주문 없음</Text>;
        return (
          <>
            <div>{o.company_name}</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {o.product_name} / {o.status}
            </div>
          </>
        );
      },
    },
    {
      title: "제품 부피 (cm³)",
      dataIndex: "product_volume_cm3",
      key: "product_volume_cm3",
    },
    {
      title: "프린팅 시간 (hr)",
      dataIndex: "printing_time_hr",
      key: "printing_time_hr",
    },
    {
      title: "베드 밀도",
      dataIndex: "bed_density",
      key: "bed_density",
    },
    { title: "비고", dataIndex: "note", key: "note" },
    {
      title: "관리",
      key: "actions",
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
            title="해당 추적 데이터를 삭제하시겠습니까?"
            onConfirm={() => handleDeleteTracking(record.id)}
            okText="삭제"
            cancelText="취소"
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
  // 핸들러
  // -----------------------------
  const handleRowClick = (record: ProcessOrder) => {
    setSelectedOrder(record);
    fetchOrderStatus(record.id);
  };

  const openOrderModal = () => {
    orderForm.resetFields();
    setOrderFile(null);
    orderForm.setFieldsValue({
      quote_date: new Date().toISOString().slice(0, 10),
      status: "견적중",
    });
    setOrderModalOpen(true);
  };

  const submitOrder = async () => {
    try {
      const values = await orderForm.validateFields();

      const formData = new FormData();
      formData.append("company_name", values.company_name);
      formData.append("quote_date", values.quote_date);
      formData.append("category", values.category);
      formData.append("product_name", values.product_name);
      formData.append("quantity", String(values.quantity));
      formData.append("manufacturing_cost", String(values.manufacturing_cost));
      formData.append("total_quote_price", String(values.total_quote_price));
      formData.append("status", values.status);
      if (values.actual_order_amount != null) {
        formData.append(
          "actual_order_amount",
          String(values.actual_order_amount)
        );
      }
      if (orderFile) {
        formData.append("file", orderFile);
      }

      await axios.post(`${API_BASE_URL}/process/orders`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("공정 주문이 등록되었습니다.");
      setOrderModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("공정 주문 등록에 실패했습니다.");
    }
  };

  const openStatusModal = () => {
    if (!selectedOrder) {
      message.warning("먼저 상단에서 주문을 선택해 주세요.");
      return;
    }
    statusForm.setFieldsValue({
      total_process_time_hours:
        orderStatus?.total_process_time_hours ?? undefined,
      current_stage: orderStatus?.current_stage ?? "",
      progress_percent: orderStatus?.progress_percent ?? undefined,
      current_detail: orderStatus?.current_detail ?? "",
      priority: orderStatus?.priority ?? undefined,
    });
    setStatusModalOpen(true);
  };

  const submitStatus = async () => {
    if (!selectedOrder) return;
    try {
      const values = await statusForm.validateFields();
      const payload = {
        order_id: selectedOrder.id,
        total_process_time_hours: values.total_process_time_hours ?? null,
        current_stage: values.current_stage || null,
        progress_percent: values.progress_percent ?? null,
        current_detail: values.current_detail || null,
        priority: values.priority || null,
      };
      await axios.post(
        `${API_BASE_URL}/process/orders/${selectedOrder.id}/status`,
        payload
      );
      message.success("공정 상태가 저장되었습니다.");
      setStatusModalOpen(false);
      fetchOrderStatus(selectedOrder.id);
      fetchOrders();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("공정 상태 저장에 실패했습니다.");
    }
  };

  const openTrackingModal = (record?: ProcessTracking) => {
    if (record) {
      setEditingTracking(record);
      trackingForm.setFieldsValue({
        order_id: record.order_id,
        product_volume_cm3: record.product_volume_cm3,
        printing_time_hr: record.printing_time_hr,
        bed_density: record.bed_density,
        note: record.note,
      });
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
          { id: editingTracking.id, ...payload }
        );
        message.success("추적 데이터가 수정되었습니다.");
      } else {
        await axios.post(`${API_BASE_URL}/process/trackings`, payload);
        message.success("추적 데이터가 등록되었습니다.");
      }
      setTrackingModalOpen(false);
      fetchRawData();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("추적 데이터 저장에 실패했습니다.");
    }
  };

  const handleDeleteTracking = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/process/trackings/${id}`);
      message.success("추적 데이터가 삭제되었습니다.");
      fetchRawData();
    } catch (err) {
      console.error(err);
      message.error("추적 데이터 삭제에 실패했습니다.");
    }
  };

  // -----------------------------
  // 렌더
  // -----------------------------
  return (
    <AppLayout>
      <Title level={3} style={{ marginBottom: 16 }}>
        공정 데이터
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: "status", label: "현황" },
          { key: "raw", label: "Raw Data" },
        ]}
      />

      {/* 현황 탭 */}
      {activeTab === "status" && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <Card
            title="견적 및 발주 진행 상황"
            extra={
              <Button type="primary" onClick={openOrderModal}>
                공정 추가
              </Button>
            }
          >
            <Table
              rowKey="id"
              columns={orderColumns}
              dataSource={orders}
              loading={loadingOrders}
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: { cursor: "pointer" },
              })}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          <Card
            title="선택된 제품 공정 현황"
            extra={
              <Button size="small" onClick={openStatusModal}>
                공정 상태 편집
              </Button>
            }
          >
            {selectedOrder ? (
              <>
                <Text strong>
                  {selectedOrder.company_name} / {selectedOrder.product_name}
                </Text>
                <Descriptions
                  bordered
                  column={2}
                  size="small"
                  style={{ marginTop: 16 }}
                >
                  <Descriptions.Item label="총 공정시간">
                    {orderStatus?.total_process_time_hours != null
                      ? `${orderStatus.total_process_time_hours} hr`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="현 공정 단계">
                    {orderStatus?.current_stage ?? "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="진행율">
                    {orderStatus?.progress_percent != null
                      ? `${orderStatus.progress_percent}%`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="우선순위">
                    {orderStatus?.priority ?? "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="현 상황" span={2}>
                    {orderStatus?.current_detail ?? "-"}
                  </Descriptions.Item>
                </Descriptions>
              </>
            ) : (
              <Text type="secondary">
                상단 테이블에서 제품을 선택하면 공정 현황이 표시됩니다.
              </Text>
            )}
          </Card>
        </div>
      )}

      {/* Raw Data 탭 */}
      {activeTab === "raw" && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <Card title="단가 테이블" loading={loadingRaw}>
            <Table
              rowKey="id"
              columns={unitCostColumns}
              dataSource={unitCosts}
              pagination={false}
            />
          </Card>

          <Card
            title="공정 추적 Raw 데이터 (진행중 주문 기준)"
            extra={
              <Button
                type="primary"
                onClick={() => {
                  if (inProgressOrders.length === 0) {
                    message.warning("진행중 상태의 주문이 없습니다.");
                    return;
                  }
                  openTrackingModal();
                }}
              >
                추적 데이터 추가
              </Button>
            }
            loading={loadingRaw}
          >
            <Table
              rowKey="id"
              columns={trackingColumns}
              dataSource={visibleTrackings}
              pagination={{ pageSize: 10 }}
            />
            {inProgressOrders.length === 0 && (
              <Text type="secondary">
                진행중 상태의 주문이 없어서 표시할 추적 데이터가 없습니다.
              </Text>
            )}
          </Card>
        </div>
      )}

      {/* 공정 주문 추가 모달 */}
      <Modal
        title="공정 주문 추가"
        open={orderModalOpen}
        onCancel={() => setOrderModalOpen(false)}
        onOk={submitOrder}
        okText="저장"
        cancelText="취소"
        destroyOnClose
      >
        <Form form={orderForm} layout="vertical">
          <Form.Item
            label="업체명"
            name="company_name"
            rules={[{ required: true, message: "업체명을 입력해 주세요." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="견적일"
            name="quote_date"
            rules={[{ required: true, message: "견적일을 입력해 주세요." }]}
          >
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            label="구분"
            name="category"
            rules={[{ required: true, message: "구분을 선택해 주세요." }]}
          >
            <Select placeholder="선택">
              <Option value="RBSC">RBSC</Option>
              <Option value="RSiC">RSiC</Option>
              <Option value="WAAM">WAAM</Option>
              <Option value="기타">기타</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="품명"
            name="product_name"
            rules={[{ required: true, message: "품명을 입력해 주세요." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="수량"
            name="quantity"
            rules={[{ required: true, message: "수량을 입력해 주세요." }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="제조원가 (전체)"
            name="manufacturing_cost"
            rules={[{ required: true, message: "제조원가를 입력해 주세요." }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="전체 견적가"
            name="total_quote_price"
            rules={[{ required: true, message: "전체 견적가를 입력해 주세요." }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="실제 발주금액" name="actual_order_amount">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="상태" name="status">
            <Select>
              <Option value="견적중">견적중</Option>
              <Option value="진행중">진행중</Option>
              <Option value="발주완료">발주완료</Option>
              <Option value="미진행">미진행</Option>
            </Select>
          </Form.Item>
          <Form.Item label="관련 파일 (CAD 등)">
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setOrderFile(f);
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 공정 상태 모달 */}
      <Modal
        title="공정 상태 편집"
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={submitStatus}
        okText="저장"
        cancelText="취소"
        destroyOnClose
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item label="총 공정시간(hr)" name="total_process_time_hours">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="현 공정 단계" name="current_stage">
            <Input placeholder="예: 프린팅, 탈분말, LSI 소결 등" />
          </Form.Item>
          <Form.Item label="진행율(%)" name="progress_percent">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="우선순위" name="priority">
            <Select allowClear placeholder="선택">
              <Option value="매우시급">매우시급</Option>
              <Option value="시급">시급</Option>
              <Option value="보통">보통</Option>
              <Option value="양호">양호</Option>
              <Option value="여유">여유</Option>
            </Select>
          </Form.Item>
          <Form.Item label="현 상황 (상세)" name="current_detail">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 추적 데이터 모달 */}
      <Modal
        title={editingTracking ? "추적 데이터 수정" : "추적 데이터 추가"}
        open={trackingModalOpen}
        onCancel={() => setTrackingModalOpen(false)}
        onOk={submitTracking}
        okText="저장"
        cancelText="취소"
        destroyOnClose
      >
        <Form form={trackingForm} layout="vertical">
          <Form.Item
            label="주문 (진행중)"
            name="order_id"
            rules={[{ required: true, message: "주문을 선택해 주세요." }]}
          >
            <Select placeholder="주문 선택">
              {inProgressOrders.map((o) => (
                <Option key={o.id} value={o.id}>
                  {o.company_name} / {o.product_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="제품 부피 (cm³)"
            name="product_volume_cm3"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="프린팅 시간 (hr)"
            name="printing_time_hr"
          >
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
