"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Crown,
  Gem,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  adminService,
  AdminPremiumConfig,
  AdminPremiumPlanPayload,
} from "@/services/admin";
import { PremiumPlan } from "@/types/premium";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type FeatureField = {
  key: keyof NonNullable<AdminPremiumPlanPayload["features"]>;
  label: string;
};

type LimitField = {
  key: keyof NonNullable<AdminPremiumPlanPayload["limits"]>;
  label: string;
};

const FEATURE_FIELDS: FeatureField[] = [
  { key: "aiAssistant", label: "AI Assistant" },
  { key: "canCreatePosts", label: "Được tạo bài viết" },
  { key: "canInteract", label: "Được tương tác" },
  { key: "canUseReels", label: "Được dùng Reel" },
  { key: "canUseStories", label: "Được dùng Story" },
  { key: "advancedAiSummary", label: "AI Summary nâng cao" },
  { key: "prioritySupport", label: "Hỗ trợ ưu tiên" },
];

const LIMIT_FIELDS: LimitField[] = [
  { key: "postsPerDay", label: "Bài viết/ngày" },
  { key: "reelsPerDay", label: "Reel/ngày" },
  { key: "storiesPerDay", label: "Story/ngày" },
  { key: "postVideoDurationSeconds", label: "Video bài viết tối đa (giây)" },
  { key: "reelVideoDurationSeconds", label: "Video reel tối đa (giây)" },
  { key: "storyVideoDurationSeconds", label: "Video story tối đa (giây)" },
];

type PlanFormState = {
  code: string;
  title: string;
  name: string;
  description: string;
  price: string;
  durationDays: string;
  isRecommended: boolean;
  disable: boolean;
  benefitsText: string;
  features: Record<string, boolean>;
  limits: Record<string, string>;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  const maybeError = error as
    | { response?: { data?: { message?: unknown } } }
    | undefined;
  if (typeof maybeError?.response?.data?.message === "string") {
    return maybeError.response.data.message;
  }
  return fallback;
};

const parseNumber = (value: string) => {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createEmptyForm = (): PlanFormState => ({
  code: "",
  title: "",
  name: "",
  description: "",
  price: "0",
  durationDays: "30",
  isRecommended: false,
  disable: false,
  benefitsText: "",
  features: FEATURE_FIELDS.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {}),
  limits: LIMIT_FIELDS.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = "0";
    return acc;
  }, {}),
});

const buildAutoDescriptionFromForm = (form: PlanFormState): string => {
  const featureLines = FEATURE_FIELDS.map(({ key, label }) => {
    const hasFeature = Boolean(form.features[key]);
    return `- ${label}: ${hasFeature ? "có" : "không"}`;
  });

  const limitLines = LIMIT_FIELDS.map(({ key, label }) => {
    const rawValue = form.limits[key] || "0";
    const limitValue = parseNumber(rawValue);
    return `- ${label}: ${limitValue > 0 ? `có (${limitValue})` : "không"}`;
  });

  return ["Features:", ...featureLines, "", "Limits:", ...limitLines].join("\n");
};

const mapPlanToForm = (plan: PremiumPlan): PlanFormState => {
  const form = createEmptyForm();
  form.code = plan.code || "";
  form.title = plan.title || plan.name || "";
  form.name = plan.name || "";
  form.description = plan.description || "";
  form.price = String(plan.price ?? 0);
  form.durationDays = String(plan.durationDays ?? 30);
  form.isRecommended = Boolean(plan.isRecommended);
  form.disable = Boolean(plan.disable);
  form.benefitsText = Array.isArray(plan.benefits)
    ? plan.benefits.join("\n")
    : "";

  FEATURE_FIELDS.forEach(({ key }) => {
    form.features[key] = Boolean(plan.features?.[key]);
  });

  LIMIT_FIELDS.forEach(({ key }) => {
    const value = plan.limits?.[key];
    form.limits[key] =
      typeof value === "number" && Number.isFinite(value) ? String(value) : "0";
  });

  return form;
};

const buildPlanPayload = (form: PlanFormState): AdminPremiumPlanPayload => ({
  code: form.code.trim(),
  title: form.title.trim(),
  name: form.name.trim(),
  description: form.description.trim(),
  price: parseNumber(form.price),
  durationDays: parseNumber(form.durationDays),
  isRecommended: form.isRecommended,
  disable: form.disable,
  benefits: form.benefitsText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean),
  features: FEATURE_FIELDS.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.key] = Boolean(form.features[item.key]);
    return acc;
  }, {}),
  limits: LIMIT_FIELDS.reduce<Record<string, number>>((acc, item) => {
    acc[item.key] = parseNumber(form.limits[item.key] || "0");
    return acc;
  }, {}),
});

const prettyJson = (value: unknown) => JSON.stringify(value || {}, null, 2);

const formatPrice = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const formatDateTime = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

export default function AdminPremiumPage() {
  const queryClient = useQueryClient();
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(createEmptyForm);
  const [isDescriptionCustomized, setIsDescriptionCustomized] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configDraft, setConfigDraft] = useState<string | null>(null);

  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["admin", "premium", "plans"],
    queryFn: adminService.getPremiumPlans,
  });

  const { data: premiumConfig = {}, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["admin", "premium", "config"],
    queryFn: adminService.getPremiumConfig,
  });

  const configText = configDraft ?? prettyJson(premiumConfig);

  const defaultPlanCode = useMemo(() => {
    const value =
      premiumConfig?.defaultPlanCode ||
      (premiumConfig as { defaultPlan?: { code?: string } })?.defaultPlan?.code;
    return value ? String(value) : "";
  }, [premiumConfig]);

  const totalPlans = plans.length;
  const recommendedPlans = plans.filter((plan) => plan.isRecommended).length;
  const averagePrice =
    totalPlans > 0
      ? Math.round(
          plans.reduce((sum, plan) => sum + Number(plan.price || 0), 0) / totalPlans,
        )
      : 0;
  const editingPlanSnapshot = useMemo(
    () =>
      editingPlanCode
        ? plans.find((plan) => plan.code === editingPlanCode)
        : undefined,
    [plans, editingPlanCode],
  );
  const editingPlanIsDefault = Boolean(
    editingPlanSnapshot?.isDefault ||
      (editingPlanCode && defaultPlanCode === editingPlanCode),
  );

  const { mutate: createPlan, isPending: isCreatingPlan } = useMutation({
    mutationFn: (payload: AdminPremiumPlanPayload) =>
      adminService.createPremiumPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium", "plans"] });
      toast.success("Đã tạo gói Premium");
      setPlanDialogOpen(false);
      setEditingPlanCode(null);
      resetPlanForm();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể tạo gói Premium"));
    },
  });

  const { mutate: updatePlan, isPending: isUpdatingPlan } = useMutation({
    mutationFn: ({
      planCode,
      payload,
    }: {
      planCode: string;
      payload: Omit<AdminPremiumPlanPayload, "code">;
    }) => adminService.updatePremiumPlan(planCode, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium", "plans"] });
      toast.success("Đã cập nhật gói Premium");
      setPlanDialogOpen(false);
      setEditingPlanCode(null);
      resetPlanForm();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật gói Premium"));
    },
  });

  const { mutate: removePlan, isPending: isDeletingPlan } = useMutation({
    mutationFn: (planCode: string) => adminService.deletePremiumPlan(planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium", "plans"] });
      toast.success("Đã xóa gói Premium");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể xóa gói Premium"));
    },
  });

  const { mutate: markDefault, isPending: isSettingDefault } = useMutation({
    mutationFn: (planCode: string) => adminService.setDefaultPremiumPlan(planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "premium", "config"] });
      toast.success("Đã đặt gói mặc định");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể đặt gói mặc định"));
    },
  });

  const { mutate: saveConfig, isPending: isSavingConfig } = useMutation({
    mutationFn: (payload: AdminPremiumConfig) =>
      adminService.updatePremiumConfig(payload),
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(["admin", "premium", "config"], updatedConfig);
      queryClient.invalidateQueries({ queryKey: ["admin", "premium", "config"] });
      setConfigDraft(null);
      toast.success("Đã cập nhật cấu hình Premium");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật cấu hình Premium"));
    },
  });

  const isSubmittingForm = isCreatingPlan || isUpdatingPlan;

  const resetPlanForm = () => {
    const emptyForm = createEmptyForm();
    setIsDescriptionCustomized(false);
    setPlanForm({
      ...emptyForm,
      description: buildAutoDescriptionFromForm(emptyForm),
    });
  };

  const applyAutoDescriptionIfNeeded = (
    nextForm: PlanFormState,
    force = false,
  ): PlanFormState => {
    if (force || !isDescriptionCustomized || !nextForm.description.trim()) {
      return {
        ...nextForm,
        description: buildAutoDescriptionFromForm(nextForm),
      };
    }
    return nextForm;
  };

  const handleFeatureChange = (
    key: keyof NonNullable<AdminPremiumPlanPayload["features"]>,
    checked: boolean,
  ) => {
    setPlanForm((prev) =>
      applyAutoDescriptionIfNeeded({
        ...prev,
        features: {
          ...prev.features,
          [key]: checked,
        },
      }),
    );
  };

  const handleLimitChange = (
    key: keyof NonNullable<AdminPremiumPlanPayload["limits"]>,
    value: string,
  ) => {
    setPlanForm((prev) =>
      applyAutoDescriptionIfNeeded({
        ...prev,
        limits: {
          ...prev.limits,
          [key]: value,
        },
      }),
    );
  };

  const handleRegenerateDescription = () => {
    setPlanForm((prev) => ({
      ...prev,
      description: buildAutoDescriptionFromForm(prev),
    }));
    setIsDescriptionCustomized(false);
  };

  const openCreateDialog = () => {
    setEditingPlanCode(null);
    resetPlanForm();
    setPlanDialogOpen(true);
  };

  const onSubmitPlanForm = () => {
    const payload = buildPlanPayload(planForm);
    if (!payload.code) {
      toast.error("Mã gói không được để trống");
      return;
    }
    if (!payload.name) {
      toast.error("Tên gói không được để trống");
      return;
    }
    if (!payload.title) {
      toast.error("Tiêu đề gói không được để trống");
      return;
    }
    if (payload.price <= 0) {
      toast.error("Giá gói phải lớn hơn 0");
      return;
    }
    if (payload.durationDays <= 0) {
      toast.error("Số ngày hiệu lực phải lớn hơn 0");
      return;
    }

    if (editingPlanCode) {
      const updatePayload: Omit<AdminPremiumPlanPayload, "code"> = {
        title: payload.title,
        name: payload.name,
        description: payload.description,
        price: payload.price,
        durationDays: payload.durationDays,
        isRecommended: payload.isRecommended,
        disable: payload.disable,
        benefits: payload.benefits,
        features: payload.features,
        limits: payload.limits,
      };
      updatePlan({ planCode: editingPlanCode, payload: updatePayload });
      return;
    }

    createPlan(payload);
  };

  const onEditPlan = (plan: PremiumPlan) => {
    const mappedForm = mapPlanToForm(plan);
    const autoDescription = buildAutoDescriptionFromForm(mappedForm);
    const hasCustomDescription =
      Boolean(mappedForm.description.trim()) &&
      mappedForm.description.trim() !== autoDescription.trim();

    setEditingPlanCode(plan.code);
    setIsDescriptionCustomized(hasCustomDescription);
    setPlanForm(
      hasCustomDescription
        ? mappedForm
        : { ...mappedForm, description: autoDescription },
    );
    setPlanDialogOpen(true);
  };

  const onDeletePlan = (planCode: string) => {
    const confirmed = window.confirm(`Xóa gói "${planCode}"?`);
    if (!confirmed) return;
    removePlan(planCode);
  };

  const onSaveConfig = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configText);
    } catch {
      toast.error("JSON config không hợp lệ");
      return;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      toast.error("Config phải là object JSON");
      return;
    }

    saveConfig(parsed as AdminPremiumConfig);
  };

  return (
    <div className="min-h-full space-y-6 bg-white p-4 md:space-y-8 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-slate-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-0 h-24 w-24 rounded-full bg-slate-300/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
              <Crown className="h-3.5 w-3.5" />
              Premium Control
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              Quản lý gói Premium
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Quản trị danh sách gói, cấu hình thanh toán và trải nghiệm nâng cấp.
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="h-11 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo gói mới
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tổng số gói
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{totalPlans}</p>
            </div>
            <div className="rounded-xl bg-sky-100 p-3">
              <Gem className="h-5 w-5 text-sky-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Gói đề xuất
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {recommendedPlans}
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3">
              <Sparkles className="h-5 w-5 text-blue-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Giá trung bình
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatPrice(averagePrice)}
              </p>
            </div>
            <div className="rounded-xl bg-sky-100 p-3">
              <BadgeCheck className="h-5 w-5 text-sky-700" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Danh sách gói ({totalPlans})
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfigPanel((prev) => !prev)}
              className="h-10 rounded-xl border-slate-300"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Config tổng Premium
              {showConfigPanel ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {showConfigPanel ? (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  `GET/PUT /admin/premium/config`
                </p>
                {isLoadingConfig ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                ) : null}
              </div>

              <Textarea
                rows={12}
                value={configText}
                onChange={(e) => setConfigDraft(e.target.value)}
                className="font-mono text-xs"
                placeholder='{"currency":"VND","paymentTemplate":{}}'
              />

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setConfigDraft(null)}>
                  Khôi phục
                </Button>
                <Button onClick={onSaveConfig} disabled={isSavingConfig}>
                  {isSavingConfig ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Lưu config
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <Table className="bg-white">
            <TableHeader>
              <TableRow className="bg-sky-50 hover:bg-sky-50">
                <TableHead className="w-[72px] px-4">STT</TableHead>
                <TableHead className="min-w-[240px] px-4">Gói Premium</TableHead>
                <TableHead className="min-w-[150px]">Mã gói</TableHead>
                <TableHead className="min-w-[140px]">Giá</TableHead>
                <TableHead className="min-w-[110px]">Số ngày</TableHead>
                <TableHead className="min-w-[170px]">Ngày tạo</TableHead>
                <TableHead className="min-w-[130px]">Đề xuất</TableHead>
                <TableHead className="min-w-[130px]">Mặc định</TableHead>
                <TableHead className="min-w-[130px]">Disable</TableHead>
                <TableHead className="min-w-[140px]">Tính năng bật</TableHead>
                <TableHead className="min-w-[220px] text-right pr-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPlans ? (
                <TableRow className="bg-white hover:bg-white">
                  <TableCell colSpan={11} className="h-20 text-center text-slate-500">
                    <span className="inline-flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tải danh sách gói...
                    </span>
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow className="bg-white hover:bg-white">
                  <TableCell colSpan={11} className="h-20 text-center text-slate-500">
                    Chưa có gói Premium nào.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan, index) => {
                  const isDefault = Boolean(
                    plan.isDefault ||
                      (defaultPlanCode && defaultPlanCode === plan.code),
                  );
                  const activeFeatures = Object.entries(plan.features || {}).filter(
                    ([, enabled]) => Boolean(enabled),
                  ).length;

                  return (
                    <TableRow key={plan.code} className="bg-white hover:bg-slate-50">
                      <TableCell className="bg-white px-4 font-medium text-slate-600">
                        {index + 1}
                      </TableCell>
                      <TableCell className="bg-white px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {plan.title || plan.name}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {plan.description || "Không có mô tả"}
                        </p>
                      </TableCell>
                      <TableCell className="bg-white font-mono text-xs">{plan.code}</TableCell>
                      <TableCell className="bg-white font-semibold">
                        {formatPrice(Number(plan.price || 0))}
                      </TableCell>
                      <TableCell className="bg-white">{plan.durationDays}</TableCell>
                      <TableCell className="bg-white text-sm text-slate-600">
                        {formatDateTime(plan.createdAt)}
                      </TableCell>
                      <TableCell className="bg-white">
                        {plan.isRecommended ? (
                          <Badge className="bg-sky-600 text-white hover:bg-sky-600">
                            Recommended
                          </Badge>
                        ) : (
                          <Badge variant="outline">Không</Badge>
                        )}
                      </TableCell>
                      <TableCell className="bg-white">
                        {isDefault ? (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                            Mặc định
                          </Badge>
                        ) : (
                          <Badge variant="outline">Không</Badge>
                        )}
                      </TableCell>
                      <TableCell className="bg-white">
                        {plan.disable ? (
                          <Badge variant="outline" className="border-red-200 text-red-600">
                            Disabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-600">
                            Hoạt động
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="bg-white">{activeFeatures}/{FEATURE_FIELDS.length}</TableCell>
                      <TableCell className="bg-white text-right pr-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditPlan(plan)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            disabled={isDeletingPlan}
                            onClick={() => onDeletePlan(plan.code)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Xóa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <Dialog
        open={planDialogOpen}
        onOpenChange={(open) => {
          if (!open && isSubmittingForm) return;
          setPlanDialogOpen(open);
          if (!open && !isSubmittingForm) {
            setEditingPlanCode(null);
            resetPlanForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-5xl border-slate-200 p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <DialogTitle className="text-slate-900">
              {editingPlanCode ? "Chỉnh sửa gói Premium" : "Tạo gói Premium mới"}
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin gói, features và limits. Logic lưu giữ nguyên.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[75vh] space-y-6 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mã gói
                </p>
                <Input
                  value={planForm.code}
                  disabled={Boolean(editingPlanCode)}
                  onChange={(e) =>
                    setPlanForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="premium_plus_monthly"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tiêu đề
                </p>
                <Input
                  value={planForm.title}
                  onChange={(e) =>
                    setPlanForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Gói Premium Plus 1 tháng"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tên gói
                </p>
                <Input
                  value={planForm.name}
                  onChange={(e) =>
                    setPlanForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Premium Plus 1 tháng"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Trạng thái đề xuất
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="text-sm text-slate-700">Recommended</span>
                    <Switch
                      checked={planForm.isRecommended}
                      onCheckedChange={(checked) =>
                        setPlanForm((prev) => ({ ...prev, isRecommended: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="text-sm text-slate-700">Mặc định</span>
                    <Switch
                      checked={editingPlanIsDefault}
                      disabled={!editingPlanCode || isSettingDefault || isSubmittingForm}
                      onCheckedChange={(checked) => {
                        if (!editingPlanCode) return;
                        if (!checked) {
                          toast.info(
                            "Không thể tắt gói mặc định tại đây. Hãy chọn gói khác làm mặc định.",
                          );
                          return;
                        }
                        markDefault(editingPlanCode);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="text-sm text-slate-700">Disable</span>
                    <Switch
                      checked={planForm.disable}
                      onCheckedChange={(checked) =>
                        setPlanForm((prev) => ({ ...prev, disable: checked }))
                      }
                    />
                  </div>
                </div>
                {!editingPlanCode ? (
                  <p className="text-[11px] text-slate-500">
                    Lưu gói trước, sau đó bạn có thể bật trạng thái mặc định.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ngày tạo gói
                </p>
                <Input
                  value={formatDateTime(editingPlanSnapshot?.createdAt)}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Giá (VND)
                </p>
                <Input
                  type="number"
                  min={0}
                  value={planForm.price}
                  onChange={(e) =>
                    setPlanForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="149000"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Thời hạn (ngày)
                </p>
                <Input
                  type="number"
                  min={1}
                  value={planForm.durationDays}
                  onChange={(e) =>
                    setPlanForm((prev) => ({ ...prev, durationDays: e.target.value }))
                  }
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mô tả (tự sinh theo features/limits)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleRegenerateDescription}
                >
                  Tạo lại mô tả
                </Button>
              </div>
              <Textarea
                rows={9}
                value={planForm.description}
                onChange={(e) => {
                  setIsDescriptionCustomized(true);
                  setPlanForm((prev) => ({ ...prev, description: e.target.value }));
                }}
                placeholder="Mô tả sẽ tự sinh từ feature và limit"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Benefits (mỗi dòng 1 mục)
              </p>
              <Textarea
                rows={4}
                value={planForm.benefitsText}
                onChange={(e) =>
                  setPlanForm((prev) => ({ ...prev, benefitsText: e.target.value }))
                }
                placeholder={"Dùng AI\nĐăng reel\nTương tác không giới hạn mềm"}
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Features
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {FEATURE_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">{field.label}</span>
                    <Switch
                      checked={Boolean(planForm.features[field.key])}
                      onCheckedChange={(checked) =>
                        handleFeatureChange(field.key, checked)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Limits
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {LIMIT_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <p className="text-xs text-slate-500">{field.label}</p>
                    <Input
                      type="number"
                      min={0}
                      value={planForm.limits[field.key] || "0"}
                      onChange={(e) => handleLimitChange(field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 px-5 py-4 sm:px-6">
            <Button
              variant="outline"
              onClick={() => {
                if (isSubmittingForm) return;
                setPlanDialogOpen(false);
                setEditingPlanCode(null);
                resetPlanForm();
              }}
            >
              Hủy
            </Button>
            <Button onClick={onSubmitPlanForm} disabled={isSubmittingForm}>
              {isSubmittingForm ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingPlanCode ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingPlanCode ? "Lưu chỉnh sửa" : "Tạo gói"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
