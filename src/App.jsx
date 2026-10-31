import { useEffect, useMemo, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
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
const [activeTab, setActiveTab] = useState("report");
const [dailyChartDays, setDailyChartDays] = useState(7);
const [jalaliChartYear, setJalaliChartYear] = useState(
  jalaali.toJalaali(new Date()).jy
);
const [jalaliCompareYear, setJalaliCompareYear] = useState(
  jalaali.toJalaali(new Date()).jy - 1
);

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

const [editingReportId, setEditingReportId] = useState(null);

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
const [targets, setTargets] = useState([]);
const [targetYear, setTargetYear] = useState("1405");
const [targetMonth, setTargetMonth] = useState("");
const [targetUserId, setTargetUserId] = useState("");
const [targetAmount, setTargetAmount] = useState("");
const [targetLoading, setTargetLoading] = useState(false);
const [notifications, setNotifications] = useState([]);
const [notificationRecipient, setNotificationRecipient] = useState("");
const [notificationTitle, setNotificationTitle] = useState("");
const [notificationMessage, setNotificationMessage] = useState("");
const [notificationLoading, setNotificationLoading] = useState(false);


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
      .select("id, username, full_name, role, is_active, can_view_all_reports, can_create_reports, can_edit_reports, can_delete_reports, can_view_analytics")

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

await loadTargets();
await loadNotifications();
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
      .select("id, username, full_name, role, created_at, can_view_all_reports, can_create_reports, can_edit_reports, can_delete_reports, can_view_analytics")

      .order("created_at", { ascending: true });

    if (result.error) {
      console.error(result.error);
      setMessage("دریافت کاربران ناموفق بود.");
      return;
    }

    setUsers(result.data || []);
  }
  async function saveUserPermissions(userId, permissions) {
if (profile?.role !== "admin") {
setMessage("فقط مدیر سیستم می‌تواند دسترسی کاربران را تغییر دهد.");
return;
}

setMessage("");

const result = await supabase
.from("profiles")
.update({
can_view_all_reports: permissions.can_view_all_reports,
can_create_reports: permissions.can_create_reports,
can_edit_reports: permissions.can_edit_reports,
can_delete_reports: permissions.can_delete_reports,
can_view_analytics: permissions.can_view_analytics,
})
.eq("id", userId);

if (result.error) {
console.error(result.error);
setMessage("ذخیره دسترسی‌ها ناموفق بود.");
return;
}

setMessage("دسترسی‌های کاربر ذخیره شد.");
await loadUsers();
}

async function loadTargets() {
setTargetLoading(true);

try {
  const result = await supabase
    .from("revenue_targets")
    .select("*")
    .order("period_year", { ascending: false });

  if (result.error) {
    console.error(result.error);
    setMessage("دریافت اهداف عواید ناموفق بود.");
    return;
  }

  setTargets(result.data || []);
} catch (error) {
  console.error(error);
  setMessage("هنگام دریافت اهداف عواید خطایی رخ داد.");
} finally {
  setTargetLoading(false);
}

}
async function saveTarget(event) {
event.preventDefault();

if (profile?.role !== "admin") {
  setMessage("فقط مدیر سیستم می‌تواند اهداف را ثبت کند.");
  return;
}

const year = Number(targetYear);
const month = targetMonth === "" ? null : Number(targetMonth);
const amount = Number(targetAmount);

if (!Number.isInteger(year) || year < 1300 || year > 1500) {
  setMessage("سال هجری شمسی را درست وارد کنید.");
  return;
}

if (
  month !== null &&
  (!Number.isInteger(month) || month < 1 || month > 12)
) {
  setMessage("ماه باید بین ۱ تا ۱۲ باشد.");
  return;
}

if (targetAmount.trim() === "" || !Number.isFinite(amount) || amount < 0) {
  setMessage("مبلغ هدف را درست وارد کنید.");
  return;
}

setTargetLoading(true);
setMessage("");

try {
  const result = await supabase
    .from("revenue_targets")
    .insert({
      user_id: targetUserId || null,
      period_year: year,
      period_month: month,
      target_amount: amount,
      created_by: session.user.id,
    });

  if (result.error) {
    console.error(result.error);
    setMessage(
      "ثبت هدف ناموفق بود. شاید برای این کاربر و این دوره قبلاً هدف ثبت شده باشد."
    );
    return;
  }

  setMessage("هدف عواید با موفقیت ثبت شد.");
  setTargetAmount("");
  await loadTargets();
} catch (error) {
  console.error(error);
  setMessage("هنگام ثبت هدف خطایی رخ داد.");
} finally {
  setTargetLoading(false);
}

}
async function loadNotifications() {

try {
  const result = await supabase
    .from("revenue_notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error(result.error);
    return;
  }

  setNotifications(result.data || []);
} catch (error) {
  console.error("خطا در دریافت ملاحظات:", error);
}

}

async function sendNotification(event) {
event.preventDefault();

if (profile?.role !== "admin") {
  setMessage("فقط مدیر سیستم می‌تواند ملاحظات را ارسال کند.");
  return;
}

const title = notificationTitle.trim();
const message = notificationMessage.trim();

if (!title) {
  setMessage("لطفاً عنوان ملاحظه را وارد کنید.");
  return;
}

if (!message) {
  setMessage("لطفاً متن ملاحظه را وارد کنید.");
  return;
}

if (title.length > 200 || message.length > 5000) {
  setMessage("عنوان یا متن ملاحظه بیش از حد طولانی است.");
  return;
}

setNotificationLoading(true);
setMessage("");

try {
  const result = await supabase
    .from("revenue_notifications")
    .insert({
      recipient_id: notificationRecipient || null,
      title,
      message,
      created_by: session.user.id,
    });

  if (result.error) {
    console.error(result.error);
    setMessage("ثبت ملاحظه ناموفق بود.");
    return;
  }

  setMessage(
    notificationRecipient
      ? "ملاحظه برای کاربر انتخاب‌شده ثبت شد."
      : "ملاحظهٔ عمومی برای همهٔ کاربران ثبت شد."
  );

  setNotificationTitle("");
  setNotificationMessage("");
  setNotificationRecipient("");

  await loadNotifications();
} catch (error) {
  console.error(error);
  setMessage("هنگام ثبت ملاحظه خطایی رخ داد.");
} finally {
  setNotificationLoading(false);
}

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

  function startEditReport(report) {
if (
profile?.role !== "admin" &&
(
profile?.can_edit_reports !== true ||
profile?.is_active !== true ||
report.user_id !== session?.user?.id
)
) {
setMessage("شما اجازه ویرایش این گزارش را ندارید.");
return;
}

setEditingReportId(report.id);
setActiveTab("report");

setReportForm({
source_id: String(report.source_id ?? ""),
report_date: report.report_date ?? "",
quantity: String(report.quantity ?? ""),
cleared_quantity: String(report.cleared_quantity ?? ""),
revenue_afn: String(report.revenue_afn ?? ""),
notes: report.notes ?? "",
});

setMessage("گزارش برای ویرایش آماده است.");
window.scrollTo({ top: 0, behavior: "smooth" });
}

 async function addReport(event) {
  event.preventDefault();

  const isEditing = editingReportId !== null;
  const isAdmin = profile?.role === "admin";

  if (isEditing) {
    const reportBeingEdited = reports.find(
      (report) => report.id === editingReportId
    );

    if (!reportBeingEdited) {
      setMessage("گزارش موردنظر پیدا نشد.");
      return;
    }

    if (
      !isAdmin &&
      (
        profile?.can_edit_reports !== true ||
        profile?.is_active !== true ||
        reportBeingEdited.user_id !== session?.user?.id
      )
    ) {
      setMessage("شما اجازه ویرایش این گزارش را ندارید.");
      return;
    }
  } else {
    if (
      !isAdmin &&
      (
        profile?.can_create_reports !== true ||
        profile?.is_active !== true
      )
    ) {
      setMessage("شما اجازه ایجاد گزارش جدید را ندارید.");
      return;
    }
  }

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

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(cleared) ||
    !Number.isFinite(revenue) ||
    quantity < 0 ||
    cleared < 0 ||
    revenue < 0
  ) {
    setMessage("مقادیر باید عدد معتبر و غیرمنفی باشند.");
    return;
  }

  if (cleared > quantity) {
    setMessage(
      "مقدار تصفیه‌شده نمی‌تواند بیشتر از مقدار کل باشد."
    );
    return;
  }

  setMessage(
    isEditing
      ? "در حال ذخیره تغییرات..."
      : "در حال ذخیره گزارش..."
  );

  const reportData = {
    source_id: Number(reportForm.source_id),
    report_date: reportForm.report_date,
    quantity,
    cleared_quantity: cleared,
    revenue_afn: revenue,
    notes: reportForm.notes.trim() || null,
  };

  let result;

  if (isEditing) {
    let query = supabase
      .from("revenue_reports")
      .update(reportData)
      .eq("id", editingReportId);

    if (!isAdmin) {
      query = query.eq("user_id", session.user.id);
    }

    result = await query.select("id");
  } else {
    result = await supabase
      .from("revenue_reports")
      .insert({
        ...reportData,
        user_id: session.user.id,
      })
      .select("id");
  }

  if (result.error) {
    console.error(result.error);
    setMessage(
      (isEditing
        ? "ویرایش گزارش ناموفق بود: "
        : "ذخیره گزارش ناموفق بود: ") + result.error.message
    );
    return;
  }

  if (isEditing && (!result.data || result.data.length === 0)) {
    setMessage(
      "گزارش تغییر نکرد. ممکن است اجازه ویرایش نداشته باشید."
    );
    return;
  }

  const successMessage = isEditing
    ? "گزارش با موفقیت ویرایش شد."
    : "گزارش با موفقیت ثبت شد.";

  setMessage(successMessage);
  setEditingReportId(null);

  setReportForm({
    source_id: "",
    report_date: new Date().toISOString().slice(0, 10),
    quantity: "",
    cleared_quantity: "",
    revenue_afn: "",
    notes: "",
  });

  await loadReports();

  setTimeout(() => {
    setMessage((current) =>
      current === successMessage ? "" : current
    );
  }, 3000);
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
    const jalaliYearChartData = useMemo(
function () {
const monthNames = [
"حمل",
"ثور",
"جوزا",
"سرطان",
"اسد",
"سنبله",
"میزان",
"عقرب",
"قوس",
"جدی",
"دلو",
"حوت",
];

  return monthNames.map(function (monthName, index) {
    const jalaliMonth = index + 1;

    const startDate = jalaali.toGregorian(
      jalaliChartYear,
      jalaliMonth,
      1
    );

    const nextMonth =
      jalaliMonth === 12
        ? jalaali.toGregorian(jalaliChartYear + 1, 1, 1)
        : jalaali.toGregorian(jalaliChartYear, jalaliMonth + 1, 1);

    const startISO = [
      startDate.gy,
      String(startDate.gm).padStart(2, "0"),
      String(startDate.gd).padStart(2, "0"),
    ].join("-");

    const nextMonthISO = [
      nextMonth.gy,
      String(nextMonth.gm).padStart(2, "0"),
      String(nextMonth.gd).padStart(2, "0"),
    ].join("-");

    const revenue = reports.reduce(function (total, report) {
      if (
        report.report_date >= startISO &&
        report.report_date < nextMonthISO
      ) {
        return total + (Number(report.revenue_afn) || 0);
      }

      return total;
    }, 0);

    return {
      month: monthName,
      revenue: revenue,
    };
  });
},
[reports, jalaliChartYear]

);
    
const jalaliYearTotalRevenue = jalaliYearChartData.reduce(
function (total, month) {
return total + month.revenue;
},
0
);
const jalaliCompareYearChartData = useMemo(
  function () {
    const monthNames = [
      "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
      "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
    ];

    return monthNames.map(function (monthName, index) {
      const jalaliMonth = index + 1;

      function getMonthStart(year, month) {
        const date = jalaali.toGregorian(year, month, 1);

        return [
          date.gy,
          String(date.gm).padStart(2, "0"),
          String(date.gd).padStart(2, "0"),
        ].join("-");
      }

      const startISO = getMonthStart(
        jalaliCompareYear,
        jalaliMonth
      );

      const nextYear = jalaliMonth === 12
        ? jalaliCompareYear + 1
        : jalaliCompareYear;

      const nextMonth = jalaliMonth === 12
        ? 1
        : jalaliMonth + 1;

      const nextMonthISO = getMonthStart(
        nextYear,
        nextMonth
      );

      const revenue = reports.reduce(function (total, report) {
        if (
          report.report_date >= startISO &&
          report.report_date < nextMonthISO
        ) {
          return total + (Number(report.revenue_afn) || 0);
        }

        return total;
      }, 0);

      return {
        month: monthName,
        revenue: revenue,
      };
    });
  },
  [reports, jalaliCompareYear]
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
width: "100%",
minHeight: "100vh",
margin: 0,
padding: 0,
boxSizing: "border-box",
background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
fontFamily: "Tahoma, Arial, sans-serif",
color: "#1e293b",
},


    header: {
      background: "#ffffff",
      padding: "18px 30px",
      borderBottom:
        "2px solid #1d4ed8",
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
      padding: "14px",
      borderRadius: "10px",
      border:
        "1px solid #e2e8f0",
      marginBottom: "26px",
      boxShadow:
        "0 5px 18px rgba(15, 23, 42, 0.05)",
        flex: 1,
minWidth: 0,
width: "100%",
boxSizing: "border-box",
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
  background: "#ffffff",
},

tableHeader: {
  background: "#1e40af",
  color: "#ffffff",
  fontWeight: "bold",
},

tableCell: {
  padding: "14px 12px",
  borderBottom: "1px solid #dbe3ef",
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
    padding: "4px",
    maxWidth: "100%",
    width: "100%",
    boxSizing: "border-box",
    margin: 0,
    display: "flex",
    flexDirection: "row",
    gap: "10px",
    alignItems: "flex-start",
  }}
>
<aside
 style={{ width: "200px",
minWidth: "200px",
 background: "#ffffff", border: "1px solid #dbe3ef", borderRadius: "14px", padding: "18px 12px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "0 4px 15px rgba(30, 64, 175, 0.06)", }} > <h3 style={{ color: "#9D174D", margin: "0 8px 14px", paddingBottom: "14px", borderBottom: "2px solid #dbeafe", fontSize: "18px", }} > ☰ منوی اصلی </h3>

{[
{ id: "report", label: "ثبت گزارش", icon: "📝" },
{ id: "dashboard", label: "داشبورد عواید", icon: "🏠" },
{ id: "charts", label: "نمودارهای عواید", icon: "📊" },
{ id: "sources", label: "مدیریت منابع عواید", icon: "💰" },
{ id: "compare", label: "مقایسه عواید", icon: "📈" },
{
id: "comparePeriods",
label: "مقایسه منابع در چهار دوره",
icon: "📉",
},
{
id: "summary",
label: "گزارش‌گیری و خلاصه عواید",
icon: "📋",
},
{
id: "allReports",
label: "همه گزارش‌های ثبت‌شده",
icon: "📁",
},
{ id: "results", label: "نتایج گزارش", icon: "📑" },
{ id: "users", label: "مدیریت کاربران", icon: "👥" },
{ id: "targets", label: "مدیریت اهداف عواید", icon: "🎯" },
].map((item) => (
<button
key={item.id}
onClick={() => setActiveTab(item.id)}
onMouseEnter={(event) => {
if (activeTab !== item.id) {
event.currentTarget.style.background = "#dbeafe";
}
}}
onMouseLeave={(event) => {
if (activeTab !== item.id) {
event.currentTarget.style.background = "#f8fafc";
}
}}
style={{
width: "100%",
boxSizing: "border-box",
display: "flex",
alignItems: "center",
gap: "10px",
padding: "13px 12px",
textAlign: "right",
border:
activeTab === item.id
? "1px solid #1d4ed8"
: "1px solid transparent",
borderRight:
activeTab === item.id
? "4px solid #60a5fa"
: "4px solid transparent",
borderRadius: "9px",
cursor: "pointer",
background:
activeTab === item.id ? "#1e40af" : "#f8fafc",
color:
activeTab === item.id ? "#ffffff" : "#1e3a8a",
fontWeight: activeTab === item.id ? "bold" : "500",
fontSize: "14px",
lineHeight: "1.8",
transition: "background 0.2s ease, color 0.2s ease",
}}
>
<span style={{ fontSize: "18px", flexShrink: 0 }}>
{item.icon}
</span>

  <span style={{ flex: 1 }}>{item.label}</span>

  {activeTab === item.id && (
    <span
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: "#ffffff",
        flexShrink: 0,
      }}
    />
  )}
</button>

))}
</aside>

<div
  style={{
    flex: 1,
    minWidth: 0,
    width: 0,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    boxSizing: "border-box",
  }}
>
  {activeTab === "dashboard" && (
  <section
    style={{
      ...styles.section,
      flex: 1,
      minWidth: 0,
    }}
  >
    <h2 style={styles.sectionTitle}>
      داشبورد عواید
    </h2>

    <p style={styles.sectionDescription}>
      خلاصهٔ وضعیت عواید و گزارش‌های ثبت‌شده
    </p>

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "18px",
      }}
    >
      {[ { title: "مجموع عواید", value: `${reports .reduce( (sum, report) => sum + (Number(report.revenue_afn) || 0), 0 ) .toLocaleString()} افغانی`, }, { title: "تعداد گزارش‌ها", value: reports.length.toLocaleString(), }, { title: "عواید ماه جاری", value: `${reports .reduce((sum, report) => { if (!report.report_date) return sum; const date = new Date(report.report_date + "T00:00:00"); const now = new Date(); if ( date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() ) { return sum + (Number(report.revenue_afn) || 0); } return sum; }, 0) .toLocaleString()} افغانی`, },{
  title: "عواید امروز",
  value: `${reports.reduce((sum, report) => {
    if (!report.report_date) return sum;

    const today = new Date();
    const todayISO =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (report.report_date === todayISO) {
      return sum + (Number(report.revenue_afn) || 0);
    }

    return sum;
  }, 0).toLocaleString()} افغانی`,


}, ].map((card) => (
        <div key={card.title} style={{ background: card.title === "مجموع عواید" ? "linear-gradient(135deg, #eff6ff, #dbeafe)" : card.title === "تعداد گزارش‌ها" ? "linear-gradient(135deg, #f5f3ff, #ede9fe)" : card.title === "عواید ماه جاری" ? "linear-gradient(135deg, #ecfdf5, #d1fae5)" : "linear-gradient(135deg, #fff7ed, #ffedd5)", border: card.title === "مجموع عواید" ? "1px solid #93c5fd" : card.title === "تعداد گزارش‌ها" ? "1px solid #c4b5fd" : card.title === "عواید ماه جاری" ? "1px solid #86efac" : "1px solid #fdba74", borderRadius: "14px", padding: "24px 18px", textAlign: "center", boxShadow: "0 5px 14px rgba(15, 23, 42, 0.06)", transition: "transform 0.2s ease, box-shadow 0.2s ease", }} onMouseEnter={(event) => { event.currentTarget.style.transform = "translateY(-4px)"; event.currentTarget.style.boxShadow = "0 10px 22px rgba(15, 23, 42, 0.12)"; }} onMouseLeave={(event) => { event.currentTarget.style.transform = "translateY(0)"; event.currentTarget.style.boxShadow = "0 5px 14px rgba(15, 23, 42, 0.06)"; }} >
          <h3
  style={{
    color: "#9D174D",
    fontSize: "16px",
    marginTop: 0,
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  }}
>
  <span style={{ fontSize: "23px" }}>
    {card.title === "مجموع عواید"
? "💰"
: card.title === "تعداد گزارش‌ها"
? "📋"
: card.title === "عواید ماه جاری"
? "📅"
: card.title === "عواید امروز"
? "☀️"
: "📈"}

  </span>
  {card.title}
</h3>


          <p
  style={{
    color:
  card.title === "مقایسه عواید"
    ? card.value.includes("افزایش")
      ? "#16a34a"
      : card.value.includes("کاهش")
      ? "#dc2626"
      : "#64748b"
    : "#1e293b",
    fontWeight: "bold",
    fontSize: "24px",
    marginBottom: 0,
    marginTop: "10px",
    lineHeight: "1.8",
    overflowWrap: "anywhere",
  }}
>
  {card.value}
</p>

        </div>
      ))}
    </div>
<div style={{ marginTop: "28px", padding: "24px", background: "linear-gradient(135deg, #fff1f7, #ffffff)", border: "1px solid #F9A8D4", borderRadius: "16px", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)", width: "100%", boxSizing: "border-box", }}
>
  <h3
    style={{
      color: "#9D174D",
      textAlign: "center",
      marginTop: 0,
      marginBottom: "28px",
    }}
  >
    📊 مقایسه عواید ماه جاری و ماه گذشته
  </h3>

  {(() => {
    const now = new Date();

    const currentRevenue = reports.reduce((sum, report) => {
      if (!report.report_date) return sum;

      const date = new Date(report.report_date + "T00:00:00");

      if (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      ) {
        return sum + (Number(report.revenue_afn) || 0);
      }

      return sum;
    }, 0);

    const previousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const previousRevenue = reports.reduce((sum, report) => {
      if (!report.report_date) return sum;

      const date = new Date(report.report_date + "T00:00:00");

      if (
        date.getMonth() === previousMonth.getMonth() &&
        date.getFullYear() === previousMonth.getFullYear()
      ) {
        return sum + (Number(report.revenue_afn) || 0);
      }

      return sum;
    }, 0);

    const maxRevenue = Math.max(
      currentRevenue,
      previousRevenue,
      1
    );

    const bars = [
{
label: "ماه گذشته",
value: previousRevenue,
color: "#86efac",
},
{
label: "ماه جاری",
value: currentRevenue,
color: "#fdba74",
},
];


    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: "50px",
          minHeight: "260px",
          padding: "20px 10px 0",
          borderBottom: "2px solid #e2e8f0",
        }}
      >
        {bars.map((bar) => (
          <div
            key={bar.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              flex: "1",
              maxWidth: "180px",
              height: "240px",
            }}
          >
            <strong
              style={{
                color: "#334155",
                fontSize: "14px",
                textAlign: "center",
                overflowWrap: "anywhere",
              }}
            >
              {bar.value.toLocaleString()} افغانی
            </strong>

            <div
              style={{
                width: "100%",
                maxWidth: "65px",
                height: `${Math.max(
                  (bar.value / maxRevenue) * 150,
                  4
                )}px`,
                background: `linear-gradient(90deg, ${bar.color} 0%, ${bar.color} 80%, #64748b 80%, #64748b 100%)`,

borderRadius: "0",
borderRight: "2px solid #1e3a8a",
boxShadow: "4px 0 5px rgba(15, 23, 42, 0.18)",
transition: "height 0.3s ease",

              }}
            />

            <span
              style={{
                color: "#475569",
                fontSize: "28px",
                lineHeight: "1.6",
                paddingBottom: "12px",
              }}
            >
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    );
  })()}
</div>

<div style={{ marginTop: "28px", padding: "24px", background: "#ffffff", border: "1px solid #F9A8D4", borderRadius: "10px", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)", width: "100%", boxSizing: "border-box", }} > <h3 style={{ color: "#9D174D", textAlign: "center", marginTop: 0, marginBottom: "24px", }} > 📊 نمودار عواید روزانه ({dailyChartDays} روز اخیر) </h3>
<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  }}
>
  <label
    htmlFor="dailyChartDays"
    style={{ color: "#9D174D", fontWeight: "bold" }}
  >
    نمایش روزهای اخیر:
  </label>

  <select
    id="dailyChartDays"
    value={dailyChartDays}
    onChange={(event) =>
      setDailyChartDays(Number(event.target.value))
    }
    style={{
      padding: "8px 12px",
      border: "1px solid #F9A8D4",
      borderRadius: "8px",
background: "#FFF1F7",
color: "#9D174D",
fontSize: "14px",
cursor: "pointer",
    }}
  >
    <option value={7}>۷ روز</option>
    <option value={15}>۱۵ روز</option>
    <option value={30}>۳۰ روز</option>
  </select>
</div>
{(() => {
const dailyData = [];

for (let i = dailyChartDays - 1; i >= 0; i--) {
  const day = new Date();
  day.setDate(day.getDate() - i);

  const dateISO = [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
  ].join("-");

  const revenue = reports.reduce((sum, report) => {
    if (report.report_date === dateISO) {
      return sum + (Number(report.revenue_afn) || 0);
    }

    return sum;
  }, 0);

  const jalaliDate = jalaali.toJalaali(
  day.getFullYear(),
  day.getMonth() + 1,
  day.getDate()
);

dailyData.push({
  date: dateISO,
  label: `${jalaliDate.jd}/${jalaliDate.jm}`,
  revenue,
});
}

const maxRevenue = Math.max(
  ...dailyData.map((day) => day.revenue),
  1
);

return (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
     justifyContent: "flex-start",
      gap: "10px",
      minHeight: "280px",
      overflowX: "auto",
      padding: "20px 5px 0",
      borderBottom: "2px solid #F9A8D4",
    }}
  >
    {dailyData.map((day) => (
      <div
        key={day.date}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
          flex: "1",
          minWidth: "45px",
          flexShrink: 0,
          height: "260px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#9D174D",
            textAlign: "center",
            overflowWrap: "anywhere",
          }}
        >
          {day.revenue.toLocaleString("en-US")}
        </span>

        <div
  title={`${(() => {
    const parts = day.date.split("-").map(Number);
    const jalaliDate = jalaali.toJalaali(
      parts[0],
      parts[1],
      parts[2]
    );

    return `${jalaliDate.jy}/${jalaliDate.jm}/${jalaliDate.jd}`;
  })()}: ${day.revenue.toLocaleString("en-US")} افغانی`}
          style={{
            width: "100%",
            maxWidth: "48px",
            height: `${Math.max(
              (day.revenue / maxRevenue) * 160,
              4
            )}px`,
           background:
  day.revenue > 0
    ? "linear-gradient(90deg, #FBCFE8 0%, #F472B6 80%, #DB2777 80%, #DB2777 100%)"
    : "linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 80%, #CBD5E1 80%, #CBD5E1 100%)",
borderRight: "2px solid #9D174D",
            boxSizing: "border-box",
          }}
        />

        <span
          style={{
            fontSize: "12px",
           color: "#9D174D",
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
        >
          {day.label}
        </span>
      </div>
    ))}
  </div>
);

})()}

<p style={{ textAlign: "center", color: "#9D174D", fontSize: "13px", marginBottom: 0, marginTop: "16px", }} > مبالغ به افغانی است؛ تاریخ‌ها به شکل روز/ماه نمایش داده می‌شوند. </p> </div>
  </section>
)}
        {activeTab === "report" && message && message !== "گزارش با موفقیت ثبت شد." && (
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
{activeTab === "report" && (
        <section
  style={{
    ...styles.section,
    flex: 1,
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  }}
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
  type="text"
  name="report_date_jalali"
  value={
    gregorianISOToJalali(reportForm.report_date)
  }
  onChange={(event) => {
    const gregorianDate = jalaliToGregorianISO(
      event.target.value
    );

    setReportForm((old) => ({
      ...old,
      report_date: gregorianDate,
    }));
  }}
  placeholder="مثلاً 1405/07/26"
  style={styles.input}
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
    )}
{activeTab === "charts" && (
    <section
  style={{
    ...styles.section,
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  }}
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
              display: "flex",
flexDirection: "column",
gap: "25px",
width: "100%",
            }}
          >
                        <div>
              <h3>
                مقایسه عواید منابع
              </h3>
<div style={{ width: "100%", minWidth: 0 }}>
  <div
    style={{
      width: "100%",
      overflowX: "auto",
      overflowY: "hidden",
    }}
  >
    <div
      style={{
        width: Math.max(
          700,
          sourceChartData.length * 110
        ),
        height: 400,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sourceChartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis
dataKey="name"
interval={0}
angle={-35}
textAnchor="end"
height={110}
tick={(props) => {
const { x, y, payload } = props;
return (
<text
x={x}
y={y}
dy={12}
textAnchor="end"
transform={`rotate(-35, ${x}, ${y})`}
fill="#BE185D"
fontSize={14}
fontWeight={700}
fontFamily="Tahoma, Arial, sans-serif"
>
{payload.value} </text>
);
}}
axisLine={{ stroke: "#DB2777", strokeWidth: 2 }}
tickLine={{ stroke: "#DB2777", strokeWidth: 1.5 }}
/>


          <YAxis />

          <Tooltip
            formatter={(value) => [
              formatNumber(value) + " افغانی",
              "عواید",
            ]}
          />

          <Legend />

          <Bar
  dataKey="revenue"
  name="عواید"
  maxBarSize={55}
>
  {sourceChartData.map((item, index) => {
    const revenue = Number(item.revenue) || 0;

    const maxRevenue = Math.max(
      ...sourceChartData.map(
        (source) => Number(source.revenue) || 0
      )
    );

    let color;

    if (revenue === 0) {
      color = "#EF4444"; // سرخ: عواید صفر
    } else if (maxRevenue > 0 && revenue >= maxRevenue * 0.7) {
      color = "#86EFAC"; // سبز روشن: عواید زیاد
    } else if (maxRevenue > 0 && revenue >= maxRevenue * 0.3) {
      color = "#FBBF24"; // زرد: عواید متوسط
    } else {
      color = "#93C5FD"; // آبی روشن: عواید کم
    }

        return (
      <Cell
        key={`source-${index}`}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    );
  })}

  <LabelList
    dataKey="revenue"
    position="top"
    offset={10}
    formatter={(value) => Number(value).toLocaleString("en-US")}
    style={{
      fill: "#374151",
      fontSize: 13,
      fontWeight: "bold",
    }}
  />
</Bar>
                      </BarChart>
                </ResponsiveContainer>
      </div>
    </div>
  </div>
</div>
</div>
</section>
)}

{activeTab === "charts" && (

  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>
      📊 نمودار عواید سالانه شمسی
    </h2>

<p style={styles.sectionDescription}>
  مقایسه عواید از اول حمل تا پایان حوت
</p>

<div
  style={{
    background: "linear-gradient(135deg, #FFF1F6, #FCE7F3)",
    border: "1px solid #F4A7C5",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "24px",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(190, 24, 93, 0.08)",
  }}
>
  <div
    style={{
      color: "#9D174D",
      fontSize: "15px",
      marginBottom: "8px",
      fontWeight: "bold",
    }}
  >
    مجموع عواید سال {jalaliChartYear}
  </div>

  <div
    style={{
      color: "#BE185D",
      fontSize: "28px",
      fontWeight: "bold",
    }}
  >
    {jalaliYearTotalRevenue.toLocaleString("en-US")} افغانی
  </div>
</div>

<div style={{ marginBottom: "20px" }}>
  <label
    htmlFor="jalaliChartYear"
    style={{ fontWeight: "bold", marginLeft: "10px" }}
  >
    انتخاب سال شمسی:
  </label>

  <select
    id="jalaliChartYear"
    value={jalaliChartYear}
    onChange={(event) =>
      setJalaliChartYear(Number(event.target.value))
    }
    style={{ ...styles.input, maxWidth: "180px" }}
  >
    {Array.from(
      { length: 10 },
      (_, index) => jalaliChartYear - 5 + index
    ).map((year) => (
      <option key={year} value={year}>
        {year}
      </option>
    ))}
  </select>
</div>

<ResponsiveContainer width="100%" height={350}>
  <BarChart data={jalaliYearChartData}>
  <CartesianGrid
stroke="#F1D5E1"
strokeDasharray="4 4"
vertical={false}
/>

    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip
formatter={(value) => [
Number(value).toLocaleString("en-US") + " افغانی",
"عواید",
]}
contentStyle={{
backgroundColor: "#FFF7FA",
border: "1px solid #F4A7C5",
borderRadius: "10px",
padding: "10px 14px",
boxShadow: "0 4px 12px rgba(190, 24, 93, 0.10)",
}}
labelStyle={{
color: "#9D174D",
fontWeight: "bold",
marginBottom: "5px",
}}
/>
    <Legend />
    <Bar
dataKey="revenue"
name="عواید"
fill="#F4A7C5"
radius={[10, 10, 0, 0]}
maxBarSize={48}
activeBar={{ fill: "#E879AC", stroke: "#BE185D", strokeWidth: 1 }}
/>


  </BarChart>
</ResponsiveContainer>

<h2 style={styles.sectionTitle}>
  📊 مقایسه عواید دو سال شمسی
</h2>

<p style={styles.sectionDescription}>
  عواید هر ماه را بین دو سال شمسی مقایسه کن.
</p>

<div
  style={{
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "20px",
  }}
>
  <div style={{ flex: "1", minWidth: "180px" }}>
    <label
      htmlFor="jalaliCompareYear1"
      style={{ fontWeight: "bold" }}
    >
      سال اول:
    </label>

    <select
      id="jalaliCompareYear1"
      value={jalaliChartYear}
      onChange={(event) =>
        setJalaliChartYear(Number(event.target.value))
      }
      style={styles.input}
    >
      {Array.from(
        { length: 10 },
        (_, index) => jalaliChartYear - 5 + index
      ).map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  </div>

  <div style={{ flex: "1", minWidth: "180px" }}>
    <label
      htmlFor="jalaliCompareYear2"
      style={{ fontWeight: "bold" }}
    >
      سال دوم:
    </label>

    <select
      id="jalaliCompareYear2"
      value={jalaliCompareYear}
      onChange={(event) =>
        setJalaliCompareYear(Number(event.target.value))
      }
      style={styles.input}
    >
      {Array.from(
        { length: 10 },
        (_, index) => jalaliCompareYear - 5 + index
      ).map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  </div>
</div>

<ResponsiveContainer width="100%" height={350}>
  <BarChart
    data={jalaliYearChartData.map((month, index) => ({
      month: month.month,
      year1: month.revenue,
      year2: jalaliCompareYearChartData[index].revenue,
    }))}
  >
    <CartesianGrid
      stroke="#F1D5E1"
      strokeDasharray="4 4"
      vertical={false}
    />

    <XAxis dataKey="month" />
    <YAxis />

    <Tooltip
      formatter={(value) =>
        Number(value).toLocaleString("en-US") + " افغانی"
      }
    />

    <Legend />

    <Bar
      dataKey="year1"
      name={`سال ${jalaliChartYear}`}
      fill="#F4A7C5"
      radius={[6, 6, 0, 0]}
    />

    <Bar
      dataKey="year2"
      name={`سال ${jalaliCompareYear}`}
      fill="#93C5FD"
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
  </section>
)}

{activeTab === "compare" && (
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
gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
gap: "16px",
alignItems: "end",
width: "100%",

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
      )}

      {activeTab === "comparePeriods" && (
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
  style={{
    ...styles.table,
    minWidth: "1100px",
    width: "max-content",
  }}
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
      )}
      {activeTab === "summary" && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
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
        </section>
      )}
      {activeTab === "results" && (
        <section style={styles.section}>
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
  setDateFilterJalali("");
  setMonthFilter("");
  setMonthFilterJalali("");
  setYearFilter("");
  setYearFilterJalali("");
}}
                >
                  پاک‌کردن فیلتر
                </button>

              </div>

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
                </table>
                 </div>
                  </>)} 
                  </section>
               )}
                {activeTab === "allReports" && (
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>
      همه گزارش‌های ثبت‌شده
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

<th style={styles.tableCell}>
  یادداشت
</th>

<th style={styles.tableCell}>
  عملیات
</th>
                    <th
                      style={
                        styles.tableCell
                      }
                    >
                      توضیحات
                    </th>
                    <th style={styles.tableCell}>
  عملیات
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
                                  <td style={styles.tableCell}>
{true && (
    <button
      type="button"
      onClick={() => startEditReport(report)}
      style={{
        padding: "6px 12px",
        backgroundColor: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
      }}
    >
      ویرایش
    </button>
  )}
</td>
                                </tr>
                                                            );
                            })}
                </tbody>
              </table>
            </div>
             )}
        </section>
        )}

        {profile?.role === "admin" &&
  activeTab === "users" && (
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
    width: "100%",
    maxWidth: "100%",
    overflowX: "scroll",
    WebkitOverflowScrolling: "touch",
  }}
>
                    <table style={{ ...styles.table, minWidth: "1200px", width: "1200px", }} >
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
                          <th style={styles.tableCell}>
                         مدیریت دسترسی‌ها
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
  ? (() => {
      const date = new Date(user.created_at);
      const jalaliDate = jalaali.toJalaali(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );

      return `${jalaliDate.jy}/${String(
        jalaliDate.jm
      ).padStart(2, "0")}/${String(
        jalaliDate.jd
      ).padStart(2, "0")}`;
    })()
  : "-"}
                                </td>
                                <td style={styles.tableCell}>
  {user.role !== "admin" && (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "180px" }}>
      {[
        ["can_view_all_reports", "مشاهده همه گزارش‌ها"],
        ["can_create_reports", "ایجاد گزارش"],
        ["can_edit_reports", "ویرایش گزارش"],
        ["can_delete_reports", "حذف گزارش"],
        ["can_view_analytics", "مشاهده آمار"],
      ].map(([key, label]) => (
        <label key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="checkbox"
            checked={Boolean(user[key])}
            onChange={(event) =>
              saveUserPermissions(user.id, {
                ...user,
                [key]: event.target.checked,
              })
            }
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )}
</td>

                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section> </> )}
              {profile?.role === "admin" && activeTab === "targets" && (

  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>مدیریت اهداف عواید</h2>
<p>
  در این بخش می‌توانید هدف سالانه، ماهانه یا هدف جداگانه برای هر کاربر ثبت کنید.
</p>

<form onSubmit={saveTarget}>
  <div style={styles.formGroup}>
    <label style={styles.label}>سال هجری شمسی</label>
    <input
      type="number"
      value={targetYear}
      onChange={(event) => setTargetYear(event.target.value)}
      min="1300"
      max="1500"
      required
      style={styles.input}
    />
  </div>

  <div style={styles.formGroup}>
    <label style={styles.label}>ماه</label>
    <select
      value={targetMonth}
      onChange={(event) => setTargetMonth(event.target.value)}
      style={styles.input}
    >
      <option value="">هدف سالانه</option>
      <option value="1">حمل</option>
      <option value="2">ثور</option>
      <option value="3">جوزا</option>
      <option value="4">سرطان</option>
      <option value="5">اسد</option>
      <option value="6">سنبله</option>
      <option value="7">میزان</option>
      <option value="8">عقرب</option>
      <option value="9">قوس</option>
      <option value="10">جدی</option>
      <option value="11">دلو</option>
      <option value="12">حوت</option>
    </select>
  </div>

  <div style={styles.formGroup}>
    <label style={styles.label}>هدف برای</label>
    <select
      value={targetUserId}
      onChange={(event) => setTargetUserId(event.target.value)}
      style={styles.input}
    >
      <option value="">هدف کلی عواید</option>
      {users
        .filter((user) => user.role !== "admin")
        .map((user) => (
          <option key={user.id} value={user.id}>
            {user.full_name || user.username}
          </option>
        ))}
    </select>
  </div>

  <div style={styles.formGroup}>
    <label style={styles.label}>مبلغ هدف</label>
    <input
      type="number"
      min="0"
      step="0.01"
      value={targetAmount}
      onChange={(event) => setTargetAmount(event.target.value)}
      required
      style={styles.input}
    />
  </div>

  <button type="submit" disabled={targetLoading} style={styles.button}>
    {targetLoading ? "لطفاً صبر کنید..." : "ثبت هدف"}
  </button>
</form>

<h3 style={{ marginTop: "28px" }}>اهداف ثبت‌شده</h3>

{targetLoading && <p>در حال دریافت اطلاعات...</p>}

{!targetLoading && targets.length === 0 && (
  <p>هنوز هدفی ثبت نشده است.</p>
)}

{targets.length > 0 && (
  <div
  style={{
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
    boxSizing: "border-box",
  }}
>

    <table
  style={{
    ...styles.table,
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "collapse",
  }}
>
  <thead>
    <tr>
      <th style={styles.th}>سال</th>
      <th style={styles.th}>دوره</th>
      <th style={styles.th}>کاربر</th>
      <th style={styles.th}>مبلغ هدف</th>
      <th style={styles.th}>عواید تحقق‌یافته</th>
      <th style={styles.th}>درصد پیشرفت</th>
      <th style={styles.th}>وضعیت پیشرفت</th>

    </tr>
  </thead>
  <tbody>
    {targets.map((target) => {
      const targetUser = users.find(
        (user) => user.id === target.user_id
      );
  const months = [
    "",
    "حمل",
    "ثور",
    "جوزا",
    "سرطان",
    "اسد",
    "سنبله",
    "میزان",
    "عقرب",
    "قوس",
    "جدی",
    "دلو",
    "حوت",
  ];

  const achieved = reports.reduce((sum, report) => {
    if (!report.report_date) return sum;

    const jalaliDate = gregorianISOToJalali(report.report_date);
    if (!jalaliDate) return sum;

    const [year, month] = jalaliDate.split("/").map(Number);

    const matchesPeriod =
      year === Number(target.period_year) &&
      (
        target.period_month == null ||
        month === Number(target.period_month)
      );

    const matchesUser =
      !target.user_id || report.user_id === target.user_id;

    if (matchesPeriod && matchesUser) {
      return sum + (Number(report.revenue_afn) || 0);
    }

    return sum;
  }, 0);

  const goal = Number(target.target_amount) || 0;
  const percent = goal > 0 ? (achieved / goal) * 100 : 0;
  const remaining = Math.max(0, goal - achieved);
const todayJalali = jalaali.toJalaali(new Date());
const currentYear = todayJalali.jy;
const currentMonth = todayJalali.jm;
const currentDay = todayJalali.jd;

let elapsedPercent = 0;

if (target.period_month != null) {
if (
target.period_year < currentYear ||
(
target.period_year === currentYear &&
target.period_month < currentMonth
)
) {
elapsedPercent = 100;
} else if (
target.period_year === currentYear &&
target.period_month === currentMonth
) {
const daysInMonth = jalaali.jalaaliMonthLength(
currentYear,
currentMonth
);
elapsedPercent = (currentDay / daysInMonth) * 100;
}
} else {
if (target.period_year < currentYear) {
elapsedPercent = 100;
} else if (target.period_year === currentYear) {
let daysPassed = currentDay;

for (let month = 1; month < currentMonth; month++) {
  daysPassed += jalaali.jalaaliMonthLength(currentYear, month);
}

const daysInYear = jalaali.isLeapJalaaliYear(currentYear)
  ? 366
  : 365;

elapsedPercent = (daysPassed / daysInYear) * 100;

}
}

let progressStatus = "";

if (goal > 0 && achieved >= goal) {
progressStatus = "✅ هدف تکمیل شده";
} else if (percent > elapsedPercent + 5) {
progressStatus = "🟢 پیش از برنامه";
} else if (percent + 5 >= elapsedPercent) {
progressStatus = "🟡 مطابق برنامه";
} else {
progressStatus = "🔴 عقب از برنامه";
}

  return (
    <tr key={target.id}>
      <td style={styles.td}>{target.period_year}</td>

      <td style={styles.td}>
        {target.period_month
          ? months[target.period_month]
          : "سالانه"}
      </td>

      <td style={styles.td}>
        {target.user_id
          ? targetUser?.full_name ||
            targetUser?.username ||
            "کاربر"
          : "هدف کلی"}
      </td>

      <td style={styles.td}>
        {goal.toLocaleString()}
      </td>

      <td style={styles.td}>
        {achieved.toLocaleString()}
      </td>

      <td style={styles.td}>
        <div style={{ minWidth: "120px" }}>
          <div style={{ marginBottom: "6px", fontWeight: "bold" }}>
            {percent.toFixed(1)}٪
          </div>

          <div
            style={{
              width: "100%",
              height: "10px",
              background: "#e5e7eb",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, percent)}%`,
                height: "100%",
                background:
                  percent >= 100 ? "#16a34a" : "#2563eb",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ fontSize: "12px", marginTop: "5px" }}>
            باقی‌مانده: {remaining.toLocaleString()}
          </div>
        </div>
      </td>
  <td style={styles.td}>
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "8px",
        fontWeight: "bold",
        whiteSpace: "nowrap",
        background: progressStatus.includes("تکمیل شده")
          ? "#dcfce7"
          : progressStatus.includes("پیش از برنامه")
          ? "#dbeafe"
          : progressStatus.includes("مطابق برنامه")
          ? "#fef3c7"
          : "#fee2e2",
        color: progressStatus.includes("تکمیل شده")
          ? "#166534"
          : progressStatus.includes("پیش از برنامه")
          ? "#1d4ed8"
          : progressStatus.includes("مطابق برنامه")
          ? "#92400e"
          : "#b91c1c",
      }}
    >
      {progressStatus}
    </span>
  </td>

    </tr>
  );
})}
  </tbody>
</table>

  </div>
)}
<h3 style={{ marginTop: "32px" }}>📝 ارسال ملاحظات به کاربران</h3>

<p style={styles.sectionDescription}>
  می‌توانید ملاحظه را برای یک کاربر مشخص یا برای همهٔ کاربران ارسال کنید.
</p>

<form onSubmit={sendNotification}>
  <div style={styles.formGroup}>
    <label style={styles.label}>گیرندهٔ ملاحظه</label>

<select
  value={notificationRecipient}
  onChange={(event) => setNotificationRecipient(event.target.value)}
  style={styles.input}
>
  <option value="">همهٔ کاربران</option>

  {users
    .filter((user) => user.role !== "admin")
    .map((user) => (
      <option key={user.id} value={user.id}>
        {user.full_name || user.username}
      </option>
    ))}
</select>

  </div>

  <div style={styles.formGroup}>
    <label style={styles.label}>عنوان ملاحظه</label>

<input
  type="text"
  value={notificationTitle}
  onChange={(event) => setNotificationTitle(event.target.value)}
  maxLength={200}
  required
  style={styles.input}
  placeholder="مثلاً: یادآوری هدف عواید ماه جاری"
/>

  </div>

  <div style={styles.formGroup}>
    <label style={styles.label}>متن ملاحظه</label>
<textarea
  value={notificationMessage}
  onChange={(event) => setNotificationMessage(event.target.value)}
  maxLength={5000}
  required
  rows={5}
  style={{
    ...styles.input,
    resize: "vertical",
    minHeight: "120px",
  }}
  placeholder="متن ملاحظه را اینجا بنویسید..."
/>
  </div>

<button
type="submit"
disabled={notificationLoading}
style={styles.button}

>
{notificationLoading ? "در حال ارسال..." : "ارسال ملاحظه"}

  </button>
</form>

  </section>
)}
{profile?.role !== "admin" && activeTab === "targets" && (
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>🎯 هدف عواید من</h2>
    <p>در این بخش فقط هدف‌های عواید تعیین‌شده برای شما نمایش داده می‌شود.</p>

    {targetLoading ? (
      <p>در حال دریافت هدف‌ها...</p>
    ) : targets.filter(
        (target) => target.user_id === session?.user?.id
      ).length === 0 ? (
      <p>هنوز هدفی برای شما تعیین نشده است.</p>
    ) : (
            <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          marginTop: "20px",
          width: "100%",
        }}
      >
        {targets
          .filter(
            (target) => target.user_id === session?.user?.id
          )
          .map((target) => {
            const months = [
              "",
              "حمل",
              "ثور",
              "جوزا",
              "سرطان",
              "اسد",
              "سنبله",
              "میزان",
              "عقرب",
              "قوس",
              "جدی",
              "دلو",
              "حوت",
            ];

            const achieved = reports.reduce((sum, report) => {
              if (
                report.user_id !== session?.user?.id ||
                !report.report_date
              ) {
                return sum;
              }

              const jalaliDate = gregorianISOToJalali(
                report.report_date
              );

              if (!jalaliDate) return sum;

              const [year, month] = jalaliDate.split("/").map(Number);

              const matchesPeriod =
                year === Number(target.period_year) &&
                (
                  target.period_month == null ||
                  month === Number(target.period_month)
                );

              return matchesPeriod
                ? sum + (Number(report.revenue_afn) || 0)
                : sum;
            }, 0);

            const goal = Number(target.target_amount) || 0;
            const percent = goal > 0 ? (achieved / goal) * 100 : 0;
            const remaining = Math.max(0, goal - achieved);

            const today = jalaali.toJalaali(new Date());
            let elapsedPercent = 0;

            if (target.period_month != null) {
              if (
                target.period_year < today.jy ||
                (
                  target.period_year === today.jy &&
                  target.period_month < today.jm
                )
              ) {
                elapsedPercent = 100;
              } else if (
                target.period_year === today.jy &&
                target.period_month === today.jm
              ) {
                elapsedPercent =
                  (today.jd /
                    jalaali.jalaaliMonthLength(
                      today.jy,
                      today.jm
                    )) * 100;
              }
            } else {
              if (target.period_year < today.jy) {
                elapsedPercent = 100;
              } else if (target.period_year === today.jy) {
                let daysPassed = today.jd;

                for (let m = 1; m < today.jm; m++) {
                  daysPassed += jalaali.jalaaliMonthLength(
                    today.jy,
                    m
                  );
                }

                const daysInYear =
                  jalaali.isLeapJalaaliYear(today.jy) ? 366 : 365;

                elapsedPercent = (daysPassed / daysInYear) * 100;
              }
            }

            let status = "🔴 عقب از برنامه";
            let statusColor = "#dc2626";
            let statusBackground = "#fee2e2";

            if (goal > 0 && achieved >= goal) {
              status = "✅ هدف تکمیل شده";
              statusColor = "#166534";
              statusBackground = "#dcfce7";
            } else if (percent > elapsedPercent + 5) {
              status = "🟢 پیش از برنامه";
              statusColor = "#1d4ed8";
              statusBackground = "#dbeafe";
            } else if (percent + 5 >= elapsedPercent) {
              status = "🟡 مطابق برنامه";
              statusColor = "#92400e";
              statusBackground = "#fef3c7";
            }

            return (
              <div
                key={target.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "18px",
                  padding: "18px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ minWidth: "85px", flex: "0 0 auto" }}>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    سال و دوره
                  </div>
                  <strong style={{ display: "block", marginTop: "6px" }}>
                    {target.period_year} ـ{" "}
                    {target.period_month
                      ? months[target.period_month]
                      : "سالانه"}
                  </strong>
                </div>

                <div style={{ flex: "1 1 100px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    مبلغ هدف
                  </div>
                  <strong style={{ display: "block", marginTop: "6px" }}>
                    {goal.toLocaleString()} افغانی
                  </strong>
                </div>

                <div style={{ flex: "1 1 110px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    عواید تحقق‌یافته
                  </div>
                  <strong style={{ display: "block", marginTop: "6px" }}>
                    {achieved.toLocaleString()} افغانی
                  </strong>
                </div>

                <div style={{ flex: "1 1 130px", minWidth: "110px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    درصد پیشرفت
                  </div>
                  <strong style={{ display: "block", marginTop: "6px" }}>
                    {percent.toFixed(1)}٪
                  </strong>

                  <div
                    style={{
                      height: "8px",
                      width: "100%",
                      background: "#e5e7eb",
                      borderRadius: "8px",
                      overflow: "hidden",
                      marginTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, percent)}%`,
                        height: "100%",
                        background: percent >= 100 ? "#16a34a" : "#2563eb",
                        borderRadius: "8px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

                <div style={{ flex: "1 1 100px" }}>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    مبلغ باقی‌مانده
                  </div>
                  <strong style={{ display: "block", marginTop: "6px" }}>
                    {remaining.toLocaleString()} افغانی
                  </strong>
                </div>

                <div style={{ flex: "0 1 auto" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      borderRadius: "9px",
                      background: statusBackground,
                      color: statusColor,
                      fontSize: "13px",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    )}
  </section>
)}
{profile && notifications.some(
  (notification) =>
    notification.recipient_id === null ||
    notification.recipient_id === session?.user?.id
) && (
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>🔔 ملاحظات و اطلاعیه‌ها</h2>

{notifications.filter(
  (notification) =>
    notification.recipient_id === null ||
    notification.recipient_id === session?.user?.id
).length === 0 ? (
  <p>فعلاً ملاحظه‌ای برای شما ثبت نشده است.</p>
) : (
  notifications
    .filter(
      (notification) =>
        notification.recipient_id === null ||
        notification.recipient_id === session?.user?.id
    )
    .map((notification) => (
      <div
        key={notification.id}
        style={{
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#1d4ed8" }}>
          {notification.title}
        </h3>

        <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
          {notification.message}
        </p>

        <small style={{ color: "#64748b" }}>
          تاریخ ارسال:{" "}
          {new Date(notification.created_at).toLocaleDateString()}
        </small>
      </div>
    ))
)}

  </section>
)}
               {profile?.role === "admin" && activeTab === "sources" && ( <section style={styles.section}> <h2 style={styles.sectionTitle}> مدیریت منابع عواید </h2>

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
                           )}
            </div>
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