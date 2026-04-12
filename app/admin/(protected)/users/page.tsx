"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminService,
  AdminUser,
  AdminUserRoleFilter,
  AdminUserStatusFilter,
  AdminUserSortBy,
} from "@/api/admin";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  User,
  Users,
  UserCheck,
  UserX,
  ArrowUpDown,
  FilterX,
  SlidersHorizontal,
  Lock,
  LockOpen,
  Clock3,
  MoreHorizontal,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { AccountStatus } from "@/types/user";
import { UpdateAccountStatusPayload } from "@/api/user";

const LIMIT_OPTIONS = [20];

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<AdminUserStatusFilter>("all");
  const [sortBy, setSortBy] = useState<AdminUserSortBy>("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftRoleFilter, setDraftRoleFilter] =
    useState<AdminUserRoleFilter>("all");
  const [draftStatusFilter, setDraftStatusFilter] =
    useState<AdminUserStatusFilter>("all");
  const [draftSortBy, setDraftSortBy] = useState<AdminUserSortBy>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [nextAccountStatus, setNextAccountStatus] =
    useState<AccountStatus>("active");
  const [isStatusFixed, setIsStatusFixed] = useState(false);
  const [statusReasonInput, setStatusReasonInput] = useState("");
  const [suspendedUntilInput, setSuspendedUntilInput] = useState("");

  const activeQueryParams = {
    offset,
    limit,
    search,
    role: roleFilter,
    status: statusFilter,
    sortBy,
    dateFrom,
    dateTo,
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin",
      "users",
      activeQueryParams,
    ],
    queryFn: () => adminService.getUsers(activeQueryParams),
  });

  useEffect(() => {
    setOffset(0);
  }, [search, roleFilter, statusFilter, sortBy, dateFrom, dateTo, limit]);

  const { mutate: updateAccountStatus, isPending: isUpdatingAccountStatus } =
    useMutation({
      mutationFn: ({
        id,
        payload,
      }: {
        id: string;
        payload: UpdateAccountStatusPayload;
      }) => adminService.updateUserAccountStatus(id, payload),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["admin", "users"] });
        toast.success("Đã cập nhật trạng thái tài khoản");
        setIsStatusDialogOpen(false);
        setSelectedUser(null);
        setIsStatusFixed(false);
        setStatusReasonInput("");
        setSuspendedUntilInput("");
      },
      onError: () => toast.error("Cập nhật trạng thái thất bại"),
    });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setOffset(0);
  };

  const users: AdminUser[] = data?.users || [];
  const totalPages = data?.totalPages || 1;
  const currentPage = data?.page || Math.floor(offset / limit) + 1;
  const hasPrev = data?.hasPrev ?? offset > 0;
  const hasNext = data?.hasNext ?? currentPage < totalPages;

  // Helper function to get account status
  const getUserAccountStatus = (user: AdminUser): AccountStatus => {
    if (user.accountStatus) {
      return user.accountStatus;
    }
    return user.isActive ? "active" : "locked";
  };

  // Calculate statistics
  const activeCount = users.filter(
    (u) => getUserAccountStatus(u) === "active",
  ).length;
  const suspendedCount = users.filter(
    (u) => getUserAccountStatus(u) === "suspended",
  ).length;
  const lockedCount = users.filter(
    (u) => getUserAccountStatus(u) === "locked",
  ).length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  const stats = {
    total: data?.total ?? 0,
    active: activeCount,
    suspended: suspendedCount,
    locked: lockedCount,
    blocked: suspendedCount + lockedCount,
    admin: adminCount,
  };

  // Dialog handlers
  const openAccountStatusDialog = (user: AdminUser, status: AccountStatus) => {
    setSelectedUser(user);
    setNextAccountStatus(status);
    setIsStatusFixed(status === "suspended");
    setStatusReasonInput("");
    setSuspendedUntilInput("");
    setIsStatusDialogOpen(true);
  };

  const handleSubmitAccountStatus = () => {
    if (!selectedUser) return;

    if (nextAccountStatus === "suspended" && !suspendedUntilInput) {
      toast.error("Vui lòng chọn ngày hết hạn đình chỉ");
      return;
    }

    const payload: UpdateAccountStatusPayload = {
      accountStatus: nextAccountStatus,
      statusReason: statusReasonInput.trim() || undefined,
    };

    if (nextAccountStatus === "suspended") {
      payload.suspendedUntil = suspendedUntilInput;
    }

    updateAccountStatus({
      id: selectedUser._id || selectedUser.id,
      payload,
    });
  };

  // Get status badge styling
  const getStatusBadge = (user: AdminUser) => {
    const status = getUserAccountStatus(user);

    const badgeConfig = {
      active: {
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
        label: "Hoạt động",
        icon: UserCheck,
      },
      suspended: {
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
        label: "Đình chỉ",
        icon: Clock3,
      },
      locked: {
        className:
          "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50",
        label: "Đã khóa",
        icon: Lock,
      },
    };

    return badgeConfig[status] || badgeConfig.active;
  };

  // Filter state management
  const hasFilter =
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "newest" ||
    dateFrom.length > 0 ||
    dateTo.length > 0 ||
    search.length > 0;

  const activeFilterCount =
    Number(roleFilter !== "all") +
    Number(statusFilter !== "all") +
    Number(sortBy !== "newest") +
    Number(Boolean(dateFrom || dateTo));

  const openFilterDialog = () => {
    setDraftRoleFilter(roleFilter);
    setDraftStatusFilter(statusFilter);
    setDraftSortBy(sortBy);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    if (
      draftDateFrom &&
      draftDateTo &&
      new Date(draftDateFrom) > new Date(draftDateTo)
    ) {
      toast.error("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc");
      return;
    }

    setRoleFilter(draftRoleFilter);
    setStatusFilter(draftStatusFilter);
    setSortBy(draftSortBy);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setOffset(0);
    setIsFilterOpen(false);
    void qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setSortBy("newest");
    setDraftRoleFilter("all");
    setDraftStatusFilter("all");
    setDraftSortBy("newest");
    setDateFrom("");
    setDateTo("");
    setDraftDateFrom("");
    setDraftDateTo("");
    setSearch("");
    setSearchInput("");
    setOffset(0);
    setIsFilterOpen(false);
    void qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-2 h-dvh md:p-6 md:gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quản lý người dùng
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Quản lý tài khoản người dùng, phân quyền và cập nhật trạng thái
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <div className="relative px-4 py-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl shadow-sm overflow-hidden group transition-all hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-r from-blue-500 to-indigo-500 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Tổng người dùng
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-300">
                {stats.total}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Tất cả tài khoản
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="relative px-4 py-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl shadow-sm overflow-hidden group transition-all hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-r from-emerald-500 to-green-500 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Đang hoạt động
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {stats.active}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                {((stats.active / (stats.total || 1)) * 100).toFixed(1)}% của tổng số
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Suspended Users Card */}
        <div className="relative px-4 py-5 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl shadow-sm overflow-hidden group transition-all hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-r from-amber-500 to-yellow-500 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Đình chỉ
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-300">
                {stats.suspended}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Tạm ngừng tạm thời
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <Clock3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        {/* Locked Users Card */}
        <div className="relative px-4 py-5 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl shadow-sm overflow-hidden group transition-all hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-r from-rose-500 to-red-500 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Đã khóa
              </p>
              <p className="mt-2 text-3xl font-bold text-rose-700 dark:text-rose-300">
                {stats.locked}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Bị khóa vĩnh viễn
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/40">
              <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white border rounded-lg shadow-sm border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        {/* Search and Filter Bar */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
          <form
            onSubmit={handleSearch}
            className="flex flex-col w-full gap-2 md:flex-row md:items-center"
          >
            <div className="relative flex-1 md:max-w-sm">
              <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên, email..."
                className="pl-9 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Tìm kiếm
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openFilterDialog}
              className="gap-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {hasFilter && (
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="gap-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FilterX className="w-4 h-4" />
                Xóa
              </Button>
            )}
          </form>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 py-14">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-14 text-slate-400">
            <Users className="w-8 h-8" />
            <p className="text-sm font-medium">Không tìm thấy người dùng phù hợp</p>
            {hasFilter && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearFilters}
                className="mt-2 dark:border-slate-600 dark:text-slate-300"
              >
                Xóa bộ lọc để xem tất cả
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 font-semibold text-left text-slate-700 dark:text-slate-300">
                    Người dùng
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-left text-slate-700 dark:text-slate-300 md:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-left text-slate-700 dark:text-slate-300">
                    Vai trò
                  </th>
                  <th className="px-4 py-3 font-semibold text-left text-slate-700 dark:text-slate-300">
                    Trạng thái
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-left text-slate-700 dark:text-slate-300 lg:table-cell">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                    Tác vụ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((user) => {
                  const statusBadge = getStatusBadge(user);
                  const currentAccountStatus = getUserAccountStatus(user);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <tr
                      key={user._id || user.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 border-slate-200 dark:border-slate-700"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PresignedAvatar
                            avatarKey={user.avatar}
                            displayName={user.displayName}
                            className="h-9 w-9"
                            fallbackClassName="text-xs font-semibold"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {user.displayName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-600 dark:text-slate-400 truncate md:table-cell">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${user.role === "admin"
                              ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40"
                              : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                            }`}
                        >
                          {user.role === "admin" ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                          {user.role === "admin" ? "Quản trị" : "Người dùng"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${statusBadge.className}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-600 dark:text-slate-400 lg:table-cell">
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-white dark:bg-slate-800 border dark:border-slate-700"
                          >
                            {currentAccountStatus !== "active" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openAccountStatusDialog(user, "active")
                                }
                                disabled={isUpdatingAccountStatus}
                                className="gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400"
                              >
                                <LockOpen className="w-4 h-4" />
                                Mở lại tài khoản
                              </DropdownMenuItem>
                            )}
                            {currentAccountStatus !== "locked" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openAccountStatusDialog(user, "suspended")
                                  }
                                  disabled={isUpdatingAccountStatus}
                                  className="gap-2 cursor-pointer text-amber-600 dark:text-amber-400"
                                >
                                  <Clock3 className="w-4 h-4" />
                                  Đình chỉ tạm thời
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openAccountStatusDialog(user, "locked")
                                  }
                                  disabled={isUpdatingAccountStatus}
                                  className="gap-2 cursor-pointer text-rose-600 dark:text-rose-400"
                                >
                                  <Lock className="w-4 h-4" />
                                  Khóa tài khoản
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex-shrink-0 flex flex-col gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Trang <span className="font-semibold">{currentPage}</span> / <span className="font-semibold">{totalPages}</span> · <span className="font-semibold text-slate-700 dark:text-slate-300">{data?.total ?? 0}</span> kết quả
            </p>
            {LIMIT_OPTIONS.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Hiển thị</span>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setOffset(0);
                  }}
                >
                  <SelectTrigger className="w-16 h-8 text-xs dark:border-slate-600 dark:bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70] dark:bg-slate-800">
                    {LIMIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-500">/trang</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
              disabled={!hasPrev}
              className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((prev) => prev + limit)}
              disabled={!hasNext}
              className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Tiếp
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold dark:text-white">
              Bộ lọc người dùng
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Vai trò
              </label>
              <Select
                value={draftRoleFilter}
                onValueChange={(value: AdminUserRoleFilter) =>
                  setDraftRoleFilter(value)
                }
              >
                <SelectTrigger className="dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                  <SelectValue placeholder="Lọc theo vai trò" />
                </SelectTrigger>
                <SelectContent className="z-[70] dark:bg-slate-800">
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="user">Người dùng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Trạng thái
              </label>
              <Select
                value={draftStatusFilter}
                onValueChange={(value: AdminUserStatusFilter) =>
                  setDraftStatusFilter(value)
                }
              >
                <SelectTrigger className="dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent className="z-[70] dark:bg-slate-800">
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="suspended">Đình chỉ</SelectItem>
                  <SelectItem value="locked">Đã khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Sắp xếp theo
              </label>
              <Select
                value={draftSortBy}
                onValueChange={(value: AdminUserSortBy) =>
                  setDraftSortBy(value)
                }
              >
                <SelectTrigger className="dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent className="z-[70] dark:bg-slate-800">
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="oldest">Cũ nhất</SelectItem>
                  <SelectItem value="name_asc">Tên A-Z</SelectItem>
                  <SelectItem value="name_desc">Tên Z-A</SelectItem>
                  <SelectItem value="online_first">Online trước</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Khoảng ngày tạo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Từ ngày</span>
                  <Input
                    type="date"
                    value={draftDateFrom}
                    onChange={(e) => setDraftDateFrom(e.target.value)}
                    className="dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Đến ngày</span>
                  <Input
                    type="date"
                    value={draftDateTo}
                    onChange={(e) => setDraftDateTo(e.target.value)}
                    className="dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFilterOpen(false)}
              className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={applyFilters}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Áp dụng bộ lọc
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Status Dialog */}
      <Dialog
        open={isStatusDialogOpen}
        onOpenChange={(open) => {
          setIsStatusDialogOpen(open);
          if (!open) {
            setSelectedUser(null);
            setIsStatusFixed(false);
            setStatusReasonInput("");
            setSuspendedUntilInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold dark:text-white">
              Cập nhật trạng thái tài khoản
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <PresignedAvatar
                avatarKey={selectedUser?.avatar}
                displayName={selectedUser?.displayName}
                className="h-10 w-10 flex-shrink-0"
                fallbackClassName="text-xs font-semibold"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {selectedUser?.displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {selectedUser?.email}
                </p>
              </div>
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Trạng thái mới
              </label>
              {isStatusFixed ? (
                <div className="px-3 py-2.5 text-sm font-medium border rounded-lg border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  Đình chỉ tạm thời
                </div>
              ) : (
                <Select
                  value={nextAccountStatus}
                  onValueChange={(value: AccountStatus) =>
                    setNextAccountStatus(value)
                  }
                >
                  <SelectTrigger className="dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70] dark:bg-slate-800">
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Hoạt động
                      </div>
                    </SelectItem>
                    <SelectItem value="suspended">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Đình chỉ tạm thời
                      </div>
                    </SelectItem>
                    <SelectItem value="locked">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        Khóa vĩnh viễn
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Suspension Date (if suspended) */}
            {nextAccountStatus === "suspended" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  Ngày hết hạn đình chỉ
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={suspendedUntilInput}
                  onChange={(e) => setSuspendedUntilInput(e.target.value)}
                  className="dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chọn ngày hết hạn để tự động mở lại tài khoản
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Lý do
              </label>
              <Textarea
                value={statusReasonInput}
                onChange={(e) => setStatusReasonInput(e.target.value)}
                placeholder="Nhập lý do khóa/đình chỉ (không bắt buộc)"
                rows={3}
                className="dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>

            {/* Info Alert */}
            {nextAccountStatus !== "active" && (
              <div className="flex gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  {nextAccountStatus === "suspended"
                    ? "Tài khoản sẽ bị tạm ngừng cho đến ngày được chọn hoặc cho đến khi bạn quản lý."
                    : "Hành động này sẽ vĩnh viễn khóa tài khoản người dùng."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleSubmitAccountStatus}
              disabled={isUpdatingAccountStatus}
              className={`${nextAccountStatus === "active"
                  ? "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                  : "bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
                }`}
            >
              {isUpdatingAccountStatus ? "Đang cập nhật..." : "Xác nhận cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
