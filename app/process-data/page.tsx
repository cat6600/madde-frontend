"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  Table,
  Card,
  Typography,
  message,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL } from "../lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

interface ProcessOrder {
  id: number;
  company_name: string;
  quote_date: string;
  category: string; // RBSC / RSiC / WAAM / 기타
  product_name: string;
  quantity: number;
  unit_manufacturing_cost: number;
  total_quote_price: number;
  status: string; // 견적중 / 제작중 / 납품완료 / 미진행
}

interface ProcessTracking {
  id: number;
  order_id: number;
  product_volume_cm3?: number | null;
  printing_time_hr?: number | null;
  bed_density?: number | null;
  note?: string | null;
}

interface UnitCost {
  id: number;            // 자동 증가
  category: string;      // 재료비 / 소모품비
  item_name: string;     // 품명
  unit_price: number;
  unit: string;
  note?: string | null;
}

// 공정 시간 (예상 리드타임 계산용)
interface ProcessTime {
  id: number;
  order_id: number;
  process_type: string; // RBSC / RSiC
  design_hr?: number | null;
  printing_hr?: number | null;
  infiltration_hr?: number | null;
  bonding_hr?: number | null;
  lsi_hr?: number | null;
  machining_hr?: number | null;
  coating_hr?: number | null;
  material_cost: number;
  consumable_cost: number;
  labor_cost: number;
  equipment_cost: number;
  overhead_cost: number;
  total_cost: number;
}

// 공정 상태 (실측 리드타임/진행율/이슈 기록)
interface ProcessOrderStatus {
  id?: number;
  order_id: number;
  total_process_time_hours?: number | null;
  current_stage?: string | null;
  progress_percent?: number | null;
  current_detail?: string | null;
  priority?: string | null;
}

// 공정 현황 탭용 Row
interface StatusRow {
  order_id: number;
  company_name: string;
  product_name: string;
  expected_lead_time_hr: number;
  progress_percent: number | null;
  expected_manufacturing_cost: number | null;
  note: string | null;
}

// Raw Data 요약 탭용 Row
interface RawSummaryRow {
  order_id: number;
  company_name: string;
  product_name: string;
  expected_lead_time_hr: number;
  actual_lead_time_hr: number | null;
  expected_manufacturing_cost: number | null;
  actual_manufacturing_cost: number | null;
}

// 단가 카테고리 옵션
const UNIT_CATEGORY_OPTIONS = [
  { label: "재료비", value: "재료비" },
  { label: "소모품비", value: "소모품비" },
];

export default function ProcessDataPage() {
  const [activeTab, setActiveTab] = useState<string>("status");

  const [orders, setOrders] = useState<ProcessOrder[]>([]);
  const [unitCosts, setUnitCosts] = useState<UnitCost[]>([]);
  const [trackings, setTrackings] = useState<ProcessTracking[]>([]);
  const [statusRows, setStatusRows] = useState<StatusRow[]>([]);
  const [rawSummaryRows, setRawSummaryRows] = useState<RawSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 공정 Tracking 모달 (Raw Data에서 product_volume_cm3 등 수정용 – 그대로 둠)
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingForm] = Form.useForm();
  const [editingTracking, setEditingTracking] =
    useState<ProcessTracking | null>(null);

  // 단가 모달
  const [unitCostModalOpen, setUnitCostModalOpen] = useState(false);
  const [unitCostForm] = Form.useForm();
  const [editingUnitCost, setEditingUnitCost] = useState<UnitCost | null>(null);

  // 공정 상세 내역 입력 탭
  const [processTimeForm] = Form.useForm();
  const [detailTrackingForm] = Form.useForm();
  const [selectedOrderIdForTime, setSelectedOrderIdForTime] = useState<
    number | null
  >(null);
  const [selectedProcessType, setSelectedProcessType] =
    useState<string>("RBSC");
  const [detailLoading, setDetailLoading] = useState(false);

  // 공정 현황 탭 하단 실측 폼
  const [selectedStatusRow, setSelectedStatusRow] = useState<StatusRow | null>(
    null
  );
  const [actualStatusForm] = Form.useForm();
  const [actualStatusLoading, setActualStatusLoading] = useState(false);

  // -----------------------------
  // 데이터 로딩
  // -----------------------------
  const buildStatusRows = async (ordersList: ProcessOrder[]) => {
    try {
      const rows: StatusRow[] = await Promise.all(
        ordersList.map(async (o) => {
          let expectedLeadTime = 0;
          try {
            const timesRes = await axios.get<ProcessTime[]>(
              `${API_BASE_URL}/process/times/${o.id}`
            );
            const times = timesRes.data || [];
            const timeRow =
              times.find((pt) => pt.process_type === o.category) || times[0];

            if (timeRow) {
              const {
                design_hr = 0,
                printing_hr = 0,
                infiltration_hr = 0,
                bonding_hr = 0,
                lsi_hr = 0,
                machining_hr = 0,
                coating_hr = 0,
              } = timeRow;
              expectedLeadTime =
                (design_hr || 0) +
                (printing_hr || 0) +
                (infiltration_hr || 0) +
                (bonding_hr || 0) +
                (lsi_hr || 0) +
                (machining_hr || 0) +
                (coating_hr || 0);
            }
          } catch {}

          let status: ProcessOrderStatus | undefined;
          try {
            const statusRes = await axios.get<ProcessOrderStatus[]>(
              `${API_BASE_URL}/process/orders/${o.id}/status`
            );
            status = (statusRes.data || [])[0];
          } catch {
            status = undefined;
          }

          return {
            order_id: o.id,
            company_name: o.company_name,
            product_name: o.product_name,
            expected_lead_time_hr: expectedLeadTime,
            progress_percent:
              status && typeof status.progress_percent === "number"
                ? status.progress_percent
                : null,
            expected_manufacturing_cost: o.unit_manufacturing_cost ?? null,
            note: status?.current_detail ?? null,
          };
        })
      );
      setStatusRows(rows);
    } catch (e) {
      console.error(e);
      message.error("공정 현황 데이터를 계산하는 중 오류가 발생했습니다.");
    }
  };

  const buildRawSummaryRows = async (ordersList: ProcessOrder[]) => {
    try {
      const targets = ordersList.filter((o) =>
        ["제작중", "납품완료"].includes(o.status)
      );

      const rows: RawSummaryRow[] = await Promise.all(
        targets.map(async (o) => {
          // 예상 리드타임
          let expectedLeadTime = 0;
          try {
            const timesRes = await axios.get<ProcessTime[]>(
              `${API_BASE_URL}/process/times/${o.id}`
            );
            const times = timesRes.data || [];
            const timeRow =
              times.find((pt) => pt.process_type === o.category) || times[0];

            if (timeRow) {
              const {
                design_hr = 0,
                printing_hr = 0,
                infiltration_hr = 0,
                bonding_hr = 0,
                lsi_hr = 0,
                machining_hr = 0,
                coating_hr = 0,
              } = timeRow;
              expectedLeadTime =
                (design_hr || 0) +
                (printing_hr || 0) +
                (infiltration_hr || 0) +
                (bonding_hr || 0) +
                (lsi_hr || 0) +
                (machining_hr || 0) +
                (coating_hr || 0);
            }
          } catch {}

          // 실제 리드타임 / 향후 실제 제작원가
          let status: ProcessOrderStatus | undefined;
          let actualLeadTime: number | null = null;
          try {
            const statusRes = await axios.get<ProcessOrderStatus[]>(
              `${API_BASE_URL}/process/orders/${o.id}/status`
            );
            status = (statusRes.data || [])[0];
            if (
              status &&
              typeof status.total_process_time_hours === "number"
            ) {
              actualLeadTime = status.total_process_time_hours;
            }
          } catch {
            status = undefined;
          }

          return {
            order_id: o.id,
            company_name: o.company_name,
            product_name: o.product_name,
            expected_lead_time_hr: expectedLeadTime,
            actual_lead_time_hr: actualLeadTime,
            expected_manufacturing_cost: o.unit_manufacturing_cost ?? null,
            actual_manufacturing_cost: null, // ✅ 나중에 계산식으로 채울 예정
          };
        })
      );
      setRawSummaryRows(rows);
    } catch (e) {
      console.error(e);
      message.error("Raw Data 요약 데이터를 계산하는 중 오류가 발생했습니다.");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, trackingRes, unitCostRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/process/orders`),
        axios.get(`${API_BASE_URL}/process/trackings`),
        axios.get(`${API_BASE_URL}/process/unit-costs`),
      ]);

      const allOrders: ProcessOrder[] = ordersRes.data;
      const inProgress = allOrders.filter((o) => o.status === "제작중");

      setOrders(inProgress);
      setTrackings(trackingRes.data);
      setUnitCosts(unitCostRes.data);

      await buildStatusRows(inProgress);
      await buildRawSummaryRows(allOrders);
    } catch (err) {
      console.error(err);
      message.error("공정 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 제작중 주문 매핑 (공정 상세/Tracking 용)
  const orderMap = useMemo(() => {
    const map = new Map<number, ProcessOrder>();
    orders.forEach((o) => map.set(o.id, o));
    return map;
  }, [orders]);

  const visibleTrackings = useMemo(
    () => trackings.filter((t) => orderMap.has(t.order_id)),
    [trackings, orderMap]
  );

  // -----------------------------
  // 공정 Tracking 모달 (Raw Data – product_volume/비고 수정용)
  // -----------------------------
  const openTrackingModal = (record?: ProcessTracking) => {
    if (record) {
      setEditingTracking(record);
      trackingForm.setFieldsValue({
        order_id: record.order_id,
        product_volume_cm3: record.product_volume_cm3,
        printing_time_hr: record.printing_time_hr,
        bed_density: record.bed_density,
        note: record.note,
      });
    } else {
      setEditingTracking(null);
      trackingForm.resetFields();
    }
    setTrackingModalOpen(true);
  };

  const submitTracking = async () => {
    try {
      const values = await trackingForm.validateFields();
      const payload = {
        order_id: values.order_id,
        product_volume_cm3: values.product_volume_cm3 ?? null,
        printing_time_hr: values.printing_time_hr ?? null,
        bed_density: values.bed_density ?? null,
        note: values.note || null,
      };

      if (editingTracking) {
        await axios.put(
          `${API_BASE_URL}/process/trackings/${editingTracking.id}`,
          payload
        );
        message.success("공정 데이터가 수정되었습니다.");
      } else {
        await axios.post(`${API_BASE_URL}/process/trackings`, payload);
        message.success("공정 데이터가 등록되었습니다.");
      }

      setTrackingModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (!err?.errorFields) {
        console.error(err);
        message.error("공정 데이터 저장에 실패했습니다.");
      }
    }
  };

  const deleteTracking = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/process/trackings/${id}`);
      message.success("공정 데이터가 삭제되었습니다.");
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("삭제에 실패했습니다.");
    }
  };

  // -----------------------------
  // 단가(UnitCost) 모달
  // -----------------------------
  const openUnitCostModal = (record?: UnitCost) => {
    if (record) {
      setEditingUnitCost(record);
      unitCostForm.setFieldsValue({
        category: record.category,
        item_name: record.item_name,
        unit: record.unit,
        unit_price: record.unit_price,
        note: record.note,
      });
    } else {
      setEditingUnitCost(null);
      unitCostForm.resetFields();
    }
    setUnitCostModalOpen(true);
  };

  const submitUnitCost = async () => {
    try {
      const values = await unitCostForm.validateFields();
      const payload = {
        category: values.category,
        item_name: values.item_name,
        unit: values.unit,
        unit_price: values.unit_price,
        note: values.note || null,
      };

      if (editingUnitCost) {
        await axios.put(
          `${API_BASE_URL}/process/unit-costs/${editingUnitCost.id}`,
          payload
        );
        message.success("단가 정보가 수정되었습니다.");
      } else {
        await axios.post(`${API_BASE_URL}/process/unit-costs`, payload);
        message.success("단가 정보가 등록되었습니다.");
      }

      setUnitCostModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (!err?.errorFields) {
        console.error(err);
        message.error("단가 정보 저장에 실패했습니다.");
      }
    }
  };

  const deleteUnitCost = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/process/unit-costs/${id}`);
      message.success("단가 정보가 삭제되었습니다.");
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("단가 정보 삭제에 실패했습니다.");
    }
  };

  // -----------------------------
  // 공정 상세 내역 입력 탭 (예상 공정 시간 + 프린팅 Raw Data)
  // -----------------------------
  const loadProcessTime = async (orderId: number, processType: string) => {
    try {
      const res = await axios.get<ProcessTime[]>(
        `${API_BASE_URL}/process/times/${orderId}`
      );
      const list = res.data || [];
      const target =
        list.find((pt) => pt.process_type === processType) || list[0];

      processTimeForm.resetFields();

      if (!target) return;

      if (processType === "RSiC") {
        processTimeForm.setFieldsValue({
          rsic_printing_hr: target.printing_hr ?? 0,
          rsic_cvi_hr: target.infiltration_hr ?? 0,
          rsic_machining_hr: target.machining_hr ?? 0,
        });
      } else if (processType === "RBSC") {
        processTimeForm.setFieldsValue({
          rbsc_printing_hr: target.printing_hr ?? 0,
          rbsc_oven1_hr: target.infiltration_hr ?? 0,
          rbsc_cooling_hr: 0,
          rbsc_depowder_hr: 0,
          rbsc_combine_hr: target.bonding_hr ?? 0,
          rbsc_oven2_hr: 0,
          rbsc_debind_hr: target.design_hr ?? 0,
          rbsc_lsi_hr: target.lsi_hr ?? 0,
          rbsc_cvd_hr: target.coating_hr ?? 0,
          rbsc_machining_hr: target.machining_hr ?? 0,
        });
      }
    } catch (err) {
      console.error(err);
      message.error("공정 시간 데이터를 불러오지 못했습니다.");
      processTimeForm.resetFields();
    }
  };

  const loadDetailTracking = (orderId: number) => {
    const tr = trackings.find((t) => t.order_id === orderId);
    if (tr) {
      detailTrackingForm.setFieldsValue({
        dt_printing_time_hr: tr.printing_time_hr ?? null,
        dt_bed_density: tr.bed_density ?? null,
      });
    } else {
      detailTrackingForm.resetFields();
    }
  };

  const handleChangeOrderForTime = (value: number) => {
    setSelectedOrderIdForTime(value);

    const o = orderMap.get(value);
    const cat = o?.category;
    const autoType =
      cat === "RBSC" || cat === "RSiC" ? cat : ("RBSC" as string);
    setSelectedProcessType(autoType);

    if (value) {
      loadProcessTime(value, autoType);
      loadDetailTracking(value);
    } else {
      processTimeForm.resetFields();
      detailTrackingForm.resetFields();
    }
  };

  const submitProcessDetail = async () => {
    try {
      if (!selectedOrderIdForTime) {
        message.warning("주문을 먼저 선택해 주세요.");
        return;
      }
      setDetailLoading(true);

      const timeValues = await processTimeForm.validateFields();

      let payload: Partial<ProcessTime> & {
        order_id: number;
        process_type: string;
      };

      if (selectedProcessType === "RSiC") {
        const p = timeValues.rsic_printing_hr ?? 0;
        const cvi = timeValues.rsic_cvi_hr ?? 0;
        const m = timeValues.rsic_machining_hr ?? 0;

        payload = {
          order_id: selectedOrderIdForTime,
          process_type: "RSiC",
          design_hr: 0,
          printing_hr: p,
          infiltration_hr: cvi,
          bonding_hr: 0,
          lsi_hr: 0,
          coating_hr: 0,
          machining_hr: m,
        };
      } else {
        const p = timeValues.rbsc_printing_hr ?? 0;
        const oven1 = timeValues.rbsc_oven1_hr ?? 0;
        const cooling = timeValues.rbsc_cooling_hr ?? 0;
        const depowder = timeValues.rbsc_depowder_hr ?? 0;
        const combine = timeValues.rbsc_combine_hr ?? 0;
        const oven2 = timeValues.rbsc_oven2_hr ?? 0;
        const debind = timeValues.rbsc_debind_hr ?? 0;
        const lsi = timeValues.rbsc_lsi_hr ?? 0;
        const cvd = timeValues.rbsc_cvd_hr ?? 0;
        const m = timeValues.rbsc_machining_hr ?? 0;

        payload = {
          order_id: selectedOrderIdForTime,
          process_type: "RBSC",
          design_hr: debind,
          printing_hr: p,
          infiltration_hr: oven1 + cooling,
          bonding_hr: depowder + combine + oven2,
          lsi_hr: lsi,
          coating_hr: cvd,
          machining_hr: m,
        };
      }

      await axios.post(`${API_BASE_URL}/process/times`, payload);

      const trValues = await detailTrackingForm
        .validateFields()
        .catch(() => detailTrackingForm.getFieldsValue());
      const printingTime =
        trValues.dt_printing_time_hr !== undefined
          ? trValues.dt_printing_time_hr
          : null;
      const bedDensity =
        trValues.dt_bed_density !== undefined ? trValues.dt_bed_density : null;

      const existing = trackings.find(
        (t) => t.order_id === selectedOrderIdForTime
      );

      if (printingTime !== null || bedDensity !== null) {
        if (existing) {
          await axios.put(
            `${API_BASE_URL}/process/trackings/${existing.id}`,
            {
              order_id: existing.order_id,
              product_volume_cm3: existing.product_volume_cm3 ?? null,
              printing_time_hr:
                printingTime !== null
                  ? printingTime
                  : existing.printing_time_hr ?? null,
              bed_density:
                bedDensity !== null
                  ? bedDensity
                  : existing.bed_density ?? null,
              note: existing.note ?? null,
            }
          );
        } else {
          await axios.post(`${API_BASE_URL}/process/trackings`, {
            order_id: selectedOrderIdForTime,
            product_volume_cm3: null,
            printing_time_hr: printingTime,
            bed_density: bedDensity,
            note: null,
          });
        }
      }

      message.success("공정 예상 시간 및 Raw Data가 저장되었습니다.");
      fetchData();
    } catch (err: any) {
      if (!err?.errorFields) {
        console.error(err);
        message.error("공정 상세 내역 저장에 실패했습니다.");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // -----------------------------
  // 공정 현황 탭 하단: 실측 리드타임 & 이슈 기록
  // -----------------------------
  const loadActualStatus = async (orderId: number) => {
    try {
      const res = await axios.get<ProcessOrderStatus[]>(
        `${API_BASE_URL}/process/orders/${orderId}/status`
      );
      const status = (res.data || [])[0];
      if (status) {
        actualStatusForm.setFieldsValue({
          actual_lead_time_hr: status.total_process_time_hours ?? undefined,
          actual_progress_percent: status.progress_percent ?? undefined,
          step_progress_note: status.current_detail ?? "",
          issue_note: status.priority ?? "",
        });
      } else {
        actualStatusForm.resetFields();
      }
    } catch (err) {
      console.error(err);
      message.error("실제 공정 현황 데이터를 불러오지 못했습니다.");
      actualStatusForm.resetFields();
    }
  };

  const handleSelectStatusRow = (row: StatusRow) => {
    setSelectedStatusRow(row);
    loadActualStatus(row.order_id);
  };

  const submitActualStatus = async () => {
    if (!selectedStatusRow) return;
    try {
      setActualStatusLoading(true);
      const values = await actualStatusForm.validateFields();

      const payload: ProcessOrderStatus = {
        order_id: selectedStatusRow.order_id,
        total_process_time_hours: values.actual_lead_time_hr ?? null,
        progress_percent: values.actual_progress_percent ?? null,
        current_detail: values.step_progress_note || null,
        priority: values.issue_note || null,
      };

      await axios.post(
        `${API_BASE_URL}/process/orders/${selectedStatusRow.order_id}/status`,
        payload
      );

      message.success("실제 공정 현황이 저장되었습니다.");
      fetchData();
    } catch (err: any) {
      if (!err?.errorFields) {
        console.error(err);
        message.error("실제 공정 현황 저장에 실패했습니다.");
      }
    } finally {
      setActualStatusLoading(false);
    }
  };

  // -----------------------------
  // 테이블 컬럼 정의
  // -----------------------------
  const statusColumns: ColumnsType<StatusRow> = [
    { title: "Order ID", dataIndex: "order_id" },
    {
      title: "업체명 / 품명",
      key: "info",
      render: (_, record) => (
        <>
          <div>{record.company_name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.product_name}
          </div>
        </>
      ),
    },
    {
      title: "예상 리드타임(hr)",
      dataIndex: "expected_lead_time_hr",
      render: (v: number) => (v ? v.toFixed(1) : "0.0"),
    },
    {
      title: "진행율(%)",
      dataIndex: "progress_percent",
      render: (v: number | null) =>
        v !== null && v !== undefined ? `${v.toFixed(1)}%` : "-",
    },
    {
      title: "예상 제작 원가",
      dataIndex: "expected_manufacturing_cost",
      render: (v: number | null) =>
        v !== null && v !== undefined ? v.toLocaleString() : "-",
    },
    { title: "비고", dataIndex: "note" },
  ];

  const rawSummaryColumns: ColumnsType<RawSummaryRow> = [
    { title: "Order ID", dataIndex: "order_id" },
    {
      title: "업체명 / 품명",
      key: "info",
      render: (_, record) => (
        <>
          <div>{record.company_name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.product_name}
          </div>
        </>
      ),
    },
    {
      title: "예상 리드타임(hr)",
      dataIndex: "expected_lead_time_hr",
      render: (v: number) => (v ? v.toFixed(1) : "0.0"),
    },
    {
      title: "실제 리드타임(hr)",
      dataIndex: "actual_lead_time_hr",
      render: (v: number | null) =>
        v !== null && v !== undefined ? v.toFixed(1) : "-",
    },
    {
      title: "예상 제작 원가",
      dataIndex: "expected_manufacturing_cost",
      render: (v: number | null) =>
        v !== null && v !== undefined ? v.toLocaleString() : "-",
    },
    {
      title: "실제 제작 원가",
      dataIndex: "actual_manufacturing_cost",
      render: (v: number | null) =>
        v !== null && v !== undefined ? v.toLocaleString() : "-", // ✅ 나중에 계산식으로 채울 예정
    },
  ];

  const trackingColumns: ColumnsType<ProcessTracking> = [
    { title: "Order ID", dataIndex: "order_id" },
    {
      title: "업체명 / 품명",
      key: "info",
      render: (_, record) => {
        const o = orderMap.get(record.order_id);
        if (!o) return <Text type="secondary">연결된 주문 없음</Text>;
        return (
          <>
            <div>{o.company_name}</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {o.product_name}
            </div>
          </>
        );
      },
    },
    { title: "제품 부피(cm³)", dataIndex: "product_volume_cm3" },
    { title: "프린팅 시간(hr)", dataIndex: "printing_time_hr" },
    { title: "베드 밀도", dataIndex: "bed_density" },
    { title: "비고", dataIndex: "note" },
    {
      title: "관리",
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => openTrackingModal(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="공정 데이터를 삭제하시겠습니까?"
            onConfirm={() => deleteTracking(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="link" size="small" danger>
              삭제
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  const unitCostColumns: ColumnsType<UnitCost> = [
    { title: "ID", dataIndex: "id" },
    { title: "Category", dataIndex: "category" },
    { title: "Item", dataIndex: "item_name" },
    {
      title: "Unit Price",
      dataIndex: "unit_price",
      render: (v: number) => v.toLocaleString(),
    },
    { title: "Unit", dataIndex: "unit" },
    { title: "비고", dataIndex: "note" },
    {
      title: "관리",
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => openUnitCostModal(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="해당 단가 정보를 삭제하시겠습니까?"
            onConfirm={() => deleteUnitCost(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="link" size="small" danger>
              삭제
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  // -----------------------------
  // 렌더
  // -----------------------------
  return (
    <AppLayout>
      <Title level={3} style={{ marginBottom: 16 }}>
        공정 데이터
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: "status", label: "공정 현황" },
          { key: "processDetail", label: "공정 상세 내역 입력" },
          { key: "raw", label: "Raw Data" },
        ]}
      />

      {/* 공정 현황 탭 */}
      {activeTab === "status" && (
        <>
          <Card
            title="제작중(Order Status = '제작중') 공정 현황"
            loading={loading || actualStatusLoading}
          >
            <Table
              rowKey="order_id"
              columns={statusColumns}
              dataSource={statusRows}
              pagination={{ pageSize: 10 }}
              onRow={(record) => ({
                onClick: () => handleSelectStatusRow(record),
              })}
            />
            {orders.length === 0 && (
              <Text type="secondary">
                제작중 상태의 주문이 없어서 표시할 공정 현황이 없습니다.
                제작 및 매출 현황에서 프로젝트를 등록하고 상태를
                &quot;제작중&quot;으로 변경하세요.
              </Text>
            )}
          </Card>

          {selectedStatusRow && (
            <Card
              style={{ marginTop: 24 }}
              title={`실제 공정 현황 입력 - Order ID ${selectedStatusRow.order_id} (${selectedStatusRow.company_name} / ${selectedStatusRow.product_name})`}
              loading={actualStatusLoading}
            >
              <Form
                form={actualStatusForm}
                layout="vertical"
                style={{ maxWidth: 800 }}
              >
                <Form.Item
                  label="실제 리드타임(hr)"
                  name="actual_lead_time_hr"
                  rules={[
                    {
                      type: "number",
                      min: 0,
                      message: "0 이상 숫자로 입력해 주세요.",
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    step={0.1}
                    style={{ width: "100%" }}
                    placeholder="예: 8.5"
                  />
                </Form.Item>

                <Form.Item
                  label="실제 진행율(%)"
                  name="actual_progress_percent"
                  rules={[
                    {
                      type: "number",
                      min: 0,
                      max: 100,
                      message: "0~100 사이 값으로 입력해 주세요.",
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={1}
                    style={{ width: "100%" }}
                    placeholder="예: 60"
                  />
                </Form.Item>

                <Form.Item
                  label="공정별 진행 현황"
                  name="step_progress_note"
                >
                  <Input.TextArea
                    rows={4}
                    placeholder={
                      "예) RBSC: Printing 100%, 탄화 50%, LSI 0% / RSiC: Printing 100%, CVI/CVD 30% 등"
                    }
                  />
                </Form.Item>

                <Form.Item label="오류 / 이슈 사항" name="issue_note">
                  <Input.TextArea
                    rows={3}
                    placeholder="예) CVI로 3시간 지연, 장비 트러블 등"
                  />
                </Form.Item>
              </Form>

              <Button type="primary" onClick={submitActualStatus}>
                실제 공정 현황 저장
              </Button>
            </Card>
          )}
        </>
      )}

      {/* 공정 상세 내역 입력 탭 (예상 공정 시간 + 프린팅 Raw Data) */}
      {activeTab === "processDetail" && (
        <Card
          title="RBSC / RSiC 공정 상세 내역 입력 (예상 공정 시간 + Raw Data)"
          loading={loading || detailLoading}
        >
          {/* 주문 선택 + 공정 타입 표시 */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 260 }}>
              <Text strong>주문 선택</Text>
              <Select
                value={selectedOrderIdForTime ?? undefined}
                onChange={handleChangeOrderForTime}
                placeholder="제작중 주문 선택"
                style={{ width: "100%", marginTop: 8 }}
              >
                {orders.map((o) => (
                  <Option key={o.id} value={o.id}>
                    {o.company_name} / {o.product_name}
                  </Option>
                ))}
              </Select>
            </div>
            <div style={{ minWidth: 160 }}>
              <Text strong>공정 타입</Text>
              <Select
                value={selectedProcessType}
                disabled
                style={{ width: "100%", marginTop: 8 }}
              >
                <Option value="RBSC">RBSC</Option>
                <Option value="RSiC">RSiC</Option>
              </Select>
            </div>
          </div>

          {orders.length === 0 && (
            <Text type="secondary">
              제작중 상태의 주문이 없어 공정 상세 내역을 입력할 수 없습니다.
              제작 및 매출 현황에서 주문을 추가하고 상태를 &quot;제작중&quot;으로
              변경하세요.
            </Text>
          )}

          {orders.length > 0 && (
            <>
              {/* 제조 원가용 Raw Data (프린팅 시간 / 베드 밀도) */}
              <Card
                size="small"
                style={{ marginBottom: 24, background: "#fafafa" }}
                title="제조 원가용 Raw Data (프린팅 시간 / 베드 밀도)"
              >
                <Form
                  form={detailTrackingForm}
                  layout="vertical"
                  style={{ maxWidth: 800 }}
                >
                  <Form.Item
                    label="프린팅 시간(hr)"
                    name="dt_printing_time_hr"
                  >
                    <InputNumber
                      min={0}
                      step={0.1}
                      style={{ width: "100%" }}
                      placeholder="예: 5.2"
                    />
                  </Form.Item>
                  <Form.Item label="베드 밀도" name="dt_bed_density">
                    <InputNumber
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                      placeholder="예: 0.55"
                    />
                  </Form.Item>
                </Form>
              </Card>

              {/* 공정 단계별 예상 시간 입력 */}
              <Card
                size="small"
                title={
                  selectedProcessType === "RSiC"
                    ? "RSiC 공정 단계별 예상 시간 입력 (hr 기준)"
                    : "RBSC 공정 단계별 예상 시간 입력 (hr 기준)"
                }
              >
                <Form
                  form={processTimeForm}
                  layout="vertical"
                  style={{ maxWidth: 800 }}
                >
                  {selectedProcessType === "RSiC" && (
                    <>
                      <Form.Item
                        label="Printing 시간(hr)"
                        name="rsic_printing_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="CVI/CVD 시간(hr)"
                        name="rsic_cvi_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="Machining 시간(hr)"
                        name="rsic_machining_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </>
                  )}

                  {selectedProcessType === "RBSC" && (
                    <>
                      <Form.Item
                        label="(1) Printing 시간(hr)"
                        name="rbsc_printing_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(2) 열처리(오븐)#1 시간(hr)"
                        name="rbsc_oven1_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(3) 냉각 시간(hr)"
                        name="rbsc_cooling_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(4) 디파우더링 시간(hr)"
                        name="rbsc_depowder_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(5) 합침(탄화) 시간(hr)"
                        name="rbsc_combine_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(6) 열처리(오븐)#2 시간(hr)"
                        name="rbsc_oven2_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(7) 디바인딩 시간(hr)"
                        name="rbsc_debind_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(8) LSI 시간(hr)"
                        name="rbsc_lsi_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(9) CVD 시간(hr)"
                        name="rbsc_cvd_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        label="(10) Machining 시간(hr)"
                        name="rbsc_machining_hr"
                      >
                        <InputNumber
                          min={0}
                          step={0.1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </>
                  )}
                </Form>
              </Card>

              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={submitProcessDetail}>
                  공정 예상 시간 및 Raw Data 저장
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Raw Data 탭 */}
      {activeTab === "raw" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* 1) 단가 테이블 */}
          <Card
            title="단가 테이블 (원재료 / 소모품 / 기타)"
            extra={
              <Button type="primary" onClick={() => openUnitCostModal()}>
                단가 추가
              </Button>
            }
          >
            <Table
              rowKey="id"
              columns={unitCostColumns}
              dataSource={unitCosts}
              pagination={{ pageSize: 20 }}
            />
            <Text type="secondary">
              SiC 파우더, Binder, Si, Phenol, BN, MTS, Ar, H2, N2, Head 등
              원재료·소모품 단가를 이 테이블에서 관리합니다.
            </Text>
          </Card>

          {/* 2) 주문 요약 (제작중 + 납품완료) – 수정 불필요 뷰 전용 */}
          <Card title="주문별 공정/원가 요약 (제작중 + 납품완료)">
            <Table
              rowKey="order_id"
              columns={rawSummaryColumns}
              dataSource={rawSummaryRows}
              pagination={{ pageSize: 20 }}
            />
            <Text type="secondary">
              제작중 및 납품완료 상태의 주문에 대해, 예상/실제 리드타임과
              예상/실제 제작원가(실제 제작원가는 추후 자동 계산 예정)를
              한눈에 확인하는 요약입니다.
            </Text>
          </Card>
        </div>
      )}


      {/* 단가 정보 모달 */}
      <Modal
        title={editingUnitCost ? "단가 정보 수정" : "단가 정보 등록"}
        open={unitCostModalOpen}
        onCancel={() => setUnitCostModalOpen(false)}
        onOk={submitUnitCost}
        okText="저장"
        cancelText="취소"
        destroyOnClose
      >
        <Form form={unitCostForm} layout="vertical">
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: "Category를 선택해 주세요." }]}
          >
            <Select placeholder="예: 재료비 / 소모품비">
              {UNIT_CATEGORY_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="품명"
            name="item_name"
            rules={[{ required: true, message: "품명을 입력해 주세요." }]}
          >
            <Input placeholder="예: SiC Powder, Binder 등" />
          </Form.Item>
          <Form.Item
            label="Unit"
            name="unit"
            rules={[{ required: true, message: "단위(Unit)를 입력해 주세요." }]}
          >
            <Input placeholder="예: KRW/kg, KRW/hr" />
          </Form.Item>
          <Form.Item
            label="Unit Price"
            name="unit_price"
            rules={[{ required: true, message: "단가를 입력해 주세요." }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="비고" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
}
