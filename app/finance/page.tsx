"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Space,
  Table,
  Tabs,
  Typography,
  message,
  Progress,
  Modal,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title, Text } = Typography;

interface Investment {
  id: number;
  round: string;
  contract_date: string;
  registration_date: string;
  shares: number;
  amount: number;
  investor: string;
  security_type: string;
}

export default function FinancePage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(
    null
  );

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await axios.get<Investment[]>(
        `${API_BASE_URL}/investments`
      );
      setInvestments(res.data || []);
    } catch (err) {
      console.error(err);
      message.error("투자 이력 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const { totalAmount, totalShares, roundCount, shareholderList } = useMemo(() => {
    const totalAmount = investments.reduce(
      (sum, i) => sum + (i.amount || 0),
      0
    );
    const totalShares = investments.reduce(
      (sum, i) => sum + (i.shares || 0),
      0
    );
    const roundCount = new Set(investments.map((i) => i.round)).size;

    const map: Record<string, { shares: number; amount: number }> = {};
    for (const inv of investments) {
      const key = inv.investor || "기타";
      if (!map[key]) {
        map[key] = { shares: 0, amount: 0 };
      }
      map[key].shares += inv.shares || 0;
      map[key].amount += inv.amount || 0;
    }

    const shareholderList = Object.entries(map)
      .map(([name, v]) => ({
        investor: name,
        shares: v.shares,
        percent: totalShares ? (v.shares / totalShares) * 100 : 0,
        amount: v.amount,
      }))
      .sort((a, b) => b.shares - a.shares);

    return { totalAmount, totalShares, roundCount, shareholderList };
  }, [investments]);

  const handleSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append("round", values.round);
      formData.append(
        "contract_date",
        values.contract_date
          ? values.contract_date.format("YYYY-MM-DD")
          : ""
      );
      formData.append(
        "registration_date",
        values.registration_date
          ? values.registration_date.format("YYYY-MM-DD")
          : ""
      );
      formData.append("shares", String(values.shares || 0));
      formData.append("amount", String(values.amount || 0));
      formData.append("investor", values.investor || "");
      formData.append("security_type", values.security_type || "");

      await axios.post(`${API_BASE_URL}/investments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("투자 이력 등록 완료 ✅");
      form.resetFields();
      fetchInvestments();
    } catch (err) {
      console.error(err);
      message.error("투자 이력 등록 실패 ❌");
    }
  };

  const openEditModal = (record: Investment) => {
    setEditingInvestment(record);
    editForm.setFieldsValue({
      round: record.round,
      contract_date: record.contract_date
        ? dayjs(record.contract_date)
        : null,
      registration_date: record.registration_date
        ? dayjs(record.registration_date)
        : null,
      shares: record.shares,
      amount: record.amount,
      investor: record.investor,
      security_type: record.security_type,
    } as any);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values: any) => {
    if (!editingInvestment) return;
    try {
      const formData = new FormData();
      formData.append("round", values.round);
      formData.append(
        "contract_date",
        values.contract_date
          ? values.contract_date.format("YYYY-MM-DD")
          : ""
      );
      formData.append(
        "registration_date",
        values.registration_date
          ? values.registration_date.format("YYYY-MM-DD")
          : ""
      );
      formData.append("shares", String(values.shares || 0));
      formData.append("amount", String(values.amount || 0));
      formData.append("investor", values.investor || "");
      formData.append("security_type", values.security_type || "");

      await axios.put(
        `${API_BASE_URL}/investments/${editingInvestment.id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      message.success("투자 이력 수정 완료 ✅");
      setEditModalOpen(false);
      setEditingInvestment(null);
      fetchInvestments();
    } catch (err) {
      console.error(err);
      message.error("투자 이력 수정 실패 ❌");
    }
  };

  const handleDelete = async (record: Investment) => {
    try {
      await axios.delete(`${API_BASE_URL}/investments/${record.id}`);
      message.success("투자 이력 삭제 완료 ✅");
      fetchInvestments();
    } catch (err) {
      console.error(err);
      message.error("투자 이력 삭제 실패 ❌");
    }
  };

  const investmentColumns = [
    {
      title: "라운드",
      dataIndex: "round",
      key: "round",
    },
    {
      title: "계약일",
      dataIndex: "contract_date",
      key: "contract_date",
    },
    {
      title: "등기일",
      dataIndex: "registration_date",
      key: "registration_date",
    },
    {
      title: "주식수",
      dataIndex: "shares",
      key: "shares",
      render: (v: number) => (v || 0).toLocaleString(),
    },
    {
      title: "투자금",
      dataIndex: "amount",
      key: "amount",
      render: (v: number) => (v || 0).toLocaleString(),
    },
    {
      title: "투자사",
      dataIndex: "investor",
      key: "investor",
    },
    {
      title: "종류",
      dataIndex: "security_type",
      key: "security_type",
    },
    {
      title: "관리",
      key: "actions",
      width: 150,
      render: (record: Investment) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="투자 이력 삭제"
            description="해당 투자 이력을 삭제하시겠습니까?"
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "invest",
      label: "투자 현황",
      children: (
        <>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px solid #f0f0f0",
              marginBottom: 16,
              background: "#fafafa",
            }}
          >
            <Form
              form={form}
              layout="inline"
              onFinish={handleSubmit}
              style={{ rowGap: 8 }}
            >
              <Form.Item
                name="round"
                rules={[{ required: true, message: "라운드를 입력해주세요" }]}
              >
                <Input placeholder="라운드 (예: Pre-A, Series A)" />
              </Form.Item>

              <Form.Item name="contract_date">
                <DatePicker placeholder="계약일" />
              </Form.Item>

              <Form.Item name="registration_date">
                <DatePicker placeholder="등기일" />
              </Form.Item>

              <Form.Item
                name="shares"
                rules={[{ required: true, message: "주식수를 입력해주세요" }]}
              >
                <InputNumber
                  placeholder="주식수"
                  min={0}
                  formatter={(value: string | number | null | undefined) =>
                    value == null || value === ""
                      ? ""
                      : String(value).replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          ","
                        )
                  }
                  parser={(value: string | number | null | undefined) =>
                    value == null || value === ""
                      ? 0
                      : Number(
                          String(value).replace(/,/g, "")
                        )
                  }
                />
              </Form.Item>

              <Form.Item
                name="amount"
                rules={[{ required: true, message: "투자금을 입력해주세요" }]}
              >
                <InputNumber
                  placeholder="투자금"
                  min={0}
                  formatter={(value: string | number | null | undefined) =>
                    value == null || value === ""
                      ? ""
                      : String(value).replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          ","
                        )
                  }
                  parser={(value: string | number | null | undefined) =>
                    value == null || value === ""
                      ? 0
                      : Number(
                          String(value).replace(/,/g, "")
                        )
                  }
                />
              </Form.Item>

              <Form.Item name="investor">
                <Input placeholder="투자사" />
              </Form.Item>

              <Form.Item name="security_type">
                <Input placeholder="종류 (예: RCPS, 보통주)" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                >
                  투자 추가
                </Button>
              </Form.Item>

              <Form.Item>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchInvestments}
                  loading={loading}
                >
                  새로고침
                </Button>
              </Form.Item>
            </Form>
          </div>

          <Table
            columns={investmentColumns}
            dataSource={investments}
            rowKey="id"
            loading={loading}
            pagination={false}
            style={{ marginBottom: 24 }}
          />

          <Card
            title="주주 현황"
            style={{ borderRadius: 12 }}
            variant="borderless"
            styles={{ body: { padding: 16 } }}
          >
            <div style={{ marginBottom: 12 }}>
              <Text>총 발행 주식수: </Text>
              <Text strong>{totalShares.toLocaleString()}</Text>
            </div>

            {shareholderList.length === 0 ? (
              <Text type="secondary">등록된 투자 이력이 없습니다.</Text>
            ) : (
              shareholderList.map((s) => (
                <div key={s.investor} style={{ marginBottom: 12 }}>
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Text strong>{s.investor}</Text>
                    <Text>
                      {s.shares.toLocaleString()}주 ·{" "}
                      {s.percent.toFixed(1)}%
                    </Text>
                  </Space>
                  <Progress
                    percent={Number(s.percent.toFixed(1))}
                    showInfo={false}
                    strokeColor="#5f3bff"
                  />
                </div>
              ))
            )}
          </Card>
        </>
      ),
    },
    {
      key: "loan",
      label: "차입·담보 현황",
      children: (
        <div
          style={{
            marginTop: 24,
            padding: 24,
            borderRadius: 12,
            border: "1px dashed #d9d9d9",
            textAlign: "center",
          }}
        >
          <Text type="secondary">
            차입·담보 현황 페이지는 추후에 구성할 예정입니다.
          </Text>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Title level={3}>재무 현황</Title>
        <Text type="secondary">
          투자, 재무지표, 매출 현황을 통합 관리합니다.
        </Text>

        <Space style={{ marginTop: 24, marginBottom: 16 }} size={16}>
          <Card
            style={{
              width: 220,
              background: "linear-gradient(135deg, #e0f0ff, #c1d4ff)",
              borderRadius: 16,
            }}
            variant="borderless"
          >
            <Text type="secondary">총 투자 유치액</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 20 }}>
                {totalAmount.toLocaleString()}원
              </Text>
            </div>
          </Card>

          <Card
            style={{
              width: 220,
              background: "linear-gradient(135deg, #e0ffe7, #bef5c4)",
              borderRadius: 16,
            }}
            variant="borderless"
          >
            <Text type="secondary">총 발행 주식수</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 20 }}>
                {totalShares.toLocaleString()}주
              </Text>
            </div>
          </Card>

          <Card
            style={{
              width: 220,
              background: "linear-gradient(135deg, #e7e0ff, #d0c3ff)",
              borderRadius: 16,
            }}
            variant="borderless"
          >
            <Text type="secondary">투자 라운드 수</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 20 }}>{roundCount}</Text>
            </div>
          </Card>

          <Card
            style={{
              width: 220,
              background: "linear-gradient(135deg, #ffe0fb, #f4c3ff)",
              borderRadius: 16,
            }}
            variant="borderless"
          >
            <Text type="secondary">주주 수</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 20 }}>
                {shareholderList.length}
              </Text>
            </div>
          </Card>
        </Space>

        <Tabs
          defaultActiveKey="invest"
          items={tabItems}
          style={{ marginTop: 8 }}
        />

        <Modal
          open={editModalOpen}
          title="투자 이력 수정"
          onCancel={() => {
            setEditModalOpen(false);
            setEditingInvestment(null);
            editForm.resetFields();
          }}
          onOk={() => editForm.submit()}
          okText="저장"
          cancelText="취소"
          destroyOnClose
        >
          <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
            <Form.Item
              name="round"
              label="라운드"
              rules={[{ required: true, message: "라운드를 입력해주세요" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="contract_date" label="계약일">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item name="registration_date" label="등기일">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="shares"
              label="주식수"
              rules={[{ required: true, message: "주식수를 입력해주세요" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={(value: string | number | null | undefined) =>
                  value == null || value === ""
                    ? ""
                    : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value: string | number | null | undefined) =>
                  value == null || value === ""
                    ? 0
                    : Number(
                        String(value).replace(/,/g, "")
                      )
                }
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="투자금"
              rules={[{ required: true, message: "투자금을 입력해주세요" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={(value: string | number | null | undefined) =>
                  value == null || value === ""
                    ? ""
                    : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value: string | number | null | undefined) =>
                  value == null || value === ""
                    ? 0
                    : Number(
                        String(value).replace(/,/g, "")
                      )
                }
              />
            </Form.Item>

            <Form.Item name="investor" label="투자사">
              <Input />
            </Form.Item>

            <Form.Item name="security_type" label="종류">
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
}
