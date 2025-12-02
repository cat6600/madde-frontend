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
  participants?: string; // 화면에서는 '과제명' 텍스트로 사용
  files?: string[];
  last_updated?: string;
}

type StatusColorMap = Record<string, string>;

const statusColors: StatusColorMap = {
  진행중: "green",
  신청예정: "blue",
  신청완료: "orange",
  미지원: "red",
  선정완료: "purple",
};

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
    } catch (error) {
      console.error(error);
      message.error("데이터 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  /** 📤 파일 업로드 (단일 파일) */
  const handleFileUpload = async (id: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_BASE_URL}/projects/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("파일 업로드 완료 ✅");
      fetchProjects();
    } catch (error) {
      console.error(error);
      message.error("업로드 실패 ❌");
    }

    // antd Upload에서 실제 업로드는 우리가 직접 했으니
    // 기본 업로드 동작은 막기 위해 false 반환
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
      setSelectedProject((prev) => (prev?.id === id ? null : prev));
    } catch (error) {
      console.error(error);
      message.error("삭제 실패 ❌");
    }
  };

  /** ✏️ 수정 버튼 클릭 시 */
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
      due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
    };

    try {
      if (isEditMode && currentId !== null) {
        await axios.put(`${API_BASE_URL}/projects/${currentId}`, payload);
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
    } catch (error) {
      console.error(error);
      message.error("저장 실패 ❌");
    }
  };

  /** 📋 테이블 컬럼 */
  const columns = [
    {
      // 1열: 과제명 → 사업명 (DB 필드는 title)
      title: "사업명",
      dataIndex: "title",
      key: "title",
      width: 260,
    },
    {
      title: "주관기관",
      dataIndex: "organization",
      key: "organization",
      width: 150,
      render: (t: string | undefined) =>
        t ? (
          <Tag
            color="purple"
            style={{
              maxWidth: 130,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "inline-block",
            }}
          >
            {t}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "유형",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (t: string | undefined) =>
        t ? <Tag color={t === "R&D" ? "blue" : "green"}>{t}</Tag> : "—",
    },
    { title: "수행기간", dataIndex: "period", key: "period", width: 140 },
    {
      title: "지원금",
      dataIndex: "budget",
      key: "budget",
      width: 120,
      render: (v: number | null | undefined) => {
        if (v === undefined || v === null || isNaN(Number(v))) return "—";
        return `${Number(v).toLocaleString()}억 원`;
      },
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string | undefined) =>
        s ? <Tag color={statusColors[s] || "default"}>{s}</Tag> : "—",
    },
    {
      title: "신청 마감일",
      dataIndex: "due_date",
      key: "due_date",
      width: 130,
      render: (d: string | null | undefined) => d || "—",
    },
    {
      // participants를 '과제명'으로 사용
      title: "과제명",
      dataIndex: "participants",
      key: "participants",
      width: 330,
      render: (t: string | undefined) => t || "—",
    },
    {
      title: "작업",
      key: "actions",
      width: 140,
      render: (_: any, record: Project) => (
        <Space size="small">
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            title="수정"
            onClick={() => handleEdit(record)}
          />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            title="삭제"
            onClick={() => handleDelete(record.id)}
          />
          <Upload
            beforeUpload={(file) => handleFileUpload(record.id, file as File)}
            showUploadList={false}
          >
            <Button
              size="small"
              type="text"
              icon={<UploadOutlined />}
              title="파일 업로드"
            />
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
            size="middle"
            scroll={{ x: 1300 }}
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
            <p>📌 과제명: {selectedProject.participants || "—"}</p>
            <p>🕓 최근 수정일: {selectedProject.last_updated || "—"}</p>

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
          destroyOnClose
        >
          <Form form={form} onFinish={handleAddOrUpdate} layout="vertical">
            <Form.Item
              name="title"
              label="사업명"
              rules={[{ required: true, message: "사업명을 입력해주세요" }]}
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
            <Form.Item name="participants" label="과제명">
              <Input placeholder="예: 내부 과제명 / 세부 과제명" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
}
