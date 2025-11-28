"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  Upload,
  Form,
  Input,
  Select,
  message,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

type IRCategory = "전체" | "IR" | "사진" | "영상" | "브로셔" | "전시회";

interface IRFile {
  id: number;
  original_name: string;
  stored_name: string;
  category: string;
  folder: string | null;
  upload_date: string;
  size: number;
}

const CATEGORY_OPTIONS: IRCategory[] = [
  "전체",
  "IR",
  "사진",
  "영상",
  "브로셔",
  "전시회",
];

const CATEGORY_COLOR: Record<string, string> = {
  IR: "purple",
  사진: "green",
  영상: "geekblue",
  브로셔: "gold",
  전시회: "magenta",
};

function formatFileSize(bytes: number) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx++;
  }
  return `${size.toFixed(1)} ${units[idx]}`;
}

export default function IRPage() {
  const [files, setFiles] = useState<IRFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<IRCategory>("전체");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm] = Form.useForm();
  const [uploadFile, setUploadFile] = useState<any>(null);

  // 🔹 파일 리스트 불러오기
  const fetchFiles = async (category: IRCategory = activeCategory) => {
    try {
      setLoading(true);
      const params =
        category && category !== "전체" ? { category } : undefined;
      const res = await axios.get<IRFile[]>(
        `${API_BASE_URL}/ir`,
        { params }
      );
      setFiles(res.data);
    } catch (err) {
      console.error(err);
      message.error("IR/마케팅 자료 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles("전체");
  }, []);

  const handleCategoryChange = (key: string) => {
    const cat = key as IRCategory;
    setActiveCategory(cat);
    fetchFiles(cat);
  };

  const handleDownload = (file: IRFile) => {
    const base = `${API_BASE_URL}/uploads/ir`;
    const path = file.folder
      ? `${base}/${file.folder}/${file.stored_name}`
      : `${base}/${file.stored_name}`;
    window.open(path, "_blank");
  };

  const handleDelete = async (file: IRFile) => {
    Modal.confirm({
      title: "파일 삭제",
      content: `"${file.original_name}" 파일을 삭제하시겠습니까?`,
      okText: "삭제",
      okType: "danger",
      cancelText: "취소",
      async onOk() {
        try {
          await axios.delete(`${API_BASE_URL}/ir/${file.id}`);
          message.success("삭제 완료 ✅");
          fetchFiles();
        } catch (err) {
          console.error(err);
          message.error("삭제 실패 ❌");
        }
      },
    });
  };

  const handleUploadSubmit = async (values: any) => {
    if (!uploadFile) {
      message.warning("업로드할 파일을 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile as File);
    formData.append("category", values.category || "IR");
    if (values.folder) {
      formData.append("folder", values.folder);
    }

    try {
      await axios.post(`${API_BASE_URL}/ir`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("IR 자료 업로드 완료 ✅");
      setUploadModalOpen(false);
      setUploadFile(null);
      uploadForm.resetFields();
      fetchFiles();
    } catch (err) {
      console.error(err);
      message.error("업로드 실패 ❌");
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Space
          style={{ width: "100%", marginBottom: 24 }}
          align="center"
          justify="space-between"
        >
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              IR/마케팅 자료
            </Title>
            <Text type="secondary">
              회사 홍보 및 IR 자료를 관리합니다.
            </Text>
          </div>

          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalOpen(true)}
          >
            파일 업로드
          </Button>
        </Space>

        {/* 카테고리 탭 */}
        <Tabs
          activeKey={activeCategory}
          onChange={handleCategoryChange}
          style={{ marginBottom: 16 }}
        >
          {CATEGORY_OPTIONS.map((cat) => (
            <TabPane tab={cat} key={cat} />
          ))}
        </Tabs>

        {/* 파일 카드 리스트 */}
        <Row gutter={[16, 16]} loading={loading as any}>
          {files.map((file) => (
            <Col xs={24} sm={12} md={8} lg={6} key={file.id}>
              <Card
                hoverable
                style={{ borderRadius: 16 }}
                styles={{ body: { padding: 16 } }}
              >
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size={8}
                >
                  <Space
                    align="start"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space>
                      <FolderOpenOutlined />
                      <Text strong>{file.original_name}</Text>
                    </Space>

                    {file.category && file.category !== "전체" && (
                      <Tag color={CATEGORY_COLOR[file.category] || "default"}>
                        {file.category}
                      </Tag>
                    )}
                  </Space>

                  {file.folder && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      폴더: {file.folder}
                    </Text>
                  )}

                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      업로드일: {file.upload_date || "-"}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      파일 크기: {formatFileSize(file.size)}
                    </Text>
                  </div>

                  <Space
                    style={{ marginTop: 12, width: "100%" }}
                    align="center"
                    justify="space-between"
                  >
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(file)}
                    >
                      다운로드
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(file)}
                    />
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}

          {!loading && files.length === 0 && (
            <Col span={24} style={{ textAlign: "center", marginTop: 40 }}>
              <Text type="secondary">
                아직 등록된 IR/마케팅 자료가 없습니다.
              </Text>
            </Col>
          )}
        </Row>

        {/* 업로드 모달 */}
        <Modal
          title="IR/마케팅 자료 업로드"
          open={uploadModalOpen}
          onCancel={() => {
            setUploadModalOpen(false);
            setUploadFile(null);
            uploadForm.resetFields();
          }}
          onOk={() => uploadForm.submit()}
          okText="업로드"
          cancelText="취소"
          destroyOnHidden
        >
          <Form form={uploadForm} layout="vertical" onFinish={handleUploadSubmit}>
            <Form.Item label="파일" required>
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                onChange={(info) => {
                  const fileList = info.fileList;
                  if (fileList.length > 0) {
                    setUploadFile(fileList[0].originFileObj);
                  } else {
                    setUploadFile(null);
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>파일 선택</Button>
              </Upload>
            </Form.Item>

            <Form.Item name="category" label="구분" initialValue="IR">
              <Select>
                <Select.Option value="IR">IR</Select.Option>
                <Select.Option value="사진">사진</Select.Option>
                <Select.Option value="영상">영상</Select.Option>
                <Select.Option value="브로셔">브로셔</Select.Option>
                <Select.Option value="전시회">전시회</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="folder"
              label="폴더명 (선택)"
              tooltip='예: "Formnext2025", "SEMI2026" 등'
            >
              <Input placeholder="폴더명을 입력하지 않으면 기본 IR 폴더에 저장됩니다." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
}
