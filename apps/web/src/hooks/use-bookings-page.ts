"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type BookingPage, bookingApi } from "@/lib/bookingApi";

export function useBookingsPage(scope: "all" | "my") {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    status: "Pending",
    oldestFirst: false,
  });
  const [result, setResult] = useState<BookingPage>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 30,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const search = searchQuery.trim();
      setFilters((current) =>
        current.search === search ? current : { ...current, search, page: 1 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadBookings = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await bookingApi.get_page(scope, filters);
      if (requestId === latestRequestId.current) setResult(data);
    } catch (err: unknown) {
      if (requestId !== latestRequestId.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить бронирования. Попробуйте позже.",
      );
      setResult({ items: [], totalCount: 0, page: 1, pageSize: 30 });
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, [scope, filters]);

  useEffect(() => {
    void loadBookings();
    return () => {
      latestRequestId.current++;
    };
  }, [loadBookings]);

  function setSelectedStatus(status: string) {
    setLoading(true);
    setFilters((current) => ({ ...current, status, page: 1 }));
  }

  function setSortOrder(sortOrder: "createdDesc" | "createdAsc") {
    setLoading(true);
    setFilters((current) => ({
      ...current,
      oldestFirst: sortOrder === "createdAsc",
      page: 1,
    }));
  }

  function setPage(page: number) {
    setLoading(true);
    setFilters((current) => ({ ...current, page }));
  }

  function clearFilters() {
    setLoading(true);
    setSearchQuery("");
    setFilters({ page: 1, search: "", status: "all", oldestFirst: false });
    setError(null);
  }

  return {
    ...result,
    loading: loading || searchQuery.trim() !== filters.search,
    error,
    searchQuery,
    setSearchQuery,
    selectedStatus: filters.status,
    setSelectedStatus,
    sortOrder: filters.oldestFirst ? "createdAsc" : "createdDesc",
    setSortOrder,
    setPage,
    clearFilters,
    loadBookings,
  };
}
