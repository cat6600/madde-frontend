"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  InputNumber,
  Table,
  Typography,
  Space,
  message,
  Form,
  DatePicker,
  Tabs,
  Card,
} from "antd";
import {
  ReloadOutlined,
  SaveOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title, Text } = Typography;

interface PersonnelRow {
  person_id: number;
  name: string;
  department: string;
  salary: number;
  shares: Record<string, number>;
  total_percent: number;
  total_amount: number;
}

interface EquipmentRow {
  equipment_id: number;
  name: string;
  acquisition_cost: number;
  acquisition_date: string;
  shares: Record<string, number>;
  total_percent: number;
  total_amount: number;
}

interface AssetsResponse {
  projects: string[];
  personnel_rows: PersonnelRow[];
  personnel_salary_total: number;
  personnel_grand_total: number;
  equipment_rows: EquipmentRow[];
  equipment_acquisition_total: number;
  equipment_grand_total: number;
}

export default function AssetsPage() {
  const [projects, setProjects] = useState<string[]>([]);
  const [personnelRows, setPersonnelRows] = useState<PersonnelRow[]>([]);
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([]);
  const [personnelSalaryTotal, setPersonnelSalaryTotal] = useState<number>(0);
  const [personnelGrandTotal, setPersonnelGrandTotal] = useState<number>(0);
  const [equipmentAcqTotal, setEquipmentAcqTotal] = useState<number>(0);
  const [equipmentGrandTotal, setEquipmentGrandTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [personForm] = Form.useForm();
  const [equipForm] = Form.useForm();

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await axios.get<AssetsResponse>(`${API_BASE_URL}/assets`);
      setProjects(res.data.projects || []);
      setPersonnelRows(res.data.personnel_rows || []);
      setEquipmentRows(res.data.equipment_rows || []);
      setPersonnelSalaryTotal(res.data.personnel_salary_total || 0);
      setPersonnelGrandTotal(res.data.personnel_grand_total || 0);
      setEquipmentAcqTotal(res.data.equipment_acquisition_total || 0);
      setEquipmentGrandTotal(res.data.equipment_grand_total || 0);
    } catch (err) {
      console.error(err);
      message.error("현물 데이터 불러오기 실패 ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const recalcPersonnelRow = (row: PersonnelRow): PersonnelRow => {
    const totalPercent = Object.values(row.shares || {}).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );
    const totalAmount = (row.salary || 0) * (totalPercent / 100.0);
    return {
      ...row,
      total_percent: totalPercent,
      total_amount: Math.round(totalAmount),
    };
  };

  const recalcEquipmentRow = (row: EquipmentRow): EquipmentRow => {
    const totalPercent = Object.values(row.shares || {}).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );
    const totalAmount =
      (row.acquisition_cost || 0) * (totalPercent / 100.0);
    return {
      ...row,
      total_percent: totalPercent,
      total_amount: Math.round(totalAmount),
    };
  };

  const recalcPersonnelGrand = (rows: PersonnelRow[]) =>
    rows.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const recalcEquipmentGrand = (rows: EquipmentRow[]) =>
    rows.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const handlePersonnelShareChange = (
    person_id: number,
    projectTitle: string,
    value: number | null
  ) => {
    const newRows = personnelRows.map((row) => {
      if (row.person_id !== person_id) return row;
      const newShares = {
        ...(row.shares || {}),
        [projectTitle]: value ?? 0,
      };
      return recalcPersonnelRow({ ...row, shares: newShares });
    });
    setPersonnelRows(newRows);
    setPersonnelGrandTotal(recalcPersonnelGrand(newRows));
  };

  const handleSavePersonnelRow = async (row: PersonnelRow) => {
    try {
      await axios.put(
        `${API_BASE_URL}/personnel/${row.person_id}/shares`,
        { shares: row.shares }
      );
      message.success(`"${row.name}" 인건비 배분율 저장 완료 ✅`);
      fetchAssets();
    } catch (err) {
      console.error(err);
      message.error("인건비 배분율 저장 실패 ❌");
    }
  };

  const handleEquipmentShareChange = (
    equipment_id: number,
    projectTitle: string,
    value: number | null
  ) => {
    const newRows = equipmentRows.map((row) => {
      if (row.equipment_id !== equipment_id) return row;
      const newShares = {
        ...(row.shares || {}),
        [projectTitle]: value ?? 0,
      };
      return recalcEquipmentRow({ ...row, shares: newShares });
    });
    setEquipmentRows(newRows);
    setEquipmentGrandTotal(recalcEquipmentGrand(newRows));
  };

  const handleSaveEquipmentRow = async (row: EquipmentRow) => {
    try {
      await axios.put(
        `${API_BASE_URL}/equipment/${row.equipment_id}/shares`,
        { shares: row.shares }
      );
      message.success(`"${row.name}" 장비 배분율 저장 완료 ✅`);
      fetchAssets();
    } catch (err) {
      console.error(err);
      message.error("장비 배분율 저장 실패 ❌");
    }
  };

  const handleAddPerson = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("department", values.department || "");
      formData.append("salary", String(values.salary || 0));

      await axios.post(`${API_BASE_URL}/personnel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("인건비 인력 등록 완료 ✅");
      personForm.resetFields();
      fetchAssets();
    } catch (err) {
      console.error(err);
      message.error("인건비 인력 등록 실패 ❌");
    }
  };

  const handleAddEquipment = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append(
        "acquisition_cost",
        String(values.acquisition_cost || 0)
      );
      formData.append(
        "acquisition_date",
        values.acquisition_date
          ? values.acquisition_date.format("YYYY-MM-DD")
          : ""
      );

      await axios.post(`${API_BASE_URL}/equipment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("장비 등록 완료 ✅");
      equipForm.resetFields();
      fetchAssets();
    } catch (err) {
      console.error(err);
      message.error("장비 등록 실패 ❌");
    }
  };

  // 인건비 테이블 컬럼
  const personnelColumns: any[] = [
    {
      title: "참여자",
      dataIndex: "name",
      key: "name",
      fixed: "left" as const,
    },
    {
      title: "부서",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "연봉(천원)",
      dataIndex: "salary",
      key: "salary",
      width: 120,
      render: (v: number) => (v || 0).toLocaleString(),
    },
  ];

  projects.forEach((proj) => {
    personnelColumns.push({
      title: proj,
      dataIndex: ["shares", proj],
      key: proj,
      width: 120,
      render: (_: any, record: PersonnelRow) => {
        const value = record.shares?.[proj] ?? 0;
        return (
          <InputNumber
            min={0}
            max={200}
            value={value}
            formatter={(
              val: number | string | null | undefined
            ): string =>
              val !== undefined && val !== null
                ? String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                : ""
            }
            parser={(val) =>
              val ? Number(String(val).replace(/,/g, "")) : 0
            }
            onChange={(val) =>
              handlePersonnelShareChange(
                record.person_id,
                proj,
                val !== null && val !== undefined ? Number(val) : null
              )
            }
          />
        );
      },
    });
  });

  personnelColumns.push(
    {
      title: "합계(%)",
      dataIndex: "total_percent",
      key: "total_percent",
      width: 100,
      render: (v: number) => {
        const val = v || 0;
        const isOver = val > 100;
        return (
          <Text type={isOver ? "danger" : undefined} strong={isOver}>
            {val.toFixed(1)}%
          </Text>
        );
      },
    },
    {
      title: "합계 금액",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 120,
      render: (v: number) => (v || 0).toLocaleString(),
    },
    {
      title: "저장",
      key: "save",
      width: 90,
      render: (_: any, record: PersonnelRow) => (
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          onClick={() => handleSavePersonnelRow(record)}
        >
          저장
        </Button>
      ),
    }
  );

  // 장비 테이블 컬럼
  const equipmentColumns: any[] = [
    {
      title: "장치명",
      dataIndex: "name",
      key: "name",
      fixed: "left" as const,
    },
    {
      title: "취득액(천원)",
      dataIndex: "acquisition_cost",
      key: "acquisition_cost",
      width: 140,
      render: (v: number) => (v || 0).toLocaleString(),
    },
    {
      title: "취득일자",
      dataIndex: "acquisition_date",
      key: "acquisition_date",
      width: 120,
      render: (v: string) => v || "-",
    },
  ];

  projects.forEach((proj) => {
    equipmentColumns.push({
      title: proj,
      dataIndex: ["shares", proj],
      key: proj,
      width: 120,
      render: (_: any, record: EquipmentRow) => {
        const value = record.shares?.[proj] ?? 0;
        return (
          <InputNumber
            min={0}
            max={200}
            value={value}
            formatter={(
              val: number | string | null | undefined
            ): string =>
              val !== undefined && val !== null
                ? String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                : ""
            }
            parser={(val) =>
              val ? Number(String(val).replace(/,/g, "")) : 0
            }
            onChange={(val) =>
              handleEquipmentShareChange(
                record.equipment_id,
                proj,
                val !== null && val !== undefined ? Number(val) : null
              )
            }
          />
        );
      },
    });
  });

  equipmentColumns.push(
    {
      title: "합계(%)",
      dataIndex: "total_percent",
      key: "total_percent",
      width: 100,
      render: (v: number) => {
        const val = v || 0;
        const isOver = val > 100;
        return (
          <Text type={isOver ? "danger" : undefined} strong={isOver}>
            {val.toFixed(1)}%
          </Text>
        );
      },
    },
    {
      title: "합계 금액",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 120,
      render: (v: number) => (v || 0).toLocaleString(),
    },
    {
      title: "저장",
      key: "save",
      width: 90,
      render: (_: any, record: EquipmentRow) => (
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          onClick={() => handleSaveEquipmentRow(record)}
        >
          저장
        </Button>
      ),
    }
  );

  const personnelRatio =
    personnelSalaryTotal > 0
      ? (personnelGrandTotal / personnelSalaryTotal) * 100
      : 0;

  const equipmentRatio =
    equipmentAcqTotal > 0
      ? (equipmentGrandTotal / equipmentAcqTotal) * 100
      : 0;

  const tabItems = [
    {
      key: "personnel",
      label: "인건비",
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
              form={personForm}
              layout="inline"
              onFinish={handleAddPerson}
              style={{ rowGap: 8 }}
            >
              <Form.Item
                name="name"
                rules={[{ required: true, message: "이름을 입력해주세요" }]}
              >
                <Input placeholder="참여자 이름" />
              </Form.Item>

              <Form.Item name="department">
                <Input placeholder="부서" />
              </Form.Item>

              <Form.Item
                name="salary"
                rules={[{ required: true, message: "연봉을 입력해주세요" }]}
              >
                <InputNumber
                  placeholder="연봉(천원)"
                  min={0}
                  formatter={(
                    v: number | string | null | undefined
                  ): string =>
                    v !== undefined && v !== null
                      ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : ""
                  }
                  parser={(v) =>
                    v ? Number(String(v).replace(/,/g, "")) : 0
                  }
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                >
                  인력 추가
                </Button>
              </Form.Item>

              <Form.Item>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchAssets}
                  loading={loading}
                >
                  새로고침
                </Button>
              </Form.Item>
            </Form>
          </div>

          <Table
            columns={personnelColumns}
            dataSource={personnelRows}
            rowKey="person_id"
            loading={loading}
            pagination={false}
            scroll={{ x: true }}
          />
        </>
      ),
    },
    {
      key: "equipment",
      label: "기계장치",
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
              form={equipForm}
              layout="inline"
              onFinish={handleAddEquipment}
              style={{ rowGap: 8 }}
            >
              <Form.Item
                name="name"
                rules={[{ required: true, message: "장치명을 입력해주세요" }]}
              >
                <Input placeholder="장치명 (예: S1, MCT-01 등)" />
              </Form.Item>

              <Form.Item
                name="acquisition_cost"
                rules={[
                  { required: true, message: "취득액을 입력해주세요" },
                ]}
              >
                <InputNumber
                  placeholder="취득액(천원)"
                  min={0}
                  formatter={(
                    v: number | string | null | undefined
                  ): string =>
                    v !== undefined && v !== null
                      ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : ""
                  }
                  parser={(v) =>
                    v ? Number(String(v).replace(/,/g, "")) : 0
                  }
                />
              </Form.Item>

              <Form.Item
                name="acquisition_date"
                rules={[
                  { required: true, message: "취득일자를 선택해주세요" },
                ]}
              >
                <DatePicker placeholder="취득일자" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                >
                  장비 추가
                </Button>
              </Form.Item>

              <Form.Item>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchAssets}
                  loading={loading}
                >
                  새로고침
                </Button>
              </Form.Item>
            </Form>
          </div>

          <Table
            columns={equipmentColumns}
            dataSource={equipmentRows}
            rowKey="equipment_id"
            loading={loading}
            pagination={false}
            scroll={{ x: true }}
          />
        </>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: 24 }}>
        <Title level={3}>현물 현황</Title>
        <Text type="secondary">
          인건비 및 기계장치의 과제별 현물 배분 현황을 관리합니다.
        </Text>

        <Space style={{ marginTop: 24, marginBottom: 16 }} size={16}>
          <Card
            style={{
              width: 360,
              background: "linear-gradient(135deg, #e0f7ff, #c3e4ff)",
              borderRadius: 16,
            }}
            variant="borderless"
          >
            <Text strong>인건비 현황</Text>
            <div style={{ marginTop: 8 }}>
              <Text>전체 총 인건비 합계: </Text>
              <Text strong>
                {personnelSalaryTotal.toLocaleString()} (천원)
              </Text>
            </div>
            <div>
              <Text>전체 현물 인건비 합계: </Text>
              <Text strong>
                {personnelGrandTotal.toLocaleString()} (천원)
              </Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text>현물 비율: </Text>
              <Text strong style={{ fontSize: 20 }}>
                {personnelRatio.toFixed(1)}%
              </Text>
            </div>
          </Card>

          <Card
            style={{
              width: 360,
              background: "linear-gradient(135deg, #e7e0ff, #d0c3ff)",
              borderRadius: 16,
            }}
            variant="borderless"
          >
            <Text strong>기계장치 현황</Text>
            <div style={{ marginTop: 8 }}>
              <Text>전체 총 취득액 합계: </Text>
              <Text strong>
                {equipmentAcqTotal.toLocaleString()} (천원)
              </Text>
            </div>
            <div>
              <Text>전체 현물 장비비 합계: </Text>
              <Text strong>
                {equipmentGrandTotal.toLocaleString()} (천원)
              </Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text>현물 비율: </Text>
              <Text strong style={{ fontSize: 20 }}>
                {equipmentRatio.toFixed(1)}%
              </Text>
            </div>
          </Card>
        </Space>

        <Tabs
          defaultActiveKey="personnel"
          style={{ marginTop: 8 }}
          items={tabItems}
        />
      </div>
    </AppLayout>
  );
}
