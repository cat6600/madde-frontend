"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Select,
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
  PaperClipOutlined,
} from "@ant-design/icons";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

interface IRRecord {
  id: number;
  original_name: string;
  stored_name: string;
  category: string;
  folder: string | null;
  upload_date: string;
  size: number;
}

export default function IRPage() {
  const [data, setData] = useState<IRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get<IRRecord[]>(`${API_BASE_URL}/ir`);
      setData(res.data);
    } catch (error) {
      console.error(error);
      message.error("IR/마케팅 자료 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const onFinish = async (values: any) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      message.warning("업로드할 파일을 선택해 주세요.");
      return;
    }

    try:
      setUploading(true);

      const formData = new FormData();
      // ✅ 파일 여러 개 모두 append
      Array.from(selectedFiles).forEach((file) => {
        formData.append("file", file); // 백엔드는 file: List[UploadFile]
      });

      formData.append("category", values.category || "IR");
      formData.append("folder", values.folder || "");

      await axios.post(`${API_BASE_URL}/ir`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("IR 자료 업로드 완료 ✅");
      form.resetFields();
      setSelectedFiles(null);
      // 파일 input 비우기
      const el = document.getElementById(
        "ir-file-input"
      ) as HTMLInputElement | null;
      if (el) el.value = "";
      fetchData();
    } catch (error) {
      console.error(error);
      message.error("IR 자료 업로드 실패 ❌");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, original: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/ir/${id}`);
      message.success(`"${original}" 삭제 완료 ✅`);
      fetchData();
    } catch (error) {
      console.error(error);
      message.error("IR 자료 삭제 실패 ❌");
    }
  };

  const buildFileUrl = (storedName: string, folder?: string | null) => {
    // 백엔드에서 uploads/ir(/folder)/stored_name 구조로 저장하므로,
    // 여기서는 단순히 /uploads/ir(/folder)/stored_name 으로 링크 생성
    if (folder) {
      return `${API_BASE_URL}/uploads/ir/${folder}/${storedName}`;
    }
    return `${API_BASE_URL}/uploads/ir/${storedName}`;
  };

  const columns = [
    {
      title: "파일명",
      dataIndex: "original_name",
      key: "original_name",
    },
    {
      title: "카테고리",
      dataIndex: "category",
      key: "category",
      width: 120,
    },
    {
      title: "폴더",
      dataIndex: "folder",
      key: "folder",
      width: 140,
      render: (v: string | null) => v || "-",
    },
    {
      title: "업로드일",
      dataIndex: "upload_date",
      key: "upload_date",
      width: 110,
    },
    {
      title: "크기",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (v: number) => (v ? `${(v / 1024).toFixed(1)} KB` : "-"),
    },
    {
      title: "보기",
      key: "view",
      width: 100,
      render: (_: any, record: IRRecord) => (
        <a
          href={buildFileUrl(record.stored_name, record.folder)}
          target="_blank"
          rel="noreferrer"
        >
          보기
        </a>
      ),
    },
    {
      title: "관리",
      key: "actions",
      width: 90,
      render: (_: any, record: IRRecord) => (
        <Popconfirm
          title="IR 자료 삭제"
          description={`"${record.original_name}" 파일을 삭제하시겠습니까?`}
          okText="삭제"
          cancelText="취소"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(record.id, record.original_name)}
        >
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
          >
            삭제
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Title level={3}>📂 IR / 마케팅 자료</Title>
        <Text type="secondary">
          피치덱, 브로셔, 전시회 자료, 사진/영상 등 마케팅 자료를 업로드하고 관리합니다.
        </Text>

        {/* 업로드 폼 */}
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
            <Form.Item name="category" initialValue="IR">
              <Select style={{ width: 160 }}>
                <Option value="IR">IR</Option>
                <Option value="브로셔">브로셔</Option>
                <Option value="전시회">전시회</Option>
                <Option value="사진">사진</Option>
                <Option value="영상">영상</Option>
                <Option value="기타">기타</Option>
              </Select>
            </Form.Item>

            <Form.Item name="folder">
              <Input placeholder="폴더명 (예: Formnext2025)" />
            </Form.Item>

            <Form.Item>
              <div>
                <Button
                  type="default"
                  icon={<PaperClipOutlined />}
                  onClick={() => {
                    const el = document.getElementById(
                      "ir-file-input"
                    ) as HTMLInputElement | null;
                    if (el) el.click();
                  }}
                >
                  파일 선택(다중)
                </Button>
                <input
                  id="ir-file-input"
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <div style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
                  {selectedFiles && selectedFiles.length > 0
                    ? `${selectedFiles.length}개 파일 선택됨`
                    : "선택된 파일 없음"}
                </div>
              </div>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={uploading}
              >
                업로드
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* 새로고침 */}
        <Space style={{ marginBottom: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            새로고침
          </Button>
        </Space>

        {/* 목록 테이블 */}
        <Table
          style={{ marginTop: 8 }}
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </div>
    </AppLayout>
  );
}
