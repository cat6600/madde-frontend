"use client";

import { API_BASE_URL } from "../lib/api";
import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Typography,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Space,
  Upload,
  List,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  PaperClipOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import AppLayout from "../components/AppLayout";

const { Title } = Typography;

interface Project {
  id: number;
  title: string;
  organization?: string;
  type?: string;
  period?: string;
  budget?: number;
  status?: string;
  due_date?: string | null;
  participants?: string;
  files?: string[];
  last_updated?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [form] = Form.useForm();

  /** 📦 과제 목록 불러오기 */
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get<Project[]>(`${API_BASE_URL}/projects`);
      setProjects(res.data);
    } catch {
      message.error("데이터 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  /** 📤 파일 업로드 */
  const handleFileUpload = async (id: number, file: any) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(
        `${API_BASE_URL}/projects/${id}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      message.success("파일 업로드 완료 ✅");
      fetchProjects();
    } catch {
      message.error("업로드 실패 ❌");
    }
    return false;
  };

  /** 🧾 상세보기 */
  const handleRowClick = (record: Project) => setSelectedProject(record);

  /** 🗑 삭제 */
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${id}`);
      message.success("삭제 완료 ✅");
      fetchProjects();
      setSelectedProject(null);
    } catch {
      message.error("삭제 실패 ❌");
    }
  };

  /** ✏️ 수정 */
  const handleEdit = (record: Project) => {
    setIsEditMode(true);
    setCurrentId(record.id);
    form.setFieldsValue({
      ...record,
      due_date: record.due_date ? dayjs(record.due_date) : null,
    });
    setIsModalOpen(true);
  };

  /** ➕ 추가/수정 저장 */
  const handleAddOrUpdate = async (values: any) => {
    const payload = {
      ...values,
      due_date: values.due_date
        ? values.due_date.format("YYYY-MM-DD")
        : null,
    };

    try {
      if (isEditMode && currentId !== null) {
        await axios.put(
          `${API_BASE_URL}/projects/${currentId}`,
          payload
        );
        message.success("과제 수정 완료 ✅");
      } else {
        await axios.post(`${API_BASE_URL}/projects`, payload);
        message.success("과제 등록 완료 ✅");
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setCurrentId(null);
      form.resetFields();
      fetchProjects();
    } catch {
      message.error("저장 실패 ❌");
    }
  };

  /** 🎨 상태 색상 */
  const statusColors: Record<string, string> = {
    진행중: "green",
    신청예정: "blue",
    신청완료: "orange",
    미지원: "red",
    선정완료: "purple",
  };

  /** 📋 테이블 컬럼 */
  const columns = [
    { title: "과제명", dataIndex: "title", key: "title" },
    {
      title: "주관기관",
      dataIndex: "organization",
      key: "organization",
      render: (t: string) => <Tag color="purple">{t}</Tag>,
    },
    {
      title: "유형",
      dataIndex: "type",
      key: "type",
      render: (t: string) => (
        <Tag color={t === "R&D" ? "blue" : "green"}>{t}</Tag>
      ),
    },
    { title: "수행기간", dataIndex: "period", key: "period" },
    {
      title: "지원금",
      dataIndex: "budget",
      key: "budget",
      render: (v: number | null) => {
        if (v === undefined || v === null || isNaN(Number(v))) return "—";
        return `${Number(v).toLocaleString()}억 원`;
      },
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (s: string) => (
        <Tag color={statusColors[s] || "default"}>{s}</Tag>
      ),
    },
    { title: "신청 마감일", dataIndex: "due_date", key: "due_date" },
    { title: "참여자", dataIndex: "participants", key: "participants" },
    {
      title: "작업",
      key: "actions",
      render: (_: any, record: Project) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            수정
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            삭제
          </Button>
          <Upload
            beforeUpload={(file) => handleFileUpload(record.id, file)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>파일</Button>
          </Upload>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        {/* 헤더 + 등록 버튼 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            📑 과제 지원 현황
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setIsEditMode(false);
              setCurrentId(null);
              setIsModalOpen(true);
            }}
          >
            + 과제 등록
          </Button>
        </div>

        <p>정부 과제 현황 및 관련 문서를 관리합니다.</p>

        {/* 목록 */}
        <Card title="과제 목록" style={{ borderRadius: 12 }}>
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            loading={loading}
            pagination={false}
            onRow={(record) => ({
              onClick: () => handleRowClick(record as Project),
            })}
          />
        </Card>

        {/* 상세보기 */}
        {selectedProject && (
          <Card style={{ marginTop: 20, borderRadius: 12 }}>
            <Title level={4}>{selectedProject.title}</Title>
            <div style={{ marginBottom: 10 }}>
              {selectedProject.organization && (
                <Tag color="purple">{selectedProject.organization}</Tag>
              )}
              {selectedProject.type && (
                <Tag
                  color={
                    selectedProject.type === "R&D" ? "blue" : "green"
                  }
                >
                  {selectedProject.type}
                </Tag>
              )}
              {selectedProject.status && (
                <Tag
                  color={
                    statusColors[selectedProject.status] || "default"
                  }
                >
                  {selectedProject.status}
                </Tag>
              )}
            </div>

            <p>📅 수행기간: {selectedProject.period || "—"}</p>
            <p>
              💰 지원금:{" "}
              {selectedProject.budget !== undefined &&
              selectedProject.budget !== null
                ? (Number(selectedProject.budget) * 100000000).toLocaleString()
                : "—"}
              원
            </p>
            <p>📆 신청 마감일: {selectedProject.due_date || "—"}</p>
            <p>👥 참여자: {selectedProject.participants || "—"}</p>
            <p>
              🕓 최근 수정일: {selectedProject.last_updated || "—"}
            </p>

            <Card
              title="📎 관련 문서"
              style={{ marginTop: 16, borderRadius: 12 }}
            >
              <List
                dataSource={selectedProject.files || []}
                locale={{ emptyText: "등록된 문서가 없습니다." }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <a
                        key="download"
                        href={`${API_BASE_URL}/project_uploads/project_${selectedProject.id}/${item}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <DownloadOutlined /> 다운로드
                      </a>,
                      <a
                        key="view"
                        href={`${API_BASE_URL}/project_uploads/project_${selectedProject.id}/${item}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        👁 보기
                      </a>,
                    ]}
                  >
                    <PaperClipOutlined /> {item}
                  </List.Item>
                )}
              />
            </Card>
          </Card>
        )}

        {/* 등록/수정 모달 */}
        <Modal
          title={isEditMode ? "과제 수정" : "새 과제 등록"}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setIsEditMode(false);
            setCurrentId(null);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          okText="저장"
          cancelText="취소"
          destroyOnHidden
        >
          <Form form={form} onFinish={handleAddOrUpdate} layout="vertical">
            <Form.Item
              name="title"
              label="과제명"
              rules={[{ required: true, message: "과제명을 입력해주세요" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="organization" label="주관기관">
              <Input />
            </Form.Item>
            <Form.Item name="type" label="유형">
              <Input placeholder="예: R&D / 사업화" />
            </Form.Item>
            <Form.Item name="period" label="수행기간">
              <Input placeholder="YYYY-MM-DD ~ YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="budget" label="지원금(억원)">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
            <Form.Item name="status" label="상태">
              <Input placeholder="예: 진행중 / 신청예정 / 선정완료" />
            </Form.Item>
            <Form.Item name="due_date" label="신청 마감일">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="participants" label="참여자">
              <Input placeholder="예: 김철수, 이영희" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
}
