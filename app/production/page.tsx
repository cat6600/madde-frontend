"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Typography,
  Row,
  Col,
  Select,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

interface SalesSummary {
  year: number;
  quarter: number;
  month: number;
  total_sales_all: number;
  total_sales_year: number;
  total_sales_quarter: number;
  total_sales_month: number;
}

interface ProcessOrder {
  id: number;
  company_name: string;
  quote_date: string;
  category: string;
  product_name: string;
  quantity: number;
  unit_manufacturing_cost: number; // 전체 제조원가
  unit_quote_price: number; // 개당 견적가
  total_quote_price: number; // 전체 견적가
  status: string; // 견적중 / 제작중 / 납품완료 / 미진행
  actual_order_amount?: number | null;
  margin_rate?: number | null;
  related_file?: string | null;
  delivered_at?: string | null;
  due_date?: string | null; // 납기일
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

export default function ProductionPage() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [orders, setOrders] = useState<ProcessOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ProcessOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<ProcessOrderStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // 프로젝트 등록 모달
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderForm] = Form.useForm();
  const [orderFile, setOrderFile] = useState<File | null>(null);

  // ===============================
  // 데이터 로딩
  // ===============================
  const fetchSummary = async () => {
    try {
      const res = await axios.get<SalesSummary>(
        `${API_BASE_URL}/sales/summary`
      );
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      message.error("매출 요약 데이터를 불러오지 못했습니다.");
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get<ProcessOrder[]>(
        `${API_BASE_URL}/process/orders`
      );
      setOrders(res.data);

      // 선택된 주문 갱신
      if (selectedOrder) {
        const refreshed = res.data.find((o) => o.id === selectedOrder.id);
        if (refreshed) {
          setSelectedOrder(refreshed);
          fetchOrderStatus(refreshed.id);
        } else {
          setSelectedOrder(null);
          setOrderStatus(null);
        }
      }
    } catch (err) {
      console.error(err);
      message.error("제작 및 매출 현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchSummary();
    fetchOrders();
  }, []);

  // ===============================
  // 상태 변경
  // ===============================
  const updateStatus = async (order: ProcessOrder, newStatus: string) => {
    try {
      const payload: ProcessOrder = {
        ...order,
        status: newStatus,
      };

      const res = await axios.put(
        `${API_BASE_URL}/process/orders/${order.id}`,
        payload
      );
      if (res.status !== 200) throw new Error();

      message.success(`상태가 '${newStatus}'로 변경되었습니다.`);
      fetchOrders();
      fetchSummary();
    } catch (err) {
      console.error(err);
      message.error("상태 변경에 실패했습니다.");
    }
  };

  // ===============================
  // 프로젝트(주문) 등록
  // ===============================
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
      formData.append("manufacturing_cost", String(values.manufacturing_cost)); // 전체 제조원가
      formData.append(
        "total_quote_price",
        String(values.total_quote_price)
      ); // 전체 견적가
      formData.append("status", values.status);
      formData.append("due_date", values.due_date); // ✅ 납기일 전송

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

      message.success("프로젝트(주문)가 등록되었습니다.");
      setOrderModalOpen(false);
      fetchOrders();
      fetchSummary();
    } catch (err: any) {
      if (err?.response?.status === 422) {
        message.error("입력값이 올바르지 않습니다. 필수 항목을 확인해 주세요.");
      } else if (!err?.errorFields) {
        console.error(err);
        message.error("프로젝트 등록에 실패했습니다.");
      }
    }
  };

  // ===============================
  // 테이블 컬럼
  // ===============================
  const columns: ColumnsType<ProcessOrder> = [
    { title: "업체명", dataIndex: "company_name" },
    { title: "품명", dataIndex: "product_name" },
    { title: "수량", dataIndex: "quantity" },
    { title: "납기일", dataIndex: "due_date" }, // ✅ 리스트에 납기일 표시
    {
      title: "제조원가(전체)",
      dataIndex: "unit_manufacturing_cost",
      render: (v: number) => `${(v || 0).toLocaleString()} 원`,
    },
    {
      title: "견적가(총)",
      dataIndex: "total_quote_price",
      render: (v: number) => `${(v || 0).toLocaleString()} 원`,
    },
    {
      title: "마진율",
      dataIndex: "margin_rate",
      render: (v?: number | null) =>
        v != null ? `${v.toFixed(1)} %` : "-",
    },
    {
      title: "상태",
      dataIndex: "status",
      render: (status: string, row: ProcessOrder) => (
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

  // ===============================
  // 렌더
  // ===============================
  return (
    <AppLayout>
      <div style={{ padding: 8 }}>
        <Title level={3}>제작 및 매출 현황</Title>

        {/* 상단 KPI */}
        {summary && (
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={6}>
              <Card title="전체 매출">
                <b>{summary.total_sales_all.toLocaleString()} 원</b>
              </Card>
            </Col>
            <Col span={6}>
              <Card title="올해 매출">
                <b>{summary.total_sales_year.toLocaleString()} 원</b>
              </Card>
            </Col>
            <Col span={6}>
              <Card title="이번 분기 매출">
                <b>{summary.total_sales_quarter.toLocaleString()} 원</b>
              </Card>
            </Col>
            <Col span={6}>
              <Card title="이번 달 매출">
                <b>{summary.total_sales_month.toLocaleString()} 원</b>
              </Card>
            </Col>
          </Row>
        )}

        {/* 제작 · 매출 리스트 */}
        <Card
          title="제작 · 매출 리스트"
          extra={
            <Button type="primary" onClick={openOrderModal}>
              프로젝트 등록
            </Button>
          }
        >
          <Table
            rowKey="id"
            dataSource={orders}
            columns={columns}
            loading={loading}
            onRow={(record) => ({
              onClick: () => {
                setSelectedOrder(record);
                fetchOrderStatus(record.id);
              },
              style: { cursor: "pointer" },
            })}
          />
        </Card>

        {/* 선택된 제품 공정 현황 */}
        {selectedOrder && (
          <Card
            title={`선택된 제품 공정 현황 - ${selectedOrder.product_name}`}
            style={{ marginTop: 20 }}
          >
            {orderStatus ? (
              <div>
                <p>
                  진행율:{" "}
                  <b>
                    {orderStatus.progress_percent != null
                      ? `${orderStatus.progress_percent}%`
                      : "-"}
                  </b>
                </p>
                <p>
                  현재 공정 단계:{" "}
                  <b>{orderStatus.current_stage ?? "-"}</b>
                </p>
                <p>
                  우선순위: <b>{orderStatus.priority ?? "-"}</b>
                </p>
                <p>
                  이슈 / 현 상황:{" "}
                  <b>{orderStatus.current_detail ?? "-"}</b>
                </p>
              </div>
            ) : (
              <Text type="secondary">
                아직 공정 상태가 입력되지 않았습니다. 공정 데이터 메뉴에서
                공정 상태를 등록하면 이곳에 표시됩니다.
              </Text>
            )}
          </Card>
        )}
      </div>

      {/* 프로젝트 등록 모달 */}
      <Modal
        title="프로젝트(주문) 등록"
        open={orderModalOpen}
        onCancel={() => setOrderModalOpen(false)}
        onOk={submitOrder}
        okText="저장"
        cancelText="취소"
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
            label="납기일"
            name="due_date"
            rules={[{ required: true, message: "납기일을 입력해 주세요." }]}
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
              <Option value="제작중">제작중</Option>
              <Option value="납품완료">납품완료</Option>
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
    </AppLayout>
  );
}
