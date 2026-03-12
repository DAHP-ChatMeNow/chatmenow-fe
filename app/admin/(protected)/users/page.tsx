"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService, AdminUser } from "@/api/admin";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const LIMIT_OPTIONS = [5, 10, 20];

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, limit, search],
    queryFn: () => adminService.getUsers(page, limit, search),
  });

  const { mutate: toggleActive, isPending: isToggling } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminService.toggleUserActive(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Đã cập nhật trạng thái người dùng");
    },
    onError: () => toast.error("Thao tác thất bại"),
  });

  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Đã xóa người dùng");
    },
    onError: () => toast.error("Xóa thất bại"),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const users: AdminUser[] = data?.users || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="p-6 space-y-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quản lý người dùng
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data?.total ?? 0} người dùng
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên, email..."
              className="pl-9 w-60 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="text-white bg-blue-600 hover:bg-blue-700"
          >
            Tìm
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white border shadow-sm dark:bg-slate-800 rounded-2xl border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            Không tìm thấy người dùng
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="px-5 py-3 font-semibold text-left text-slate-500 dark:text-slate-400">
                  Người dùng
                </th>
                <th className="hidden px-5 py-3 font-semibold text-left text-slate-500 dark:text-slate-400 md:table-cell">
                  Email
                </th>
                <th className="px-5 py-3 font-semibold text-left text-slate-500 dark:text-slate-400">
                  Role
                </th>
                <th className="px-5 py-3 font-semibold text-left text-slate-500 dark:text-slate-400">
                  Trạng thái
                </th>
                <th className="hidden px-5 py-3 font-semibold text-left text-slate-500 dark:text-slate-400 lg:table-cell">
                  Ngày tạo
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u._id || u.id}
                  className="transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-xs font-bold text-white rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                        {u.displayName?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {u.displayName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {u.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === "admin"
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {u.role === "admin" ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.isActive
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {u.isActive ? "Hoạt động" : "Bị khóa"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs hidden lg:table-cell">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-slate-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-white dark:bg-slate-800"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            toggleActive({
                              id: u._id || u.id,
                              isActive: !u.isActive,
                            })
                          }
                          disabled={isToggling}
                          className="gap-2 cursor-pointer"
                        >
                          {u.isActive ? (
                            <>
                              <ToggleLeft className="w-4 h-4 text-orange-500" />
                              Khóa tài khoản
                            </>
                          ) : (
                            <>
                              <ToggleRight className="w-4 h-4 text-green-500" />
                              Mở khóa
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Xóa tài khoản "${u.displayName}"?`)) {
                              deleteUser(u._id || u.id);
                            }
                          }}
                          disabled={isDeleting}
                          className="gap-2 text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa tài khoản
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Trang {page} / {totalPages} · {data?.total ?? 0} kết quả
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 text-xs bg-white border rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">/ trang</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="dark:border-slate-600 dark:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="dark:border-slate-600 dark:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
