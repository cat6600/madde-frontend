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
  Modal,
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

interface IPRecord {
  id: number;
  title: string;
  number: string;
  apply_date: string | null;
  reg_date: string | null;
  inventors: string | null;
  status: string | null;
}

interface IPFile {
  id: number;
  ip_id: number;
  original_name: string;
  stored_name: string;
  upload_date: string;
  size: number;
}

export default function IPPage() {
  const [data, setData] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 🔹 파일 관리 모달 상태
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [currentIP, setCurrentIP] = useState<IPRecord | null>(null);
  const [ipFiles, setIpFiles] = useState<IPFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  /** 📦 IP 목록 불러오기 */
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

  /** ➕ IP 등록 */
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

  /** 🗑 IP 삭제 */
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

  // ================================
  // 📎 파일 관리 모달 관련 로직
  // ================================
  const openFileModal = async (record: IPRecord) => {
    setCurrentIP(record);
    setFileModalOpen(true);
    setSelectedFiles(null);
    await fetchIpFiles(record.id);
  };

  const closeFileModal = () => {
    setFileModalOpen(false);
    setCurrentIP(null);
    setIpFiles([]);
    setSelectedFiles(null);
  };

  const fetchIpFiles = async (ipId: number) => {
    try {
      setFilesLoading(true);
      const res = await axios.get<IPFile[]>(`${API_BASE_URL}/ip/${ipId}/files`);
      setIpFiles(res.data);
    } catch (error) {
      console.error(error);
      message.error("IP 파일 목록 불러오기 실패 ❌");
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUploadFiles = async () => {
    if (!currentIP) return;
    if (!selectedFiles || selectedFiles.length === 0) {
      message.warning("업로드할 파일을 선택해 주세요.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      // ✅ 백엔드 파라미터 이름: files: List[UploadFile] = File(...)
      Array.from(selectedFiles).forEach((file) => {
        formData.append("files", file);
      });

      await axios.post(
        `${API_BASE_URL}/ip/${currentIP.id}/files`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      message.success("파일 업로드 완료 ✅");
      setSelectedFiles(null);

      // input 값 초기화
      const inputEl = document.getElementById(
        "ip-file-input"
      ) as HTMLInputElement | null;
      if (inputEl) inputEl.value = "";

      await fetchIpFiles(currentIP.id);
    } catch (error) {
      console.error(error);
      message.error("파일 업로드 실패 ❌");
    } finally {
      setUploading(false);
    }
  };

  /** 🗑 개별 파일 삭제 */
  const handleDeleteFile = async (fileId: number) => {
    if (!currentIP) return;
    try {
      await axios.delete(`${API_BASE_URL}/ip/files/${fileId}`);
      message.success("파일 삭제 완료 ✅");
      await fetchIpFiles(currentIP.id);
    } catch (error) {
      console.error(error);
      message.error("파일 삭제 실패 ❌");
    }
  };

  /** 📎 파일 URL */
  const buildFileUrl = (storedName: string) =>
    `${API_BASE_URL}/uploads/ip/${storedName}`;

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
      title: "파일",
      key: "files",
      width: 120,
      render: (_: any, record: IPRecord) => (
        <Button
          size="small"
          icon={<PaperClipOutlined />}
          onClick={() => openFileModal(record)}
        >
          파일 관리
        </Button>
      ),
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

        {/* 등록 폼 */}
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
          pagination={{ pageSize: 10 }}
          size="middle"
        />

        {/* 파일 관리 모달 */}
        <Modal
          title={
            currentIP
              ? `파일 관리 - [${currentIP.id}] ${currentIP.title}`
              : "파일 관리"
          }
          open={fileModalOpen}
          onCancel={closeFileModal}
          footer={null}
          destroyOnClose
        >
          {/* 파일 업로드 영역 */}
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              border: "1px dashed #d9d9d9",
            }}
          >
            <Text strong>파일 업로드</Text>
            <div style={{ marginTop: 8 }}>
              <input
                id="ip-file-input"
                type="file"
                multiple
                onChange={handleFileInputChange}
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              {selectedFiles && selectedFiles.length > 0
                ? `${selectedFiles.length}개 파일 선택됨`
                : "선택된 파일 없음"}
            </div>
            <div style={{ marginTop: 8 }}>
              <Button
                type="primary"
                onClick={handleUploadFiles}
                loading={uploading}
              >
                업로드
              </Button>
            </div>
          </div>

          {/* 기존 파일 리스트 */}
          <Text strong>등록된 파일</Text>
          <Table
            style={{ marginTop: 8 }}
            size="small"
            rowKey="id"
            loading={filesLoading}
            pagination={false}
            dataSource={ipFiles}
            columns={[
              {
                title: "파일명",
                dataIndex: "original_name",
                key: "original_name",
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
                render: (v: number) =>
                  v ? `${(v / 1024).toFixed(1)} KB` : "-",
              },
              {
                title: "다운로드",
                key: "download",
                width: 100,
                render: (_: any, record: IPFile) => (
                  <a
                    href={buildFileUrl(record.stored_name)}
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
                width: 80,
                render: (_: any, record: IPFile) => (
                  <Popconfirm
                    title="파일 삭제"
                    description={`"${record.original_name}" 파일을 삭제하시겠습니까?`}
                    okText="삭제"
                    cancelText="취소"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDeleteFile(record.id)}
                  >
                    <Button size="small" danger>
                      삭제
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Modal>
      </div>
    </AppLayout>
  );
}
