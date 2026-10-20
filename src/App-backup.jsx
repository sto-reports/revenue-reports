import { useEffect, useMemo, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { supabase } from "./supabaseClient";
import * as jalaali from "jalaali-js";

function jalaliToGregorianISO(value) {
  const normalizedValue = value
    .trim()
    .replace(/[۰-۹]/g, function (digit) {
      return String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit));
    })
    .replace(/[٠-٩]/g, function (digit) {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
    });

  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(
    normalizedValue
  );

  if (!match) return "";

  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);

  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) {
    return "";
  }

  const result = jalaali.toGregorian(jy, jm, jd);

  return [
    result.gy,
    String(result.gm).padStart(2, "0"),
    String(result.gd).padStart(2, "0"),
  ].join("-");
}

function gregorianISOToJalali(value) {
  if (!value) return "";

  const parts = value.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return "";
  }

  const result = jalaali.toJalaali(
    parts[0],
    parts[1],
    parts[2]
  );

  return [
    result.jy,
    String(result.jm).padStart(2, "0"),
    String(result.jd).padStart(2, "0"),
  ].join("/");
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sources, setSources] = useState([]);
  
  const [reports, setReports] = useState([]);

  const [dateFilter, setDateFilter] = useState("");
const [dateFilterJalali, setDateFilterJalali] = useState("");
const [monthFilter, setMonthFilter] = useState("");
const [yearFilter, setYearFilter] = useState("");
const [monthFilterJalali, setMonthFilterJalali] = useState("");
const [yearFilterJalali, setYearFilterJalali] = useState("");

      const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    full_name: "",
    password: "",
    role: "user",
  });

  const [creatingUser, setCreatingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [newSource, setNewSource] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const [reportForm, setReportForm] = useState({
    source_id: "",
    report_date: new Date().toISOString().slice(0, 10),
    quantity: "",
    cleared_quantity: "",
    revenue_afn: "",
    notes: "",
  });

  const [reportPeriod, setReportPeriod] = useState("all");
  const [reportSource, setReportSource] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
const [reportFromJalali, setReportFromJalali] = useState("");
const [reportToJalali, setReportToJalali] = useState("");
  useEffect(function () {
    checkLogin();
  }, []);

  async function checkLogin() {
    setLoading(true);

    const result = await supabase.auth.getSession();
    const currentSession = result.data.session;

    if (!currentSession) {
      setLoading(false);
      return;
    }

    setSession(currentSession);

    const profileResult = await supabase
      .from("profiles")
      .select("id, username, full_name, role")
      .eq("id", currentSession.user.id)
      .single();

    if (profileResult.error) {
      console.error(profileResult.error);
      setMessage("دریافت اطلاعات کاربر ناموفق بود.");
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);

    await loadSources();
    await loadReports();

    if (profileResult.data.role === "admin") {
      await loadUsers();
    }

    setLoading(false);
  }

  async function loadSources() {
    const result = await supabase
      .from("revenue_sources")
      .select("id, name, is_active")
      .order("id");

    if (result.error) {
      console.error(result.error);
      setMessage("دریافت منابع ناموفق بود.");
      return;
    }

    setSources(result.data || []);
  }

  async function loadReports() {
    const result = await supabase
      .from("revenue_reports")
      .select(
        "id, report_date, quantity, cleared_quantity, revenue_afn, remaining_quantity, notes, source_id, user_id, revenue_sources(name)"
      )
      .order("report_date", { ascending: false })
      .order("id", { ascending: false });

    if (result.error) {
      console.error(result.error);
      setMessage("دریافت گزارش‌ها ناموفق بود.");
      return;
    }

    setReports(result.data || []);
  }

  async function loadUsers() {
    const result = await supabase
      .from("profiles")
      .select("id, username, full_name, role, created_at")
      .order("created_at", { ascending: true });

    if (result.error) {
      console.error(result.error);
      setMessage("دریافت کاربران ناموفق بود.");
      return;
    }

    setUsers(result.data || []);
  }

  async function createUser() {
    if (!newUser.username.trim()) {
      setMessage("نام کاربری را وارد کنید.");
      return;
    }

    if (!newUser.full_name.trim()) {
      setMessage("نام کامل را وارد کنید.");
      return;
    }

    if (!newUser.password) {
      setMessage("رمز عبور را وارد کنید.");
      return;
    }

    if (newUser.password.length < 6) {
      setMessage("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    setCreatingUser(true);
    setMessage("");

    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-create-user",
        {
          body: {
            username: newUser.username.trim(),
            full_name: newUser.full_name.trim(),
            password: newUser.password,
            role: newUser.role,
          },
        }
      );

      if (error) {
        console.error(error);
        setMessage("ایجاد کاربر ناموفق بود. لطفاً اتصال و دسترسی مدیر را بررسی کنید.");
        return;
      }

      if (data?.error) {
        setMessage(data.error);
        return;
      }

      setMessage("کاربر با موفقیت ایجاد شد.");
      setNewUser({
        username: "",
        full_name: "",
        password: "",
        role: "user",
      });
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage("هنگام ایجاد کاربر خطایی رخ داد.");
    } finally {
      setCreatingUser(false);
    }
  }

  async function login() {
    if (!username.trim() || !password) {
      setMessage("نام کاربری و رمز عبور را وارد کنید.");
      return;
    }

    setMessage("در حال ورود...");

    const result = await supabase.functions.invoke("username-login", {
      body: {
        username: username.trim(),
        password: password,
      },
    });

    if (result.error) {
      console.error(result.error);
      setMessage("ورود ناموفق بود.");
      return;
    }

    if (!result.data || result.data.error) {
      setMessage(result.data?.error || "ورود ناموفق بود.");
      return;
    }

    const sessionResult = await supabase.auth.setSession({
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token,
    });

    if (sessionResult.error) {
      console.error(sessionResult.error);
      setMessage("ساخت نشست ورود ناموفق بود.");
      return;
    }

    setUsername("");
    setPassword("");

    await checkLogin();
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setSources([]);
    setReports([]);
    setUsers([]);
    setMessage("");
  }

  function handleReportChange(event) {
    const name = event.target.name;
    const value = event.target.value;

    setReportForm(function (old) {
      return {
        ...old,
        [name]: value,
      };
    });
  }

  async function addReport(event) {
    event.preventDefault();

    if (!reportForm.source_id) {
      setMessage("لطفاً منبع عواید را انتخاب کنید.");
      return;
    }

    if (!reportForm.report_date) {
      setMessage("لطفاً تاریخ را انتخاب کنید.");
      return;
    }

    const quantity = Number(reportForm.quantity || 0);
    const cleared = Number(reportForm.cleared_quantity || 0);
    const revenue = Number(reportForm.revenue_afn || 0);

    if (quantity < 0 || cleared < 0 || revenue < 0) {
      setMessage("مقادیر نمی‌توانند منفی باشند.");
      return;
    }

    if (cleared > quantity) {
      setMessage("مقدار تصفیه‌شده نمی‌تواند بیشتر از مقدار کل باشد.");
      return;
    }

    setMessage("در حال ذخیره گزارش...");

    const result = await supabase.from("revenue_reports").insert({
      user_id: session.user.id,
      source_id: Number(reportForm.source_id),
      report_date: reportForm.report_date,
      quantity: quantity,
      cleared_quantity: cleared,
      revenue_afn: revenue,
      notes: reportForm.notes.trim() || null,
    });

    if (result.error) {
      console.error(result.error);
      setMessage("ذخیره گزارش ناموفق بود: " + result.error.message);
      return;
    }

    setMessage("گزارش با موفقیت ثبت شد.");

    setReportForm({
      source_id: "",
      report_date: new Date().toISOString().slice(0, 10),
      quantity: "",
      cleared_quantity: "",
      revenue_afn: "",
      notes: "",
    });

    await loadReports();
  }

  async function addSource() {
    const name = newSource.trim();

    if (!name) {
      setMessage("نام منبع را وارد کنید.");
      return;
    }

    const result = await supabase.from("revenue_sources").insert({
      name: name,
      is_active: true,
    });

    if (result.error) {
      console.error(result.error);
      setMessage("افزودن منبع ناموفق بود.");
      return;
    }

    setNewSource("");
    setMessage("منبع با موفقیت اضافه شد.");
    await loadSources();
  }

  function startEdit(source) {
    setEditingId(source.id);
    setEditingName(source.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id) {
    const name = editingName.trim();

    if (!name) {
      setMessage("نام منبع نمی‌تواند خالی باشد.");
      return;
    }

    const result = await supabase
      .from("revenue_sources")
      .update({ name: name })
      .eq("id", id);

    if (result.error) {
      console.error(result.error);
      setMessage("تغییر نام منبع ناموفق بود.");
      return;
    }

    setEditingId(null);
    setEditingName("");
    setMessage("نام منبع تغییر کرد.");
    await loadSources();
  }

  async function toggleSource(source) {
    const result = await supabase
      .from("revenue_sources")
      .update({
        is_active: !source.is_active,
      })
      .eq("id", source.id);

    if (result.error) {
      console.error(result.error);
      setMessage("تغییر وضعیت منبع ناموفق بود.");
      return;
    }

    setMessage(
      source.is_active
        ? "منبع غیرفعال شد."
        : "منبع فعال شد."
    );

    await loadSources();
  }

  function dateToString(date) {
    return date.toISOString().slice(0, 10);
  }

  function getTodayDate() {
    return new Date();
  }

  function getDateRange() {
    const today = getTodayDate();

    if (reportPeriod === "all") {
      return { from: "", to: "" };
    }

    if (reportPeriod === "daily") {
      const date = dateToString(today);
      return { from: date, to: date };
    }

    if (reportPeriod === "annual") {
      const year = today.getFullYear();

      return {
        from: String(year) + "-01-01",
        to: String(year) + "-12-31",
      };
    }

    if (reportPeriod === "quarterly") {
      const year = today.getFullYear();
      const month = today.getMonth();
      const quarter = Math.floor(month / 3);
      const startMonth = quarter * 3;

      const start = new Date(year, startMonth, 1);
      const end = new Date(year, startMonth + 3, 0);

      return {
        from: dateToString(start),
        to: dateToString(end),
      };
    }

    if (reportPeriod === "weekly") {
      const current = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const day = current.getDay();
      const daysFromSaturday = day === 6 ? 0 : day + 1;

      const saturday = new Date(current);

      saturday.setDate(
        current.getDate() - daysFromSaturday
      );

      const friday = new Date(saturday);

      friday.setDate(saturday.getDate() + 6);

      return {
        from: dateToString(saturday),
        to: dateToString(friday),
      };
    }

    return { from: "", to: "" };
  }

  function getComparisonPeriods() {
    const today = getTodayDate();

    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const yesterday = new Date(todayStart);

    yesterday.setDate(
      yesterday.getDate() - 1
    );

    const day = todayStart.getDay();

    const daysFromSaturday =
      day === 6 ? 0 : day + 1;

    const currentWeekStart = new Date(
      todayStart
    );

    currentWeekStart.setDate(
      todayStart.getDate() -
      daysFromSaturday
    );

    const currentWeekEnd = new Date(
      currentWeekStart
    );

    currentWeekEnd.setDate(
      currentWeekStart.getDate() + 6
    );

    const previousWeekStart = new Date(
      currentWeekStart
    );

    previousWeekStart.setDate(
      currentWeekStart.getDate() - 7
    );

    const previousWeekEnd = new Date(
      currentWeekEnd
    );

    previousWeekEnd.setDate(
      currentWeekEnd.getDate() - 7
    );

    const currentQuarter =
      Math.floor(todayStart.getMonth() / 3);

    const currentQuarterStart = new Date(
      todayStart.getFullYear(),
      currentQuarter * 3,
      1
    );

    const currentQuarterEnd = new Date(
      todayStart.getFullYear(),
      currentQuarter * 3 + 3,
      0
    );

    const previousQuarterStart = new Date(
      todayStart.getFullYear(),
      currentQuarter * 3 - 3,
      1
    );

    const previousQuarterEnd = new Date(
      todayStart.getFullYear(),
      currentQuarter * 3,
      0
    );

    const currentYearStart = new Date(
      todayStart.getFullYear(),
      0,
      1
    );

    const currentYearEnd = new Date(
      todayStart.getFullYear(),
      11,
      31
    );

    const previousYearStart = new Date(
      todayStart.getFullYear() - 1,
      0,
      1
    );

    const previousYearEnd = new Date(
      todayStart.getFullYear() - 1,
      11,
      31
    );

    return [
      {
        key: "day",
        title: "امروز در برابر روز قبل",
        currentFrom: dateToString(todayStart),
        currentTo: dateToString(todayStart),
        previousFrom: dateToString(yesterday),
        previousTo: dateToString(yesterday),
      },
      {
        key: "week",
        title: "هفته جاری در برابر هفته قبل",
        currentFrom: dateToString(currentWeekStart),
        currentTo: dateToString(currentWeekEnd),
        previousFrom: dateToString(previousWeekStart),
        previousTo: dateToString(previousWeekEnd),
      },
      {
        key: "quarter",
        title: "ربع جاری در برابر ربع قبل",
        currentFrom: dateToString(currentQuarterStart),
        currentTo: dateToString(currentQuarterEnd),
        previousFrom: dateToString(previousQuarterStart),
        previousTo: dateToString(previousQuarterEnd),
      },
      {
        key: "year",
        title: "سال جاری در برابر سال قبل",
        currentFrom: dateToString(currentYearStart),
        currentTo: dateToString(currentYearEnd),
        previousFrom: dateToString(previousYearStart),
        previousTo: dateToString(previousYearEnd),
      },
    ];
  }

  function getRevenueBetween(
    from,
    to,
    sourceId
  ) {
    return reports.reduce(
      function (total, report) {
        const date = report.report_date;

        if (date < from || date > to) {
          return total;
        }

        if (
          sourceId &&
          String(report.source_id) !==
          String(sourceId)
        ) {
          return total;
        }

        return (
          total +
          Number(report.revenue_afn || 0)
        );
      },
      0
    );
  }

  function getChangePercent(
  current,
  previous
) {
    if (previous === 0) {
      if (current === 0) {
        return 0;
      }

      return null;
    }

    return (
      ((current - previous) / previous) *
      100
    );
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString(
      "fa-AF",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  function getComparisonStatus(
    current,
    previous
  ) {
    if (current > previous) {
      return "افزایش";
    }

    if (current < previous) {
      return "کاهش";
    }

    return "بدون تغییر";
  }

  
    const filteredReports = useMemo(
    function () {
      let result = reports.slice();

      const range = getDateRange();

      const from =
        reportFrom || range.from;

      const to =
        reportTo || range.to;

      if (from) {
        result = result.filter(
          function (report) {
            return report.report_date >= from;
          }
        );
      }

      if (to) {
        result = result.filter(
          function (report) {
            return report.report_date <= to;
          }
        );
      }
if (dateFilter) {
  result = result.filter(function (report) {
    return report.report_date === dateFilter;
  });
}

if (monthFilterJalali) {
  const normalizedMonth = monthFilterJalali
    .trim()
    .replace(/[۰-۹]/g, (d) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    )
    .replace(/[٠-٩]/g, (d) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
    );

  const match = /^(\d{4})\/(\d{2})$/.exec(normalizedMonth);

  if (match) {
    const jy = Number(match[1]);
    const jm = Number(match[2]);

    if (jm >= 1 && jm <= 12 && jalaali.isValidJalaaliDate(jy, jm, 1)) {
      result = result.filter(function (report) {
        if (!report.report_date) return false;

        const parts = report.report_date.split("-").map(Number);

        if (parts.length !== 3 || parts.some(Number.isNaN)) {
          return false;
        }

        const jalaliDate = jalaali.toJalaali(
          parts[0],
          parts[1],
          parts[2]
        );

        return jalaliDate.jy === jy && jalaliDate.jm === jm;
      });
    }
  }
}

if (yearFilter) {
  result = result.filter(function (report) {
    return report.report_date.slice(0, 4) === yearFilter;
  });
}
      if (reportSource) {
        result = result.filter(
          function (report) {
            return (
              String(report.source_id) ===
              String(reportSource)
            );
          }
        );
      }

      return result;
    },
    [
      reports,
      reportPeriod,
      reportSource,
      reportFrom,
      reportTo,
      dateFilter,
      monthFilter,
      yearFilter,
    ]
  );
const totalRevenue = filteredReports.reduce(
    function (sum, report) {
      return sum + Number(report.revenue_afn || 0);
    },
    0
  );

  const summary = useMemo(
    function () {
      return filteredReports.reduce(
        function (total, report) {
          total.quantity += Number(
            report.quantity || 0
          );

          total.cleared += Number(
            report.cleared_quantity || 0
          );

          total.remaining += Number(
            report.remaining_quantity || 0
          );

          total.revenue += Number(
            report.revenue_afn || 0
          );

          return total;
        },
        {
          quantity: 0,
          cleared: 0,
          remaining: 0,
          revenue: 0,
        }
      );
    },
    [filteredReports]
  );

  const comparisonPeriods =
    getComparisonPeriods();

  const comparisonRows =
    comparisonPeriods.map(
      function (period) {
        const currentRevenue =
          getRevenueBetween(
            period.currentFrom,
            period.currentTo,
            reportSource
          );

        const previousRevenue =
          getRevenueBetween(
            period.previousFrom,
            period.previousTo,
            reportSource
          );

        const difference =
          currentRevenue -
          previousRevenue;

        const percent =
          getChangePercent(
            currentRevenue,
            previousRevenue
          );

        return {
          ...period,
          currentRevenue:
            currentRevenue,
          previousRevenue:
            previousRevenue,
          difference: difference,
          percent: percent,
          status:
            getComparisonStatus(
              currentRevenue,
              previousRevenue
            ),
        };
      }
    );

  const last7DaysChartData =
    useMemo(
      function () {
        const data = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
          const date = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - i
          );

          const dateString =
            dateToString(date);

          const revenue =
            reports.reduce(
              function (
                total,
                report
              ) {
                if (
                  report.report_date ===
                  dateString
                ) {
                  return (
                    total +
                    Number(
                      report.revenue_afn ||
                      0
                    )
                  );
                }

                return total;
              },
              0
            );

          data.push({
            date: dateString,
            revenue: revenue,
          });
        }

        return data;
      },
      [reports]
    );

  const sourceChartData = useMemo(
    function () {
      return sources.map(
        function (source) {
          const revenue =
            reports.reduce(
              function (
                total,
                report
              ) {
                if (
                  String(
                    report.source_id
                  ) ===
                  String(source.id)
                ) {
                  return (
                    total +
                    Number(
                      report.revenue_afn ||
                      0
                    )
                  );
                }

                return total;
              },
              0
            );

          return {
            name: source.name,
            revenue: revenue,
          };
        }
      );
    },
    [sources, reports]
  );

  const last12MonthsChartData =
    useMemo(
      function () {
        const data = [];
        const today = new Date();

        for (let i = 11; i >= 0; i--) {
          const date = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
          );

          const year =
            date.getFullYear();

          const month =
            date.getMonth();

          const monthString =
            String(year) +
            "-" +
            String(month + 1).padStart(
              2,
              "0"
            );

          const revenue =
            reports.reduce(
              function (
                total,
                report
              ) {
                if (
                  report.report_date.startsWith(
                    monthString
                  )
                ) {
                  return (
                    total +
                    Number(
                      report.revenue_afn ||
                      0
                    )
                  );
                }

                return total;
              },
              0
            );

          data.push({
            month: monthString,
            revenue: revenue,
          });
        }

        return data;
      },
      [reports]
    );

  const activeSources =
    sources.filter(
      function (source) {
        return source.is_active;
      }
    );

  const selectedRange =
    getDateRange();

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)",
      fontFamily:
        "Tahoma, Arial, sans-serif",
      color: "#1e293b",
    },

    header: {
      background: "#ffffff",
      padding: "18px 30px",
      borderBottom:
        "1px solid #e2e8f0",
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",
      gap: "20px",
      boxShadow:
        "0 2px 10px rgba(15, 23, 42, 0.04)",
    },

    section: {
      background: "#ffffff",
      padding: "26px",
      borderRadius: "16px",
      border:
        "1px solid #e2e8f0",
      marginBottom: "26px",
      boxShadow:
        "0 5px 18px rgba(15, 23, 42, 0.05)",
    },

    input: {
      width: "100%",
      padding: "11px 12px",
      marginTop: "7px",
      boxSizing: "border-box",
      border:
        "1px solid #cbd5e1",
      borderRadius: "9px",
      fontFamily: "Tahoma",
      background: "#ffffff",
    },

    primaryButton: {
      border: "none",
      borderRadius: "9px",
      padding: "11px 20px",
      cursor: "pointer",
      background: "#2563eb",
      color: "#ffffff",
      fontWeight: "bold",
      fontFamily: "Tahoma",
    },

    secondaryButton: {
      border:
        "1px solid #cbd5e1",
      borderRadius: "9px",
      padding: "9px 15px",
      cursor: "pointer",
      background: "#ffffff",
      color: "#334155",
      fontFamily: "Tahoma",
    },

    sectionTitle: {
      marginTop: 0,
      marginBottom: "8px",
      color: "#0f172a",
    },

    sectionDescription: {
      color: "#64748b",
      fontSize: "14px",
      marginTop: 0,
      marginBottom: "22px",
    },

    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "850px",
    },

    tableHeader: {
      background: "#f8fafc",
      color: "#475569",
      fontWeight: "bold",
    },

    tableCell: {
      padding: "13px 12px",
      borderBottom:
        "1px solid #e2e8f0",
      textAlign: "right",
      whiteSpace: "nowrap",
    },
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "Tahoma",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "35px 50px",
            borderRadius: "16px",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.08)",
            textAlign: "center",
            color: "#475569",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            سیستم گزارش عواید
          </div>

          <div>
            در حال بارگذاری...
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "Tahoma",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "35px",
            boxShadow:
              "0 15px 45px rgba(15, 23, 42, 0.10)",
            border:
              "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin:
                  "0 auto 15px",
                borderRadius: "16px",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: "bold",
              }}
            >
              ع
            </div>

            <h1
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "25px",
              }}
            >
              سیستم گزارش عواید
            </h1>

            <p
              style={{
                color: "#64748b",
                marginTop: "8px",
              }}
            >
              برای ورود، مشخصات کاربری خود را وارد کنید.
            </p>
          </div>

          <label
            style={{
              fontWeight: "bold",
              color: "#334155",
            }}
          >
            نام کاربری
          </label>

          <input
            value={username}
            onChange={function (
              event
            ) {
              setUsername(
                event.target.value
              );
            }}
            onKeyDown={function (
              event
            ) {
              if (
                event.key ===
                "Enter"
              ) {
                login();
              }
            }}
            placeholder="نام کاربری"
            style={styles.input}
          />

          <label
            style={{
              display: "block",
              marginTop: "18px",
              fontWeight: "bold",
              color: "#334155",
            }}
          >
            رمز عبور
          </label>

          <input
            type="password"
            value={password}
            onChange={function (
              event
            ) {
              setPassword(
                event.target.value
              );
            }}
            onKeyDown={function (
              event
            ) {
              if (
                event.key ===
                "Enter"
              ) {
                login();
              }
            }}
            placeholder="رمز عبور"
            style={styles.input}
          />

          <button
            onClick={login}
            style={{
              ...styles.primaryButton,
              width: "100%",
              marginTop: "22px",
              padding: "13px",
              fontSize: "15px",
            }}
          >
            ورود به سیستم
          </button>

          {message && (
            <div
              style={{
                marginTop: "18px",
                padding: "12px",
                borderRadius: "9px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={styles.page}
    >
      <header
        style={styles.header}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "20px",
              }}
            >
              ع
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: "#0f172a",
                }}
              >
                داشبورد سیستم گزارش عواید
              </h1>

              <div
                style={{
                  marginTop: "5px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                مدیریت و تحلیل عواید
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <div
            style={{
              textAlign: "left",
              paddingLeft: "10px",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#334155",
              }}
            >
              {profile?.full_name}
            </div>

            <div
              style={{
                marginTop: "4px",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              {profile?.role ===
                "admin"
                ? "مدیر سیستم"
                : "کاربر سیستم"}
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              ...styles.secondaryButton,
              color: "#dc2626",
              borderColor:
                "#fecaca",
            }}
          >
            خروج
          </button>
        </div>
      </header>

      <main
        style={{
          padding: "30px",
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        {message && (
          <div
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              border:
                "1px solid #bfdbfe",
              padding:
                "13px 16px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        <section
          style={styles.section}
        >
          <h2
            style={styles.sectionTitle}
          >
            ثبت گزارش عواید
          </h2>

          <p
            style={
              styles.sectionDescription
            }
          >
            اطلاعات روزانه عواید را در این بخش ثبت کنید.
          </p>

          <form
            onSubmit={addReport}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
              }}
            >
              <div>
                <label>
                  منبع عواید
                </label>

                <select
                  name="source_id"
                  value={
                    reportForm.source_id
                  }
                  onChange={
                    handleReportChange
                  }
                  style={
                    styles.input
                  }
                >
                  <option value="">
                    انتخاب منبع
                  </option>

                  {activeSources.map(
                    function (
                      source
                    ) {
                      return (
                        <option
                          key={
                            source.id
                          }
                          value={
                            source.id
                          }
                        >
                          {
                            source.name
                          }
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div>
                <label>
                  تاریخ
                </label>

                <input
                  type="date"
                  name="report_date"
                  value={
                    reportForm.report_date
                  }
                  onChange={
                    handleReportChange
                  }
                  style={
                    styles.input
                  }
                />
              </div>

              <div>
                <label>
                  مقدار
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="quantity"
                  value={
                    reportForm.quantity
                  }
                  onChange={
                    handleReportChange
                  }
                  placeholder="مثلاً 100"
                  style={
                    styles.input
                  }
                />
              </div>

              <div>
                <label>
                  مقدار تصفیه‌شده
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="cleared_quantity"
                  value={
                    reportForm.cleared_quantity
                  }
                  onChange={
                    handleReportChange
                  }
                  placeholder="مثلاً 80"
                  style={
                    styles.input
                  }
                />
              </div>

              <div>
                <label>
                  عواید به افغانی
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="revenue_afn"
                  value={
                    reportForm.revenue_afn
                  }
                  onChange={
                    handleReportChange
                  }
                  placeholder="مثلاً 50000"
                  style={
                    styles.input
                  }
                />
              </div>

              <div>
                <label>
                  توضیحات
                </label>

                <input
                  type="text"
                  name="notes"
                  value={
                    reportForm.notes
                  }
                  onChange={
                    handleReportChange
                  }
                  placeholder="اختیاری"
                  style={
                    styles.input
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                ...styles.primaryButton,
                marginTop: "22px",
              }}
            >
              ثبت گزارش
            </button>
          </form>
        </section>

        <section
          style={styles.section}
        >
          <h2
            style={styles.sectionTitle}
          >
            نمودارهای عواید
          </h2>

          <p
            style={
              styles.sectionDescription
            }
          >
            نمای کلی روند عواید در روزها، منابع و ماه‌های اخیر.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(350px, 1fr))",
              gap: "25px",
            }}
          >
            <div>
              <h3>
                عواید ۷ روز اخیر
              </h3>

              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <LineChart
                  data={
                    last7DaysChartData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="date"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={function (
                      value
                    ) {
                      return [
                        formatNumber(
                          value
                        ) +
                        " افغانی",
                        "عواید",
                      ];
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="عواید"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3>
                مقایسه عواید منابع
              </h3>

              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <BarChart
                  data={
                    sourceChartData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={function (
                      value
                    ) {
                      return [
                        formatNumber(
                          value
                        ) +
                        " افغانی",
                        "عواید",
                      ];
                    }}
                  />

                  <Legend />

                  <Bar
                    dataKey="revenue"
                    name="عواید"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              <h3>
                روند عواید ۱۲ ماه اخیر
              </h3>

              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <LineChart
                  data={
                    last12MonthsChartData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={function (
                      value
                    ) {
                      return [
                        formatNumber(
                          value
                        ) +
                        " افغانی",
                        "عواید",
                      ];
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="عواید"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section
          style={styles.section}
        >
          <h2
            style={styles.sectionTitle}
          >
            مقایسه عواید
          </h2>

          <p
            style={
              styles.sectionDescription
            }
          >
            مقایسه عواید دوره فعلی با دوره قبلی و نمایش درصد تغییر.
          </p>

          <div
            style={{
              marginBottom: "22px",
              padding: "16px",
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
              borderRadius: "10px",
            }}
          >
            <label
              style={{
                fontWeight:
                  "bold",
              }}
            >
              منبع برای مقایسه:
            </label>

            <select
              value={
                reportSource
              }
              onChange={function (
                event
              ) {
                setReportSource(
                  event.target.value
                );
              }}
              style={{
                ...styles.input,
                maxWidth: "420px",
              }}
            >
              <option value="">
                مجموع تمام منابع
              </option>

              {sources.map(
                function (
                  source
                ) {
                  return (
                    <option
                      key={
                        source.id
                      }
                      value={
                        source.id
                      }
                    >
                      {
                        source.name
                      }
                    </option>
                  );
                }
              )}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
            }}
          >
            {comparisonRows.map(
              function (row) {
                const isIncrease =
                  row.difference >
                  0;

                const isDecrease =
                  row.difference <
                  0;

                const isSame =
                  row.difference ===
                  0;

                return (
                  <div
                    key={row.key}
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "14px",
                      padding: "20px",
                      background:
                        "#ffffff",
                      boxShadow:
                        "0 3px 12px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom:
                          "18px",
                        color:
                          "#0f172a",
                      }}
                    >
                      {row.title}
                    </h3>

                    <div
                      style={{
                        display:
                          "grid",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              "12px",
                            color:
                              "#64748b",
                          }}
                        >
                          دوره فعلی
                        </div>

                        <div
                          style={{
                            fontSize:
                              "21px",
                            fontWeight:
                              "bold",
                            marginTop:
                              "4px",
                          }}
                        >
                          {formatNumber(
                            row.currentRevenue
                          )}{" "}
                          افغانی
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize:
                              "12px",
                            color:
                              "#64748b",
                          }}
                        >
                          دوره قبلی
                        </div>

                        <div
                          style={{
                            fontSize:
                              "18px",
                            marginTop:
                              "4px",
                          }}
                        >
                          {formatNumber(
                            row.previousRevenue
                          )}{" "}
                          افغانی
                        </div>
                      </div>

                      <div
                        style={{
                          borderTop:
                            "1px solid #e2e8f0",
                          paddingTop:
                            "12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "12px",
                            color:
                              "#64748b",
                          }}
                        >
                          میزان تغییر
                        </div>

                        <div
                          style={{
                            fontSize:
                              "17px",
                            fontWeight:
                              "bold",
                            marginTop:
                              "4px",
                          }}
                        >
                          {row.difference >
                            0
                            ? "+"
                            : ""}
                          {formatNumber(
                            row.difference
                          )}{" "}
                          افغانی
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop:
                          "15px",
                        padding:
                          "10px",
                        borderRadius:
                          "9px",
                        background:
                          isIncrease
                            ? "#f0fdf4"
                            : isDecrease
                              ? "#fef2f2"
                              : "#f8fafc",
                        color:
                          isIncrease
                            ? "#15803d"
                            : isDecrease
                              ? "#b91c1c"
                              : "#64748b",
                        fontWeight:
                          "bold",
                        textAlign:
                          "center",
                      }}
                    >
                      {row.percent ===
                        null
                        ? row.currentRevenue >
                          0
                          ? "جدید: 100٪+"
                          : "۰٪"
                        : (row.percent >
                          0
                          ? "+"
                          : "") +
                        row.percent.toLocaleString(
                          "fa-AF",
                          {
                            maximumFractionDigits: 2,
                          }
                        ) +
                        "٪"}{" "}
                      —{" "}
                      {isIncrease
                        ? "افزایش عواید"
                        : isDecrease
                          ? "کاهش عواید"
                          : isSame
                            ? "بدون تغییر"
                            : row.status}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "12px",
                        fontSize:
                          "11px",
                        color:
                          "#94a3b8",
                        lineHeight:
                          1.8,
                      }}
                    >
                      {
                        row.currentFrom
                      }{" "}
                      تا{" "}
                      {
                        row.currentTo
                      }
                      <br />
                      در مقایسه با{" "}
                      {
                        row.previousFrom
                      }{" "}
                      تا{" "}
                      {
                        row.previousTo
                      }
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section
          style={styles.section}
        >
          <h2
            style={styles.sectionTitle}
          >
            مقایسه منابع در چهار دوره
          </h2>

          <p
            style={
              styles.sectionDescription
            }
          >
            عواید هر منبع را برای امروز، هفته، ربع و سال با دوره قبلی مقایسه کنید.
          </p>

          {sources.length ===
            0 ? (
            <p>
              منبعی وجود ندارد.
            </p>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={styles.table}
              >
                <thead>
                  <tr
                    style={
                      styles.tableHeader
                    }
                  >
                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      منبع
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      امروز
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      تغییر روزانه
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      این هفته
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      تغییر هفتگی
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      این ربع
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      تغییر ربع
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      امسال
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      تغییر سالانه
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sources.map(
                    function (
                      source
                    ) {
                      const sourceRows =
                        comparisonPeriods.map(
                          function (
                            period
                          ) {
                            const current =
                              getRevenueBetween(
                                period.currentFrom,
                                period.currentTo,
                                source.id
                              );

                            const previous =
                              getRevenueBetween(
                                period.previousFrom,
                                period.previousTo,
                                source.id
                              );

                            return {
                              current:
                                current,
                              previous:
                                previous,
                              difference:
                                current -
                                previous,
                              percent:
                                getChangePercent(
                                  current,
                                  previous
                                ),
                            };
                          }
                        );

                      return (
                        <tr
                          key={
                            source.id
                          }
                        >
                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            <strong>
                              {
                                source.name
                              }
                            </strong>
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {formatNumber(
                              sourceRows[0]
                                .current
                            )}
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {sourceRows[0]
                              .percent ===
                              null
                              ? "جدید"
                              : (sourceRows[0]
                                .percent >
                                0
                                ? "+"
                                : "") +
                              sourceRows[0].percent.toLocaleString(
                                "fa-AF",
                                {
                                  maximumFractionDigits: 2,
                                }
                              ) +
                              "٪"}
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {formatNumber(
                              sourceRows[1]
                                .current
                            )}
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {sourceRows[1]
                              .percent ===
                              null
                              ? "جدید"
                              : (sourceRows[1]
                                .percent >
                                0
                                ? "+"
                                : "") +
                              sourceRows[1].percent.toLocaleString(
                                "fa-AF",
                                {
                                  maximumFractionDigits: 2,
                                }
                              ) +
                              "٪"}
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {formatNumber(
                              sourceRows[2]
                                .current
                            )}
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {sourceRows[2]
                              .percent ===
                              null
                              ? "جدید"
                              : (sourceRows[2]
                                .percent >
                                0
                                ? "+"
                                : "") +
                              sourceRows[2].percent.toLocaleString(
                                "fa-AF",
                                {
                                  maximumFractionDigits: 2,
                                }
                              ) +
                              "٪"}
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {formatNumber(
                              sourceRows[3]
                                .current
                            )}
                          </td>

                          <td
                            style={
                              styles.tableCell
                            }
                          >
                            {sourceRows[3]
                              .percent ===
                              null
                              ? "جدید"
                              : (sourceRows[3]
                                .percent >
                                0
                                ? "+"
                                : "") +
                              sourceRows[3].percent.toLocaleString(
                                "fa-AF",
                                {
                                  maximumFractionDigits: 2,
                                }
                              ) +
                              "٪"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          style={styles.section}
        >
          <h2
            style={styles.sectionTitle}
          >
            گزارش‌گیری و خلاصه عواید
          </h2>

          <p
            style={
              styles.sectionDescription
            }
          >
            دوره، منبع و تاریخ مورد نظر را انتخاب کنید تا خلاصه و گزارش‌های مربوط نمایش داده شود.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom:
                "20px",
            }}
          >
            <div>
              <label>
                نوع گزارش
              </label>

              <select
                value={
                  reportPeriod
                }
                onChange={function (
                  event
                ) {
                  setReportPeriod(
                    event.target.value
                  );
                }}
                style={
                  styles.input
                }
              >
                <option value="all">
                  همه گزارش‌ها
                </option>

                <option value="daily">
                  روزانه
                </option>

                <option value="weekly">
                  هفتگی
                </option>

                <option value="quarterly">
                  سه‌ماهه
                </option>

                <option value="annual">
                  سالانه
                </option>
              </select>
            </div>

            <div>
              <label>
                منبع
              </label>

              <select
                value={
                  reportSource
                }
                onChange={function (
                  event
                ) {
                  setReportSource(
                    event.target.value
                  );
                }}
                style={
                  styles.input
                }
              >
                <option value="">
                  همه منابع
                </option>

                {sources.map(
                  function (
                    source
                  ) {
                    return (
                      <option
                        key={
                          source.id
                        }
                        value={
                          source.id
                        }
                      >
                        {
                          source.name
                        }
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            <div>
              <label>
                از تاریخ
              </label>

              <input
type="text"
placeholder="مثلاً ۱۴۰۵/۰۷/۲۱"
value={reportFromJalali}
onChange={function (event) {
const value = event.target.value;
setReportFromJalali(value);

const gregorianDate = jalaliToGregorianISO(value);
console.log("تاریخ شمسی:", value, "تاریخ میلادی:", gregorianDate);
setReportFrom(gregorianDate);

}}
style={styles.input}
/>
            </div>

            <div>
              <label>
                تا تاریخ
              </label>

              <input
type="text"
placeholder="مثلاً ۱۴۰۵/۰۷/۲۱"
value={reportToJalali}
onChange={function (event) {
const value = event.target.value;
setReportToJalali(value);

const gregorianDate = jalaliToGregorianISO(value);
setReportTo(gregorianDate);

}}
style={styles.input}
/>
            </div>
          </div>

          <div
            style={{
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
              padding:
                "14px 16px",
              borderRadius: "10px",
              marginBottom:
                "22px",
              color: "#475569",
            }}
          >
            <strong>
  بازه انتخاب‌شده:
</strong>{" "}
{gregorianISOToJalali(reportFrom || selectedRange.from) || "ابتدا"}
{" "}تا{" "}
{gregorianISOToJalali(reportTo || selectedRange.to) || "اکنون"}
</div>


          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
              marginBottom:
                "30px",
            }}
          >
            <div
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #dbeafe",
                borderRight:
                  "5px solid #2563eb",
                borderRadius:
                  "14px",
                padding: "22px",
                boxShadow:
                  "0 5px 15px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "14px",
                  fontWeight:
                    "bold",
                }}
              >
                مجموع مقدار
              </div>

              <div
                style={{
                  fontSize:
                    "30px",
                  fontWeight:
                    "bold",
                  color:
                    "#1d4ed8",
                  marginTop:
                    "10px",
                }}
              >
                {formatNumber(
                  summary.quantity
                )}
              </div>

              <div
                style={{
                  color:
                    "#94a3b8",
                  fontSize:
                    "12px",
                  marginTop:
                    "7px",
                }}
              >
                کل مقدار در بازه انتخاب‌شده
              </div>
            </div>

            <div
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #dcfce7",
                borderRight:
                  "5px solid #16a34a",
                borderRadius:
                  "14px",
                padding: "22px",
                boxShadow:
                  "0 5px 15px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "14px",
                  fontWeight:
                    "bold",
                }}
              >
                مجموع تصفیه‌شده
              </div>

              <div
                style={{
                  fontSize:
                    "30px",
                  fontWeight:
                    "bold",
                  color:
                    "#15803d",
                  marginTop:
                    "10px",
                }}
              >
                {formatNumber(
                  summary.cleared
                )}
              </div>

              <div
                style={{
                  color:
                    "#94a3b8",
                  fontSize:
                    "12px",
                  marginTop:
                    "7px",
                }}
              >
                مقدار تصفیه‌شده در بازه انتخاب‌شده
              </div>
            </div>

            <div
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #fef3c7",
                borderRight:
                  "5px solid #f59e0b",
                borderRadius:
                  "14px",
                padding: "22px",
                boxShadow:
                  "0 5px 15px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "14px",
                  fontWeight:
                    "bold",
                }}
              >
                مجموع باقی‌مانده
              </div>

              <div
                style={{
                  fontSize:
                    "30px",
                  fontWeight:
                    "bold",
                  color:
                    "#b45309",
                  marginTop:
                    "10px",
                }}
              >
                {formatNumber(
                  summary.remaining
                )}
              </div>

              <div
                style={{
                  color:
                    "#94a3b8",
                  fontSize:
                    "12px",
                  marginTop:
                    "7px",
                }}
              >
                مقدار باقی‌مانده
              </div>
            </div>

            <div
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #ede9fe",
                borderRight:
                  "5px solid #7c3aed",
                borderRadius:
                  "14px",
                padding: "22px",
                boxShadow:
                  "0 5px 15px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "14px",
                  fontWeight:
                    "bold",
                }}
              >
                مجموع عواید
              </div>

              <div
                style={{
                  fontSize:
                    "28px",
                  fontWeight:
                    "bold",
                  color:
                    "#6d28d9",
                  marginTop:
                    "10px",
                }}
              >
                {formatNumber(
                  summary.revenue
                )}
              </div>

              <div
                style={{
                  color:
                    "#94a3b8",
                  fontSize:
                    "12px",
                  marginTop:
                    "7px",
                }}
              >
                افغانی — کل عواید بازه انتخاب‌شده
              </div>
            </div>
          </div>

          <h3
            style={{
              color:
                "#0f172a",
              marginBottom:
                "15px",
            }}
          >
            نتایج گزارش
          </h3>

          {filteredReports.length ===
            0 ? (
            <div
              style={{
                padding:
                  "25px",
                background:
                  "#f8fafc",
                borderRadius:
                  "10px",
                textAlign:
                  "center",
                color:
                  "#64748b",
              }}
            >
              برای این فیلتر گزارشی پیدا نشد.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, }} >
<label>
  روز:
  <input
    type="text"
    placeholder="۱۴۰۵/۰۷/۲۱"
    value={dateFilterJalali}
    onChange={(e) => {
      const value = e.target.value;
      setDateFilterJalali(value);

      const normalizedValue = value
        .trim()
        .replace(/[۰-۹]/g, (d) =>
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        )
        .replace(/[٠-٩]/g, (d) =>
          String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
        );

      const isCompleteDate = /^\d{4}\/\d{2}\/\d{2}$/.test(
        normalizedValue
      );

      const gregorianDate = isCompleteDate
        ? jalaliToGregorianISO(value)
        : "";

      setDateFilter(gregorianDate);
      setMonthFilter("");
      setMonthFilterJalali("");
      setYearFilter("");
      setYearFilterJalali("");
    }}
  />
</label>

<label>
  ماه شمسی:
  <input
    type="text"
    placeholder="۱۴۰۵/۰۷"
    value={monthFilterJalali}
    onChange={(e) => {
      const value = e.target.value;
      setMonthFilterJalali(value);

      const normalizedValue = value
        .trim()
        .replace(/[۰-۹]/g, (d) =>
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        )
        .replace(/[٠-٩]/g, (d) =>
          String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
        );

      const match = /^(\d{4})\/(\d{2})$/.exec(
        normalizedValue
      );

      if (match) {
        const jy = Number(match[1]);
        const jm = Number(match[2]);

        if (
          jm >= 1 &&
          jm <= 12 &&
          jalaali.isValidJalaaliDate(jy, jm, 1)
        ) {
          const gregorian = jalaali.toGregorian(jy, jm, 1);

          setMonthFilter(
            `${gregorian.gy}-${String(gregorian.gm).padStart(2, "0")}`
          );
        } else {
          setMonthFilter("");
        }
      } else {
        setMonthFilter("");
      }

      setDateFilter("");
      setDateFilterJalali("");
      setYearFilter("");
      setYearFilterJalali("");
    }}
  />
</label>

<label>
  سال شمسی:
  <input
    type="text"
    placeholder="۱۴۰۵"
    value={yearFilterJalali}
    onChange={(e) => {
      const value = e.target.value;
      setYearFilterJalali(value);

      const normalizedValue = value
        .trim()
        .replace(/[۰-۹]/g, (d) =>
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        )
        .replace(/[٠-٩]/g, (d) =>
          String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
        );

      if (/^\d{4}$/.test(normalizedValue)) {
        const jy = Number(normalizedValue);

        if (jalaali.isValidJalaaliDate(jy, 1, 1)) {
          const gregorian = jalaali.toGregorian(jy, 1, 1);
          setYearFilter(String(gregorian.gy));
        } else {
          setYearFilter("");
        }
      } else {
        setYearFilter("");
      }

      setDateFilter("");
      setDateFilterJalali("");
      setMonthFilter("");
      setMonthFilterJalali("");
    }}
  />
</label>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter("");
                    setMonthFilter("");
                    setYearFilter("");
                  }}
                >
                  پاک‌کردن فیلتر
                </button>

              </div>

              {/* جدول گزارش‌ها از اینجا شروع می‌شود */}


              <div
                style={{
                  overflowX:
                    "auto",
                }}
              >
                <table
                  style={styles.table}
                >
                  <thead>
                    <tr
                      style={
                        styles.tableHeader
                      }
                    >
                      <th
                        style={
                          styles.tableCell
                        }
                      >
                        تاریخ
                      </th>

                      <th
                        style={
                          styles.tableCell
                        }
                      >
                        منبع
                      </th>

                      <th
                        style={
                          styles.tableCell
                        }
                      >
                        مقدار
                      </th>

                      <th
                        style={
                          styles.tableCell
                        }
                      >
                        تصفیه‌شده
                      </th>

                      <th
                        style={
                          styles.tableCell
                        }
                      >
                        باقی‌مانده
                      </th>

                      <th
                        style={
                          styles.tableCell
                        }
                      >
                        عواید
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredReports.map(
                      function (
                        report
                      ) {
                        return (
                          <tr
                            key={
                              report.id
                            }
                          >
                            <td
                              style={
                                styles.tableCell
                              }
                            >
                              {
                                report.report_date
                              }
                            </td>

                            <td
                              style={
                                styles.tableCell
                              }
                            >
                              {report
                                .revenue_sources
                                ?.name ||
                                "نامشخص"}
                            </td>

                            <td
                              style={
                                styles.tableCell
                              }
                            >
                              {formatNumber(
                                report.quantity
                              )}
                            </td>

                            <td
                              style={
                                styles.tableCell
                              }
                            >
                              {formatNumber(
                                report.cleared_quantity
                              )}
                            </td>

                            <td
                              style={
                                styles.tableCell
                              }
                            >
                              {formatNumber(
                                report.remaining_quantity
                              )}
                            </td>

                            <td
                              style={
                                styles.tableCell
                              }
                            >
                              <strong>
                                {formatNumber(
                                  report.revenue_afn
                                )}
                              </strong>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table> </div> </>)} </section> <section style={styles.section} > <h2 style={styles.sectionTitle} > همه گزارش‌های ثبت‌شده

                </h2>

          <p
            style={
              styles.sectionDescription
            }
          >
            فهرست کامل گزارش‌هایی که برای حساب شما قابل مشاهده است.
          </p>

          {reports.length ===
            0 ? (
            <div
              style={{
                padding:
                  "25px",
                background:
                  "#f8fafc",
                borderRadius:
                  "10px",
                textAlign:
                  "center",
                color:
                  "#64748b",
              }}
            >
              هنوز گزارشی ثبت نشده است.
            </div>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={styles.table}
              >
                <thead>
                  <tr
                    style={
                      styles.tableHeader
                    }
                  >
                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      تاریخ
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      منبع
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      مقدار
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      تصفیه‌شده
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      باقی‌مانده
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      عواید
                    </th>

                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      توضیحات
                    </th>
                  </tr>
                </thead>

                
                  <tbody>
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: "12px",
                          fontWeight: "bold",
                          fontSize: "18px",
                          backgroundColor: "#e8f5e9",
                        }}
                      >
                        مجموع کل عواید: {totalRevenue.toLocaleString("en-US")} افغانی
                      </td>
                    </tr>

                    {filteredReports.map(function (report) {
  return (
                                <tr
                                  key={
                                    report.id
                                  }
                                >
                                  <td
                                    style={
                                      styles.tableCell
                                    }
                                  >
                                    {
                                      report.report_date
                                    }
                                  </td>

                                  <td
                                    style={
                                      styles.tableCell
                                    }
                                  >
                                    {report
                                      .revenue_sources
                                      ?.name ||
                                      "نامشخص"}
                                  </td>

                                  <td
                                    style={
                                      styles.tableCell
                                    }
                                  >
                                    {formatNumber(
                                      report.quantity
                                    )}
                                  </td>

                                  <td
                                    style={
                                      styles.tableCell
                                    }
                                  >
                                    {formatNumber(
                                      report.cleared_quantity
                                    )}
                                  </td>

                                  <td
                                    style={
                                      styles.tableCell
                                    }
                                  >
                                    {formatNumber(
                                      report.remaining_quantity
                                    )}
                                  </td>

                                  <td
                                    style={
                                      styles.tableCell
                                    }
                                  >
                                    <strong>
                                      {formatNumber(
                                        report.revenue_afn
                                      )}
                                    </strong>
                                  </td>

                                  <td
                                    style={
                                      styles.tableCell
                                    }
                                  >
                                    {report.notes ||
                                      "-"}
                                  </td>
                                </tr>
                                                            );
                            })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {profile?.role ===
          "admin" && (
            <>
              <section
                style={
                  styles.section
                }
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "15px",
                    flexWrap:
                      "wrap",
                    marginBottom:
                      "8px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        ...styles.sectionTitle,
                        marginBottom:
                          "8px",
                      }}
                    >
                      مدیریت کاربران
                    </h2>

                    <p
                      style={{
                        ...styles.sectionDescription,
                        marginBottom:
                          0,
                      }}
                    >
                      فهرست کاربران سیستم و خلاصه فعالیت هر کاربر.

                    </p>
                  </div>

                  <button
                    onClick={loadUsers}
                    style={
                      styles.secondaryButton
                    }
                  >
                    تازه‌سازی کاربران
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "24px",
                    padding: "20px",
                    border: "1px solid #dbeafe",
                    borderRadius: "12px",
                    background: "#f8fbff",
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
                    ایجاد کاربر جدید
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "15px",
                    }}
                  >
                    <div>
                      <label>نام کاربری</label>
                      <input
                        value={newUser.username}
                        onChange={(event) =>
                          setNewUser({ ...newUser, username: event.target.value })
                        }
                        placeholder="نام کاربری"
                        autoComplete="off"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label>نام کامل</label>
                      <input
                        value={newUser.full_name}
                        onChange={(event) =>
                          setNewUser({ ...newUser, full_name: event.target.value })
                        }
                        placeholder="نام و تخلص"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label>رمز عبور (حداقل ۶ کاراکتر)</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(event) =>
                          setNewUser({ ...newUser, password: event.target.value })
                        }
                        placeholder="رمز عبور"
                        autoComplete="new-password"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label>نوع کاربر</label>
                      <select
                        value={newUser.role}
                        onChange={(event) =>
                          setNewUser({ ...newUser, role: event.target.value })
                        }
                        style={styles.input}
                      >
                        <option value="user">کاربر عادی</option>
                        <option value="admin">مدیر سیستم</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={createUser}
                    disabled={creatingUser}
                    style={{
                      ...styles.primaryButton,
                      marginTop: "18px",
                      opacity: creatingUser ? 0.7 : 1,
                      cursor: creatingUser ? "wait" : "pointer",
                    }}
                  >
                    {creatingUser ? "در حال ایجاد..." : "ایجاد کاربر"}
                  </button>
                </div>

                <div
                  style={{
                    marginTop:
                      "22px",
                    marginBottom:
                      "20px",
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "15px",
                  }}
                >
                  <div
                    style={{
                      padding:
                        "18px",
                      borderRadius:
                        "12px",
                      background:
                        "#eff6ff",
                      border:
                        "1px solid #dbeafe",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                      }}
                    >
                      تعداد کل کاربران
                    </div>

                    <div
                      style={{
                        fontSize:
                          "28px",
                        fontWeight:
                          "bold",
                        color:
                          "#1d4ed8",
                        marginTop:
                          "7px",
                      }}
                    >
                      {formatNumber(
                        users.length
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        "18px",
                      borderRadius:
                        "12px",
                      background:
                        "#f0fdf4",
                      border:
                        "1px solid #dcfce7",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                      }}
                    >
                      مدیران
                    </div>

                    <div
                      style={{
                        fontSize:
                          "28px",
                        fontWeight:
                          "bold",
                        color:
                          "#15803d",
                        marginTop:
                          "7px",
                      }}
                    >
                      {formatNumber(
                        users.filter(
                          function (
                            user
                          ) {
                            return (
                              user.role ===
                              "admin"
                            );
                          }
                        ).length
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        "18px",
                      borderRadius:
                        "12px",
                      background:
                        "#faf5ff",
                      border:
                        "1px solid #ede9fe",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                      }}
                    >
                      کاربران عادی
                    </div>

                    <div
                      style={{
                        fontSize:
                          "28px",
                        fontWeight:
                          "bold",
                        color:
                          "#7c3aed",
                        marginTop:
                          "7px",
                      }}
                    >
                      {formatNumber(
                        users.filter(
                          function (
                            user
                          ) {
                            return (
                              user.role !==
                              "admin"
                            );
                          }
                        ).length
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        "18px",
                      borderRadius:
                        "12px",
                      background:
                        "#fffbeb",
                      border:
                        "1px solid #fef3c7",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                      }}
                    >
                      مجموع عواید ثبت‌شده
                    </div>

                    <div
                      style={{
                        fontSize:
                          "24px",
                        fontWeight:
                          "bold",
                        color:
                          "#b45309",
                        marginTop:
                          "7px",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      {formatNumber(
                        reports.reduce(
                          function (
                            total,
                            report
                          ) {
                            return (
                              total +
                              Number(
                                report.revenue_afn ||
                                0
                              )
                            );
                          },
                          0
                        )
                      )}{" "}
                      افغانی
                    </div>
                  </div>
                </div>

                {users.length ===
                  0 ? (
                  <div
                    style={{
                      padding:
                        "25px",
                      background:
                        "#f8fafc",
                      borderRadius:
                        "10px",
                      textAlign:
                        "center",
                      color:
                        "#64748b",
                    }}
                  >
                    کاربری پیدا نشد.
                  </div>
                ) : (
                  <div
                    style={{
                      overflowX:
                        "auto",
                    }}
                  >
                    <table
                      style={
                        styles.table
                      }
                    >
                      <thead>
                        <tr
                          style={
                            styles.tableHeader
                          }
                        >
                          <th
                            style={
                              styles.tableCell
                            }
                          >
                            #
                          </th>

                          <th
                            style={
                              styles.tableCell
                            }
                          >
                            نام کاربری
                          </th>

                          <th
                            style={
                              styles.tableCell
                            }
                          >
                            نام کامل
                          </th>

                          <th
                            style={
                              styles.tableCell
                            }
                          >
                            نقش
                          </th>

                          <th
                            style={
                              styles.tableCell
                            }
                          >
                            تعداد گزارش
                          </th>

                          <th
                            style={
                              styles.tableCell
                            }
                          >
                            مجموع عواید
                          </th>

                          <th
                            style={
                              styles.tableCell
                            }
                          >
                            تاریخ ایجاد
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {users.map(
                          function (
                            user,
                            index
                          ) {
                            const userReports =
                              reports.filter(
                                function (
                                  report
                                ) {
                                  return (
                                    report.user_id ===
                                    user.id
                                  );
                                }
                              );

                            const userRevenue =
                              userReports.reduce(
                                function (
                                  total,
                                  report
                                ) {
                                  return (
                                    total +
                                    Number(
                                      report.revenue_afn ||
                                      0
                                    )
                                  );
                                },
                                0
                              );

                            return (
                              <tr
                                key={
                                  user.id
                                }
                              >
                                <td
                                  style={
                                    styles.tableCell
                                  }
                                >
                                  {
                                    index +
                                    1
                                  }
                                </td>

                                <td
                                  style={
                                    styles.tableCell
                                  }
                                >
                                  <strong>
                                    {
                                      user.username
                                    }
                                  </strong>
                                </td>

                                <td
                                  style={
                                    styles.tableCell
                                  }
                                >
                                  {
                                    user.full_name
                                  }
                                </td>

                                <td
                                  style={
                                    styles.tableCell
                                  }
                                >
                                  <span
                                    style={{
                                      display:
                                        "inline-block",
                                      padding:
                                        "6px 12px",
                                      borderRadius:
                                        "20px",
                                      fontSize:
                                        "12px",
                                      fontWeight:
                                        "bold",
                                      background:
                                        user.role ===
                                          "admin"
                                          ? "#dbeafe"
                                          : "#f1f5f9",
                                      color:
                                        user.role ===
                                          "admin"
                                          ? "#1d4ed8"
                                          : "#475569",
                                    }}
                                  >
                                    {user.role ===
                                      "admin"
                                      ? "مدیر"
                                      : "کاربر"}
                                  </span>
                                </td>

                                <td
                                  style={
                                    styles.tableCell
                                  }
                                >
                                  {formatNumber(
                                    userReports.length
                                  )}
                                </td>

                                <td
                                  style={
                                    styles.tableCell
                                  }
                                >
                                  <strong>
                                    {formatNumber(
                                      userRevenue
                                    )}{" "}
                                    افغانی
                                  </strong>
                                </td>

                                <td
                                  style={
                                    styles.tableCell
                                  }
                                >
                                  {user.created_at
                                    ? new Date(
                                      user.created_at
                                    ).toLocaleDateString(
                                      "fa-AF"
                                    )
                                    : "-"}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section
                style={
                  styles.section
                }
              >
                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  مدیریت منابع عواید
                </h2>

                <p
                  style={
                    styles.sectionDescription
                  }
                >
                  منابع عواید را اضافه، ویرایش و فعال یا غیرفعال کنید.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom:
                      "22px",
                    flexWrap:
                      "wrap",
                  }}
                >
                  <input
                    value={
                      newSource
                    }
                    onChange={function (
                      event
                    ) {
                      setNewSource(
                        event.target.value
                      );
                    }}
                    placeholder="نام منبع جدید"
                    style={{
                      ...styles.input,
                      flex: 1,
                      minWidth:
                        "220px",
                      marginTop: 0,
                    }}
                  />

                  <button
                    onClick={
                      addSource
                    }
                    style={
                      styles.primaryButton
                    }
                  >
                    افزودن منبع
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {sources.map(
                    function (
                      source
                    ) {
                      return (
                        <div
                          key={
                            source.id
                          }
                          style={{
                            padding:
                              "20px",
                            border:
                              "1px solid #e2e8f0",
                            borderRadius:
                              "14px",
                            background:
                              "#f8fafc",
                          }}
                        >
                          {editingId ===
                            source.id ? (
                            <div>
                              <input
                                value={
                                  editingName
                                }
                                onChange={function (
                                  event
                                ) {
                                  setEditingName(
                                    event.target
                                      .value
                                  );
                                }}
                                style={{
                                  ...styles.input,
                                  marginTop: 0,
                                  marginBottom:
                                    "10px",
                                }}
                              />

                              <button
                                onClick={function () {
                                  saveEdit(
                                    source.id
                                  );
                                }}
                                style={
                                  styles.primaryButton
                                }
                              >
                                ذخیره
                              </button>

                              <button
                                onClick={
                                  cancelEdit
                                }
                                style={{
                                  ...styles.secondaryButton,
                                  marginRight:
                                    "8px",
                                }}
                              >
                                لغو
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems:
                                    "center",
                                  gap: "10px",
                                }}
                              >
                                <h3
                                  style={{
                                    margin: 0,
                                    color:
                                      "#0f172a",
                                  }}
                                >
                                  {
                                    source.name
                                  }
                                </h3>

                                <span
                                  style={{
                                    padding:
                                      "5px 10px",
                                    borderRadius:
                                      "20px",
                                    fontSize:
                                      "11px",
                                    fontWeight:
                                      "bold",
                                    background:
                                      source.is_active
                                        ? "#dcfce7"
                                        : "#fee2e2",
                                    color:
                                      source.is_active
                                        ? "#15803d"
                                        : "#b91c1c",
                                  }}
                                >
                                  {source.is_active
                                    ? "فعال"
                                    : "غیرفعال"}
                                </span>
                              </div>

                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: "8px",
                                  marginTop:
                                    "18px",
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                <button
                                  onClick={function () {
                                    startEdit(
                                      source
                                    );
                                  }}
                                  style={
                                    styles.secondaryButton
                                  }
                                >
                                  تغییر نام
                                </button>

                                <button
                                  onClick={function () {
                                    toggleSource(
                                      source
                                    );
                                  }}
                                  style={{
                                    ...styles.secondaryButton,
                                    color:
                                      source.is_active
                                        ? "#b91c1c"
                                        : "#15803d",
                                  }}
                                >
                                  {source.is_active
                                    ? "غیرفعال کردن"
                                    : "فعال کردن"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            </>
          )}
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "25px",
          color: "#94a3b8",
          fontSize: "12px",
        }}
      >
        سیستم گزارش عواید — واحد مدیریت عواید
      </footer>
    </div>
  );
}

export default App;