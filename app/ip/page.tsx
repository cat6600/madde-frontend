"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  DatePicker,
  Table,
  Typography,
  Space,
  message,
  Popconfirm,
} from "antd";
import {
  ReloadOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title, Text } = Typography;

interface IPRecord {
  id: number;
  title: string;
  number: string;
  apply_date: string;
  reg_date: string;
  inventors: string;
  status: string;
}

export default function IPPage() {
  const [data, setData] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get<IPRecord[]>(`${API_BASE_URL}/ip`);
      setData(res.data);
    } catch (error) {
      console.error(error);
      message.error("IP 데이터 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onFinish = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("number", values.number);
      formData.append(
        "apply_date",
        values.apply_date ? values.apply_date.format("YYYY-MM-DD") : ""
      );
      formData.append(
        "reg_date",
        values.reg_date ? values.reg_date.format("YYYY-MM-DD") : ""
      );
      formData.append("inventors", values.inventors || "");
      formData.append("status", values.status || "");

      await axios.post(`${API_BASE_URL}/ip`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("IP 등록 완료 ✅");
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error(error);
      message.error("IP 등록 실패 ❌");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/ip/${id}`);
      message.success("IP 삭제 완료 ✅");
      fetchData();
    } catch (error) {
      console.error(error);
      message.error("IP 삭제 실패 ❌");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "제목",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "번호",
      dataIndex: "number",
      key: "number",
    },
    {
      title: "출원일",
      dataIndex: "apply_date",
      key: "apply_date",
      width: 110,
      render: (v: string | null) => v || "-",
    },
    {
      title: "등록일",
      dataIndex: "reg_date",
      key: "reg_date",
      width: 110,
      render: (v: string | null) => v || "-",
    },
    {
      title: "발명자",
      dataIndex: "inventors",
      key: "inventors",
      render: (v: string | null) => v || "-",
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: string | null) => v || "-",
    },
    {
      title: "관리",
      key: "actions",
      width: 90,
      render: (_: any, record: IPRecord) => (
        <Popconfirm
          title="IP 삭제"
          description={`"${record.title}" 항목을 삭제하시겠습니까?`}
          okText="삭제"
          cancelText="취소"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(record.id)}
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            삭제
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Title level={3}>💡 IP 현황</Title>
        <Text type="secondary">
          특허·디자인·상표 등 회사 IP 현황을 관리합니다.
        </Text>

        <div
          style={{
            marginTop: 24,
            marginBottom: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid #f0f0f0",
            background: "#fafafa",
          }}
        >
          <Form
            form={form}
            layout="inline"
            onFinish={onFinish}
            style={{ rowGap: 8 }}
          >
            <Form.Item
              name="title"
              rules={[{ required: true, message: "제목을 입력해주세요" }]}
            >
              <Input placeholder="IP 제목 (예: RBSC 세라믹 부품 제조 방법)" />
            </Form.Item>

            <Form.Item
              name="number"
              rules={[{ required: true, message: "번호를 입력해주세요" }]}
            >
              <Input placeholder="출원/등록 번호" />
            </Form.Item>

            <Form.Item name="apply_date">
              <DatePicker placeholder="출원일" />
            </Form.Item>

            <Form.Item name="reg_date">
              <DatePicker placeholder="등록일" />
            </Form.Item>

            <Form.Item name="inventors">
              <Input placeholder="발명자(들)" />
            </Form.Item>

            <Form.Item name="status">
              <Input placeholder="상태 (출원중 / 등록 / 거절 등)" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
              >
                등록
              </Button>
            </Form.Item>
          </Form>
        </div>

        <Space style={{ marginBottom: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            새로고침
          </Button>
        </Space>

        <Table
          style={{ marginTop: 8 }}
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </div>
    </AppLayout>
  );
}
