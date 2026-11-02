import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const emptyForm = {
  tariff_number: "",
  taxpayer_name: "",
  father_name: "",
  taxpayer_number: "",
  tariff_amount: "",
  payment_year: "",
  issued_date: new Date().toLocaleDateString("en-CA"),
  item_id: "",
};

export default function Tariffs() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [tariffs, setTariffs] = useState([]);
  const [items, setItems] = useState([]);
  const [sources, setSources] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = profile?.role === "admin";

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      const currentUser = userData?.user;

      if (!currentUser) {
        throw new Error("کاربر وارد سیستم نشده است.");
      }

      setUser(currentUser);

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      if (!profileData.is_active) {
        throw new Error("حساب کاربری شما غیرفعال است.");
      }

      const [
        tariffsResult,
        itemsResult,
        sourcesResult,
      ] = await Promise.all([
        supabase
          .from("tariffs")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("source_items")
          .select("id, source_id, item_code, item_name")
          .eq("is_active", true)
          .order("item_code"),

        supabase
          .from("revenue_sources")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (tariffsResult.error) throw tariffsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (sourcesResult.error) throw sourcesResult.error;

      setTariffs(tariffsResult.data || []);
      setItems(itemsResult.data || []);
      setSources(sourcesResult.data || []);

    } catch (error) {
      setMessage(error.message || "خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  // فقط اقلام دارای کد رسمی پنج‌رقمی برای ثبت جدید نمایش داده می‌شوند.
  const officialItems = items.filter((item) =>
    /^[0-9]{5}$/.test(String(item.item_code || ""))
  );

  // قلم‌های قدیمی و آزمایشی برای ویرایش سوابق قبلی حفظ می‌شوند.
  const selectedItemExists = items.some(
    (item) => String(item.id) === String(form.item_id)
  );

  const formItems =
    editingId !== null && form.item_id && !officialItems.some(
      (item) => String(item.id) === String(form.item_id)
    )
      ? [
          ...officialItems,
          ...items.filter(
            (item) => String(item.id) === String(form.item_id)
          ),
        ]
      : officialItems;

  async function saveTariff(event) {
    event.preventDefault();

    if (!user || !profile?.is_active) {
      setMessage("حساب کاربری فعال نیست.");
      return;
    }

    const taxpayerNumber = form.taxpayer_number.trim();

    if (!/^[1-9][0-9]{9}$/.test(taxpayerNumber)) {
      setMessage("شماره تشخیصیه باید دقیقاً ۱۰ رقم و با رقم غیرصفر شروع شود.");
      return;
    }

    if (!form.tariff_number.trim()) {
      setMessage("شماره تعرفه را وارد کنید.");
      return;
    }

    if (!form.item_id) {
      setMessage("منبع عواید را انتخاب کنید.");
      return;
    }

    const amount = Number(form.tariff_amount);
    const year = Number(form.payment_year);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("مبلغ تعرفه باید بیشتر از صفر باشد.");
      return;
    }

    if (!Number.isInteger(year) || year <= 0) {
      setMessage("سال پرداخت را درست وارد کنید.");
      return;
    }

    if (!form.issued_date) {
      setMessage("تاریخ صدور تعرفه را انتخاب کنید.");
      return;
    }

    const selectedItem = items.find(
      (item) => String(item.id) === String(form.item_id)
    );

    if (!selectedItem || !selectedItem.is_active) {
      setMessage("قلم انتخاب‌شده معتبر یا فعال نیست.");
      return;
    }

    // ثبت جدید فقط با کد رسمی مجاز است.
    if (
      editingId === null &&
      !/^[0-9]{5}$/.test(String(selectedItem.item_code || ""))
    ) {
      setMessage("لطفاً یک منبع دارای کد رسمی انتخاب کنید.");
      return;
    }

    setSaving(true);
    setMessage("");

    const tariffData = {
      tariff_number: form.tariff_number.trim(),
      taxpayer_name: form.taxpayer_name.trim(),
      father_name: form.father_name.trim(),
      taxpayer_number: taxpayerNumber,
      tariff_amount: amount,
      payment_year: year,
      issued_date: form.issued_date,
      item_id: Number(form.item_id),
    };

    try {
      let result;

      if (editingId !== null) {
        result = await supabase
          .from("tariffs")
          .update(tariffData)
          .eq("id", editingId);

      } else {
        result = await supabase
          .from("tariffs")
          .insert({
            ...tariffData,
            issued_by: user.id,
          });
      }

      if (result.error) throw result.error;

      setMessage(
        editingId !== null
          ? "تعرفه با موفقیت ویرایش شد."
          : "تعرفه با موفقیت ثبت شد."
      );

      resetForm();
      await loadData();

    } catch (error) {
      if (error.code === "23505") {
        setMessage("این شماره تعرفه قبلاً ثبت شده است.");
      } else {
        setMessage(error.message || "ثبت تعرفه با خطا مواجه شد.");
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(tariff) {
    setForm({
      tariff_number: tariff.tariff_number,
      taxpayer_name: tariff.taxpayer_name,
      father_name: tariff.father_name,
      taxpayer_number: tariff.taxpayer_number,
      tariff_amount: String(tariff.tariff_amount),
      payment_year: String(tariff.payment_year),
      issued_date: tariff.issued_date,
      item_id: String(tariff.item_id),
    });

    setEditingId(tariff.id);
    setMessage("تعرفه برای ویرایش آماده است.");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const sourceMap = Object.fromEntries(
    sources.map((source) => [
      String(source.id),
      source.name,
    ])
  );

  const itemMap = Object.fromEntries(
    items.map((item) => [
      String(item.id),
      item,
    ])
  );

  const inputStyle = {
    width: "100%",
    padding: "11px",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    marginTop: "6px",
    boxSizing: "border-box",
    fontSize: "14px",
  };

  if (loading) {
    return (
      <section style={{ padding: "25px" }}>
        در حال دریافت اطلاعات تعرفه‌ها...
      </section>
    );
  }

  return (
    <section
      style={{
        background: "#FFFFFF",
        padding: "22px",
        borderRadius: "14px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ color: "#1E3A8A" }}>
        مدیریت تعرفه‌ها
      </h2>

      <p style={{ color: "#64748B" }}>
        ثبت، مشاهده و ویرایش تعرفه‌های عواید
      </p>

      {message && (
        <div
          style={{
            background: "#EFF6FF",
            color: "#1D4ED8",
            border: "1px solid #BFDBFE",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "18px",
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={saveTariff}>
        <h3>
          {editingId !== null
            ? "ویرایش تعرفه"
            : "ثبت تعرفه جدید"}
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <label>
            شماره تعرفه
            <input
              name="tariff_number"
              value={form.tariff_number}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </label>

          <label>
            نام مؤدی
            <input
              name="taxpayer_name"
              value={form.taxpayer_name}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </label>

          <label>
            نام پدر
            <input
              name="father_name"
              value={form.father_name}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </label>

          <label>
            شماره تشخیصیه ۱۰ رقمی
            <input
              name="taxpayer_number"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={form.taxpayer_number}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </label>

          <label>
            مبلغ تعرفه (افغانی)
            <input
              name="tariff_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.tariff_amount}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </label>

          <label>
            سال پرداخت
            <input
              name="payment_year"
              type="number"
              min="1"
              value={form.payment_year}
              onChange={handleChange}
              placeholder="مثلاً ۱۴۰۵"
              required
              style={inputStyle}
            />
          </label>

          <label>
            تاریخ صدور تعرفه
            <input
              name="issued_date"
              type="date"
              value={form.issued_date}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </label>

          <label>
            منبع عواید
            <select
              name="item_id"
              value={form.item_id}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="">
                انتخاب منبع عواید
              </option>

              {formItems.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {sourceMap[String(item.source_id)] || "منبع نامشخص"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "22px",
          }}
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#2563EB",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 25px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {saving
              ? "در حال ذخیره..."
              : editingId !== null
                ? "ذخیره تغییرات"
                : "ثبت تعرفه"}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              style={{
                background: "#64748B",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                cursor: "pointer",
              }}
            >
              لغو ویرایش
            </button>
          )}
        </div>
      </form>

      <hr
        style={{
          margin: "30px 0",
          border: "none",
          borderTop: "1px solid #E2E8F0",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h3>فهرست تعرفه‌ها</h3>

        <button
          type="button"
          onClick={loadData}
          style={{
            padding: "9px 16px",
            background: "#E2E8F0",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          تازه‌سازی
        </button>
      </div>

      <p style={{ color: "#64748B" }}>
        تعداد تعرفه‌های قابل مشاهده: {tariffs.length}
        {isAdmin ? " (همه کاربران)" : " (تعرفه‌های شما)"}
      </p>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "850px",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ background: "#EFF6FF" }}>
              {[
                "شماره تعرفه",
                "نام مؤدی",
                "شماره تشخیصیه",
                "منبع",
                "کد قلم",
                "مبلغ",
                "سال",
                "تاریخ",
                "عملیات",
              ].map((title) => (
                <th
                  key={title}
                  style={{
                    padding: "12px 8px",
                    border: "1px solid #E2E8F0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {tariffs.map((tariff) => {
              const item = itemMap[String(tariff.item_id)];

              return (
                <tr key={tariff.id}>
                  <td>{tariff.tariff_number}</td>
                  <td>{tariff.taxpayer_name}</td>
                  <td>{tariff.taxpayer_number}</td>

                  <td>
                    {item
                      ? sourceMap[String(item.source_id)] || "-"
                      : "-"}
                  </td>

                  <td>
                    {item?.item_code || "-"}
                  </td>

                  <td>
                    {Number(tariff.tariff_amount).toLocaleString("en-US")}
                  </td>

                  <td>{tariff.payment_year}</td>

                  <td>{tariff.issued_date}</td>

                  <td>
                    {(isAdmin || tariff.issued_by === user?.id) && (
                      <button
                        type="button"
                        onClick={() => startEdit(tariff)}
                        style={{
                          background: "#DBEAFE",
                          color: "#1D4ED8",
                          border: "none",
                          padding: "7px 12px",
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

            {tariffs.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    textAlign: "center",
                    padding: "25px",
                    color: "#64748B",
                  }}
                >
                  هنوز تعرفه‌ای ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}