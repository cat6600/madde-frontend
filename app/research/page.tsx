"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Upload,
  message,
  Typography,
  Form,
  Input,
  InputNumber,
  DatePicker,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title } = Typography;

interface ResearchRecord {
  id: number;
  sample_type: string;
  property: string;
  value: number;
  tester: string;
  test_date: string;
  filename: string | null;
}

export default function ResearchPage() {
  const [data, setData] = useState<ResearchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get<ResearchRecord[]>(
        `${API_BASE_URL}/research`
      );
      setData(res.data);
    } catch {
      message.error("데이터 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteData = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/research/${id}`);
      message.success("삭제 완료 ✅");
      fetchData();
    } catch {
      message.error("삭제 실패 ❌");
    }
  };

  const onFinish = async (values: any) => {
    const formData = new FormData();
    formData.append("sample_type", values.sample_type);
    formData.append("property", values.property);
    formData.append("value", values.value);
    formData.append("tester", values.tester);
    formData.append("test_date", values.test_date.format("YYYY-MM-DD"));

    if (values.file && values.file.file) {
      formData.append("file", values.file.file);
    }

    try {
      await axios.post(`${API_BASE_URL}/research`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("연구 데이터 등록 완료 ✅");
      form.resetFields();
      fetchData();
    } catch {
      message.error("업로드 실패 ❌");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "시편 종류", dataIndex: "sample_type", key: "sample_type" },
    { title: "물성 항목", dataIndex: "property", key: "property" },
    { title: "측정 값", dataIndex: "value", key: "value" },
    { title: "시험자", dataIndex: "tester", key: "tester" },
    { title: "시험 일자", dataIndex: "test_date", key: "test_date" },
    {
      title: "파일",
      dataIndex: "filename",
      key: "filename",
      render: (filename: string | null) =>
        filename ? (
          <a
            href={`${API_BASE_URL}/uploads/${filename}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {filename}
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: "삭제",
      key: "delete",
      render: (record: ResearchRecord) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => deleteData(record.id)}
        >
          삭제
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Title level={3}>🔬 연구 데이터 관리</Title>

        <Form
          form={form}
          layout="inline"
          onFinish={onFinish}
          style={{ marginBottom: 24 }}
        >
          <Form.Item name="sample_type" rules={[{ required: true }]}>
            <Input placeholder="시편 종류 (RBSC/RSiC)" />
          </Form.Item>
          <Form.Item name="property" rules={[{ required: true }]}>
            <Input placeholder="물성 항목 (예: 강도)" />
          </Form.Item>
          <Form.Item name="value" rules={[{ required: true }]}>
            <InputNumber placeholder="측정 값" />
          </Form.Item>
          <Form.Item name="tester" rules={[{ required: true }]}>
            <Input placeholder="시험자" />
          </Form.Item>
          <Form.Item name="test_date" rules={[{ required: true }]}>
            <DatePicker placeholder="시험 일자" />
          </Form.Item>
          <Form.Item
            name="file"
            valuePropName="file"
            getValueFromEvent={(e) => e}
          >
            <Upload beforeUpload={() => false}>
              <Button icon={<UploadOutlined />}>파일</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              등록
            </Button>
          </Form.Item>
        </Form>

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          새로고침
        </Button>

        <Table
          style={{ marginTop: 20 }}
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
        />
      </div>
    </AppLayout>
  );
}
